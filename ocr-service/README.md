---
title: MediVault Prescription OCR
emoji: 💊
colorFrom: blue
colorTo: indigo
sdk: gradio
sdk_version: 5.20.0
app_file: app.py
pinned: false
---

# MediVault Prescription OCR Microservice

Extracts handwritten and printed medical prescriptions using:
- **Primary**: `chinmays18/medical-prescription-ocr` (TrOCR fine-tuned on handwritten prescriptions)
- **Fallback**: Tesseract 5 OCR
- **API**: REST `/analyze`, `/health`, `/model-info`
