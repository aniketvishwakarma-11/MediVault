"""
MediVault Prescription OCR Microservice (Gradio SDK + ZeroGPU)
Powered by TrOCR (chinmays18/medical-prescription-ocr)
Pure PyTorch & Transformers - No external system binaries needed.
"""

import os
import time
import io
import logging
import gradio as gr
from fastapi import File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("medivault-ocr")

MODEL_NAME = os.getenv("PRESCRIPTION_OCR_MODEL", "chinmays18/medical-prescription-ocr")

processor = None
model = None
model_loaded = False
load_error = None

# ZeroGPU Decorator (provides dynamic NVIDIA A100 GPU allocation on Hugging Face)
try:
    import spaces
    gpu_decorator = spaces.GPU
except Exception:
    def gpu_decorator(func):
        return func

def load_model():
    global processor, model, model_loaded, load_error
    try:
        logger.info(f"Loading TrOCR model: {MODEL_NAME}...")
        from transformers import TrOCRProcessor, VisionEncoderDecoderModel
        import torch

        device = "cpu"  # Initial load on CPU for ZeroGPU dynamic allocation
        processor = TrOCRProcessor.from_pretrained(MODEL_NAME)
        model = VisionEncoderDecoderModel.from_pretrained(MODEL_NAME).to(device)
        model.eval()
        model_loaded = True
        logger.info(f"Model {MODEL_NAME} loaded successfully!")
    except Exception as e:
        load_error = str(e)
        logger.warning(f"Failed to load {MODEL_NAME}: {e}")
        model_loaded = False

# Load model in background thread on startup
import threading
threading.Thread(target=load_model, daemon=True).start()

@gpu_decorator
def run_trocr(image_bytes: bytes) -> str:
    """Run TrOCR model on raw image bytes using ZeroGPU if available."""
    from PIL import Image
    import torch

    if not model_loaded or model is None or processor is None:
        return ""

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model.to(device)

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    pixel_values = processor(image, return_tensors="pt").pixel_values.to(device)
    with torch.no_grad():
        generated_ids = model.generate(
            pixel_values,
            max_new_tokens=512,
            num_beams=4,
            early_stopping=True
        )
    return processor.batch_decode(generated_ids, skip_special_tokens=True)[0].strip()

def score_quality(text: str) -> tuple[float, list[str]]:
    issues = []
    score = 1.0
    if len(text) < 20:
        issues.append("very_short_output")
        score -= 0.3
    if len([c for c in text if c.isalpha()]) / max(len(text), 1) < 0.3:
        issues.append("low_alpha_ratio")
        score -= 0.2
    return max(round(score, 2), 0.4), issues

# Interactive UI testing handler
def gradio_extract(pil_image):
    if pil_image is None:
        return "Please upload a prescription image."
    img_byte_arr = io.BytesIO()
    pil_image.save(img_byte_arr, format='JPEG')
    raw_bytes = img_byte_arr.getvalue()
    try:
        result = run_trocr(raw_bytes)
        return result if result else "No legible handwriting detected."
    except Exception as e:
        return f"Extraction error: {e}"

# ── Gradio Web UI ─────────────────────────────────────────────────────────────
with gr.Blocks(title="MediVault Prescription OCR", theme=gr.themes.Soft()) as demo:
    gr.Markdown("# 💊 MediVault Prescription OCR Microservice")
    gr.Markdown("High-accuracy handwritten medical prescription extraction powered by **TrOCR** (`chinmays18/medical-prescription-ocr`).")
    with gr.Row():
        with gr.Column():
            input_image = gr.Image(type="pil", label="Upload Prescription Image")
            extract_btn = gr.Button("Extract Prescription Text", variant="primary")
        with gr.Column():
            output_text = gr.Textbox(label="Extracted Clinical Text", lines=10)
    
    extract_btn.click(fn=gradio_extract, inputs=[input_image], outputs=[output_text])
    gr.Markdown("### REST API Endpoints for MediVault Backend:\n- `POST /analyze` (multipart file upload)\n- `GET /health`\n- `GET /model-info`")

# ── REST API Endpoints for MediVault Backend ──────────────────────────────────
@demo.app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": model_loaded,
        "model_name": MODEL_NAME,
        "load_error": load_error,
    }

@demo.app.get("/model-info")
def model_info():
    return {
        "model_name": MODEL_NAME,
        "model_loaded": model_loaded,
        "framework": "TrOCR (transformers) + ZeroGPU",
        "supported_types": ["image/jpeg", "image/png", "image/webp"],
    }

@demo.app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    start = time.time()
    try:
        image_bytes = await file.read()
        raw_text = ""

        if model_loaded:
            try:
                raw_text = run_trocr(image_bytes)
                logger.info(f"TrOCR extracted {len(raw_text)} chars")
            except Exception as e:
                logger.warning(f"TrOCR inference error: {e}")

        quality_score, quality_issues = score_quality(raw_text)
        elapsed_ms = int((time.time() - start) * 1000)

        return JSONResponse({
            "success": True,
            "raw_text": raw_text,
            "model_name": MODEL_NAME,
            "model_version": "1.0.0",
            "processing_time_ms": elapsed_ms,
            "image_quality_score": quality_score,
            "quality_issues": quality_issues,
            "model_output": {
                "char_count": len(raw_text),
                "word_count": len(raw_text.split()),
            }
        })
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)
