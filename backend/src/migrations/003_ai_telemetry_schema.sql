-- MediVault AI Execution Telemetry Database Migration Script
-- Creates audit table to log AI provider execution, latencies, retries, failovers, tokens, and confidence.

CREATE TABLE IF NOT EXISTS public.ai_execution_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    provider_used VARCHAR(50) NOT NULL, -- 'gemini', 'nvidia', 'openai', 'ollama'
    execution_type VARCHAR(50) NOT NULL, -- 'DOCUMENT_PROCESSING', 'CHAT_COPILOT', 'EMBEDDINGS'
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

-- Index for analytics & monitoring
CREATE INDEX IF NOT EXISTS idx_ai_execution_logs_provider ON public.ai_execution_logs(provider_used);
CREATE INDEX IF NOT EXISTS idx_ai_execution_logs_document ON public.ai_execution_logs(document_id);

-- Enable RLS
ALTER TABLE public.ai_execution_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read ai_execution_logs" ON public.ai_execution_logs FOR SELECT USING (true);
