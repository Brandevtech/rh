import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { Pause, Pin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useJobs } from '@/hooks/useJobs';
import { usePinnedJobs } from '@/hooks/usePinnedJobs';
import { sortActiveJobsThenPaused } from '@/lib/pinnedJobs';
import { usePipelineJobCounts, usePendingApprovalCounts } from '@/hooks/useInterviewPipeline';
import { cn } from '@/lib/utils';

interface HiringJobPickerProps {
  showAllJobs?: boolean;
}

export function HiringJobPicker({ showAllJobs = false }: HiringJobPickerProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeJobId = searchParams.get('job');
  const { user } = useAuth();
  const { jobs } = useJobs({ summary: true });
  const { togglePin, isPinned, sortJobs } = usePinnedJobs(user?.id);

  const availableJobs = useMemo(
    () => sortActiveJobsThenPaused(
      sortJobs(jobs.filter((j: { status: string }) => j.status === 'open' || j.status === 'paused')),
    ),
    [jobs, sortJobs],
  );

  const openJobIds = useMemo(
    () => availableJobs.map((j: { id: string }) => j.id),
    [availableJobs],
  );

  const { data: jobCandidateCounts = new Map<string, number>() } = usePipelineJobCounts(openJobIds);
  const { data: pendingApprovalCounts = new Map<string, number>() } = usePendingApprovalCounts(openJobIds);

  const setJob = (jobId: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (jobId) next.set('job', jobId);
      else next.delete('job');
      return next;
    }, { replace: true });
  };

  if (availableJobs.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma vaga aberta encontrada.</p>;
  }

  return (
    <ScrollArea className="w-full min-w-0 max-w-full">
      <div className="flex border-b">
        {showAllJobs && (
          <button
            type="button"
            onClick={() => setJob(null)}
            className={cn(
              'px-4 py-2.5 text-label whitespace-nowrap border-b-2 -mb-px transition-colors duration-fast ease-out',
              !activeJobId
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            Todas as vagas
          </button>
        )}
        {availableJobs.map((job: { id: string; title: string; status: string }) => {
          const count = jobCandidateCounts.get(job.id) ?? 0;
          const pendingCount = pendingApprovalCounts.get(job.id) ?? 0;
          const isActive = activeJobId === job.id;
          const pinned = isPinned(job.id);
          return (
            <div
              key={job.id}
              ref={isActive ? (el) => el?.scrollIntoView({ block: 'nearest', inline: 'nearest' }) : undefined}
              className={cn(
                'group flex items-center border-b-2 -mb-px shrink-0',
                isActive ? 'border-primary' : 'border-transparent',
              )}
            >
              <button
                type="button"
                onClick={() => togglePin(job.id)}
                title={pinned ? 'Desafixar vaga' : 'Fixar vaga no início'}
                aria-label={pinned ? `Desafixar ${job.title}` : `Fixar ${job.title} no início`}
                className={cn(
                  'pl-3 pr-1 py-2.5 transition-opacity duration-fast ease-out',
                  pinned ? 'text-primary opacity-100' : 'text-muted-foreground opacity-0 group-hover:opacity-70',
                )}
              >
                <Pin className={cn('h-3 w-3 shrink-0', pinned && 'fill-current')} />
              </button>
              <button
                type="button"
                onClick={() => setJob(job.id)}
                className={cn(
                  'pr-4 py-2.5 text-label whitespace-nowrap transition-colors duration-fast ease-out flex items-center gap-2',
                  isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span>{job.title}</span>
                {job.status === 'paused' && (
                  <Badge variant="neutral" className="gap-1 text-[10px] px-1 py-0">
                    <Pause className="h-2.5 w-2.5" /> Pausada
                  </Badge>
                )}
                {count > 0 && (
                  <Badge
                    variant={isActive ? 'default' : 'neutral'}
                    className="text-xs px-1.5 py-0"
                  >
                    {count}
                  </Badge>
                )}
                {pendingCount > 0 && (
                  <Badge
                    className="bg-violet-500 text-white hover:bg-violet-600 text-xs px-1.5 py-0"
                    title={`${pendingCount} aprovação pendente`}
                  >
                    {pendingCount}
                  </Badge>
                )}
              </button>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
