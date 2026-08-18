-- Migration: 010_prescription_ecosystem.sql
-- Description: Complete Prescription Ecosystem: Drug Catalog (RxNorm/WHO/IP), Prescriptions, Adherence, Refills, Dispensing

-- 1. Integrated Drug Catalog Table (RxNorm + WHO EML + Indian Pharmacopoeia / NLEM)
CREATE TABLE IF NOT EXISTS public.drug_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rxcui VARCHAR(20),                     -- RxNorm Concept ID (e.g. '860975')
    atc_code VARCHAR(20),                  -- WHO ATC Classification (e.g. 'A10BA02')
    is_who_essential BOOLEAN DEFAULT TRUE, -- WHO Essential Medicines List (EML)
    brand_name VARCHAR(255),               -- Commercial Brands (e.g. 'Glycomet', 'Dolo 650', 'Augmentin')
    generic_name VARCHAR(255) NOT NULL,    -- Official Generic Name (e.g. 'Metformin Hydrochloride')
    therapeutic_class VARCHAR(100),        -- e.g. 'Biguanide Antidiabetic', 'Analgesic', 'Antibiotic'
    is_nlem BOOLEAN DEFAULT TRUE,          -- Indian National List of Essential Medicines
    dosage_form VARCHAR(50) NOT NULL,      -- 'Tablet', 'Capsule', 'Syrup', 'Injection', 'Inhaler', 'Ointment'
    strength VARCHAR(50) NOT NULL,         -- '500 mg', '650 mg', '625 mg', '10 mg', '40 mg'
    route VARCHAR(50) DEFAULT 'Oral',      -- 'Oral', 'Intravenous', 'Inhalation', 'Topical'
    default_schedule VARCHAR(20) DEFAULT '1-0-1', -- '1-0-1', '1-0-0', '0-0-1', '1-1-1'
    food_instructions VARCHAR(150) DEFAULT 'Take after meals',
    allergy_classes TEXT[] DEFAULT '{}',   -- e.g. ARRAY['Penicillin', 'Sulfa']
    jan_aushadhi_price NUMERIC(10, 2),     -- PM Jan Aushadhi Generic Price in INR (₹)
    market_brand_price NUMERIC(10, 2),     -- Average Market Brand Price in INR (₹)
    contraindications TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for instant drug search autocomplete
CREATE INDEX IF NOT EXISTS idx_drug_catalog_generic ON public.drug_catalog(generic_name);
CREATE INDEX IF NOT EXISTS idx_drug_catalog_brand ON public.drug_catalog(brand_name);

-- 2. Enhanced Prescriptions Master Table
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID REFERENCES public.doctor_consultations(id) ON DELETE SET NULL,
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    diagnosis_code VARCHAR(50),            -- e.g. 'E11.9' (ICD-10 for Type 2 Diabetes)
    diagnosis_text TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PARTIALLY_DISPENSED', 'FULLY_DISPENSED', 'EXPIRED', 'CANCELLED', 'RENEWED')),
    notes TEXT,
    recommended_tests TEXT[] DEFAULT '{}',
    qr_code_hash VARCHAR(255) NOT NULL,
    digital_signature TEXT NOT NULL,
    blockchain_tx_hash VARCHAR(128),
    ai_explanation JSONB DEFAULT '{}'::jsonb,
    validity_days INTEGER DEFAULT 30,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure all columns exist even if prescriptions table already existed from earlier migrations
ALTER TABLE public.prescriptions
    ADD COLUMN IF NOT EXISTS consultation_id UUID,
    ADD COLUMN IF NOT EXISTS diagnosis_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS diagnosis_text TEXT,
    ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS recommended_tests TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS qr_code_hash VARCHAR(255),
    ADD COLUMN IF NOT EXISTS digital_signature TEXT,
    ADD COLUMN IF NOT EXISTS blockchain_tx_hash VARCHAR(128),
    ADD COLUMN IF NOT EXISTS ai_explanation JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS validity_days INTEGER DEFAULT 30,
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days');

ALTER TABLE public.prescriptions
    ALTER COLUMN medications_json DROP NOT NULL;

