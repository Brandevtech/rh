import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveStageKey, type InterviewKit } from '@/lib/scorecardTemplates';
import { useToast } from '@/hooks/use-toast';

function parseKit(row: Record<string, unknown>): InterviewKit {
  return {
    id: row.id as string,
    candidate_interview_id: row.candidate_interview_id as string,
    questions: (row.questions as string[]) || [],
    source: row.source as 'template' | 'gemini',
    scorecard_template_id: row.scorecard_template_id as string | null | undefined,
    generated_at: row.generated_at as string,
  };
}

export function useInterviewKit(interviewId?: string | null, stageName?: string | null) {
  return useQuery({
    queryKey: ['interview-kit', interviewId, stageName ?? null],
    enabled: !!interviewId,
    staleTime: 60_000,
    queryFn: async (): Promise<InterviewKit | null> => {
      // 1. Check if a custom or previously saved kit exists for this interview
      const { data, error } = await supabase
        .from('interview_kits')
        .select('id, candidate_interview_id, questions, source, scorecard_template_id, generated_at')
        .eq('candidate_interview_id', interviewId!)
        .maybeSingle();

      if (!error && data) {
        const parsed = parseKit(data as Record<string, unknown>);
        if (parsed.questions && parsed.questions.length > 0) {
          return parsed;
        }
      }

      // 2. Resolve stage name (passed directly or fetched from interview row)
      let resolvedStage = stageName;
      if (!resolvedStage) {
        const { data: interviewRow } = await supabase
          .from('candidate_interviews')
          .select('stage_name_snapshot, job_interview_stage_id')
          .eq('id', interviewId!)
          .maybeSingle();

        if (interviewRow?.job_interview_stage_id) {
          const { data: stageRow } = await supabase
            .from('job_interview_stages')
            .select('stage_name')
            .eq('id', interviewRow.job_interview_stage_id)
            .maybeSingle();
          resolvedStage = stageRow?.stage_name || interviewRow.stage_name_snapshot || null;
        } else {
          resolvedStage = interviewRow?.stage_name_snapshot || null;
        }
      }

      const stageKey = resolveStageKey(resolvedStage);

      // 3. Fallback to default questions configured in scorecard_templates for this stage
      const { data: template } = await supabase
        .from('scorecard_templates')
        .select('id, stage_key, display_name, prompt_questions, is_active')
        .eq('stage_key', stageKey)
        .eq('is_active', true)
        .maybeSingle();

      const questions = (template?.prompt_questions as string[]) || [];
      if (questions.length > 0) {
        return {
          id: `template-${template?.id || stageKey}`,
          candidate_interview_id: interviewId!,
          questions,
          source: 'template',
          scorecard_template_id: template?.id ?? null,
          generated_at: '',
        };
      }

      return null;
    },
  });
}

export function useGenerateInterviewKit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      interview_id: string;
      candidate_name?: string;
      stage_name?: string;
      job_title?: string;
      force_gemini?: boolean;
      force_regenerate?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('generate-interview-kit', {
        body: params,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.kit as InterviewKit;
    },
    onSuccess: (_kit) => {
      queryClient.invalidateQueries({ queryKey: ['interview-kit'] });
      toast({
        title: 'Kit de perguntas atualizado',
        description: 'Perguntas geradas com sucesso.',
      });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Erro ao conectar ao serviço de IA.';
      toast({
        title: 'Não foi possível gerar via IA',
        description: message,
        variant: 'destructive',
      });
    },
  });
}
