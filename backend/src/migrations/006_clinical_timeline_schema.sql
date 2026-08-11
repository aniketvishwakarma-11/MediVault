-- MediVault V2 — Migration 006: Intelligent Longitudinal Clinical Timeline Schema
-- Adds clinical_events and clinical_episodes tables.
-- Fully additive — does NOT modify or drop existing tables.
-- Safe to run multiple times (idempotent).

BEGIN;

-- ─────────────────────────────────────────────────────────────────
-- 1. Enums
-- ─────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE clinical_event_type AS ENUM (
    'CONSULTATION',
    'DIAGNOSIS',
    'LAB_TEST',
    'IMAGING',
    'PRESCRIPTION',
    'MEDICATION_CHANGE',
    'PROCEDURE',
    'HOSPITALIZATION',
    'DISCHARGE',
    'VACCINATION',
    'FOLLOW_UP',
    'SYMPTOM',
    'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE clinical_event_severity AS ENUM (
    'NORMAL',
    'MONITOR',
    'CRITICAL'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE clinical_episode_status AS ENUM (
    'ACTIVE',
    'IMPROVING',
    'STABLE',
    'RESOLVED',
    'ONGOING',
    'UNKNOWN'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE clinical_event_status AS ENUM (
    'ACTIVE',
    'IMPROVING',
    'STABLE',
    'RESOLVED',
    'ONGOING',
    'UNKNOWN'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─────────────────────────────────────────────────────────────────
-- 2. clinical_events — Durable Clinical Facts
-- ─────────────────────────────────────────────────────────────────
-- Every clinical event must trace back to its source document.
-- structured_data holds event-type-specific JSONB payloads:
--   LAB_TEST     → { lab_results: [...] }
--   PRESCRIPTION → { medications: [...] }
--   IMAGING      → { imaging: { modality, body_region, findings, impression } }
--   DIAGNOSIS    → { diagnoses: [...], symptoms: [...] }
--   PROCEDURE    → { procedures: [...] }
--   VACCINATION  → { vaccinations: [...] }
--   etc.

CREATE TABLE IF NOT EXISTS public.clinical_events (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id        UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  document_id       UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  analysis_id       UUID REFERENCES public.ai_analyses(id) ON DELETE SET NULL,

  event_type        clinical_event_type NOT NULL,
  event_date        DATE NOT NULL,

  title             VARCHAR(512) NOT NULL,
  summary           TEXT,

  severity          clinical_event_severity DEFAULT 'NORMAL',
  status            clinical_event_status DEFAULT 'UNKNOWN',

  doctor_name       VARCHAR(255),
  facility_name     VARCHAR(255),
  department        VARCHAR(255),

  -- Event-type-specific structured payload
  structured_data   JSONB DEFAULT '{}'::jsonb,

  -- Clinically significant events shown with visual milestone treatment
  is_milestone      BOOLEAN DEFAULT FALSE,

  -- Duplicate prevention key: analysis_id + event_type + event_date + title hash
  -- Enforced at application layer; this unique index prevents DB-level duplicates.
  idempotency_key   VARCHAR(512) UNIQUE,

  created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────────
-- 3. clinical_episodes — Related Period of Care
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.clinical_episodes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id        UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,

  title             VARCHAR(512) NOT NULL,
  description       TEXT,
  primary_condition VARCHAR(512),

  status            clinical_episode_status DEFAULT 'UNKNOWN',

  start_date        DATE,
  end_date          DATE,

  -- Metadata about the episode
  event_count       INT DEFAULT 0,
  document_count    INT DEFAULT 0,

  created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Junction table: episode ↔ event (many-to-many)
CREATE TABLE IF NOT EXISTS public.clinical_episode_events (
  episode_id        UUID NOT NULL REFERENCES public.clinical_episodes(id) ON DELETE CASCADE,
  event_id          UUID NOT NULL REFERENCES public.clinical_events(id) ON DELETE CASCADE,
  PRIMARY KEY (episode_id, event_id)
);

-- ─────────────────────────────────────────────────────────────────
-- 4. Performance Indexes
-- ─────────────────────────────────────────────────────────────────

-- Primary timeline query: patient events ordered by date
CREATE INDEX IF NOT EXISTS idx_clinical_events_patient_date
  ON public.clinical_events(patient_id, event_date DESC);

-- Document provenance lookups
CREATE INDEX IF NOT EXISTS idx_clinical_events_document
  ON public.clinical_events(document_id);

-- Event type filtering
CREATE INDEX IF NOT EXISTS idx_clinical_events_patient_type
  ON public.clinical_events(patient_id, event_type);

-- Analysis provenance
CREATE INDEX IF NOT EXISTS idx_clinical_events_analysis
  ON public.clinical_events(analysis_id);

-- Episode date queries
CREATE INDEX IF NOT EXISTS idx_clinical_episodes_patient_date
  ON public.clinical_episodes(patient_id, start_date DESC);

-- JSONB GIN index for structured_data queries (lab test name lookups, etc.)
CREATE INDEX IF NOT EXISTS idx_clinical_events_structured_data
  ON public.clinical_events USING GIN (structured_data);

-- ─────────────────────────────────────────────────────────────────
-- 5. Updated_at auto-update trigger
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_clinical_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clinical_events_updated_at ON public.clinical_events;
CREATE TRIGGER trg_clinical_events_updated_at
  BEFORE UPDATE ON public.clinical_events
  FOR EACH ROW EXECUTE FUNCTION public.update_clinical_updated_at();

DROP TRIGGER IF EXISTS trg_clinical_episodes_updated_at ON public.clinical_episodes;
CREATE TRIGGER trg_clinical_episodes_updated_at
  BEFORE UPDATE ON public.clinical_episodes
  FOR EACH ROW EXECUTE FUNCTION public.update_clinical_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- 6. Row Level Security
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE public.clinical_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_episode_events ENABLE ROW LEVEL SECURITY;

-- clinical_events: patient owns it or has active consent grant
DROP POLICY IF EXISTS "Owner or consented read clinical_events" ON public.clinical_events;
CREATE POLICY "Owner or consented read clinical_events" ON public.clinical_events
  FOR SELECT USING (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.consent_grants cg
      WHERE cg.patient_id = public.clinical_events.patient_id
        AND cg.grantee_id = auth.uid()
        AND cg.status = 'APPROVED'
        AND (cg.expires_at IS NULL OR cg.expires_at > NOW())
    )
  );

DROP POLICY IF EXISTS "Owner or consented read clinical_episodes" ON public.clinical_episodes;
CREATE POLICY "Owner or consented read clinical_episodes" ON public.clinical_episodes
  FOR SELECT USING (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.consent_grants cg
      WHERE cg.patient_id = public.clinical_episodes.patient_id
        AND cg.grantee_id = auth.uid()
        AND cg.status = 'APPROVED'
        AND (cg.expires_at IS NULL OR cg.expires_at > NOW())
    )
  );

COMMIT;
