-- MediVault V2 — Migration 008: Consent System Normalization
-- Canonical consent table: public.consent_grants
-- Fully additive / idempotent — safe to run multiple times.

-- 1. Ensure consent_grants table exists with all required columns
CREATE TABLE IF NOT EXISTS public.consent_grants (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id         UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    grantee_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    grantee_role       VARCHAR(20) NOT NULL DEFAULT 'doctor',
    status             VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    purpose            TEXT,
    scope              VARCHAR(100) DEFAULT 'Full Vault',
    doctor_name        VARCHAR(255),
    consent_hash       VARCHAR(64),
    blockchain_tx_hash VARCHAR(128),
    expires_at         TIMESTAMP WITH TIME ZONE,
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add missing columns to consent_grants if they were created without them
ALTER TABLE public.consent_grants
    ADD COLUMN IF NOT EXISTS purpose TEXT,
    ADD COLUMN IF NOT EXISTS scope VARCHAR(100) DEFAULT 'Full Vault',
    ADD COLUMN IF NOT EXISTS doctor_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS consent_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS blockchain_tx_hash VARCHAR(128),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 3. Add status constraint (non-destructive)
DO $$ BEGIN
    ALTER TABLE public.consent_grants
        ADD CONSTRAINT consent_grants_status_check
        CHECK (status IN ('PENDING', 'APPROVED', 'DENIED', 'REVOKED', 'EXPIRED'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 4. Performance indexes
CREATE INDEX IF NOT EXISTS idx_consent_grants_patient
    ON public.consent_grants(patient_id);

CREATE INDEX IF NOT EXISTS idx_consent_grants_grantee
    ON public.consent_grants(grantee_id);

CREATE INDEX IF NOT EXISTS idx_consent_grants_patient_grantee_status
    ON public.consent_grants(patient_id, grantee_id, status);

CREATE INDEX IF NOT EXISTS idx_consent_grants_approved
    ON public.consent_grants(patient_id, grantee_id)
    WHERE status = 'APPROVED';

CREATE INDEX IF NOT EXISTS idx_consent_grants_pending
    ON public.consent_grants(patient_id)
    WHERE status = 'PENDING';

-- 5. Extend audit_logs with metadata column
ALTER TABLE public.audit_logs
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action
    ON public.audit_logs(user_id, action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
    ON public.audit_logs(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created
    ON public.audit_logs(created_at DESC);

-- 6. Ensure consent_requests table exists for backward compatibility
--    (patient consent page historically wrote here via Supabase client)
CREATE TABLE IF NOT EXISTS public.consent_requests (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id    UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    requested_by  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    doctor_name   VARCHAR(255),
    hospital_name VARCHAR(255),
    specialty     VARCHAR(150),
    purpose       TEXT,
    scope         VARCHAR(100) DEFAULT 'Full Vault',
    status        VARCHAR(20) DEFAULT 'PENDING',
    expires_at    TIMESTAMP WITH TIME ZONE,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consent_requests_patient
    ON public.consent_requests(patient_id);

CREATE INDEX IF NOT EXISTS idx_consent_requests_requester
    ON public.consent_requests(requested_by);

-- 7. RLS for consent_grants (backend service role bypasses RLS)
ALTER TABLE public.consent_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patient or grantee read consent_grants" ON public.consent_grants;
CREATE POLICY "Patient or grantee read consent_grants" ON public.consent_grants
    FOR SELECT USING (
        patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
        OR grantee_id = auth.uid()
    );

DROP POLICY IF EXISTS "Grantee insert consent_grants" ON public.consent_grants;
CREATE POLICY "Grantee insert consent_grants" ON public.consent_grants
    FOR INSERT WITH CHECK (grantee_id = auth.uid());

DROP POLICY IF EXISTS "Patient update consent_grants" ON public.consent_grants;
CREATE POLICY "Patient update consent_grants" ON public.consent_grants
    FOR UPDATE USING (
        patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
        OR grantee_id = auth.uid()
    );

-- 8. RLS for consent_requests (backward compat)
ALTER TABLE public.consent_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patient or requester read consent_requests" ON public.consent_requests;
CREATE POLICY "Patient or requester read consent_requests" ON public.consent_requests
    FOR SELECT USING (
        patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
        OR requested_by = auth.uid()
    );

DROP POLICY IF EXISTS "Authenticated insert consent_requests" ON public.consent_requests;
CREATE POLICY "Authenticated insert consent_requests" ON public.consent_requests
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Patient or requester update consent_requests" ON public.consent_requests;
CREATE POLICY "Patient or requester update consent_requests" ON public.consent_requests
    FOR UPDATE USING (
        patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
        OR requested_by = auth.uid()
    );

-- 9. RLS for audit_logs (users see only own logs)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Self read audit_logs" ON public.audit_logs;
CREATE POLICY "Self read audit_logs" ON public.audit_logs
    FOR SELECT USING (user_id = auth.uid());
