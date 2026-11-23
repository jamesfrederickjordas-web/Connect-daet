export type AdminRole =
  | 'super_admin'
  | 'tourism_admin'
  | 'data_analyst'
  | 'report_viewer';

export interface AdminProfile {
  id: string;
  email: string;
  full_name: string;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
}

export interface DataSource {
  id: string;
  name: string;
  source_type:
    | 'accommodation'
    | 'tour_operator'
    | 'attraction_log'
    | 'subsystem'
    | 'lgu_survey'
    | 'other';
  subsystem_code: string | null;
  contact_office: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ArrivalRecord {
  id: string;
  reporting_date: string;
  destination: string;
  visitor_type: 'day_visitor' | 'overnight' | 'excursionist';
  local_count: number;
  foreign_count: number;
  data_source_id: string | null;
  notes: string | null;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
}

export interface EconomicRecord {
  id: string;
  reporting_date: string;
  destination: string;
  revenue_category:
    | 'accommodation'
    | 'food_and_beverage'
    | 'transport'
    | 'tours_and_activities'
    | 'souvenirs_and_retail'
    | 'other';
  estimated_revenue_php: number;
  employment_count: number;
  verification_status: 'verified' | 'estimated';
  data_source_id: string | null;
  notes: string | null;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
}

export type SustainabilityCategory =
  | 'environmental'
  | 'economic'
  | 'social'
  | 'governance';

export interface SustainabilityIndicator {
  id: string;
  indicator_name: string;
  category: SustainabilityCategory;
  metric_value: number;
  unit: string;
  target_value: number | null;
  reporting_period: string;
  status: 'on_track' | 'watch' | 'critical';
  data_source_id: string | null;
  notes: string | null;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
}

export interface ImportLog {
  id: string;
  subsystem_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: 'accepted' | 'rejected';
  error_message: string | null;
  records_processed: number;
  received_at: string;
}

export interface SatisfactionRating {
  id: string;
  destination: string;
  rating: number;
  source_subsystem: string;
  recorded_at: string;
}

export interface ReportHistory {
  id: string;
  report_type:
    | 'monthly_impact'
    | 'quarterly_sustainability'
    | 'annual_summary'
    | 'economic_assessment'
    | 'destination_breakdown';
  period_start: string;
  period_end: string;
  summary_text: string;
  metrics_snapshot: Record<string, unknown>;
  generated_by: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface RuleInsight {
  id: string;
  severity: 'positive' | 'warning' | 'info';
  title: string;
  message: string;
  recommendation: string;
}
