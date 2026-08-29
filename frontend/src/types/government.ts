export interface AbhaKycDetails {
  fullName: string;
  dob: string;
  gender: string;
  mobileMasked: string;
  aadhaarMasked?: string;
  district?: string;
  state?: string;
  photoUrl?: string;
}

export interface AbhaProfileData {
  abhaNumber: string | null;
  abhaAddress: string | null;
  abhaStatus: 'NOT_LINKED' | 'ACTIVE' | 'SUSPENDED';
  isGovVerified: boolean;
  govIdType: string | null;
  govIdMasked: string | null;
  kycDetails: AbhaKycDetails | null;
  digilockerLinked: boolean;
}

export interface DigiLockerDoc {
  type: 'PMJAY_CARD' | 'COVID_VACCINE' | 'HEALTH_INSURANCE' | 'UDID';
  name: string;
  issuer: string;
  category: string;
  uri: string;
  data: Record<string, any>;
}