-- 3. Prescription Line Items (Structured Medication Regimen)
CREATE TABLE IF NOT EXISTS public.prescription_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    drug_catalog_id UUID REFERENCES public.drug_catalog(id) ON DELETE SET NULL,
    drug_name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    dosage_form VARCHAR(50) DEFAULT 'Tablet',
    strength VARCHAR(50) NOT NULL,
    schedule_code VARCHAR(20) NOT NULL DEFAULT '1-0-1', -- '1-0-0' (Morning), '1-0-1' (Morn/Night), '0-0-1' (Bedtime)
    food_instructions VARCHAR(150) DEFAULT 'Take after meals',
    duration_days INTEGER NOT NULL DEFAULT 30,
    quantity_to_dispense INTEGER NOT NULL DEFAULT 30,
    quantity_dispensed INTEGER DEFAULT 0,
    refills_allowed INTEGER DEFAULT 0,
    refills_used INTEGER DEFAULT 0,
    special_instructions TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Patient Medication Adherence Log
CREATE TABLE IF NOT EXISTS public.medication_adherence_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    prescription_item_id UUID REFERENCES public.prescription_items(id) ON DELETE CASCADE,
    dose_slot VARCHAR(20) NOT NULL CHECK (dose_slot IN ('MORNING', 'AFTERNOON', 'EVENING', 'BEDTIME')),
    scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
    scheduled_time TIME NOT NULL DEFAULT '08:00:00',
    taken_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'TAKEN' CHECK (status IN ('TAKEN', 'MISSED', 'SKIPPED', 'SNOOZED')),
    skip_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Unique constraint: only 1 log per patient + item + slot + date
CREATE UNIQUE INDEX IF NOT EXISTS idx_adherence_unique_slot 
ON public.medication_adherence_logs(patient_id, prescription_item_id, dose_slot, scheduled_date);

