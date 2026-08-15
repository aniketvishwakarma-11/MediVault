export type AllowedMimeType = 
  | 'application/pdf' 
  | 'image/png' 
  | 'image/jpeg' 
  | 'image/webp'
  | 'application/msword'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'text/plain';

export type AllowedExtension = 'pdf' | 'png' | 'jpeg' | 'jpg' | 'webp' | 'doc' | 'docx' | 'txt';

export const ALLOWED_MIME_TYPES: AllowedMimeType[] = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

export const ALLOWED_EXTENSIONS: AllowedExtension[] = ['pdf', 'png', 'jpeg', 'jpg', 'webp', 'doc', 'docx', 'txt'];

export enum DocumentCategory {
  PRESCRIPTION = 'Prescription',
  BLOOD_REPORT = 'Blood Report',
  MRI = 'MRI',
  CT_SCAN = 'CT Scan',
  X_RAY = 'X-Ray',
  ECG = 'ECG',
  DISCHARGE_SUMMARY = 'Discharge Summary',
  INSURANCE = 'Insurance',
  VACCINATION = 'Vaccination',
  PRESCRIPTION_HISTORY = 'Prescription History',
  SURGERY = 'Surgery',
  DENTAL = 'Dental',
  EYE = 'Eye',
  OTHER = 'Other',
}

export const ALLOWED_CATEGORIES: string[] = Object.values(DocumentCategory);

export enum UploadStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface DocumentRecord {
  id: string;
  patient_id: string;
  uploaded_by: string;
  uploader_id?: string;
  document_name: string;
  original_filename: string;
  storage_key: string;
  storage_path?: string;
  bucket_name: string;
  mime_type: string;
  file_extension: string;
  file_size: number;
  file_size_bytes?: number;
  document_category: DocumentCategory | string;
  hospital_name?: string | null;
  doctor_name?: string | null;
  visit_date?: string | null;
  checksum_sha256: string;
  upload_status: UploadStatus | string;
  is_deleted: boolean;
  is_archived?: boolean;
  created_at: Date | string;
  updated_at: Date | string;
  blockchain_hash?: string | null;
  blockchain_tx?: string | null;
  ocr_completed: boolean;
  embedding_completed: boolean;
  metadata_json?: Record<string, any> | null;
}

export interface UploadDocumentInput {
  patient_id: string;
  uploaded_by: string;
  document_name: string;
  document_category: DocumentCategory | string;
  hospital_name?: string;
  doctor_name?: string;
  visit_date?: string;
  custom_metadata?: Record<string, any>;
}

export interface DocumentSearchFilters {
  patient_id?: string;
  document_category?: string;
  hospital_name?: string;
  doctor_name?: string;
  visit_date_from?: string;
  visit_date_to?: string;
  upload_date_from?: string;
  upload_date_to?: string;
  mime_type?: string;
  search_query?: string; // matches document_name or original_filename
  page?: number;
  limit?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'patient' | 'doctor' | 'hospital' | 'admin' | 'authenticated' | string;
  patient_id?: string;
}
