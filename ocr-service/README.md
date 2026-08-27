---
title: MediVault Prescription OCR
emoji: 💊
colorFrom: cyan
colorTo: teal
sdk: docker
pinned: false
---

# MediVault Prescription OCR Service

Handwritten prescription OCR microservice using:
- **Primary**: `chinmays18/medical-prescription-ocr` (TrOCR fine-tuned on medical prescriptions)
- **Fallback**: Tesseract 5 OCR (for typed/printed documents and PDFs)

## Endpoints
- `GET /health` — Service health + model loaded status
- `GET /model-info` — Model metadata
- `POST /analyze` — Upload image/PDF, get extracted text

## Usage
```bash
curl -X POST https://[your-space].hf.space/analyze \
  -F "file=@prescription.jpg"
```
