-- =================================================================
-- MediVault V2 Migration 014: Government ID (ABHA & DigiLocker)
-- =================================================================

-- 1. Extend public.patients with ABHA and Government Identity fields
ALTER TABLE public.patients 
  ADD COLUMN IF NOT EXISTS abha_number VARCHAR(25),
  ADD COLUMN IF NOT EXISTS abha_address VARCHAR(120),
  ADD COLUMN IF NOT EXISTS abha_status VARCHAR(30) DEFAULT 'NOT_LINKED',
  ADD COLUMN IF NOT EXISTS is_gov_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gov_id_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS gov_id_masked VARCHAR(50),
  ADD COLUMN IF NOT EXISTS kyc_details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS abha_card_url TEXT,
  ADD COLUMN IF NOT EXISTS digilocker_linked BOOLEAN DEFAULT FALSE;

-- 2. Create Government OTP & Challenge Sessions Table
CREATE TABLE IF NOT EXISTS public.government_id_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    transaction_id VARCHAR(120) NOT NULL UNIQUE,
    id_type VARCHAR(50) NOT NULL, -- 'AADHAAR_OTP', 'MOBILE_OTP', 'ABHA_LINK'
    id_input_masked VARCHAR(50),
    otp_code VARCHAR(20),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup and expiration cleanup
CREATE INDEX IF NOT EXISTS idx_gov_verifications_txn ON public.government_id_verifications(transaction_id);
CREATE INDEX IF NOT EXISTS idx_gov_verifications_user ON public.government_id_verifications(user_id);

-- 3. Create DigiLocker Imported Documents Table
CREATE TABLE IF NOT EXISTS public.digilocker_imported_docs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    doc_type VARCHAR(100) NOT NULL, -- 'PMJAY_CARD', 'COVID_VACCINE', 'HEALTH_INSURANCE', 'UDID'
    doc_name VARCHAR(255) NOT NULL,
    issuer VARCHAR(255) NOT NULL,
    uri VARCHAR(255),
    doc_data_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_digilocker_docs_user ON public.digilocker_imported_docs(user_id);

-- Grant privileges
GRANT ALL ON TABLE public.government_id_verifications TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.digilocker_imported_docs TO postgres, anon, authenticated, service_role;
