-- MediVault V2 — Production PostgreSQL Database Schema Specification
-- Complete Normalized Schema, Triggers, Views, Indexes, and RLS Policies

BEGIN;

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Drop legacy/old tables to guarantee clean greenfield schema build
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.blockchain_notarizations CASCADE;
DROP TABLE IF EXISTS public.consent_grants CASCADE;
DROP TABLE IF EXISTS public.consent_requests CASCADE;
DROP TABLE IF EXISTS public.timeline_events CASCADE;
DROP TABLE IF EXISTS public.prescriptions CASCADE;
DROP TABLE IF EXISTS public.medical_knowledge CASCADE;
DROP TABLE IF EXISTS public.ai_analyses CASCADE;
DROP TABLE IF EXISTS public.document_ai_analysis CASCADE;
DROP TABLE IF EXISTS public.document_versions CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.medical_reports CASCADE;
DROP TABLE IF EXISTS public.hospitals CASCADE;
DROP TABLE IF EXISTS public.doctors CASCADE;
DROP TABLE IF EXISTS public.doctor_patient_access CASCADE;
DROP TABLE IF EXISTS public.patients CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.users_profile CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. Custom Enum Types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'hospital', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE org_type AS ENUM ('hospital', 'clinic', 'lab');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE doctor_verification_status AS ENUM ('pending', 'verified', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE document_category AS ENUM (
        'Blood Report', 'Prescription', 'MRI', 'CT Scan', 'X-Ray', 
        'Discharge Summary', 'ECG', 'Pathology', 'Other'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE ai_knowledge_type AS ENUM ('biomarker', 'diagnosis', 'medication', 'symptom');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE clinical_status AS ENUM ('normal', 'abnormal', 'critical', 'active', 'resolved');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE timeline_event_type AS ENUM (
        'DOCTOR_VISIT', 'DIAGNOSIS', 'PRESCRIPTION', 'SURGERY', 
        'HOSPITALIZATION', 'LAB_RESULT', 'VACCINATION', 
        'MEDICATION_STARTED', 'MEDICATION_STOPPED', 'FOLLOW_UP'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE clinical_severity AS ENUM ('NORMAL', 'MONITOR', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE consent_status AS ENUM ('PENDING', 'APPROVED', 'REVOKED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE grantee_role AS ENUM ('doctor', 'hospital');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Base Identity Tables
CREATE TABLE public.users_profile (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'patient',
    phone VARCHAR(50),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    reg_number VARCHAR(100) UNIQUE NOT NULL,
    type org_type NOT NULL DEFAULT 'hospital',
    address TEXT,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    date_of_birth DATE,
    gender VARCHAR(20),
    blood_group VARCHAR(10),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(50),
    emergency_qr_code_url TEXT,
    vitals_json JSONB DEFAULT '{}'::jsonb,
    allergies_json JSONB DEFAULT '[]'::jsonb,
    chronic_conditions_json JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    license_number VARCHAR(100) UNIQUE NOT NULL,
    specialization VARCHAR(150) NOT NULL,
    hospital_name VARCHAR(255),
    verification_status doctor_verification_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.hospitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    hospital_name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100) UNIQUE NOT NULL,
    address TEXT,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Core Health Document Tables
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    uploader_id UUID REFERENCES auth.users(id),
    document_name VARCHAR(255) NOT NULL,
    document_category document_category NOT NULL,
    file_extension VARCHAR(10) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    storage_path TEXT NOT NULL,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. AI Versioning Engine Table
CREATE TABLE public.ai_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    prompt_version VARCHAR(50) NOT NULL,
    ocr_raw_text TEXT,
    clinical_summary TEXT,
    raw_response_json JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    execution_time_ms INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Normalized Clinical Knowledge Table
CREATE TABLE public.medical_knowledge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID REFERENCES public.ai_analyses(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    knowledge_type ai_knowledge_type NOT NULL,
    name VARCHAR(255) NOT NULL,
    value VARCHAR(255),
    unit VARCHAR(50),
    reference_range VARCHAR(100),
    status clinical_status DEFAULT 'normal',
    recorded_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Clinical Prescriptions Table
CREATE TABLE public.prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES public.doctors(id),
    medications_json JSONB NOT NULL,
    instructions TEXT,
    digital_signature TEXT,
    blockchain_tx_hash VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Patient-Centric Timeline Events Table
CREATE TABLE public.timeline_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    event_type timeline_event_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    related_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    related_prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL,
    clinical_severity clinical_severity DEFAULT 'NORMAL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Consent Grants Table
CREATE TABLE public.consent_grants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    grantee_id UUID NOT NULL REFERENCES auth.users(id),
    grantee_role grantee_role NOT NULL,
    status consent_status DEFAULT 'PENDING',
    purpose TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    blockchain_tx_hash VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Web3 Blockchain Notarization Table
CREATE TABLE public.blockchain_notarizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    document_hash VARCHAR(64) NOT NULL,
    tx_hash VARCHAR(128) UNIQUE NOT NULL,
    block_number BIGINT NOT NULL,
    network VARCHAR(100) DEFAULT 'Polygon Amoy',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Security Audit Logs Table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_documents_patient_created ON public.documents(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_checksum ON public.documents(checksum_sha256);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_active ON public.ai_analyses(document_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_timeline_patient_date ON public.timeline_events(patient_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_consent_approved ON public.consent_grants(patient_id, grantee_id) WHERE status = 'APPROVED';
CREATE INDEX IF NOT EXISTS idx_knowledge_patient_type ON public.medical_knowledge(patient_id, knowledge_type, recorded_date DESC);

-- 13. Functions & Triggers
CREATE OR REPLACE FUNCTION public.handle_new_user_v2()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users_profile (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'patient'::user_role)
  )
  ON CONFLICT (id) DO NOTHING;

  IF (COALESCE(NEW.raw_user_meta_data->>'role', 'patient') = 'patient') THEN
    INSERT INTO public.patients (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  ELSIF (NEW.raw_user_meta_data->>'role' = 'doctor') THEN
    INSERT INTO public.doctors (user_id, license_number, specialization) 
    VALUES (NEW.id, 'DOC-' || SUBSTRING(NEW.id::text, 1, 8), 'General Physician')
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF (NEW.raw_user_meta_data->>'role' = 'hospital') THEN
    INSERT INTO public.hospitals (user_id, hospital_name, registration_number) 
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'General Hospital'), 'HOSP-' || SUBSTRING(NEW.id::text, 1, 8))
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_v2 ON auth.users;
CREATE TRIGGER on_auth_user_created_v2
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_v2();

-- 14. Row Level Security Policies
ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Security Policies
DROP POLICY IF EXISTS "Auth read users_profile" ON public.users_profile;
CREATE POLICY "Auth read users_profile" ON public.users_profile FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Self insert users_profile" ON public.users_profile;
CREATE POLICY "Self insert users_profile" ON public.users_profile FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Self update users_profile" ON public.users_profile;
CREATE POLICY "Self update users_profile" ON public.users_profile FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Self or consented read patients" ON public.patients;
CREATE POLICY "Self or consented read patients" ON public.patients FOR SELECT USING (
  user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.consent_grants cg 
    WHERE cg.patient_id = public.patients.id AND cg.grantee_id = auth.uid() 
    AND cg.status = 'APPROVED' AND (cg.expires_at IS NULL OR cg.expires_at > NOW())
  )
);
DROP POLICY IF EXISTS "Self insert patients" ON public.patients;
CREATE POLICY "Self insert patients" ON public.patients FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Self update patients" ON public.patients;
CREATE POLICY "Self update patients" ON public.patients FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Owner or consented read documents" ON public.documents;
CREATE POLICY "Owner or consented read documents" ON public.documents FOR SELECT USING (
  patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()) OR uploader_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.consent_grants cg 
    WHERE cg.patient_id = public.documents.patient_id AND cg.grantee_id = auth.uid() 
    AND cg.status = 'APPROVED' AND (cg.expires_at IS NULL OR cg.expires_at > NOW())
  )
);
DROP POLICY IF EXISTS "Owner insert documents" ON public.documents;
CREATE POLICY "Owner insert documents" ON public.documents FOR INSERT WITH CHECK (
  patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()) OR uploader_id = auth.uid()
);

COMMIT;
