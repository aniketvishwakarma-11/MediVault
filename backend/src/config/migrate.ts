import { query } from './db';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export async function runAutoMigrations(): Promise<void> {
  try {
    logger.info('[Database Migration] Checking and initializing database schema tables...');

    // 1. Check & Create uuid-ossp extension
    await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // 2. Document AI Analysis Table
    await query(`
      CREATE TABLE IF NOT EXISTS public.document_ai_analysis (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
          patient_id UUID,
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
    `);

    // 3. Laboratory Results Table
    await query(`
      CREATE TABLE IF NOT EXISTS public.lab_results (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
          patient_id UUID,
          test_name VARCHAR(255) NOT NULL,
          value VARCHAR(100) NOT NULL,
          unit VARCHAR(50),
          reference_range VARCHAR(100),
          reference_min NUMERIC,
          reference_max NUMERIC,
          status VARCHAR(20),
          clinical_meaning TEXT,
          confidence NUMERIC(4,3),
          visit_date DATE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Medications Table
    await query(`
      CREATE TABLE IF NOT EXISTS public.medications (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
          patient_id UUID,
          name VARCHAR(255) NOT NULL,
          dosage VARCHAR(100),
          frequency VARCHAR(100),
          duration VARCHAR(100),
          purpose TEXT,
          instructions TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Diagnoses Table
    await query(`
      CREATE TABLE IF NOT EXISTS public.diagnoses (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
          patient_id UUID,
          diagnosis_name VARCHAR(255) NOT NULL,
          category VARCHAR(100),
          confidence NUMERIC(4,3),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Medical Entities Table
    await query(`
      CREATE TABLE IF NOT EXISTS public.medical_entities (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
          patient_id UUID,
          entity_type VARCHAR(100) NOT NULL,
          entity_value TEXT NOT NULL,
          metadata_json JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Document Insights Table
    await query(`
      CREATE TABLE IF NOT EXISTS public.document_insights (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
          patient_id UUID,
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
    `);

    // 8. AI Execution Logs Table
    await query(`
      CREATE TABLE IF NOT EXISTS public.ai_execution_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
          provider_used VARCHAR(50) NOT NULL,
          execution_type VARCHAR(50) NOT NULL,
          processing_time_ms INTEGER NOT NULL,
          retries INTEGER DEFAULT 0,
          fallback_triggered BOOLEAN DEFAULT FALSE,
          prompt_tokens INTEGER,
          completion_tokens INTEGER,
          estimated_cost NUMERIC(8,6),
          confidence NUMERIC(4,3),
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. Clinical Events Table (V2 Longitudinal Timeline)
    await query(`
      DO $$ BEGIN
        CREATE TYPE clinical_event_type AS ENUM (
          'CONSULTATION','DIAGNOSIS','LAB_TEST','IMAGING','PRESCRIPTION',
          'MEDICATION_CHANGE','PROCEDURE','HOSPITALIZATION','DISCHARGE',
          'VACCINATION','FOLLOW_UP','SYMPTOM','OTHER'
        );
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await query(`
      DO $$ BEGIN
        CREATE TYPE clinical_event_severity AS ENUM ('NORMAL','MONITOR','CRITICAL');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await query(`
      DO $$ BEGIN
        CREATE TYPE clinical_event_status AS ENUM ('ACTIVE','IMPROVING','STABLE','RESOLVED','ONGOING','UNKNOWN');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await query(`
      DO $$ BEGIN
        CREATE TYPE clinical_episode_status AS ENUM ('ACTIVE','IMPROVING','STABLE','RESOLVED','ONGOING','UNKNOWN');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS public.clinical_events (
        id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        patient_id        UUID NOT NULL,
        document_id       UUID,
        analysis_id       UUID,
        event_type        clinical_event_type NOT NULL,
        event_date        DATE NOT NULL,
        title             VARCHAR(512) NOT NULL,
        summary           TEXT,
        severity          clinical_event_severity DEFAULT 'NORMAL',
        status            clinical_event_status DEFAULT 'UNKNOWN',
        doctor_name       VARCHAR(255),
        facility_name     VARCHAR(255),
        department        VARCHAR(255),
        structured_data   JSONB DEFAULT '{}'::jsonb,
        is_milestone      BOOLEAN DEFAULT FALSE,
        idempotency_key   VARCHAR(512) UNIQUE,
        created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_clinical_events_patient_date ON public.clinical_events(patient_id, event_date DESC);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_clinical_events_document ON public.clinical_events(document_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_clinical_events_patient_type ON public.clinical_events(patient_id, event_type);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_clinical_events_analysis ON public.clinical_events(analysis_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_clinical_events_structured_data ON public.clinical_events USING GIN (structured_data);`);

    // 10. Clinical Episodes Table
    await query(`
      CREATE TABLE IF NOT EXISTS public.clinical_episodes (
        id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        patient_id        UUID NOT NULL,
        title             VARCHAR(512) NOT NULL,
        description       TEXT,
        primary_condition VARCHAR(512),
        status            clinical_episode_status DEFAULT 'UNKNOWN',
        start_date        DATE,
        end_date          DATE,
        event_count       INT DEFAULT 0,
        document_count    INT DEFAULT 0,
        created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_clinical_episodes_patient_date ON public.clinical_episodes(patient_id, start_date DESC);`);

    // 11. Episode ↔ Event Junction Table
    await query(`
      CREATE TABLE IF NOT EXISTS public.clinical_episode_events (
        episode_id UUID NOT NULL,
        event_id   UUID NOT NULL,
        PRIMARY KEY (episode_id, event_id)
      );
    `);

    // 12. Emergency Medical Credential & Access System (Migration 007)
    try {

      await query(`
        DO $$ BEGIN
          CREATE TYPE emergency_credential_status AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED', 'SUSPENDED');
        EXCEPTION WHEN duplicate_object THEN null; END $$;
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS public.emergency_credentials (
          id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          patient_id   UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
          token_hash   VARCHAR(64) NOT NULL UNIQUE,
          version      INTEGER NOT NULL DEFAULT 1,
          status       emergency_credential_status NOT NULL DEFAULT 'ACTIVE',
          expires_at   TIMESTAMP WITH TIME ZONE,
          last_used_at TIMESTAMP WITH TIME ZONE,
          revoked_at   TIMESTAMP WITH TIME ZONE,
          revoked_by   UUID,
          created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS public.emergency_profiles (
          id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          patient_id              UUID NOT NULL UNIQUE REFERENCES public.patients(id) ON DELETE CASCADE,
          show_blood_group        BOOLEAN NOT NULL DEFAULT TRUE,
          show_allergies          BOOLEAN NOT NULL DEFAULT TRUE,
          show_medications        BOOLEAN NOT NULL DEFAULT TRUE,
          show_conditions         BOOLEAN NOT NULL DEFAULT TRUE,
          show_surgeries          BOOLEAN NOT NULL DEFAULT TRUE,
          show_emergency_contacts BOOLEAN NOT NULL DEFAULT TRUE,
          show_primary_physician  BOOLEAN NOT NULL DEFAULT FALSE,
          show_full_timeline      BOOLEAN NOT NULL DEFAULT FALSE,
          emergency_notes         TEXT,
          custom_alerts           JSONB NOT NULL DEFAULT '[]'::jsonb,
          emergency_contacts      JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS public.emergency_access_sessions (
          id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          credential_id  UUID REFERENCES public.emergency_credentials(id) ON DELETE SET NULL,
          patient_id     UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
          actor_id       UUID NOT NULL,
          actor_type     VARCHAR(50) NOT NULL DEFAULT 'DOCTOR',
          reason_code    VARCHAR(100) NOT NULL DEFAULT 'OTHER',
          reason_text    TEXT NOT NULL,
          scope          TEXT[] NOT NULL DEFAULT ARRAY['emergency.profile'],
          duration_hours NUMERIC(4,2) NOT NULL DEFAULT 4.00,
          issued_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          expires_at     TIMESTAMP WITH TIME ZONE NOT NULL,
          revoked_at     TIMESTAMP WITH TIME ZONE,
          revoked_by     UUID
        );
      `);

      await query(`
        ALTER TABLE public.emergency_access_sessions
          ADD COLUMN IF NOT EXISTS access_level VARCHAR(50) DEFAULT 'DOCTOR',
          ADD COLUMN IF NOT EXISTS session_token_hash VARCHAR(64);
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS public.emergency_access_logs (
          id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          patient_id         UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
          session_id         UUID REFERENCES public.emergency_access_sessions(id) ON DELETE SET NULL,
          actor_id           UUID,
          actor_type         VARCHAR(50) DEFAULT 'PUBLIC',
          action             VARCHAR(100) NOT NULL DEFAULT 'EMERGENCY_PROFILE_VIEWED',
          resource           VARCHAR(255),
          access_reason      TEXT,
          scope              TEXT[],
          ip_hash            VARCHAR(64),
          device_hash        VARCHAR(64),
          blockchain_tx_hash VARCHAR(100),
          metadata           JSONB DEFAULT '{}'::jsonb,
          expires_at         TIMESTAMP WITH TIME ZONE,
          created_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const emergencyMigrationPath = path.join(__dirname, '../migrations/007_emergency_system.sql');
      if (fs.existsSync(emergencyMigrationPath)) {
        const emergencySQL = fs.readFileSync(emergencyMigrationPath, 'utf8');
        await query(emergencySQL);
        logger.info('[Database Migration] Emergency system schema (007) applied successfully.');
      }

      await query(`
        CREATE OR REPLACE FUNCTION public.handle_new_user_v2()
        RETURNS TRIGGER
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $$
        DECLARE
          u_role text;
          safe_role user_role;
          u_name text;
        BEGIN
          -- Extract role
          u_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'patient'));
          IF u_role = 'doctor' THEN
            safe_role := 'doctor'::user_role;
          ELSIF u_role = 'hospital' THEN
            safe_role := 'hospital'::user_role;
          ELSIF u_role = 'admin' THEN
            safe_role := 'admin'::user_role;
          ELSE
            safe_role := 'patient'::user_role;
          END IF;

          -- Extract full name from Google metadata (full_name or name or email)
          u_name := COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            NEW.email,
            'MediVault User'
          );

          -- 1. Insert into users_profile
          BEGIN
            INSERT INTO public.users_profile (id, email, full_name, role)
            VALUES (NEW.id, NEW.email, u_name, safe_role)
            ON CONFLICT (id) DO UPDATE SET
              email = EXCLUDED.email,
              full_name = EXCLUDED.full_name;
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END;

          -- 2. Insert into role table
          BEGIN
            IF safe_role = 'doctor' THEN
              INSERT INTO public.doctors (user_id, specialization, hospital_affiliation, verification_status) 
              VALUES (NEW.id, 'General Physician', 'MediVault EMR', 'VERIFIED')
              ON CONFLICT (user_id) DO NOTHING;
            ELSIF safe_role = 'hospital' THEN
              INSERT INTO public.hospitals (user_id, hospital_name, registration_number) 
              VALUES (NEW.id, u_name, 'HOSP-' || SUBSTRING(NEW.id::text, 1, 8))
              ON CONFLICT (user_id) DO NOTHING;
            ELSE
              INSERT INTO public.patients (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
            END IF;
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END;

          RETURN NEW;
        EXCEPTION WHEN OTHERS THEN
          RETURN NEW;
        END;
        $$;

        GRANT ALL ON TABLE public.users_profile TO postgres, anon, authenticated, service_role;
        GRANT ALL ON TABLE public.patients TO postgres, anon, authenticated, service_role;
        GRANT ALL ON TABLE public.doctors TO postgres, anon, authenticated, service_role;
        GRANT ALL ON TABLE public.hospitals TO postgres, anon, authenticated, service_role;

        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        DROP TRIGGER IF EXISTS on_auth_user_created_v2 ON auth.users;
        DROP TRIGGER IF EXISTS handle_new_user ON auth.users;

        CREATE TRIGGER on_auth_user_created_v2
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_v2();
      `);
    } catch (emergencyErr: any) {
      logger.warn('[Database Migration] Emergency system migration notice:', emergencyErr.message || emergencyErr);
    }

    // 13. Consent System Normalization (Migration 008)
    try {
      const consentMigrationPath = path.join(__dirname, '../migrations/008_consent_system.sql');
      if (fs.existsSync(consentMigrationPath)) {
        const consentSQL = fs.readFileSync(consentMigrationPath, 'utf8');
        await query(consentSQL);
        logger.info('[Database Migration] Consent system schema (008) applied successfully.');
      } else {
        logger.warn('[Database Migration] Migration 008_consent_system.sql not found, running inline consent setup...');
        // Inline fallback: ensure consent_grants table exists with required columns
        await query(`
          CREATE TABLE IF NOT EXISTS public.consent_grants (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            patient_id UUID NOT NULL,
            grantee_id UUID NOT NULL,
            grantee_role VARCHAR(20) NOT NULL DEFAULT 'doctor',
            status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
            purpose TEXT,
            scope VARCHAR(100) DEFAULT 'Full Vault',
            doctor_name VARCHAR(255),
            consent_hash VARCHAR(64),
            blockchain_tx_hash VARCHAR(128),
            expires_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);
        await query(`
          ALTER TABLE public.consent_grants
            ADD COLUMN IF NOT EXISTS purpose TEXT,
            ADD COLUMN IF NOT EXISTS scope VARCHAR(100) DEFAULT 'Full Vault',
            ADD COLUMN IF NOT EXISTS doctor_name VARCHAR(255),
            ADD COLUMN IF NOT EXISTS consent_hash VARCHAR(64),
            ADD COLUMN IF NOT EXISTS blockchain_tx_hash VARCHAR(128),
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        `);
        await query(`ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;`);
        await query(`CREATE INDEX IF NOT EXISTS idx_consent_grants_patient ON public.consent_grants(patient_id);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_consent_grants_grantee ON public.consent_grants(grantee_id);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_consent_grants_patient_grantee_status ON public.consent_grants(patient_id, grantee_id, status);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_consent_grants_approved ON public.consent_grants(patient_id, grantee_id) WHERE status = 'APPROVED';`);
        // Ensure consent_requests exists for backward compat
        await query(`
          CREATE TABLE IF NOT EXISTS public.consent_requests (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            patient_id UUID,
            requested_by UUID,
            doctor_name VARCHAR(255),
            purpose TEXT,
            scope VARCHAR(100) DEFAULT 'Full Vault',
            status VARCHAR(20) DEFAULT 'PENDING',
            expires_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);
        logger.info('[Database Migration] Inline consent system tables initialized successfully.');
      }
    } catch (consentErr: any) {
      logger.warn('[Database Migration] Consent system migration notice:', consentErr.message || consentErr);
    }

    logger.info('[Database Migration] All database tables initialized successfully.');

    // 9. AI Copilot Chat Tables
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS public.chat_sessions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          patient_id UUID NOT NULL,
          title VARCHAR(255) DEFAULT 'New Conversation',
          mode VARCHAR(20) DEFAULT 'general',
          context_document_id UUID,
          is_archived BOOLEAN DEFAULT FALSE,
          message_count INT DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS public.chat_messages (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
          role VARCHAR(10) NOT NULL,
          content TEXT NOT NULL,
          sources JSONB DEFAULT '[]',
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await query(`CREATE INDEX IF NOT EXISTS idx_chat_sessions_patient ON public.chat_sessions(patient_id, updated_at DESC);`);
      await query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages(session_id, created_at ASC);`);
      logger.info('[Database Migration] AI Copilot chat tables (chat_sessions, chat_messages) initialized successfully.');
    } catch (chatErr: any) {
      logger.warn('[Database Migration] AI Copilot chat tables migration notice:', chatErr.message || chatErr);
    }

    // ─── Doctor AI Copilot Tables ────────────────────────────────────────────
    try {
      await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

      await query(`
        CREATE TABLE IF NOT EXISTS public.doctor_copilot_sessions (
          id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          doctor_id     UUID NOT NULL,
          patient_id    UUID NOT NULL,
          title         VARCHAR(255) NOT NULL DEFAULT 'Clinical Consultation',
          mode          VARCHAR(50)  NOT NULL DEFAULT 'clinical',
          is_archived   BOOLEAN      NOT NULL DEFAULT FALSE,
          message_count INT          NOT NULL DEFAULT 0,
          created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        );
      `);
      await query(`CREATE INDEX IF NOT EXISTS idx_dcs_doctor_patient ON public.doctor_copilot_sessions (doctor_id, patient_id);`);

      await query(`
        CREATE TABLE IF NOT EXISTS public.doctor_copilot_messages (
          id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          session_id  UUID         NOT NULL REFERENCES public.doctor_copilot_sessions(id) ON DELETE CASCADE,
          role        VARCHAR(20)  NOT NULL,
          content     TEXT         NOT NULL,
          sources     JSONB        NOT NULL DEFAULT '[]',
          tools_used  JSONB        NOT NULL DEFAULT '[]',
          metadata    JSONB        NOT NULL DEFAULT '{}',
          created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        );
      `);
      await query(`CREATE INDEX IF NOT EXISTS idx_dcm_session ON public.doctor_copilot_messages (session_id, created_at ASC);`);

      await query(`
        CREATE TABLE IF NOT EXISTS public.doctor_patient_briefs (
          id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          doctor_id    UUID        NOT NULL,
          patient_id   UUID        NOT NULL,
          brief_json   JSONB       NOT NULL,
          generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          expires_at   TIMESTAMPTZ,
          UNIQUE (doctor_id, patient_id)
        );
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS public.ai_clinical_alerts (
          id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          doctor_id     UUID        NOT NULL,
          patient_id    UUID        NOT NULL,
          alert_type    VARCHAR(100) NOT NULL,
          severity      VARCHAR(20)  NOT NULL DEFAULT 'info',
          title         TEXT         NOT NULL,
          body          TEXT         NOT NULL,
          is_dismissed  BOOLEAN      NOT NULL DEFAULT FALSE,
          dismissed_at  TIMESTAMPTZ,
          created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        );
      `);
      await query(`CREATE INDEX IF NOT EXISTS idx_aca_doctor_patient ON public.ai_clinical_alerts (doctor_id, patient_id, is_dismissed);`);

      await query(`
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
      `);

      logger.info('[Database Migration] Doctor AI Copilot tables initialized successfully.');
    } catch (doctorCopilotErr: any) {
      logger.warn('[Database Migration] Doctor AI Copilot tables migration notice:', doctorCopilotErr.message || doctorCopilotErr);
    }

  } catch (error: any) {
    logger.warn('[Database Migration Notice] Auto-migration execution note:', error.message || error);
  }
}
