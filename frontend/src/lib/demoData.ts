export interface DemoDocumentRecord {
  id: string;
  patient_id: string;
  document_name: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  document_category: string;
  hospital_name: string;
  doctor_name: string;
  visit_date: string;
  checksum_sha256: string;
  created_at: string;
}

export interface DemoTimelineEvent {
  id: string;
  date: string;
  title: string;
  category: string;
  doctor: string;
  facility: string;
  description: string;
  document_id?: string;
  document_name?: string;
}

export interface DemoConsentGrant {
  id: string;
  doctor_name: string;
  facility: string;
  specialty: string;
  granted_at: string;
  expires_at: string;
  scope: "Full Vault" | "Emergency Only" | "Lab Reports Only";
  status: "Active" | "Expired";
}

export const DEMO_PATIENT_PROFILE = {
  full_name: "Demo Patient (Alex Morgan)",
  email: "patient@medivault.local",
  phone: "+1 (555) 234-5678",
  date_of_birth: "1994-06-20",
  gender: "Female",
  blood_group: "O+",
  emergency_contact: "+1 (555) 987-6543 (Spouse)",
  weight: "68",
  weight_unit: "kg",
  height: "172",
  height_unit: "cm",
  allergies: "Penicillin, Peanuts",
  chronic_conditions: "Mild Asthma",
};

export const DEMO_REPORTS: DemoDocumentRecord[] = [
  {
    id: "demo-doc-1",
    patient_id: "demo-patient-123",
    document_name: "Comprehensive Lipid & Cardiac Panel",
    original_filename: "Lipid_Panel_Report_Aug2026.pdf",
    mime_type: "application/pdf",
    file_size: 2457600, // 2.4 MB
    document_category: "Blood Report",
    hospital_name: "Metro General Health Center",
    doctor_name: "Dr. Sarah Jenkins",
    visit_date: "2026-08-01",
    checksum_sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    created_at: "2026-08-01T10:30:00Z",
  },
  {
    id: "demo-doc-2",
    patient_id: "demo-patient-123",
    document_name: "Chest Radiography (X-Ray) High-Res Scan",
    original_filename: "Chest_XRay_DigitalScan.png",
    mime_type: "image/png",
    file_size: 5242880, // 5 MB
    document_category: "X-Ray",
    hospital_name: "St. Jude Pulmonary Clinic",
    doctor_name: "Dr. Robert Vance",
    visit_date: "2026-07-15",
    checksum_sha256: "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284ddd200126d9069d",
    created_at: "2026-07-15T14:20:00Z",
  },
  {
    id: "demo-doc-3",
    patient_id: "demo-patient-123",
    document_name: "Annual Physical & Cardiology Follow-up",
    original_filename: "Cardiology_Consultation_Note.pdf",
    mime_type: "application/pdf",
    file_size: 1153433, // 1.1 MB
    document_category: "Prescription",
    hospital_name: "Metro General Health Center",
    doctor_name: "Dr. Sarah Jenkins",
    visit_date: "2026-06-10",
    checksum_sha256: "6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b",
    created_at: "2026-06-10T09:15:00Z",
  },
  {
    id: "demo-doc-4",
    patient_id: "demo-patient-123",
    document_name: "Routine Immunization & Vaccine Certificate",
    original_filename: "Vaccine_Record_2026.pdf",
    mime_type: "application/pdf",
    file_size: 819200, // 800 KB
    document_category: "Vaccination",
    hospital_name: "City Public Health Clinic",
    doctor_name: "Dr. Elena Rostova",
    visit_date: "2026-04-05",
    checksum_sha256: "d41d8cd98f00b204e9800998ecf8427e",
    created_at: "2026-04-05T11:00:00Z",
  },
];

export const DEMO_TIMELINE: DemoTimelineEvent[] = [
  {
    id: "demo-evt-1",
    date: "2026-08-01",
    title: "Lipid Panel & Cardiac Biomarker Screening",
    category: "Blood Report",
    doctor: "Dr. Sarah Jenkins",
    facility: "Metro General Health Center",
    description: "Routine follow-up blood work. HDL cholesterol optimal at 58 mg/dL, Triglycerides 110 mg/dL. All parameters within target range.",
    document_id: "demo-doc-1",
    document_name: "Lipid_Panel_Report_Aug2026.pdf",
  },
  {
    id: "demo-evt-2",
    date: "2026-07-15",
    title: "Chest X-Ray Imaging Follow-Up",
    category: "X-Ray",
    doctor: "Dr. Robert Vance",
    facility: "St. Jude Pulmonary Clinic",
    description: "Digital chest radiography performed following mild respiratory symptoms. Clear lungs, no active infiltrates or effusion observed.",
    document_id: "demo-doc-2",
    document_name: "Chest_XRay_DigitalScan.png",
  },
  {
    id: "demo-evt-3",
    date: "2026-06-10",
    title: "Annual Cardiology & Wellness Consult",
    category: "Prescription",
    doctor: "Dr. Sarah Jenkins",
    facility: "Metro General Health Center",
    description: "Routine annual physical exam. Blood pressure 118/76 mmHg. Renewed mild asthma maintenance inhaler prescription.",
    document_id: "demo-doc-3",
    document_name: "Cardiology_Consultation_Note.pdf",
  },
  {
    id: "demo-evt-4",
    date: "2026-04-05",
    title: "Seasonal Booster Vaccination",
    category: "Vaccination",
    doctor: "Dr. Elena Rostova",
    facility: "City Public Health Clinic",
    description: "Administered annual influenza and booster vaccine. Zero adverse reaction recorded post-observation.",
    document_id: "demo-doc-4",
    document_name: "Vaccine_Record_2026.pdf",
  },
];

export const DEMO_CONSENTS: DemoConsentGrant[] = [
  {
    id: "demo-consent-1",
    doctor_name: "Dr. Sarah Jenkins",
    facility: "Metro General Health Center",
    specialty: "Cardiology Specialist",
    granted_at: "2026-06-10",
    expires_at: "2027-06-10",
    scope: "Full Vault",
    status: "Active",
  },
  {
    id: "demo-consent-2",
    doctor_name: "Dr. Robert Vance",
    facility: "St. Jude Pulmonary Clinic",
    specialty: "Pulmonologist",
    granted_at: "2026-07-15",
    expires_at: "2026-08-15",
    scope: "Lab Reports Only",
    status: "Active",
  },
];
