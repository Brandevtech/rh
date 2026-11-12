import { supabase } from '@/integrations/supabase/client';
import type { InterviewKitDrawerInterview } from '@/components/pipeline/InterviewKitDrawer';
import { DEFAULT_INTERVIEW_DURATION_MINUTES } from '@/lib/interviewConflicts';

const INTERVIEW_KIT_SELECT = `
  id, candidate_id, scheduled_at,
  candidate:candidates!candidate_interviews_candidate_id_fkey(id, name, email, job_id, role_applied),
  job_interview_stage:job_interview_stages!candidate_interviews_job_interview_stage_id_fkey(stage_name, job_id)
`;

export async function fetchInterviewForKit(interviewId: string): Promise<InterviewKitDrawerInterview | null> {
  const { data } = await supabase
    .from('candidate_interviews')
    .select(INTERVIEW_KIT_SELECT)
    .eq('id', interviewId)
    .maybeSingle();
  return data as InterviewKitDrawerInterview | null;
}

/** True when scheduled_at plus duration window is in the past (respects active slot window). */
export function isPastInterview(
  scheduledAt: string | null | undefined,
  durationMinutes = DEFAULT_INTERVIEW_DURATION_MINUTES,
): boolean {
  if (!scheduledAt) return false;
  const start = new Date(scheduledAt).getTime();
  if (Number.isNaN(start)) return false;
  return start + durationMinutes * 60_000 < Date.now();
}

/** Fire-and-forget kit generation after schedule/reschedule. Failures are silent (template fallback in edge fn). */
export function triggerInterviewKitGeneration(interviewId: string): void {
  void supabase.functions
    .invoke('generate-interview-kit', {
      body: {
        interview_id: interviewId,
        force_regenerate: true,
      },
    })
    .catch(() => {});
}
