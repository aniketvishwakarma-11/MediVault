export interface DoctorDemoPatient {
  id: string;
  uhid: string;
  fullName: string;
  age: number;
  gender: string;
  bloodGroup: string;
  phone: string;
  email: string;
  avatarUrl?: string;
  riskBadge: 'HIGH_RISK' | 'MODERATE_RISK' | 'STABLE' | 'CRITICAL';
  recentDiagnosis: string;
  currentMedications: string[];
  lastVisit: string;
  accessStatus: 'APPROVED' | 'PENDING' | 'DENIED' | 'EMERGENCY_GRANTED';
  allergies: string[];
  chronicConditions: string[];
  emergencyContact: string;
  bmi: number;
  insuranceProvider: string;
  primaryDoctor: string;
}

export interface DoctorDemoConsultation {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  symptoms: string[];
  vitals: {
    bloodPressure: string;
    heartRate: number;
    temperature: number;
    spO2: number;
    bmi: number;
  };
  observations: string;
  diagnosis: string;
  treatmentPlan: string;
  advice: string;
  followUpDate: string;
}

export interface DoctorDemoPrescription {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  diagnosis: string;
  medicines: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }[];
  recommendedTests: string[];
  digitalSignature: string;
  blockchainTxHash: string;
  aiExplanation: string;
}

export interface DoctorDemoTimelineEvent {
  id: string;
  patientId: string;
  date: string;
  type: 'DIAGNOSIS' | 'PRESCRIPTION' | 'CONSULTATION' | 'LAB_RESULT' | 'RADIOLOGY' | 'EMERGENCY' | 'MEDICATION_CHANGE';
  title: string;
  doctorName: string;
  hospital: string;
  summary: string;
  details: string;
  badgeColor: string;
  documents?: { name: string; type: string; url: string }[];
}

export interface DoctorDemoReport {
  id: string;
  patientId: string;
  title: string;
  category: 'LABORATORY' | 'RADIOLOGY' | 'PRESCRIPTION' | 'DISCHARGE' | 'CONSULTATION';
  date: string;
  doctorName: string;
  hospital: string;
  isAbnormal: boolean;
  isCritical: boolean;
  ocrText: string;
  aiSummary: string;
  entities: { key: string; value: string; status?: 'HIGH' | 'LOW' | 'NORMAL' }[];
  fileUrl: string;
}

export const mockDoctorProfile = {
  id: 'doc-jenkins-123',
  fullName: 'Dr. Sarah Jenkins, MD',
  email: 'dr.jenkins@medivault.org',
  phone: '+1 (555) 345-6789',
  licenseNumber: 'MD-994820-US',
  registrationCouncil: 'American Board of Internal Medicine (ABIM)',
  specialization: 'Internal Medicine & Clinical Cardiology',
  experienceYears: 14,
  hospitalAffiliation: 'St. Jude Memorial Hospital',
  clinicName: 'Jenkins Medical Associates',
  address: 'Suite 300, 100 Medical Center Way, Boston MA',
  profilePhotoUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=300&q=80',
  verificationStatus: 'VERIFIED' as const,
  languages: ['English', 'Spanish', 'French'],
  consultationHours: {
    MonFri: '09:00 AM - 05:00 PM',
    Sat: '09:00 AM - 01:00 PM',
    Sun: 'Emergency Call Only',
  },
};

