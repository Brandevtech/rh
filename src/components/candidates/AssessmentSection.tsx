import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  resolvePipelineAssessmentStatus,
  useCandidateJobAssessment,
  type PipelineAssessmentStatus,
} from '@/hooks/useJobAssessment';
import { ClipboardCheck, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { isGradingPending } from '@/lib/assessmentGrading';

interface AssessmentSectionProps {
  candidateId: string;
  jobId: string | null;
  defaultAssessmentId: string | null;
  assessmentEnabled: boolean;
  onAssign?: () => void;
  canAssign?: boolean;
  embedded?: boolean;
}

export function AssessmentStatusBadge({ status }: { status: PipelineAssessmentStatus }) {
  if (status === 'not_required') return null;

  const config: Record<
    Exclude<PipelineAssessmentStatus, 'not_required'>,
    { label: string; className: string }
  > = {
    none: {
      label: 'Avaliação não atribuída',
      className:
        'border-slate-300 text-slate-600 bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:bg-slate-950/30',
    },
    pending: {
      label: 'Avaliação pendente',
      className:
        'border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:bg-amber-950/30',
    },
    awaiting_review: {
      label: 'Aguardando revisão',
      className:
        'border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:bg-amber-950/30',
    },
    passed: {
      label: 'Aprovado na avaliação',
      className:
        'border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950/30',
    },
    failed: {
      label: 'Reprovado na avaliação',
      className:
        'border-red-300 text-red-700 bg-red-50 dark:border-red-800 dark:text-red-400 dark:bg-red-950/30',
    },
    expired: {
      label: 'Avaliação expirada',
      className:
        'border-orange-300 text-orange-700 bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:bg-orange-950/30',
    },
  };

  const { label, className } = config[status];
  return (
    <Badge variant="outline" className={cn('text-[10px]', className)}>
      {label}
    </Badge>
  );
}

export function AssessmentSection({
  candidateId,
  jobId,
  defaultAssessmentId,
  assessmentEnabled,
  onAssign,
  canAssign,
  embedded = false,
}: AssessmentSectionProps) {
  const { data, isLoading } = useCandidateJobAssessment(
    candidateId,
    jobId,
    assessmentEnabled ? defaultAssessmentId : null,
  );

  if (!assessmentEnabled || !defaultAssessmentId) return null;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  const assignment = data?.assignment;
  const status: PipelineAssessmentStatus = resolvePipelineAssessmentStatus(assignment);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        {embedded ? (
          <h4 className="text-sm font-medium">Avaliação da Vaga</h4>
        ) : (
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Avaliação
          </h3>
        )}
        <AssessmentStatusBadge status={status} />
      </div>

      {!assignment ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground italic">
            Nenhuma avaliação atribuída ainda para esta vaga.
          </p>
          {canAssign && onAssign && (
            <Button size="sm" variant="outline" onClick={onAssign}>
              Atribuir Avaliação
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <p className="font-medium">{assignment.assessment?.title || 'Avaliação'}</p>
          {assignment.deadline && (
            <p className="text-xs text-muted-foreground">
              Prazo: {format(new Date(assignment.deadline), 'dd/MM/yyyy')}
            </p>
          )}
          {assignment.completed_at && (
            <p className="text-xs text-muted-foreground">
              Concluído em {format(new Date(assignment.completed_at), 'dd/MM/yyyy')}
              {isGradingPending(assignment)
                ? ' · corrigindo…'
                : assignment.percentage != null ? ` · ${Math.round(assignment.percentage)}%` : ''}
            </p>
          )}
          {status === 'pending' && (
            <p className="text-xs text-muted-foreground capitalize">Status: {assignment.status.replace('_', ' ')}</p>
          )}
          {canAssign && onAssign && status !== 'passed' && (
            <Button size="sm" variant="outline" className="gap-1" onClick={onAssign}>
              <ExternalLink className="h-3.5 w-3.5" />
              Reatribuir / Reenviar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
