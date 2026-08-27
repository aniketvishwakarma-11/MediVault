// MediVault V2 — Extended Medical AI Types for Clinical Timeline
// Extends existing interfaces with fields required for longitudinal clinical intelligence.

export interface MedicationItem {
  name: string;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  purpose?: string | null;
  instructions?: string | null;
  route?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  /** 'active' | 'discontinued' | 'last_recorded' */
  status?: string | null;
}

export interface LabResultItem {
  test_name: string;
  value: string;
  unit?: string | null;
  reference_range?: string | null;
  status: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  clinical_meaning?: string | null;
  confidence?: number | null;
  /** ISO date of the individual test measurement */
  test_date?: string | null;
}

export interface ImagingItem {
  modality?: string | null;   // MRI | CT | X-Ray | Ultrasound | PET | etc.
  body_region?: string | null;
  findings?: string | null;
  impression?: string | null;
  date?: string | null;
}

export interface TimelineEventItem {
  title: string;
  date: string;
  description: string;
  importance: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface MedicalAIAnalysis {
  document: {
    document_type: string;
    suggested_title?: string | null;
    speciality?: string | null;
    category?: string | null;
    summary: string;
    language?: string | null;
    confidence: number;
  };
  hospital?: {
    name?: string | null;
    address?: string | null;
    department?: string | null;
    contact?: string | null;
  };
  doctor?: {
    name?: string | null;
    qualification?: string | null;
    specialization?: string | null;
    registration_number?: string | null;
  };
  patient?: {
    name?: string | null;
    age?: number | null;
    gender?: string | null;
    patient_id?: string | null;
    dob?: string | null;
  };
  visit?: {
    visit_date?: string | null;
    report_date?: string | null;
    admission_date?: string | null;
    discharge_date?: string | null;
    /** 'CONSULTATION' | 'EMERGENCY' | 'FOLLOW_UP' | 'INPATIENT' | 'DAY_CARE' etc. */
    encounter_type?: string | null;
  };
  diagnosis: string[];
  symptoms: string[];
  medical_history: string[];
  allergies: string[];
  medications: MedicationItem[];
  lab_results: LabResultItem[];
  imaging?: ImagingItem[];
  vitals?: {
    height?: string | number | null;
    weight?: string | number | null;
    bmi?: string | number | null;
    blood_pressure?: string | null;
    pulse?: string | null;
    temperature?: string | null;
    spo2?: string | null;
  };
  procedures: string[];
  surgeries: string[];
  vaccinations: string[];
  recommended_followup: string[];
  recommended_tests: string[];
  lifestyle_recommendations: string[];
  red_flags: string[];
  risk_factors: string[];
  overall_health_status: string;
  plain_language_explanation: string;
  timeline_events: TimelineEventItem[];
  analysis_timestamp?: string;
  ai_model?: string;
}
