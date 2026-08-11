export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';

export interface DoctorProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  licenseNumber: string;
  registrationCouncil?: string;
  specialization: string;
  experienceYears: number;
  hospitalAffiliation?: string;
  clinicName?: string;
  address?: string;
  profilePhotoUrl?: string;
  governmentIdUrl?: string;
  licenseDocUrl?: string;
  hospitalIdUrl?: string;
  languages: string[];
  verificationStatus: VerificationStatus;
  rejectionReason?: string;
  consultationHours?: Record<string, string>;
  createdAt: string;
}

export interface ConsultationVitals {
  bloodPressure?: string;
  heartRate?: number;
  temperature?: number;
  spO2?: number;
  bmi?: number;
  weightKg?: number;
  heightCm?: number;
}

export interface DoctorConsultation {
  id: string;
  doctorId: string;
  patientId: string;
  symptoms: string[];
  vitals: ConsultationVitals;
  observations?: string;
  diagnosis: string;
  treatmentPlan?: string;
  advice?: string;
  followUpDate?: string;
  attachments?: string[];
  createdAt: string;
}

export interface PrescriptionMedicine {
  name: string;
  dosage: string;
  frequency: string; // e.g. 1-0-1 or Twice Daily
  duration: string;  // e.g. 7 days
  instructions?: string; // e.g. After food
}

export interface DoctorPrescription {
  id: string;
  consultationId?: string;
  doctorId: string;
  patientId: string;
  medicines: PrescriptionMedicine[];
  recommendedTests?: string[];
  digitalSignature?: string;
  blockchainTxHash?: string;
  aiExplanation?: string;
  createdAt: string;
}

export interface EmergencyAccessRequest {
  patientQrOrCode: string;
  doctorUserId: string;
  reason: string;
}

export interface EmergencyClinicalSummary {
  patientId: string;
  patientName: string;
  age: number;
  gender: string;
  bloodGroup: string;
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  emergencyContacts: { name: string; relation: string; phone: string }[];
  recentVitalSigns: ConsultationVitals;
  grantedUntil: string;
  accessLogId: string;
}

export interface DoctorNotification {
  id: string;
  recipientId: string;
  senderId?: string;
  type: 'CONSENT_APPROVED' | 'CONSENT_DENIED' | 'EMERGENCY_ACCESS' | 'NEW_REPORT' | 'CRITICAL_ALERT' | 'FOLLOW_UP';
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
}