export const mockDoctorPatients: DoctorDemoPatient[] = [
  {
    id: 'pat-1001',
    uhid: 'MV-PAT-88401',
    fullName: 'Alex Morgan',
    age: 36,
    gender: 'Male',
    bloodGroup: 'O+',
    phone: '+1 (555) 987-6543',
    email: 'alex.morgan@example.com',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    riskBadge: 'HIGH_RISK',
    recentDiagnosis: 'Type 2 Diabetes & Mild Iron Anemia',
    currentMedications: ['Metformin 500mg (TID)', 'Lisinopril 10mg (OD)', 'Ferrous Sulfate 325mg (OD)'],
    lastVisit: '2026-08-01',
    accessStatus: 'APPROVED',
    allergies: ['Penicillin', 'Peanuts'],
    chronicConditions: ['Type 2 Diabetes Mellitus', 'Essential Hypertension'],
    emergencyContact: 'Sarah Morgan (Spouse) +1 (555) 987-6543',
    bmi: 24.2,
    insuranceProvider: 'BlueCross BlueShield #BC-99248',
    primaryDoctor: 'Dr. Sarah Jenkins, MD',
  },
  {
    id: 'pat-1002',
    uhid: 'MV-PAT-88402',
    fullName: 'Eleanor Vance',
    age: 42,
    gender: 'Female',
    bloodGroup: 'A-',
    phone: '+1 (555) 234-8901',
    email: 'eleanor.vance@example.com',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    riskBadge: 'STABLE',
    recentDiagnosis: 'Acute Bronchitis (Resolved)',
    currentMedications: ['Albuterol Inhaler (PRN)'],
    lastVisit: '2026-07-28',
    accessStatus: 'APPROVED',
    allergies: ['Sulfa Drugs'],
    chronicConditions: ['Mild Asthma'],
    emergencyContact: 'Thomas Vance (Brother) +1 (555) 234-8902',
    bmi: 21.8,
    insuranceProvider: 'Aetna Global #AE-44120',
    primaryDoctor: 'Dr. Sarah Jenkins, MD',
  },
  {
    id: 'pat-1003',
    uhid: 'MV-PAT-88403',
    fullName: 'Marcus Brody',
    age: 50,
    gender: 'Male',
    bloodGroup: 'B+',
    phone: '+1 (555) 678-1234',
    email: 'marcus.brody@example.com',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    riskBadge: 'MODERATE_RISK',
    recentDiagnosis: 'Hyperlipidemia & Stage 1 Hypertension',
    currentMedications: ['Atorvastatin 20mg (OD)', 'Amlodipine 5mg (OD)'],
    lastVisit: '2026-07-15',
    accessStatus: 'PENDING',
    allergies: ['None Reported'],
    chronicConditions: ['Hyperlipidemia', 'Hypertension'],
    emergencyContact: 'Linda Brody (Wife) +1 (555) 678-1235',
    bmi: 27.4,
    insuranceProvider: 'UnitedHealth #UH-88310',
    primaryDoctor: 'Dr. Robert Vance',
  },
  {
    id: 'pat-1004',
    uhid: 'MV-PAT-88404',
    fullName: 'Sophia Martinez',
    age: 29,
    gender: 'Female',
    bloodGroup: 'AB+',
    phone: '+1 (555) 432-1098',
    email: 'sophia.m@example.com',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    riskBadge: 'STABLE',
    recentDiagnosis: 'Routine Annual Wellness Audit',
    currentMedications: ['Multivitamins'],
    lastVisit: '2026-08-04',
    accessStatus: 'APPROVED',
    allergies: ['Latex'],
    chronicConditions: ['None'],
    emergencyContact: 'Carlos Martinez (Father) +1 (555) 432-1099',
    bmi: 20.5,
    insuranceProvider: 'Cigna Healthcare #CG-10294',
    primaryDoctor: 'Dr. Sarah Jenkins, MD',
  },
];

export const mockDoctorConsultations: DoctorDemoConsultation[] = [
  {
    id: 'CS-99401',
    patientId: 'pat-1001',
    patientName: 'Alex Morgan',
    date: '2026-08-01',
    symptoms: ['Mild Fatigue', 'Frequent Thirst', 'Occasional Dizziness'],
    vitals: {
      bloodPressure: '132/84 mmHg',
      heartRate: 78,
      temperature: 98.6,
      spO2: 98,
      bmi: 24.2,
    },
    observations: 'Patient presented for routine diabetic follow-up. Peripheral pulses intact. No pedal edema.',
    diagnosis: 'Type 2 Diabetes Mellitus (Controlled) & Mild Iron Deficiency Anemia',
    treatmentPlan: 'Continue Metformin 500mg TID. Start Ferrous Sulfate 325mg OD after food. Dietary counselor referral.',
    advice: 'Hydrate well (> 2.5L daily). Monitor blood glucose twice weekly in logbook.',
    followUpDate: '2026-08-25',
  },
  {
    id: 'CS-99402',
    patientId: 'pat-1002',
    patientName: 'Eleanor Vance',
    date: '2026-07-28',
    symptoms: ['Dry Cough', 'Nasal Congestion'],
    vitals: {
      bloodPressure: '118/76 mmHg',
      heartRate: 72,
      temperature: 98.4,
      spO2: 99,
      bmi: 21.8,
    },
    observations: 'Chest clear bilaterally. No wheezing or crepitations.',
    diagnosis: 'Acute Rhinitis & Mild Tracheitis',
    treatmentPlan: 'Saline nasal spray & steam inhalation. Symptomatic relief.',
    advice: 'Avoid cold exposure & allergen triggers.',
    followUpDate: '2026-08-15',
  },
];

export const mockDoctorPrescriptions: DoctorDemoPrescription[] = [
  {
    id: 'RX-77201',
    patientId: 'pat-1001',
    patientName: 'Alex Morgan',
    date: '2026-08-01',
    diagnosis: 'Type 2 Diabetes Mellitus & Iron Deficiency Anemia',
    medicines: [
      {
        name: 'Metformin Hydrochloride 500mg',
        dosage: '1 Tablet',
        frequency: '1-0-1 (Twice daily)',
        duration: '30 Days',
        instructions: 'Take after principal meals with water.',
      },
      {
        name: 'Ferrous Sulfate 325mg (65mg elemental Iron)',
        dosage: '1 Tablet',
        frequency: '0-1-0 (Once daily)',
        duration: '30 Days',
        instructions: 'Take with Vitamin C / Orange juice for optimal absorption.',
      },
    ],
    recommendedTests: ['Fasting Blood Sugar (FBS)', 'HbA1c Panel', 'Serum Ferritin'],
    digitalSignature: 'SIG-DR-JENKINS-882410',
    blockchainTxHash: '0xa7f83b2d194c5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
    aiExplanation: 'Metformin helps manage blood glucose levels. Ferrous Sulfate replenishes iron stores to improve hemoglobin levels.',
  },
];

