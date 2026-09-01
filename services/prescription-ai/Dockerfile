# =========================================================================
# Production Dockerfile for MediVault Python TrOCR AI Microservice
# =========================================================================

FROM python:3.11-slim

# Install system dependencies for image preprocessing and OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install CPU-optimized PyTorch first for fast downloads and smaller image footprint
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
# Filter out torch from requirements.txt to avoid overwriting CPU wheel
RUN grep -v '^torch' requirements.txt > reqs_filtered.txt && \
    pip install --no-cache-dir -r reqs_filtered.txt

COPY app.py model_loader.py preprocessor.py ./

ENV PORT=8001
ENV PYTHONUNBUFFERED=1
EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:8001/health || exit 1

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]
