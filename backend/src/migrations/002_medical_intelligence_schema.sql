-- MediVault Medical Intelligence Database Migration Script
-- Creates normalized tables for structured AI analysis, lab results, medications, diagnoses, medical entities, insights, and timeline events.

-- 1. Document AI Analysis Table (Full JSONB & High-Level Metadata)
CREATE TABLE IF NOT EXISTS public.document_ai_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    document_type VARCHAR(100),
    specialty VARCHAR(150),
    category VARCHAR(100),
    summary TEXT,
    plain_language_explanation TEXT,
    overall_health_status VARCHAR(100),
    confidence NUMERIC(4,3),
    raw_ai_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Laboratory Results Table (Individual Parameter Persistence for Trend Analysis)
CREATE TABLE IF NOT EXISTS public.lab_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    test_name VARCHAR(255) NOT NULL,
    value VARCHAR(100) NOT NULL,
    unit VARCHAR(50),
    reference_range VARCHAR(100),
    reference_min NUMERIC,
    reference_max NUMERIC,
    status VARCHAR(20) CHECK (status IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL')),
    clinical_meaning TEXT,
    confidence NUMERIC(4,3),
    visit_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Medications Table (Extracted Prescriptions & Dosage Details)
CREATE TABLE IF NOT EXISTS public.medications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    duration VARCHAR(100),
    purpose TEXT,
    instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Diagnoses Table (Extracted Diagnosed Conditions)
CREATE TABLE IF NOT EXISTS public.diagnoses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    diagnosis_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    confidence NUMERIC(4,3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Medical Entities Table (Doctors, Hospitals, Symptoms, Procedures, Allergies, Vitals)
CREATE TABLE IF NOT EXISTS public.medical_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    entity_type VARCHAR(100) NOT NULL, -- 'HOSPITAL', 'DOCTOR', 'SYMPTOM', 'PROCEDURE', 'ALLERGY', 'VITAL'
    entity_value TEXT NOT NULL,
    metadata_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Document Insights Table (Red Flags, Risk Factors, Follow-ups, Tests)
CREATE TABLE IF NOT EXISTS public.document_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    summary TEXT,
    plain_language_explanation TEXT,
    overall_health_status VARCHAR(100),
    red_flags JSONB,
    risk_factors JSONB,
    recommended_followup JSONB,
    recommended_tests JSONB,
    lifestyle_recommendations JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Add Importance & Document Link to Timeline Events Table if not present
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timeline_events' AND column_name='importance') THEN
        ALTER TABLE public.timeline_events ADD COLUMN importance VARCHAR(20) DEFAULT 'MEDIUM' CHECK (importance IN ('LOW', 'MEDIUM', 'HIGH'));
    END IF;
END $$;

-- Enable Row Level Security on New Tables
ALTER TABLE public.document_ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_insights ENABLE ROW LEVEL SECURITY;

-- Permissive Security Policies
CREATE POLICY "Public read document_ai_analysis" ON public.document_ai_analysis FOR SELECT USING (true);
CREATE POLICY "Public read lab_results" ON public.lab_results FOR SELECT USING (true);
CREATE POLICY "Public read medications" ON public.medications FOR SELECT USING (true);
CREATE POLICY "Public read diagnoses" ON public.diagnoses FOR SELECT USING (true);
CREATE POLICY "Public read medical_entities" ON public.medical_entities FOR SELECT USING (true);
CREATE POLICY "Public read document_insights" ON public.document_insights FOR SELECT USING (true);
