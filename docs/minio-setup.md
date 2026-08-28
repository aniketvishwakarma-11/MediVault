# MinIO Setup Guide - MediVault Chain AI

## 1. Running MinIO via Docker
```bash
docker run -d \
  -p 9000:9000 \
  -p 9001:9001 \
  --name medivault_minio \
  -e "MINIO_ROOT_USER=medivault_minio_admin" \
  -e "MINIO_ROOT_PASSWORD=medivault_minio_secret_key" \
  minio/minio server /data --console-address ":9001"
```

## 2. Environment Variables Configuration
In `backend/.env`:
```env
MINIO_ENDPOINT=127.0.0.1
MINIO_PORT=9000
MINIO_ACCESS_KEY=medivault_minio_admin
MINIO_SECRET_KEY=medivault_minio_secret_key
MINIO_BUCKET=medical-records
MINIO_USE_SSL=false
```

## 3. Automatic Initialization
On application server startup (`npm start`), the backend executes `initializeMinioBucket()` which:
1. Pings the MinIO server.
2. Checks if `medical-records` bucket exists.
3. Automatically creates the bucket if missing.
4. Enforces private bucket policy settings.
