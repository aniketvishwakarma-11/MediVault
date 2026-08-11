import { query } from './db';
import { logger } from '../utils/logger';

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

    logger.info('[Database Migration] All database tables initialized successfully.');
  } catch (error: any) {
    logger.warn('[Database Migration Notice] Auto-migration execution note:', error.message || error);
  }
}
