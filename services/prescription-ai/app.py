"""
MediVault -- Prescription OCR AI Microservice
Model: chinmays18/medical-prescription-ocr (Hugging Face)
Port: 8001
"""

import os
import io
import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from typing import Optional
import uvicorn

from model_loader import PrescriptionOCRModel
from preprocessor import ImagePreprocessor

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Singleton model
_model: Optional[PrescriptionOCRModel] = None


def get_model() -> PrescriptionOCRModel:
    global _model
    if _model is None:
        model_name = os.getenv("PRESCRIPTION_OCR_MODEL", "chinmays18/medical-prescription-ocr")
        logger.info(f"[OCR Service] Loading model: {model_name}")
        _model = PrescriptionOCRModel(model_name)
        logger.info("[OCR Service] Model ready.")
    return _model


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        get_model()
    except Exception as e:
        logger.error(f"[OCR Service] Model load notice at startup: {e}")
    yield
    # Shutdown


app = FastAPI(
    title="MediVault Prescription OCR Service",
    description="Analyzes prescription images using chinmays18/medical-prescription-ocr",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
def health():
    global _model
    loaded = _model is not None and _model.is_loaded()
    return {
        "status": "UP",
        "service": "MediVault Prescription OCR",
        "model_loaded": loaded,
        "model_name": os.getenv("PRESCRIPTION_OCR_MODEL", "chinmays18/medical-prescription-ocr"),
    }


@app.get("/model-info")
def model_info():
    model = get_model()
    return {
        "model_name": model.model_name,
        "model_version": model.model_version,
        "architecture": model.architecture,
        "status": "loaded" if model.is_loaded() else "loading",
    }


@app.post("/analyze")
async def analyze_prescription(file: UploadFile = File(...)):
    """Analyze a prescription image using the OCR model."""
    start_ms = time.time()

    raw_bytes = await file.read()
    if len(raw_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file received.")

    logger.info(f"[OCR Service] Received image: {file.filename} ({len(raw_bytes)} bytes, {file.content_type})")

    preprocessor = ImagePreprocessor()
    content_type = file.content_type or "image/jpeg"
    quality_result = preprocessor.check_quality(raw_bytes, content_type)

    if quality_result.get("reject", False):
        logger.warning(f"[OCR Service] Quality rejected: {quality_result.get('issues')}")
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "error": "image_quality_too_low",
                "message": "Prescription image quality is too low to analyze reliably. Please upload a clearer image.",
                "quality_score": quality_result.get("score", 0.0),
                "issues": quality_result.get("issues", []),
            },
        )

    try:
        processed_image = preprocessor.preprocess(raw_bytes, content_type)
    except Exception as e:
        logger.error(f"[OCR Service] Preprocessing error: {e}")
        raise HTTPException(status_code=422, detail=f"Image preprocessing failed: {str(e)}")

    model = get_model()
    try:
        ocr_result = model.run_inference(processed_image)
        extracted_text = ocr_result.get("text", "")
        logger.info(f"[OCR Service] OCR Extracted: '{extracted_text}'")
    except Exception as e:
        logger.error(f"[OCR Service] Inference error: {e}")
        raise HTTPException(status_code=500, detail=f"OCR inference failed: {str(e)}")

    elapsed_ms = int((time.time() - start_ms) * 1000)

    return {
        "success": True,
        "raw_text": ocr_result.get("text", ""),
        "model_name": model.model_name,
        "model_version": model.model_version,
        "processing_time_ms": elapsed_ms,
        "image_quality_score": quality_result.get("score", 0.95),
        "quality_issues": quality_result.get("issues", []),
        "model_output": ocr_result,
    }


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8001"))
    logger.info(f"[OCR Service] Starting on port {port}")
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)