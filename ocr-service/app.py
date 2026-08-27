"""
MediVault Prescription OCR Microservice
Wraps chinmays18/medical-prescription-ocr (TrOCR fine-tuned on handwritten prescriptions)
+ Tesseract fallback for typed/printed documents.

Deploy this on HuggingFace Spaces (FREE) or Render (FREE).
"""

import os
import time
import io
import logging
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import uvicorn

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("medivault-ocr")

app = FastAPI(title="MediVault Prescription OCR API", version="1.0.0")

# ── Model Loading ─────────────────────────────────────────────────────────────
MODEL_NAME = os.getenv("PRESCRIPTION_OCR_MODEL", "chinmays18/medical-prescription-ocr")
USE_GPU = os.getenv("USE_GPU", "false").lower() == "true"

processor = None
model = None
model_loaded = False
load_error = None

def load_model():
    global processor, model, model_loaded, load_error
    try:
        logger.info(f"Loading model: {MODEL_NAME}")
        from transformers import TrOCRProcessor, VisionEncoderDecoderModel
        import torch

        device = "cuda" if (USE_GPU and torch.cuda.is_available()) else "cpu"
        processor = TrOCRProcessor.from_pretrained(MODEL_NAME)
        model = VisionEncoderDecoderModel.from_pretrained(MODEL_NAME).to(device)
        model.eval()
        model_loaded = True
        logger.info(f"Model {MODEL_NAME} loaded successfully on {device}")
    except Exception as e:
        load_error = str(e)
        logger.warning(f"Failed to load {MODEL_NAME}: {e}. Will use Tesseract fallback only.")
        model_loaded = False

# Load model at startup (non-blocking for HuggingFace Spaces)
import threading
threading.Thread(target=load_model, daemon=True).start()

# ── OCR Helpers ───────────────────────────────────────────────────────────────

def run_trocr(image_bytes: bytes) -> str:
    """Run TrOCR model on image bytes."""
    from PIL import Image
    import torch
    device = next(model.parameters()).device
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    pixel_values = processor(image, return_tensors="pt").pixel_values.to(device)
    with torch.no_grad():
        generated_ids = model.generate(
            pixel_values,
            max_new_tokens=512,
            num_beams=4,
            early_stopping=True
        )
    text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
    return text.strip()

def run_tesseract(image_bytes: bytes, mime_type: str) -> str:
    """Tesseract fallback for typed/printed documents."""
    try:
        import pytesseract
        from PIL import Image
        import pdf2image

        if mime_type == "application/pdf":
            pages = pdf2image.convert_from_bytes(image_bytes, dpi=300)
            texts = [pytesseract.image_to_string(p, lang="eng") for p in pages]
            return "\n".join(texts).strip()
        else:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            return pytesseract.image_to_string(image, lang="eng").strip()
    except Exception as e:
        logger.warning(f"Tesseract failed: {e}")
        return ""

def score_quality(text: str) -> tuple[float, list[str]]:
    """Simple heuristic quality scoring."""
    issues = []
    score = 1.0
    if len(text) < 20:
        issues.append("very_short_output")
        score -= 0.3
    if len([c for c in text if c.isalpha()]) / max(len(text), 1) < 0.3:
        issues.append("low_alpha_ratio")
        score -= 0.2
    return max(round(score, 2), 0.4), issues

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": model_loaded,
        "model_name": MODEL_NAME,
        "load_error": load_error,
    }

@app.get("/model-info")
async def model_info():
    return {
        "model_name": MODEL_NAME,
        "model_loaded": model_loaded,
        "framework": "TrOCR (transformers)",
        "fallback": "Tesseract 5 + pdf2image",
        "supported_types": ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    }

@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    start = time.time()
    try:
        image_bytes = await file.read()
        mime_type = file.content_type or "image/jpeg"
        raw_text = ""
        used_model = MODEL_NAME

        # 1. Try TrOCR (fine-tuned on handwritten prescriptions)
        if model_loaded and mime_type.startswith("image/"):
            try:
                raw_text = run_trocr(image_bytes)
                logger.info(f"TrOCR extracted {len(raw_text)} chars")
            except Exception as e:
                logger.warning(f"TrOCR inference failed: {e}")

        # 2. Fallback to Tesseract for PDFs or if TrOCR gave nothing
        if not raw_text or len(raw_text.strip()) < 10:
            raw_text = run_tesseract(image_bytes, mime_type)
            used_model = "Tesseract OCR 5 (fallback)"

        quality_score, quality_issues = score_quality(raw_text)
        elapsed_ms = int((time.time() - start) * 1000)

        return JSONResponse({
            "success": True,
            "raw_text": raw_text,
            "model_name": used_model,
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
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 7860)))
