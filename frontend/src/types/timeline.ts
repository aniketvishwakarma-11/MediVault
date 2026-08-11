// MediVault V2 — Frontend Timeline Type Definitions

export type ClinicalEventType =
  | 'CONSULTATION'
  | 'DIAGNOSIS'
  | 'LAB_TEST'
  | 'IMAGING'
  | 'PRESCRIPTION'
  | 'MEDICATION_CHANGE'
  | 'PROCEDURE'
  | 'HOSPITALIZATION'
  | 'DISCHARGE'
  | 'VACCINATION'
  | 'FOLLOW_UP'
  | 'SYMPTOM'
  | 'OTHER';

export type TrendDirection = 'IMPROVING' | 'WORSENING' | 'STABLE' | 'CHANGE_DETECTED' | 'INSUFFICIENT_DATA';
export type EpisodeStatus = 'ACTIVE' | 'IMPROVING' | 'STABLE' | 'RESOLVED' | 'ONGOING' | 'UNKNOWN';
export type EventSeverity = 'NORMAL' | 'MONITOR' | 'CRITICAL';

export interface ClinicalEvent {
  id: string;
  event_type: ClinicalEventType;
  event_date: string;
  title: string;
  summary: string | null;
  severity: EventSeverity;
  status: string;
  doctor_name: string | null;
  facility_name: string | null;
  department: string | null;
  is_milestone: boolean;
  structured_data: Record<string, any>;
  document_id: string | null;
  analysis_id: string | null;
  // Joined document fields
  document_name: string | null;
  document_category: string | null;
  checksum_sha256: string | null;
  file_extension: string | null;
  mime_type: string | null;
  created_at: string;
}

export interface ClinicalEpisode {
  id: string;
  title: string;
  description: string | null;
  primary_condition: string | null;
  status: EpisodeStatus;
  start_date: string | null;
  end_date: string | null;
  event_count: number;
  document_count: number;
  event_ids: string[];
}

export interface LabMeasurement {
  event_id: string;
  document_id: string | null;
  event_date: string;
  value_raw: string;
  value_numeric: number | null;
  unit: string | null;
  reference_range: string | null;
  status: string;
  facility_name: string | null;
}

export interface LabTrend {
  test_name: string;
  normalized_name: string;
  unit: string | null;
  reference_range: string | null;
  measurements: LabMeasurement[];
  current: LabMeasurement | null;
  previous: LabMeasurement | null;
  absolute_change: number | null;
  percentage_change: number | null;
  trend: TrendDirection;
}

export interface MedicationDosePoint {
  event_id: string;
  document_id: string | null;
  event_date: string;
  dosage: string | null;
  frequency: string | null;
  route: string | null;
  purpose: string | null;
  instructions: string | null;
  status: string;
  facility_name: string | null;
  doctor_name: string | null;
}

export interface MedicationHistory {
  medication_name: string;
  normalized_name: string;
  dose_timeline: MedicationDosePoint[];
  first_recorded: string;
  last_recorded: string;
  current_status: string;
  dose_changes: number;
}

export interface ConditionEvent {
  event_id: string;
  document_id: string | null;
  event_type: string;
  event_date: string;
  title: string;
  summary: string | null;
  doctor_name: string | null;
  facility_name: string | null;
  is_milestone: boolean;
}

export interface ConditionJourney {
  condition_name: string;
  normalized_name: string;
  first_seen: string;
  last_seen: string;
  status: string;
  events: ConditionEvent[];
  related_lab_tests: string[];
  related_medications: string[];
}

export interface TimelineSummary {
  total_documents: number;
  total_clinical_events: number;
  total_episodes: number;
  active_conditions: number;
  active_medications: number;
  last_activity_date: string | null;
  milestone_events: number;
}

export interface RecordGap {
  from_date: string;
  to_date: string;
  gap_days: number;
}

export interface NotableChange {
  test_name: string;
  status: string;
  value: string;
  event_date: string;
}

export interface HealthInsights {
  overview: string;
  evidence_count: number;
  disclaimer: string;
}

export interface TimelineSummaryResponse {
  summary: TimelineSummary;
  record_gaps: RecordGap[];
  notable_changes: NotableChange[];
}

export interface ClinicalEventsResponse {
  events: ClinicalEvent[];
  total: number;
  totalPages: number;
}

export type TimelineView = 'timeline' | 'conditions' | 'medications' | 'labs';
export type TimelineFilter =
  | 'ALL'
  | 'CONSULTATION'
  | 'DIAGNOSIS'
  | 'LAB_TEST'
  | 'IMAGING'
  | 'PRESCRIPTION'
  | 'PROCEDURE'
  | 'HOSPITALIZATION'
  | 'VACCINATION';
