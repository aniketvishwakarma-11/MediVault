-- MediVault — Doctor AI Copilot Schema (Migration 009)
-- Creates tables for doctor-scoped chat sessions, clinical alerts, and AI brief caching.

BEGIN;

-- ─── Doctor Copilot Chat Sessions ───────────────────────────────────────────
-- Separate from patient chat_sessions — scoped to (doctor_id, patient_id) pair.
CREATE TABLE IF NOT EXISTS public.doctor_copilot_sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id     UUID NOT NULL,         -- references doctors or users table (doctor user)
  patient_id    UUID NOT NULL,         -- patient being consulted about
  title         VARCHAR(255) NOT NULL DEFAULT 'Clinical Consultation',
  mode          VARCHAR(50)  NOT NULL DEFAULT 'clinical',
  is_archived   BOOLEAN      NOT NULL DEFAULT FALSE,
  message_count INT          NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dcs_doctor_patient
  ON public.doctor_copilot_sessions (doctor_id, patient_id);

CREATE INDEX IF NOT EXISTS idx_dcs_updated
  ON public.doctor_copilot_sessions (updated_at DESC);

-- ─── Doctor Copilot Messages ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.doctor_copilot_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  UUID         NOT NULL REFERENCES public.doctor_copilot_sessions(id) ON DELETE CASCADE,
  role        VARCHAR(20)  NOT NULL CHECK (role IN ('doctor', 'assistant', 'system')),
  content     TEXT         NOT NULL,
  sources     JSONB        NOT NULL DEFAULT '[]',
  tools_used  JSONB        NOT NULL DEFAULT '[]',   -- clinical tools invoked for this message
  metadata    JSONB        NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dcm_session
  ON public.doctor_copilot_messages (session_id, created_at ASC);

-- ─── AI Patient Briefs (Cached) ───────────────────────────────────────────────
-- Pre-generated clinical brief shown when doctor opens a patient.
CREATE TABLE IF NOT EXISTS public.doctor_patient_briefs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id    UUID        NOT NULL,
  patient_id   UUID        NOT NULL,
  brief_json   JSONB       NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ,
  UNIQUE (doctor_id, patient_id)
);

CREATE INDEX IF NOT EXISTS idx_dpb_doctor_patient
  ON public.doctor_patient_briefs (doctor_id, patient_id);

-- ─── AI Clinical Alerts ───────────────────────────────────────────────────────
-- Proactive, non-blocking clinical alerts surfaced by the AI for a patient.
CREATE TABLE IF NOT EXISTS public.ai_clinical_alerts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id     UUID        NOT NULL,
  patient_id    UUID        NOT NULL,
  alert_type    VARCHAR(100) NOT NULL,  -- 'drug_interaction' | 'overdue_test' | 'trend_alert' | 'guideline'
  severity      VARCHAR(20)  NOT NULL DEFAULT 'info',  -- 'info' | 'warning' | 'critical'
  title         TEXT         NOT NULL,
  body          TEXT         NOT NULL,
  is_dismissed  BOOLEAN      NOT NULL DEFAULT FALSE,
  dismissed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aca_doctor_patient
  ON public.ai_clinical_alerts (doctor_id, patient_id, is_dismissed);

-- ─── AI Tool Audit Log ────────────────────────────────────────────────────────
-- Every clinical tool invocation is audited for compliance.
CREATE TABLE IF NOT EXISTS public.ai_tool_audit_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id       UUID         NOT NULL,
  patient_id      UUID         NOT NULL,
  tool_name       VARCHAR(100) NOT NULL,
  input_params    JSONB        NOT NULL DEFAULT '{}',
  output_summary  TEXT,
  execution_ms    INT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_atal_doctor_patient
  ON public.ai_tool_audit_log (doctor_id, patient_id, created_at DESC);

COMMIT;
