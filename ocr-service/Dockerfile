FROM python:3.11-slim

# Install system dependencies for Tesseract + pdf2image
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    poppler-utils \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .

# Install CPU-only torch first (smaller image)
RUN pip install --no-cache-dir torch==2.5.1+cpu torchvision==0.20.1+cpu \
    -f https://download.pytorch.org/whl/torch_stable.html

RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

# HuggingFace Spaces uses port 7860
ENV PORT=7860
EXPOSE 7860

# Pre-download model at build time so runtime is fast
RUN python -c "from transformers import TrOCRProcessor, VisionEncoderDecoderModel; \
    TrOCRProcessor.from_pretrained('chinmays18/medical-prescription-ocr'); \
    VisionEncoderDecoderModel.from_pretrained('chinmays18/medical-prescription-ocr')" || true

CMD ["python", "app.py"]
