-- ============================================================================
-- Migration 013: WebAuthn Passkeys & Security Challenges Schema
-- Enables FIDO2 / WebAuthn passwordless biometric login across all devices.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_passkeys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter BIGINT NOT NULL DEFAULT 0,
    device_name TEXT NOT NULL DEFAULT 'Device Passkey',
    transports JSONB DEFAULT '[]'::jsonb,
    aaguid TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_user_passkeys_user_id ON public.user_passkeys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_passkeys_credential_id ON public.user_passkeys(credential_id);

CREATE TABLE IF NOT EXISTS public.webauthn_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge TEXT NOT NULL,
    user_id UUID,
    email TEXT,
    challenge_type VARCHAR(30) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_lookup ON public.webauthn_challenges(challenge, challenge_type);
