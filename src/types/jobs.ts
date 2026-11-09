// Job types for The Talent App

export type JobStatus = 'draft' | 'open' | 'paused' | 'closed' | 'cancelled';

export const ACTIVE_JOB_STATUSES: JobStatus[] = ['draft', 'open', 'paused'];
export const COMPLETED_JOB_STATUSES: JobStatus[] = ['closed', 'cancelled'];

export type JobListTab = 'active' | 'closed' | 'cancelled';

export const JOB_CANCEL_REASONS = [
  { value: 'filled_internally', label: 'Preenchida internamente' },
  { value: 'role_dropped', label: 'Vaga cancelada / Descontinuada' },
  { value: 'budget', label: 'Orçamento suspenso' },
  { value: 'duplicate', label: 'Vaga duplicada' },
  { value: 'other', label: 'Outro motivo' },
] as const;

export type JobCancelReason = (typeof JOB_CANCEL_REASONS)[number]['value'];

export function isActiveJobStatus(status: JobStatus): boolean {
  return ACTIVE_JOB_STATUSES.includes(status);
}

export function isCompletedJobStatus(status: JobStatus): boolean {
  return COMPLETED_JOB_STATUSES.includes(status);
}

export function jobStatusesForListTab(tab: JobListTab): readonly JobStatus[] {
  if (tab === 'active') return ACTIVE_JOB_STATUSES;
  if (tab === 'closed') return ['closed'] as const;
  return ['cancelled'] as const;
}

export function isJobStatusInListTab(status: JobStatus, tab: JobListTab): boolean {
  return jobStatusesForListTab(tab).includes(status);
}
export type JobType = 'full_time' | 'part_time' | 'contract' | 'internship' | 'freelance';
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
export type PositionType = 'tech' | 'non_tech';
export interface JobAssessmentConfig {
  deadline_days?: number;
  pass_threshold_override?: number | null;
  notify_recruiter_on_complete?: boolean;
  require_pass_before_interview?: boolean;
}

export type ExperienceYearsRange = 
  | 'fresh'
  | '0_6_months'
  | '6_months_plus'
  | '1_year_plus'
  | '2_years_plus'
  | '3_years_plus'
  | '5_years_plus'
  | '8_years_plus'
  | '10_years_plus'
  | '12_years_plus'
  | '15_years_plus';

export interface Job {
  id: string;
  title: string;
  description?: string;
  domain?: string;
  department?: string; // Now used as "Team"
  location?: string;
  job_type: JobType;
  experience_level?: ExperienceLevel;
  experience_years_range?: ExperienceYearsRange;
  position_type?: PositionType;
  total_openings?: number;
  positions_filled?: number;
  salary_min?: number;
  salary_max?: number;
  salary_currency: string; // Always INR
  required_skills: string[];
  benefits: string[];
  application_deadline?: string;
  status: JobStatus;
  sort_order?: number;
  status_note?: string | null;
  require_digital_application_form?: boolean;
  assessment_enabled?: boolean;
  default_assessment_id?: string | null;
  assessment_config?: JobAssessmentConfig;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  candidate_count?: number;
}

export interface JobApplication {
  id: string;
  job_id: string;
  candidate_id?: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone?: string;
  resume_url?: string;
  linkedin_url?: string;
  cover_letter?: string;
  status: string;
  created_at: string;
  updated_at: string;
  // Joined data
  job?: Job;
}

export const jobTypeLabels: Record<JobType, string> = {
  full_time: 'Tempo Integral',
  part_time: 'Meio Período',
  contract: 'Contrato / PJ',
  internship: 'Estágio',
  freelance: 'Freelance',
};

export const experienceLevelLabels: Record<ExperienceLevel, string> = {
  entry: 'Júnior / Inicial',
  mid: 'Pleno',
  senior: 'Sênior',
  lead: 'Liderança / Especialista',
  executive: 'Executivo / Diretoria',
};

export const experienceYearsLabels: Record<ExperienceYearsRange, string> = {
  fresh: '0 (Fresh)',
  '0_6_months': '0 a 6 meses',
  '6_months_plus': '6 meses+',
  '1_year_plus': '1 ano+',
  '2_years_plus': '2 anos+',
  '3_years_plus': '3 anos+',
  '5_years_plus': '5 anos+',
  '8_years_plus': '8 anos+',
  '10_years_plus': '10 anos+',
  '12_years_plus': '12 anos+',
  '15_years_plus': '15 anos+',
};

export const positionTypeLabels: Record<PositionType, string> = {
  tech: 'Tecnologia',
  non_tech: 'Não-Tecnologia',
};

export const jobStatusLabels: Record<JobStatus, string> = {
  draft: 'Rascunho',
  open: 'Aberta',
  paused: 'Pausada',
  closed: 'Fechada',
  cancelled: 'Cancelada',
};