export const mockDoctorTimelineEvents: DoctorDemoTimelineEvent[] = [
  {
    id: 'TL-101',
    patientId: 'pat-1001',
    date: '2026-08-01',
    type: 'CONSULTATION',
    title: 'Diabetic & Hematology Follow-up Consultation',
    doctorName: 'Dr. Sarah Jenkins, MD',
    hospital: 'St. Jude Memorial Hospital',
    summary: 'Routine diabetic evaluation. Hemoglobin noted at 10.2 g/dL.',
    details: 'Patient reports mild tiredness. Vitals stable. Adjusted treatment regimen to include iron supplementation.',
    badgeColor: 'bg-emerald-500/10 text-emerald-700 border-emerald-300',
  },
  {
    id: 'TL-102',
    patientId: 'pat-1001',
    date: '2026-08-01',
    type: 'LAB_RESULT',
    title: 'Complete Blood Count (CBC) & Metabolic Panel',
    doctorName: 'Dr. Robert Vance',
    hospital: 'Metro Care Diagnostic Center',
    summary: 'Hb: 10.2 g/dL (Low), Glucose: 108 mg/dL (Borderline High), WBC: 6,800 /cu mm (Normal)',
    details: 'Extracted 12 parameters. Flagged mild microcytic anemia.',
    badgeColor: 'bg-cyan-500/10 text-cyan-700 border-cyan-300',
    documents: [{ name: 'CBC_Report_Aug2026.pdf', type: 'PDF', url: '#' }],
  },
  {
    id: 'TL-103',
    patientId: 'pat-1001',
    date: '2026-08-01',
    type: 'PRESCRIPTION',
    title: 'Prescription Generated: Metformin & Ferrous Sulfate',
    doctorName: 'Dr. Sarah Jenkins, MD',
    hospital: 'Jenkins Medical Associates',
    summary: 'Rx #RX-77201 issued and signed digitally.',
    details: 'Digital hash recorded on-chain.',
    badgeColor: 'bg-indigo-500/10 text-indigo-700 border-indigo-300',
  },
];

export const mockDoctorReports: DoctorDemoReport[] = [
  {
    id: 'REP-501',
    patientId: 'pat-1001',
    title: 'Complete Blood Count (CBC) Laboratory Report',
    category: 'LABORATORY',
    date: '2026-08-01',
    doctorName: 'Dr. Robert Vance',
    hospital: 'Metro Care Diagnostics',
    isAbnormal: true,
    isCritical: false,
    ocrText: `PATIENT: Alex Morgan | AGE: 36 | GENDER: Male | DATE: 2026-08-01
TEST NAME: Hemoglobin (Hb) -> 10.2 g/dL [REF: 13.5 - 17.5 g/dL] (LOW)
TEST NAME: WBC Count -> 6,800 /cu mm [REF: 4,000 - 11,000] (NORMAL)
TEST NAME: Platelets -> 240,000 /cu mm [REF: 150,000 - 450,000] (NORMAL)
TEST NAME: Fasting Blood Glucose -> 108 mg/dL [REF: 70 - 99 mg/dL] (HIGH)`,
    aiSummary: 'Hb is 10.2 g/dL (below 13.5 threshold) indicating mild anemia. Fasting blood sugar is 108 mg/dL indicating mild glucose dysregulation.',
    entities: [
      { key: 'Hemoglobin', value: '10.2 g/dL', status: 'LOW' },
      { key: 'WBC Count', value: '6,800 /cu mm', status: 'NORMAL' },
      { key: 'Platelet Count', value: '240,000 /cu mm', status: 'NORMAL' },
      { key: 'Fasting Glucose', value: '108 mg/dL', status: 'HIGH' },
    ],
    fileUrl: '#',
  },
  {
    id: 'REP-502',
    patientId: 'pat-1001',
    title: 'Chest Radiography (X-Ray PA View)',
    category: 'RADIOLOGY',
    date: '2026-06-12',
    doctorName: 'Dr. Michael Chen',
    hospital: 'St. Jude Imaging Dept',
    isAbnormal: false,
    isCritical: false,
    ocrText: `CHEST X-RAY PA VIEW: Lungs are clear. Heart size normal. No pleural effusion or focal consolidation.`,
    aiSummary: 'Normal chest radiography. Unremarkable cardio-thoracic contours.',
    entities: [
      { key: 'Lungs', value: 'Clear bilaterally', status: 'NORMAL' },
      { key: 'Cardiac Silhouette', value: 'Normal size', status: 'NORMAL' },
    ],
    fileUrl: '#',
  },
];