-- 5. Prescription Refill Requests
CREATE TABLE IF NOT EXISTS public.prescription_refill_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
    patient_notes TEXT,
    adherence_rate INTEGER DEFAULT 100, -- Snapshot of patient adherence at request time
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    doctor_response_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 6. Pharmacy Dispensations Table
CREATE TABLE IF NOT EXISTS public.pharmacy_dispensations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    pharmacy_name VARCHAR(255) NOT NULL,
    pharmacist_name VARCHAR(255),
    pharmacist_license VARCHAR(100),
    items_dispensed JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_full_dispensation BOOLEAN DEFAULT TRUE,
    blockchain_receipt_hash VARCHAR(128),
    dispensed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for rapid retrieval
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON public.prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON public.prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON public.prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_prescription_items_rx ON public.prescription_items(prescription_id);
CREATE INDEX IF NOT EXISTS idx_adherence_patient_date ON public.medication_adherence_logs(patient_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_refills_doctor ON public.prescription_refill_requests(doctor_id, status);

-- Seed Essential Drug Catalog Data (RxNorm + WHO EML + Indian Pharmacopoeia / NLEM)
INSERT INTO public.drug_catalog 
(rxcui, atc_code, is_who_essential, brand_name, generic_name, therapeutic_class, is_nlem, dosage_form, strength, route, default_schedule, food_instructions, allergy_classes, jan_aushadhi_price, market_brand_price, contraindications)
VALUES
('860975', 'A10BA02', TRUE, 'Glycomet 500 / Glucophage', 'Metformin Hydrochloride', 'Biguanide Antidiabetic', TRUE, 'Tablet', '500 mg', 'Oral', '1-0-1', 'Take with or immediately after meals', '{}', 12.00, 48.00, ARRAY['Severe Renal Impairment (eGFR < 30)', 'Metabolic Acidosis']),
('860977', 'A10BA02', TRUE, 'Glycomet 1000 SR', 'Metformin Hydrochloride SR', 'Biguanide Antidiabetic', TRUE, 'Tablet (Sustained Release)', '1000 mg', 'Oral', '0-0-1', 'Take with evening meal', '{}', 18.00, 65.00, ARRAY['Severe Renal Impairment (eGFR < 30)']),
('617314', 'C10AA05', TRUE, 'Atorva 10 / Lipitor', 'Atorvastatin Calcium', 'HMG-CoA Reductase Inhibitor (Statin)', TRUE, 'Tablet', '10 mg', 'Oral', '0-0-1', 'Take at bedtime with water', '{}', 15.00, 88.00, ARRAY['Active Liver Disease', 'Pregnancy']),
('617318', 'C10AA05', TRUE, 'Atorva 20 / Storvas 20', 'Atorvastatin Calcium', 'HMG-CoA Reductase Inhibitor (Statin)', TRUE, 'Tablet', '20 mg', 'Oral', '0-0-1', 'Take at bedtime with water', '{}', 24.00, 140.00, ARRAY['Active Liver Disease', 'Pregnancy']),
('316672', 'C09CA07', TRUE, 'Telma 40 / Micardis', 'Telmisartan', 'Angiotensin II Receptor Blocker (ARB)', TRUE, 'Tablet', '40 mg', 'Oral', '1-0-0', 'Take in the morning with or without food', '{}', 14.00, 95.00, ARRAY['Pregnancy (2nd/3rd trimester)', 'Bilateral Renal Artery Stenosis']),
('316673', 'C09CA07', TRUE, 'Telma 80 / Tazloc 80', 'Telmisartan', 'Angiotensin II Receptor Blocker (ARB)', TRUE, 'Tablet', '80 mg', 'Oral', '1-0-0', 'Take in the morning with water', '{}', 22.00, 160.00, ARRAY['Pregnancy', 'Severe Hepatic Impairment']),
('313797', 'J01CR02', TRUE, 'Augmentin 625 Duo / Clavam 625', 'Amoxicillin + Clavulanic Acid', 'Beta-lactam Antibacterial', TRUE, 'Tablet', '625 mg', 'Oral', '1-0-1', 'Take at the start of a light meal', ARRAY['Penicillin', 'Beta-lactam'], 45.00, 185.00, ARRAY['History of Amoxicillin-associated jaundice']),
('7052', 'J01CA04', TRUE, 'Mox 500 / Novamox', 'Amoxicillin', 'Aminopenicillin Antibiotic', TRUE, 'Capsule', '500 mg', 'Oral', '1-1-1', 'Take every 8 hours with water', ARRAY['Penicillin', 'Beta-lactam'], 22.00, 75.00, ARRAY['Penicillin Hypersensitivity']),
('860975', 'N02BE01', TRUE, 'Dolo 650 / Crocin 650 / Calpol 650', 'Paracetamol', 'Analgesic & Antipyretic', TRUE, 'Tablet', '650 mg', 'Oral', '1-0-1 (PRN)', 'Take with water every 6-8 hours as needed (Max 4000mg/day)', '{}', 8.00, 34.00, ARRAY['Severe Hepatic Impairment']),
('284635', 'A02BC02', TRUE, 'Pan 40 / Pantocid 40', 'Pantoprazole Sodium', 'Proton Pump Inhibitor (PPI)', TRUE, 'Tablet (Enteric Coated)', '40 mg', 'Oral', '1-0-0', 'Take 30 minutes before morning breakfast', '{}', 18.00, 115.00, ARRAY['Hypersensitivity to substituted benzimidazoles']),
('284636', 'A02BC02', TRUE, 'Pan-D / Pantocid DSR', 'Pantoprazole + Domperidone SR', 'PPI + Prokinetic', FALSE, 'Capsule (Sustained Release)', '40 mg + 30 mg', 'Oral', '1-0-0', 'Take 30 minutes before breakfast on empty stomach', '{}', 28.00, 165.00, ARRAY['Prolonged QT Interval', 'GI Obstruction']),
('141962', 'J01FA10', TRUE, 'Azithral 500 / Azee 500', 'Azithromycin', 'Macrolide Antibiotic', TRUE, 'Tablet', '500 mg', 'Oral', '1-0-0', 'Take 1 hour before or 2 hours after meals for 3-5 days', ARRAY['Macrolides'], 42.00, 130.00, ARRAY['Cholestatic Jaundice', 'QT Prolongation']),
('5640', 'N02BA01', TRUE, 'Ecosprin 75 / Aspirin Low Dose', 'Aspirin (Acetylsalicylic Acid)', 'Antiplatelet / Salicylate', TRUE, 'Tablet (Gastro-resistant)', '75 mg', 'Oral', '0-1-0', 'Take with or immediately after lunch', ARRAY['Aspirin', 'NSAID'], 6.00, 18.00, ARRAY['Active Peptic Ulcer', 'Bleeding Disorders']),
('17767', 'C08CA01', TRUE, 'Amlong 5 / Norvasc', 'Amlodipine Besylate', 'Calcium Channel Blocker (Dihydropyridine)', TRUE, 'Tablet', '5 mg', 'Oral', '1-0-0', 'Take once daily morning or night', '{}', 9.00, 42.00, ARRAY['Severe Hypotension', 'Cardiogenic Shock']),
('17768', 'C08CA01', TRUE, 'Amlong 10', 'Amlodipine Besylate', 'Calcium Channel Blocker', TRUE, 'Tablet', '10 mg', 'Oral', '1-0-0', 'Take once daily with water', '{}', 15.00, 75.00, ARRAY['Severe Aortic Stenosis']),
('20352', 'R06AE07', TRUE, 'Cetzine 10 / Zyrtec', 'Cetirizine Hydrochloride', 'Second-Generation Antihistamine', TRUE, 'Tablet', '10 mg', 'Oral', '0-0-1', 'Take once daily at bedtime', '{}', 7.00, 38.00, ARRAY['End-stage Renal Disease']),
('7512', 'R06AE09', TRUE, 'Levocet 5 / Xyzal', 'Levocetirizine Dihydrochloride', 'Antihistamine', FALSE, 'Tablet', '5 mg', 'Oral', '0-0-1', 'Take once daily at night', '{}', 11.00, 55.00, ARRAY['Severe Renal Impairment (CrCl < 10)']),
('7513', 'R03DC03', FALSE, 'Montair-LC / Telekast-L', 'Montelukast + Levocetirizine', 'Leukotriene Receptor Antagonist + Antihistamine', FALSE, 'Tablet', '10 mg + 5 mg', 'Oral', '0-0-1', 'Take at bedtime with water', '{}', 35.00, 195.00, ARRAY['Neuropsychiatric events (caution)']),
('2551', 'J01MA02', TRUE, 'Ciplox 500 / Cipro', 'Ciprofloxacin', 'Fluoroquinolone Antibacterial', TRUE, 'Tablet', '500 mg', 'Oral', '1-0-1', 'Drink plenty of water; do not take with antacids or milk', ARRAY['Fluoroquinolone'], 28.00, 85.00, ARRAY['Myasthenia Gravis', 'Concurrent Tizanidine use']),
('312615', 'B03AA07', TRUE, 'Autrin / Fefol / Orofer-XT', 'Ferrous Ascorbate + Folic Acid', 'Hematinic (Iron Supplement)', TRUE, 'Tablet', '100 mg + 1.5 mg', 'Oral', '0-1-0', 'Take 1-2 hours after meals with Vitamin C / Citrus juice', '{}', 25.00, 155.00, ARRAY['Hemosiderosis', 'Hemochromatosis']),
('6809', 'A10BB09', TRUE, 'Glynase 5 / Daonil', 'Gliclazide', 'Sulfonylurea Antidiabetic', TRUE, 'Tablet', '80 mg', 'Oral', '1-0-0', 'Take with breakfast or first main meal', ARRAY['Sulfonylurea', 'Sulfa'], 18.00, 92.00, ARRAY['Type 1 Diabetes', 'Diabetic Ketoacidosis']),
('860980', 'A10BH01', TRUE, 'Januvia 100 / Istavel 100', 'Sitagliptin Phosphate', 'DPP-4 Inhibitor Antidiabetic', FALSE, 'Tablet', '100 mg', 'Oral', '1-0-0', 'Take with or without food once daily', '{}', 45.00, 290.00, ARRAY['History of Pancreatitis']),
('104377', 'A10BK01', FALSE, 'Forxiga 10 / Dapavel 10', 'Dapagliflozin', 'SGLT2 Inhibitor Antidiabetic', FALSE, 'Tablet', '10 mg', 'Oral', '1-0-0', 'Take in the morning with water', '{}', 38.00, 240.00, ARRAY['eGFR < 25', 'History of DKA']),
('7646', 'A02BC01', TRUE, 'Omez 20 / Prilosec', 'Omeprazole', 'Proton Pump Inhibitor', TRUE, 'Capsule', '20 mg', 'Oral', '1-0-0', 'Take 30 minutes before first meal of day', '{}', 14.00, 72.00, ARRAY['Hypersensitivity to PPIs'])
ON CONFLICT DO NOTHING;
