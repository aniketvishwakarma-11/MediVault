-- Migration: 004_doctor_ecosystem_schema.sql
-- Description: Complete Doctor Ecosystem Tables, Column Extensions & Policies

-- 1. Extend doctors table with registration and verification metadata
ALTER TABLE public.doctors 
  ADD COLUMN IF NOT EXISTS registration_council VARCHAR(255),
  ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hospital_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS clinic_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS government_id_url TEXT,
  ADD COLUMN IF NOT EXISTS license_doc_url TEXT,
  ADD COLUMN IF NOT EXISTS hospital_id_url TEXT,
  ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT ARRAY['English'],
  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED')),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS consultation_hours JSONB DEFAULT '{"mon_fri": "09:00 - 17:00", "sat": "09:00 - 13:00", "sun": "Closed"}'::jsonb;

-- 2. Doctor Consultations Table
CREATE TABLE IF NOT EXISTS public.doctor_consultations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    symptoms TEXT[] DEFAULT '{}',
    vitals JSONB DEFAULT '{}'::jsonb,
    observations TEXT,
    diagnosis TEXT NOT NULL,
    treatment_plan TEXT,
    advice TEXT,
    follow_up_date DATE,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Doctor Prescriptions Table
CREATE TABLE IF NOT EXISTS public.doctor_prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID REFERENCES public.doctor_consultations(id) ON DELETE SET NULL,
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    medicines JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommended_tests TEXT[] DEFAULT '{}',
    digital_signature TEXT,
    blockchain_tx_hash VARCHAR(128),
    ai_explanation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Emergency Access Logs Table
CREATE TABLE IF NOT EXISTS public.emergency_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    access_reason TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    blockchain_tx_hash VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. System Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast query resolution
CREATE INDEX IF NOT EXISTS idx_doctors_verification ON public.doctors(verification_status);
CREATE INDEX IF NOT EXISTS idx_consultations_patient ON public.doctor_consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor ON public.doctor_consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON public.doctor_prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_emergency_logs_patient ON public.emergency_access_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id);
