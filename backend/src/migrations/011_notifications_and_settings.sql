-- Migration: 011_notifications_and_settings.sql
-- Description: System Settings and Enterprise Notification Center tables

-- 1. System Settings Table (Key-Value JSONB store with default configuration presets)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial enterprise settings if not present
INSERT INTO public.system_settings (key, value)
VALUES 
  ('security', '{
    "session_timeout_minutes": 60,
    "require_2fa": false,
    "max_login_attempts": 5,
    "password_min_length": 8,
    "enforce_strong_passwords": true
  }'::jsonb),
  ('storage', '{
    "max_file_size_mb": 50,
    "retention_years": 7,
    "auto_archive_inactive": true,
    "allowed_mimes": ["application/pdf", "image/png", "image/jpeg", "image/webp"]
  }'::jsonb),
  ('ai_engine', '{
    "default_model": "gemini-1.5-flash",
    "confidence_threshold": 0.85,
    "max_tokens": 4096,
    "enable_rag": true,
    "temperature": 0.1
  }'::jsonb),
  ('maintenance', '{
    "enabled": false,
    "message": "MediVault is currently undergoing routine maintenance. All services will resume shortly.",
    "scheduled_end": null
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Ensure Notifications Table has all broadcast attributes
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_role VARCHAR(50) DEFAULT 'ALL',
    severity VARCHAR(30) DEFAULT 'INFO',
    type VARCHAR(50) NOT NULL DEFAULT 'SYSTEM_BROADCAST',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    delivery_channel VARCHAR(50) DEFAULT 'IN_APP',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure columns exist even if table was created in an earlier migration
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS target_role VARCHAR(50) DEFAULT 'ALL',
    ADD COLUMN IF NOT EXISTS severity VARCHAR(30) DEFAULT 'INFO',
    ADD COLUMN IF NOT EXISTS delivery_channel VARCHAR(50) DEFAULT 'IN_APP';

-- Broadcast notifications are platform/role-wide and don't target a single individual recipient
ALTER TABLE public.notifications ALTER COLUMN recipient_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON public.notifications(target_role);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);
