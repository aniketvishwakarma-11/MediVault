# MediVault Document Management - API Documentation

## Base URL
`/documents`

---

## Authorization
All endpoints (except `/documents/categories`) require a valid JWT Bearer Token passed in the request header:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## API Endpoints

### 1. Fetch Supported Categories
- **Endpoint**: `GET /documents/categories`
- **Access**: Public / Authenticated
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Supported medical document categories retrieved successfully.",
  "data": {
    "categories": [
      "Prescription",
      "Blood Report",
      "MRI",
      "CT Scan",
      "X-Ray",
      "ECG",
      "Discharge Summary",
      "Insurance",
      "Vaccination",
      "Prescription History",
      "Surgery",
      "Dental",
      "Eye",
      "Other"
    ]
  },
  "timestamp": "2026-08-05T21:00:00.000Z"
}
```

---

### 2. Upload Medical Document
- **Endpoint**: `POST /documents/upload`
- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `file`: (Binary File, required, max 15MB, PDF/PNG/JPEG/WEBP)
  - `patient_id`: (UUID string, required)
  - `document_name`: (string, min 2 chars)
  - `document_category`: (string, must be allowed category)
  - `hospital_name`: (string, optional)
  - `doctor_name`: (string, optional)
  - `visit_date`: (YYYY-MM-DD, optional)
- **Response**: `201 Created`
```json
{
  "success": true,
  "message": "Medical document uploaded successfully.",
  "data": {
    "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "patient_id": "11111111-2222-3333-4444-555555555555",
    "uploaded_by": "99999999-8888-7777-6666-555555555555",
    "document_name": "Post-Op MRI Scan",
    "original_filename": "mri_scan_knee.pdf",
    "storage_key": "patients/11111111-2222-3333-4444-555555555555/7c9e6679-7425-40de-944b-e07fc1f90ae7/original.pdf",
    "bucket_name": "medical-records",
    "mime_type": "application/pdf",
    "file_extension": "pdf",
    "file_size": 2451200,
    "document_category": "MRI",
    "hospital_name": "City General Hospital",
    "doctor_name": "Dr. Sarah Jenkins",
    "visit_date": "2026-08-01",
    "checksum_sha256": "bd7dcfd7e4a174c8eb5d064cf6f0ec50b868eef4b82d499427b37077c5c0a0c6",
    "upload_status": "COMPLETED",
    "ocr_completed": false,
    "embedding_completed": false
  }
}
```

---

### 3. Fetch Single Document & Pre-Signed Download Link
- **Endpoint**: `GET /documents/:id`
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "document": { ... },
    "signedDownloadUrl": "http://127.0.0.1:9000/medical-records/patients/.../original.pdf?X-Amz-Algorithm=..."
  }
}
```

---

### 4. Search and Filter Documents
- **Endpoint**: `GET /documents/search` or `GET /documents`
- **Query Parameters**:
  - `patient_id` (UUID)
  - `document_category` (string)
  - `hospital_name` (string)
  - `doctor_name` (string)
  - `visit_date_from` (YYYY-MM-DD)
  - `visit_date_to` (YYYY-MM-DD)
  - `search_query` (matches document_name or original_filename)
  - `page` (number, default 1)
  - `limit` (number, default 10)

---

### 5. Fetch Recent Documents
- **Endpoint**: `GET /documents/recent`
- **Query Parameters**: `patient_id`, `limit` (default 5)

---

### 6. Fetch Documents for Patient
- **Endpoint**: `GET /documents/patient/:patientId`

---

### 7. Update Document Metadata
- **Endpoint**: `PATCH /documents/:id`
- **Body**: `{ "document_name": "...", "doctor_name": "..." }`

---

### 8. Soft Delete Document
- **Endpoint**: `DELETE /documents/:id`
