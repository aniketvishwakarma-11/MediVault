-- MediVault V2 — Migration 007: Emergency Medical Credential & Access System
-- Implements: emergency_credentials, emergency_profiles, emergency_access_sessions
-- Extends:    emergency_access_logs with session/scope/actor columns
-- Fully additive — does NOT modify or drop existing tables.
-- Safe to run multiple times (idempotent).

-- ─────────────────────────────────────────────────────────────────
-- 1. Enums
-- ─────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE emergency_credential_status AS ENUM (
    'ACTIVE',
    'REVOKED',
    'EXPIRED',
    'SUSPENDED'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE emergency_access_level AS ENUM (
    'PUBLIC',
    'RESPONDER',
    'DOCTOR'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE emergency_actor_type AS ENUM (
    'PUBLIC',
    'DOCTOR',
    'HOSPITAL',
    'ADMIN'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE emergency_action AS ENUM (
    'QR_SCANNED',
    'CREDENTIAL_VALIDATED',
    'CREDENTIAL_INVALID',
    'CREDENTIAL_EXPIRED',
    'CREDENTIAL_REVOKED',
    'EMERGENCY_PROFILE_VIEWED',
    'DOCTOR_AUTHENTICATED',
    'BREAK_GLASS_INITIATED',
    'ACCESS_GRANTED',
    'ACCESS_DENIED',
    'DOCUMENT_VIEWED',
    'TIMELINE_VIEWED',
    'SESSION_REVOKED',
    'SESSION_EXPIRED',
    'SUSPICIOUS_ACTIVITY'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE break_glass_reason_code AS ENUM (
    'PATIENT_UNCONSCIOUS',
    'PATIENT_UNABLE_TO_CONSENT',
    'LIFE_THREATENING_EMERGENCY',
    'UNKNOWN_MEDICAL_HISTORY',
    'ALLERGY_VERIFICATION',
    'MEDICATION_VERIFICATION',
    'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─────────────────────────────────────────────────────────────────
-- 2. emergency_credentials
-- ─────────────────────────────────────────────────────────────────
-- Stores only the SHA-256 hash of the raw credential token.
-- The raw token is NEVER persisted — it only lives in the QR code.

CREATE TABLE IF NOT EXISTS public.emergency_credentials (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id    UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  token_hash    VARCHAR(64) NOT NULL,   -- SHA-256 hex of raw token
  version       INT NOT NULL DEFAULT 1,
  status        emergency_credential_status NOT NULL DEFAULT 'ACTIVE',

  -- Credential validity window (NULL = never expires)
  expires_at    TIMESTAMP WITH TIME ZONE,

  last_used_at  TIMESTAMP WITH TIME ZONE,
  revoked_at    TIMESTAMP WITH TIME ZONE,
  revoked_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Duplicate-prevention: one active credential per patient enforced at app layer
  UNIQUE (token_hash)
);

-- ─────────────────────────────────────────────────────────────────
-- 3. emergency_profiles
-- ─────────────────────────────────────────────────────────────────
-- Patient-curated visibility settings for their emergency profile.
-- Controls what is shown at Level 0 (public scan).

CREATE TABLE IF NOT EXISTS public.emergency_profiles (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id            UUID NOT NULL UNIQUE REFERENCES public.patients(id) ON DELETE CASCADE,

  -- Visibility toggles
  show_blood_group      BOOLEAN NOT NULL DEFAULT TRUE,
  show_allergies        BOOLEAN NOT NULL DEFAULT TRUE,
  show_medications      BOOLEAN NOT NULL DEFAULT TRUE,
  show_conditions       BOOLEAN NOT NULL DEFAULT TRUE,
  show_surgeries        BOOLEAN NOT NULL DEFAULT TRUE,
  show_emergency_contacts BOOLEAN NOT NULL DEFAULT TRUE,
  show_primary_physician  BOOLEAN NOT NULL DEFAULT FALSE,
  show_full_timeline    BOOLEAN NOT NULL DEFAULT FALSE,

  -- Patient-authored free-text fields shown on emergency card
  emergency_notes       TEXT,    -- e.g. "I am diabetic — always carry glucose tablets"
  custom_alerts         TEXT[],  -- e.g. ["Latex allergy", "Pacemaker present"]

  -- Emergency contacts (JSONB array of {name, relationship, phone, priority, enabled})
  emergency_contacts    JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────────
-- 4. emergency_access_sessions
-- ─────────────────────────────────────────────────────────────────
-- Created when an authenticated doctor requests break-glass access.
-- The session is the authorization unit — NOT the QR token itself.

CREATE TABLE IF NOT EXISTS public.emergency_access_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  credential_id   UUID NOT NULL REFERENCES public.emergency_credentials(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,

  actor_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_type      emergency_actor_type NOT NULL DEFAULT 'DOCTOR',

  access_level    emergency_access_level NOT NULL DEFAULT 'DOCTOR',

  -- Access scope granted for this session (array of scope strings)
  scope           TEXT[] NOT NULL DEFAULT '{"emergency.profile"}',

  -- Break-glass justification (required)
  reason_code     break_glass_reason_code NOT NULL,
  reason_text     TEXT NOT NULL,

  issued_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,

  revoked_at      TIMESTAMP WITH TIME ZONE,
  revoked_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Short-lived session JWT token hash (to validate session calls)
  session_token_hash VARCHAR(64),

  created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────────
-- 5. Extend emergency_access_logs with new columns
-- ─────────────────────────────────────────────────────────────────
-- The table already exists from migration 004.
-- We add columns needed for the new system.

ALTER TABLE public.emergency_access_logs
  ADD COLUMN IF NOT EXISTS session_id    UUID REFERENCES public.emergency_access_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS actor_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS actor_type    emergency_actor_type DEFAULT 'DOCTOR',
  ADD COLUMN IF NOT EXISTS action        emergency_action,
  ADD COLUMN IF NOT EXISTS resource      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS scope         TEXT[],
  ADD COLUMN IF NOT EXISTS ip_hash       VARCHAR(64),
  ADD COLUMN IF NOT EXISTS device_hash   VARCHAR(64),
  ADD COLUMN IF NOT EXISTS metadata      JSONB DEFAULT '{}'::jsonb;

-- ─────────────────────────────────────────────────────────────────
-- 6. Performance Indexes
-- ─────────────────────────────────────────────────────────────────

-- Credential lookups by hash (primary auth path — must be fast)
CREATE INDEX IF NOT EXISTS idx_emergency_cred_token_hash
  ON public.emergency_credentials(token_hash);

CREATE INDEX IF NOT EXISTS idx_emergency_cred_patient_status
  ON public.emergency_credentials(patient_id, status);

-- Session lookups
CREATE INDEX IF NOT EXISTS idx_emergency_sessions_credential
  ON public.emergency_access_sessions(credential_id);

CREATE INDEX IF NOT EXISTS idx_emergency_sessions_patient
  ON public.emergency_access_sessions(patient_id);

CREATE INDEX IF NOT EXISTS idx_emergency_sessions_actor
  ON public.emergency_access_sessions(actor_id);

CREATE INDEX IF NOT EXISTS idx_emergency_sessions_active
  ON public.emergency_access_sessions(patient_id, expires_at)
  WHERE revoked_at IS NULL;

-- Emergency profile one-per-patient
CREATE INDEX IF NOT EXISTS idx_emergency_profiles_patient
  ON public.emergency_profiles(patient_id);

-- Audit log queries (patient viewing their own history)
CREATE INDEX IF NOT EXISTS idx_emergency_logs_patient_created
  ON public.emergency_access_logs(patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_emergency_logs_session
  ON public.emergency_access_logs(session_id);

CREATE INDEX IF NOT EXISTS idx_emergency_logs_action
  ON public.emergency_access_logs(action);

-- ─────────────────────────────────────────────────────────────────
-- 7. Updated_at trigger for emergency_credentials
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_emergency_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_emergency_cred_updated_at ON public.emergency_credentials;
CREATE TRIGGER trg_emergency_cred_updated_at
  BEFORE UPDATE ON public.emergency_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_emergency_updated_at();

DROP TRIGGER IF EXISTS trg_emergency_profile_updated_at ON public.emergency_profiles;
CREATE TRIGGER trg_emergency_profile_updated_at
  BEFORE UPDATE ON public.emergency_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_emergency_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- 8. Row Level Security
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE public.emergency_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_access_sessions ENABLE ROW LEVEL SECURITY;

-- Credentials: patient owns it
DROP POLICY IF EXISTS "Patient owns emergency_credentials" ON public.emergency_credentials;
CREATE POLICY "Patient owns emergency_credentials" ON public.emergency_credentials
  FOR ALL USING (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
  );

-- Profiles: patient owns it
DROP POLICY IF EXISTS "Patient owns emergency_profiles" ON public.emergency_profiles;
CREATE POLICY "Patient owns emergency_profiles" ON public.emergency_profiles
  FOR ALL USING (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
  );

-- Sessions: actor who created it or the patient it belongs to
DROP POLICY IF EXISTS "Actor or patient read emergency_sessions" ON public.emergency_access_sessions;
CREATE POLICY "Actor or patient read emergency_sessions" ON public.emergency_access_sessions
  FOR SELECT USING (
    actor_id = auth.uid()
    OR patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
  );
