-- MediVault Chain AI - Medical Document Management Database Migration
-- Table: public.documents

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
    document_name VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_key VARCHAR(512) UNIQUE NOT NULL,
    bucket_name VARCHAR(100) NOT NULL DEFAULT 'medical-records',
    mime_type VARCHAR(100) NOT NULL,
    file_extension VARCHAR(20) NOT NULL,
    file_size BIGINT NOT NULL,
    document_category VARCHAR(100) NOT NULL,
    hospital_name VARCHAR(255),
    doctor_name VARCHAR(255),
    visit_date DATE,
    checksum_sha256 VARCHAR(64) NOT NULL,
    upload_status VARCHAR(50) DEFAULT 'COMPLETED',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    blockchain_hash VARCHAR(128),
    blockchain_tx VARCHAR(128),
    ocr_completed BOOLEAN DEFAULT FALSE,
    embedding_completed BOOLEAN DEFAULT FALSE,
    metadata_json JSONB
);

-- 2. Indexes for search and query performance optimization
CREATE INDEX IF NOT EXISTS idx_documents_patient_id ON public.documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_documents_storage_key ON public.documents(storage_key);
CREATE INDEX IF NOT EXISTS idx_documents_checksum ON public.documents(checksum_sha256);
CREATE INDEX IF NOT EXISTS idx_documents_category ON public.documents(document_category);
CREATE INDEX IF NOT EXISTS idx_documents_visit_date ON public.documents(visit_date);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at);

-- Composite index for duplicate lookup optimization
CREATE INDEX IF NOT EXISTS idx_documents_patient_checksum ON public.documents(patient_id, checksum_sha256) WHERE is_deleted = false;

-- 3. Automatic updated_at trigger function
CREATE OR REPLACE FUNCTION update_documents_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION update_documents_updated_at_column();
