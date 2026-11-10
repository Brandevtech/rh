import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Footer } from '@/components/Footer';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useJobs } from '@/hooks/useJobs';
import { useRecruitmentTracker, TrackerStage } from '@/hooks/useRecruitmentTracker';
import { useRecruiterPerformance, useRecruiterPerformanceDetail, RecruiterStat } from '@/hooks/useRecruiterPerformance';
import { useVendors } from '@/hooks/useVendors';
import { useVendorPerformance, useVendorPerformanceDetail, type VendorStat } from '@/hooks/useVendorPerformance';
import { useReportsJobStats } from '@/hooks/useReportsJobStats';
import { useAuth } from '@/hooks/useAuth';
import { TimeVelocitySection } from '@/components/reports/TimeVelocitySection';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  FileSpreadsheet, Loader2, Users, CheckCircle2, XCircle, PauseCircle,
  Clock, ChevronRight, TrendingUp, Sparkles, AlertTriangle,
  BarChart3, Trophy, Briefcase, UserRound, Building2, Gauge,
} from 'lucide-react';
import { differenceInDays, parseISO, subDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { usePipelineAnalysis, useAnalysePipeline, computePipelineMetrics } from '@/hooks/usePipelineAnalysis';
import { PipelineHealthPanel } from '@/components/pipeline/PipelineHealthPanel';
import { cn } from '@/lib/utils';
import { parseReportsTab, type ReportsTab } from '@/lib/navConfig';

const verdictColors: Record<string, string> = {
  proceeded: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected:  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  hold:      'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  no_show:   'bg-muted text-muted-foreground',
};

const verdictLabels: Record<string, string> = {
  proceeded: 'Avançado',
  rejected:  'Reprovado',
  hold:      'Em espera',
  no_show:   'Não compareceu',
};

const modeLabels: Record<string, string> = {
  in_person: 'Presencial',
  video:     'Vídeo',
  phone:     'Telefone',
};

const jobStatusLabels: Record<string, string> = {
  open:   'Aberta',
  paused: 'Pausada',
  draft:  'Rascunho',
  closed: 'Encerrada',
};

const sourceLabels: Record<string, string> = {
  manual: 'Manual',
  referral: 'Indicação',
  linkedin: 'LinkedIn',
  vendor: 'Fornecedor',
  careers_page: 'Página de Vagas',
  job_board: 'Portal de Vagas',
};

// ── Tooltip-wrapped truncated cell ───────────────────────────────────────────

function TruncCell({
  text,
  maxW = 200,
  className,
}: {
  text: string | null | undefined;
  maxW?: number;
  className?: string;
}) {
  if (!text) return <span className="text-muted-foreground">—</span>;
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <span
          className={cn('block truncate cursor-default', className)}
          style={{ maxWidth: maxW }}
        >
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        className="max-w-xs text-xs leading-relaxed whitespace-pre-wrap wrap-break-word"
      >
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Reports() {
  usePageTitle('Relatórios — Acompanhamento de Recrutamento');
  const { toast } = useToast();
  const { isAdminOrHR } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { jobs, isLoading: jobsLoading } = useJobs({ reportList: true });
  const [selectedJobId, setSelectedJobId] = useState<string | null>(() => searchParams.get('job'));
  const { stages, rows, isLoading: trackerLoading } = useRecruitmentTracker(selectedJobId);
  const { data: scoreResult } = usePipelineAnalysis(selectedJobId);
  const analysePipeline = useAnalysePipeline();

  // View toggle: job report vs recruiter leaderboard vs vendor leaderboard vs time & velocity
  const [view, setViewState] = useState<ReportsTab>(() => parseReportsTab(searchParams.toString()));

  const setView = (next: ReportsTab) => {
    setViewState(next);
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev);
      nextParams.set('tab', next);
      if (next !== 'job') nextParams.delete('job');
      return nextParams;
    }, { replace: true });
  };

  // Deep-link: /reports?job=<uuid> opens that job's tracker
  const jobFromUrl = searchParams.get('job');
  const tabFromUrl = searchParams.get('tab');
  useEffect(() => {
    if (jobFromUrl) {
      setSelectedJobId(jobFromUrl);
    }
    if (jobFromUrl && !tabFromUrl) {
      setViewState('job');
      return;
    }
    setViewState(parseReportsTab(searchParams.toString()));
  }, [jobFromUrl, tabFromUrl, searchParams]);

  const selectJob = (jobId: string | null) => {
    setSelectedJobId(jobId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', 'job');
      if (jobId) next.set('job', jobId);
      else next.delete('job');
      return next;
    }, { replace: true });
  };

  // Recruiter leaderboard state
  const [dateRange, setDateRange] = useState('7');
  const [selectedRecruiter, setSelectedRecruiter] = useState<RecruiterStat | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<VendorStat | null>(null);

  const today = format(new Date(), 'yyyy-MM-dd');
  const rangeStart = format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd');
  const recruiterQuery = (searchParams.get('q') ?? '').trim().toLowerCase();
  const { data: recruiterStats = [], isLoading: recruiterLoading } = useRecruiterPerformance(
    rangeStart,
    today,
    { enabled: view === 'recruiter' },
  );
  const filteredRecruiterStats = recruiterQuery
    ? recruiterStats.filter((r) => r.recruiter_name.toLowerCase().includes(recruiterQuery))
    : recruiterStats;
  const { data: recruiterDetail, isLoading: recruiterDetailLoading } = useRecruiterPerformanceDetail(
    selectedRecruiter?.recruiter_id,
    rangeStart,
    today,
  );

  const { data: allVendors = [] } = useVendors(false, { enabled: view === 'vendor' });
  const { data: vendorStats = [], isLoading: vendorLoading } = useVendorPerformance(
    allVendors,
    rangeStart,
    today,
    { enabled: view === 'vendor' },
  );
  const { data: vendorDetailCandidates = [], isLoading: vendorDetailLoading } = useVendorPerformanceDetail(
    selectedVendor?.vendor.source_key,
    rangeStart,
    today,
  );

  const { data: jobIvStats = {}, isError: jobStatsError, refetch: refetchJobStats } = useReportsJobStats(
    view === 'job' && !selectedJobId,
  );

  const staticColumns = [
    { key: 'sno',           label: 'Nº',                  width: 'w-12' },
    { key: 'recruiter',     label: 'Recrutador',          width: 'w-32' },
    { key: 'source',        label: 'Origem',              width: 'w-24' },
    { key: 'position',      label: 'Vaga',                width: 'w-44' },
    { key: 'name',          label: 'Nome do Candidato',   width: 'w-40' },
    { key: 'phone',         label: 'Telefone',            width: 'w-36' },
    { key: 'email',         label: 'E-mail',              width: 'w-48' },
    { key: 'total_exp',     label: 'Exp. Total',          width: 'w-24' },
    { key: 'relevant_exp',  label: 'Exp. Relevante',      width: 'w-28' },
    { key: 'current_ctc',   label: 'Salário Atual',       width: 'w-28' },
    { key: 'expected_ctc',  label: 'Pretensão Salarial',  width: 'w-32' },
    { key: 'notice_period', label: 'Aviso Prévio',        width: 'w-28' },
    { key: 'status',        label: 'Status da Entrevista',width: 'w-32' },
  ];

  const stageSubColumns = ['Status', 'Entrevistador', 'Feedback', 'Data', 'Horário', 'Modalidade'];

  const trailingColumns = [
    { key: 'final_feedback', label: 'Feedback Final',           width: 'w-40' },
    { key: 'remarks',        label: 'Observações',              width: 'w-40' },
    { key: 'comms_rating',   label: 'Avaliação de Comunicação', width: 'w-32' },
  ];

  const getOverallStatus = (interviews: Record<string, any>, stagesList: TrackerStage[]) => {
    const sorted = [...stagesList].sort((a, b) => b.order_index - a.order_index);
    for (const s of sorted) {
      const iv = interviews[s.stage_id];
      if (iv?.verdict) return iv.verdict;
    }
    return null;
  };

  const getFinalFeedback = (interviews: Record<string, any>, stagesList: TrackerStage[]) => {
    const sorted = [...stagesList].sort((a, b) => b.order_index - a.order_index);
    for (const s of sorted) {
      const iv = interviews[s.stage_id];
      if (iv?.feedback) return iv.feedback as string;
    }
    return null;
  };

  const handleAnalysePipeline = async () => {
    const selectedJob = (jobs || []).find(j => j.id === selectedJobId);
    if (!selectedJob || rows.length === 0 || analysePipeline.isPending) return;
    try {
      await analysePipeline.mutateAsync({
        job: {
          id: selectedJob.id,
          title: selectedJob.title,
          total_openings: (selectedJob as { total_openings?: number | null }).total_openings ?? null,
          application_deadline: selectedJob.application_deadline ?? null,
          status: selectedJob.status,
        },
        metrics: computePipelineMetrics(
          stages,
          rows,
          selectedJob.application_deadline ?? null,
          selectedJob.created_at ?? null,
        ),
      });
    } catch (err) {
      toast({
        title: 'Falha na análise',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const scoring = analysePipeline.isPending;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <FileSpreadsheet className="w-6 h-6 text-primary shrink-0" />
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">Acompanhamento de Recrutamento</h1>
            </div>
            <div className="flex rounded-lg border border-border overflow-hidden sm:ml-2 w-fit">
              <button
                onClick={() => setView('job')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                  view === 'job' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Por Vaga
              </button>
              <button
                onClick={() => setView('recruiter')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                  view === 'recruiter' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                <Trophy className="h-3.5 w-3.5" />
                Por Recrutador
              </button>
              <button
                onClick={() => setView('vendor')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                  view === 'vendor' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                <Building2 className="h-3.5 w-3.5" />
                Por Fornecedor
              </button>
              {isAdminOrHR && (
                <button
                  onClick={() => setView('velocity')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                    view === 'velocity' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                  )}
                >
                  <Gauge className="h-3.5 w-3.5" />
                  Tempo & Velocidade
                </button>
              )}
            </div>
          </div>

          {/* Right controls — selected job title or date range picker */}
          {view === 'job' ? (
            selectedJobId && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Visualizando:</span>
                <span className="font-medium text-foreground truncate max-w-[280px]">
                  {(jobs || []).find(j => j.id === selectedJobId)?.title ?? ''}
                </span>
              </div>
            )
          ) : view === 'velocity' ? null : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Período:</span>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="14">Últimos 14 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* ── Time & Velocity view (admin/HR only) ───────────────────────────── */}
        {view === 'velocity' && isAdminOrHR && (
          <TimeVelocitySection />
        )}

        {/* ── Recruiter leaderboard view ───────────────────────────────────── */}
        {view === 'recruiter' && (
          <>
            {recruiterQuery && (
              <p className="text-sm text-muted-foreground mb-3">
                Exibindo recrutadores correspondentes a &ldquo;{searchParams.get('q')}&rdquo;
              </p>
            )}
            {recruiterLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredRecruiterStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                <UserRound className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg font-medium">
                  {recruiterQuery ? 'Nenhum recrutador corresponde a esse nome' : 'Nenhum candidato captado neste período'}
                </p>
                <p className="text-sm">{recruiterQuery ? 'Tente um nome diferente ou limpe o filtro' : 'Tente estender o período de datas'}</p>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground w-10">#</th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Recrutador</th>
                      <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">Captados</th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground min-w-[160px]">Funil</th>
                      <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">Avançados</th>
                      <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">Contratados</th>
                      <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">Pendentes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecruiterStats.map(r => {
                      const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : null;
                      return (
                        <tr
                          key={r.recruiter_id}
                          className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer group"
                          onClick={() => setSelectedRecruiter(r)}
                        >
                          <td className="px-3 py-3 text-center">
                            {medal
                              ? <span className="text-lg leading-none">{medal}</span>
                              : <span className="text-sm text-muted-foreground font-mono">{r.rank}</span>}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                                r.rank === 1 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                                r.rank === 2 ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' :
                                r.rank === 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' :
                                'bg-primary/10 text-primary',
                              )}>
                                {r.initials}
                              </div>
                              <div>
                                <p className="font-medium text-foreground group-hover:text-primary transition-colors">{r.recruiter_name}</p>
                                <p className="text-xs text-muted-foreground">{r.job_count} {r.job_count !== 1 ? 'vagas' : 'vaga'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center font-semibold">{r.sourced}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium w-6 text-right shrink-0">{r.in_pipeline}</span>
                              <div className="flex-1 min-w-[80px]">
                                <Progress value={r.conversion_pct} className="h-1.5" />
                              </div>
                              <span className="text-xs text-muted-foreground w-9 shrink-0">{r.conversion_pct}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            {r.proceeded > 0
                              ? <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{r.proceeded}</span>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {r.hired > 0
                              ? <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 font-semibold">{r.hired}</Badge>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {r.pending > 0
                              ? <span className="text-orange-600 font-medium">{r.pending}</span>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Recruiter drill-down drawer ── */}
            <Sheet open={!!selectedRecruiter} onOpenChange={open => { if (!open) setSelectedRecruiter(null); }}>
              <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                {selectedRecruiter && (
                  <>
                    <SheetHeader className="mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold">
                          {selectedRecruiter.initials}
                        </div>
                        <div>
                          <SheetTitle>{selectedRecruiter.recruiter_name}</SheetTitle>
                          <p className="text-sm text-muted-foreground">Últimos {dateRange} dias · {selectedRecruiter.sourced} candidatos captados</p>
                        </div>
                      </div>
                    </SheetHeader>

                    {/* Summary chips */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/60 border border-border text-sm">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        <span className="font-semibold">{selectedRecruiter.sourced}</span>
                        <span className="text-muted-foreground text-xs">Captados</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 text-sm">
                        <BarChart3 className="h-3.5 w-3.5 text-blue-600" />
                        <span className="font-semibold text-blue-700 dark:text-blue-400">{selectedRecruiter.in_pipeline}</span>
                        <span className="text-muted-foreground text-xs">No Funil</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 text-sm">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">{selectedRecruiter.proceeded}</span>
                        <span className="text-muted-foreground text-xs">Avançados</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 text-sm">
                        <Trophy className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">{selectedRecruiter.hired}</span>
                        <span className="text-muted-foreground text-xs">Contratados</span>
                      </div>
                      {selectedRecruiter.pending > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-200 dark:border-orange-800 text-sm">
                          <Clock className="h-3.5 w-3.5 text-orange-500" />
                          <span className="font-semibold text-orange-600 dark:text-orange-400">{selectedRecruiter.pending}</span>
                          <span className="text-muted-foreground text-xs">Pendentes</span>
                        </div>
                      )}
                    </div>

                    {recruiterDetailLoading ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : (
                    <>
                    {/* Jobs breakdown */}
                    {(recruiterDetail?.jobs.length ?? 0) > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                          <Briefcase className="h-4 w-4 text-muted-foreground" /> Detalhamento por Vaga
                        </h3>
                        <div className="border border-border rounded-lg overflow-hidden">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="bg-muted border-b border-border">
                                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Vaga</th>
                                <th className="px-3 py-2 text-center font-medium text-muted-foreground">Captados</th>
                                <th className="px-3 py-2 text-center font-medium text-muted-foreground">Funil</th>
                                <th className="px-3 py-2 text-center font-medium text-muted-foreground">Contratados</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(recruiterDetail?.jobs ?? []).map(j => (
                                <tr key={j.job_id} className="border-b border-border last:border-0 hover:bg-muted/30">
                                  <td className="px-3 py-2 font-medium">{j.title}</td>
                                  <td className="px-3 py-2 text-center">{j.sourced}</td>
                                  <td className="px-3 py-2 text-center text-blue-600 dark:text-blue-400">{j.in_pipeline}</td>
                                  <td className="px-3 py-2 text-center">
                                    {j.hired > 0
                                      ? <span className="text-emerald-600 font-semibold">{j.hired}</span>
                                      : <span className="text-muted-foreground">—</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Source breakdown */}
                    {(recruiterDetail?.sources.length ?? 0) > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" /> Detalhamento por Origem
                        </h3>
                        <div className="space-y-2">
                          {(recruiterDetail?.sources ?? []).map(s => {
                            const convPct = s.count > 0 ? Math.round((s.in_pipeline / s.count) * 100) : 0;
                            return (
                              <div key={s.source} className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground capitalize w-24 shrink-0">{sourceLabels[s.source] || s.source || 'manual'}</span>
                                <div className="flex-1">
                                  <Progress value={convPct} className="h-1.5" />
                                </div>
                                <span className="text-xs font-medium w-16 text-right shrink-0">{s.in_pipeline}/{s.count} ({convPct}%)</span>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1.5">A barra mostra a conversão do funil por origem</p>
                      </div>
                    )}

                    {/* Candidate list */}
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-muted-foreground" /> Candidatos ({recruiterDetail?.candidates.length ?? 0})
                      </h3>
                      <div className="border border-border rounded-lg overflow-hidden">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-muted border-b border-border">
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Nome</th>
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Vaga</th>
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Origem</th>
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Etapa Mais Alta</th>
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(recruiterDetail?.candidates ?? []).map(c => (
                              <tr
                                key={c.id}
                                className={cn(
                                  'border-b border-border last:border-0',
                                  c.is_hired && 'bg-emerald-50/60 dark:bg-emerald-950/20',
                                  !c.is_hired && c.overall_verdict === 'rejected' && 'bg-red-50/40 dark:bg-red-950/10',
                                )}
                              >
                                <td className="px-3 py-2 font-medium">{c.name}</td>
                                <td className="px-3 py-2 text-muted-foreground">{c.job_title}</td>
                                <td className="px-3 py-2 capitalize text-muted-foreground">{sourceLabels[c.source] || c.source || 'Manual'}</td>
                                <td className="px-3 py-2 text-muted-foreground">{c.highest_stage || '—'}</td>
                                <td className="px-3 py-2">
                                  {c.is_hired
                                    ? <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Contratado</span>
                                    : c.overall_verdict
                                      ? <span className={cn('capitalize',
                                          c.overall_verdict === 'proceeded' && 'text-emerald-600',
                                          c.overall_verdict === 'rejected' && 'text-red-500',
                                          c.overall_verdict === 'hold' && 'text-amber-600',
                                          c.overall_verdict === 'no_show' && 'text-muted-foreground',
                                        )}>{verdictLabels[c.overall_verdict] || c.overall_verdict.replace('_', ' ')}</span>
                                      : <span className="text-muted-foreground">—</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    </>
                    )}
                  </>
                )}
              </SheetContent>
            </Sheet>
          </>
        )}

        {/* ── Vendor leaderboard view ─────────────────────────────────────────── */}
        {view === 'vendor' && (
          <>
            {allVendors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                <Building2 className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg font-medium">Nenhum fornecedor cadastrado</p>
                <p className="text-sm">Adicione fornecedores em Configurações → Fornecedores e identifique as importações durante o upload em massa.</p>
              </div>
            ) : vendorLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground w-10">#</th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Fornecedor</th>
                      <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">Enviados</th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground min-w-[160px]">Funil</th>
                      <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">Etapa Final</th>
                      <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">Contratados</th>
                      <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">Taxa %</th>
                      <th className="px-3 py-2.5 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {vendorStats.map(vs => (
                      <tr
                        key={vs.vendor.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => setSelectedVendor(vs)}
                      >
                        <td className="px-3 py-3 text-muted-foreground font-mono text-xs">{vs.rank}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">
                              {vs.vendor.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">{vs.vendor.name}</p>
                              {vs.vendor.contact_name && <p className="text-xs text-muted-foreground">{vs.vendor.contact_name}</p>}
                            </div>
                            {!vs.vendor.is_active && (
                              <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">inativo</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center font-bold">{vs.submitted}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${vs.conversion_pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-10 text-right">{vs.in_pipeline} ({vs.conversion_pct}%)</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {vs.shortlisted > 0
                            ? <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{vs.shortlisted}</span>
                            : <span className="text-muted-foreground">0</span>
                          }
                        </td>
                        <td className="px-3 py-3 text-center">
                          {vs.hired > 0
                            ? <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full">✓ {vs.hired}</span>
                            : <span className="text-muted-foreground text-xs">—</span>
                          }
                        </td>
                        <td className="px-3 py-3 text-center text-muted-foreground text-xs">
                          {vs.vendor.fee_pct != null ? `${vs.vendor.fee_pct}%` : '—'}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Vendor detail sheet */}
            <Sheet open={!!selectedVendor} onOpenChange={o => { if (!o) setSelectedVendor(null); }}>
              <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                {selectedVendor && (
                  <>
                    <SheetHeader className="mb-4">
                      <SheetTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        {selectedVendor.vendor.name}
                      </SheetTitle>
                      {selectedVendor.vendor.contact_email && (
                        <p className="text-sm text-muted-foreground">{selectedVendor.vendor.contact_name} · {selectedVendor.vendor.contact_email}</p>
                      )}
                    </SheetHeader>

                    {/* Stats strip */}
                    <div className="grid grid-cols-4 gap-3 mb-6">
                      {[
                        { label: 'Enviados', value: selectedVendor.submitted, color: 'text-foreground' },
                        { label: 'No Funil', value: `${selectedVendor.in_pipeline} (${selectedVendor.conversion_pct}%)`, color: 'text-primary' },
                        { label: 'Etapa Final', value: selectedVendor.shortlisted, color: 'text-emerald-600' },
                        { label: 'Contratados', value: selectedVendor.hired, color: selectedVendor.hired > 0 ? 'text-emerald-600 font-bold' : 'text-muted-foreground' },
                      ].map(s => (
                        <div key={s.label} className="bg-muted/50 rounded-lg p-3 text-center">
                          <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {vendorDetailLoading ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : vendorDetailCandidates.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Nenhum candidato deste fornecedor no período selecionado.</p>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-muted border-b">
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Candidato</th>
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Vaga</th>
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Etapa</th>
                              <th className="px-3 py-2 text-center font-medium text-muted-foreground">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {vendorDetailCandidates.map(c => (
                              <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                                <td className="px-3 py-2.5 font-medium">{c.name}</td>
                                <td className="px-3 py-2.5 text-muted-foreground max-w-[140px] truncate">{c.job_title}</td>
                                <td className="px-3 py-2.5 text-muted-foreground">{c.highest_stage ?? '—'}</td>
                                <td className="px-3 py-2.5 text-center">
                                  {c.is_hired ? (
                                    <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">Contratado</span>
                                  ) : c.overall_verdict ? (
                                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', verdictColors[c.overall_verdict] ?? 'bg-muted text-muted-foreground')}>
                                      {verdictLabels[c.overall_verdict] || c.overall_verdict}
                                    </span>
                                  ) : c.is_in_pipeline ? (
                                    <span className="text-[10px] text-primary font-medium">No funil</span>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </SheetContent>
            </Sheet>
          </>
        )}

        {view === 'job' && !selectedJobId ? (
          <>
          {jobStatsError && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm mb-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Não foi possível carregar as estatísticas do funil. A lista de vagas é exibida sem as contagens de No Funil / Avançados / Pendentes.</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchJobStats()}>Tentar novamente</Button>
            </div>
          )}
          {jobsLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (jobs || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <FileSpreadsheet className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">Nenhuma vaga encontrada</p>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[720px]">
                <thead>
                  <tr className="bg-muted border-b border-border">
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Vaga</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground w-24">Status</th>
                    <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">Candidatos</th>
                    <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">No Funil</th>
                    <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">Avançados</th>
                    <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">Pendentes</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Prazo</th>
                  </tr>
                </thead>
                <tbody>
                  {[...(jobs || [])]
                    .sort((a, b) => {
                      const order: Record<string, number> = { open: 0, paused: 1, draft: 2, closed: 3 };
                      const diff = (order[a.status] ?? 4) - (order[b.status] ?? 4);
                      if (diff !== 0) return diff;
                      return ((b as any).candidate_count ?? 0) - ((a as any).candidate_count ?? 0);
                    })
                    .map(job => {
                      const stats = jobIvStats[job.id] ?? { inPipeline: 0, proceeded: 0, pending: 0 };
                      const totalCandidates = (job as any).candidate_count ?? 0;
                      const deadlineDays = job.application_deadline && job.status === 'open'
                        ? differenceInDays(parseISO(job.application_deadline), new Date())
                        : null;
                      const isDeadlineExpired = job.status === 'open' && deadlineDays !== null && deadlineDays < 0;
                      const isDeadlineSoon = job.status === 'open' && deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 20;
                      const statusCls: Record<string, string> = {
                        open:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
                        paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
                        draft:  'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
                        closed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
                      };
                      return (
                        <tr
                          key={job.id}
                          className={cn(
                            'border-b border-border transition-colors cursor-pointer group',
                            isDeadlineExpired
                              ? 'bg-red-50/90 hover:bg-red-100/80 dark:bg-red-950/25 dark:hover:bg-red-950/40'
                              : isDeadlineSoon
                                ? 'bg-amber-50/80 hover:bg-amber-100/70 dark:bg-amber-950/20 dark:hover:bg-amber-950/35'
                                : 'hover:bg-muted/30',
                          )}
                          onClick={() => selectJob(job.id)}
                        >
                          <td className="px-3 py-3">
                            <div>
                              <p className="font-medium group-hover:text-primary transition-colors">{job.title}</p>
                              {(job.department || (job as any).domain) && (
                                <p className="text-xs text-muted-foreground">{job.department || (job as any).domain}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-medium border capitalize', statusCls[job.status] ?? '')}>
                              {jobStatusLabels[job.status] ?? job.status}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center font-semibold">{totalCandidates}</td>
                          <td className="px-3 py-3 text-center">
                            {stats.inPipeline > 0
                              ? <span className="text-blue-600 dark:text-blue-400 font-medium">{stats.inPipeline}</span>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {stats.proceeded > 0
                              ? <span className="text-emerald-600 dark:text-emerald-400 font-medium">{stats.proceeded}</span>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {stats.pending > 0
                              ? <span className="text-orange-600 font-medium">{stats.pending}</span>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-3 py-3 text-sm">
                            {job.application_deadline ? (
                              <span className={cn(
                                job.status !== 'open' ? 'text-muted-foreground' :
                                deadlineDays === null ? 'text-muted-foreground' :
                                deadlineDays < 0 ? 'text-red-600 font-semibold' :
                                deadlineDays <= 7 ? 'text-orange-600 font-medium' :
                                deadlineDays <= 20 ? 'text-yellow-600' : 'text-muted-foreground'
                              )}>
                                {format(parseISO(job.application_deadline), 'dd MMM yyyy', { locale: ptBR })}
                                {job.status === 'open' && deadlineDays !== null && deadlineDays < 0 && (
                                  <span className="ml-1 text-xs font-normal">Expirado</span>
                                )}
                                {job.status === 'open' && deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 20 && (
                                  <span className="ml-1 text-xs font-normal">≤{deadlineDays}d</span>
                                )}
                              </span>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
          </>
        ) : view === 'job' && trackerLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : view === 'job' && rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <p className="text-lg font-medium">Nenhum candidato encontrado para esta vaga</p>
          </div>
        ) : view === 'job' ? (
          <>
            {/* Back to job listing */}
            <button
              onClick={() => selectJob(null)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              Todas as vagas
            </button>

            {/* ── Pipeline Summary ── */}
            {(() => {
              // Overall verdict counts
              let proceeded = 0, rejected = 0, hold = 0, noShow = 0, pendingFeedback = 0;
              rows.forEach(row => {
                const status = getOverallStatus(row.interviews, stages);
                if (status === 'proceeded') proceeded++;
                else if (status === 'rejected') rejected++;
                else if (status === 'hold') hold++;
                else if (status === 'no_show') noShow++;
                const hasPending = stages.some(s => {
                  const iv = row.interviews[s.stage_id];
                  return iv?.scheduled_date && !iv.verdict;
                });
                if (hasPending) pendingFeedback++;
              });

              // Per-stage funnel (sorted by order)
              const funnel = [...stages]
                .sort((a, b) => a.order_index - b.order_index)
                .map(stage => {
                  const inStage = rows.filter(r => r.interviews[stage.stage_id]);
                  const vds = inStage.map(r => r.interviews[stage.stage_id]?.verdict);
                  return {
                    ...stage,
                    count: inStage.length,
                    proceeded: vds.filter(v => v === 'proceeded').length,
                    rejected:  vds.filter(v => v === 'rejected').length,
                    hold:      vds.filter(v => v === 'hold').length,
                    pending:   inStage.filter(r => !r.interviews[stage.stage_id]?.verdict).length,
                  };
                });

              const conversionRate = rows.length > 0
                ? Math.round(
                    (rows.filter(
                      (r) => r.hired_at != null || r.candidate_status === 'shortlisted',
                    ).length /
                      rows.length) *
                      100,
                  )
                : null;

              return (
                <div className="mb-5 space-y-4">
                  {/* Stat chips */}
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted/60 border border-border">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-xl font-bold leading-none">{rows.length}</span>
                      <span className="text-xs text-muted-foreground leading-none">Total</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-xl font-bold leading-none text-emerald-700 dark:text-emerald-400">{proceeded}</span>
                      <span className="text-xs text-muted-foreground leading-none">Avançados</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 dark:border-red-800">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-xl font-bold leading-none text-red-600 dark:text-red-400">{rejected}</span>
                      <span className="text-xs text-muted-foreground leading-none">Reprovados</span>
                    </div>
                    {hold > 0 && (
                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-amber-200 dark:border-amber-800">
                        <PauseCircle className="h-4 w-4 text-amber-600" />
                        <span className="text-xl font-bold leading-none text-amber-700 dark:text-amber-400">{hold}</span>
                        <span className="text-xs text-muted-foreground leading-none">Em Espera</span>
                      </div>
                    )}
                    {pendingFeedback > 0 && (
                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-orange-200 dark:border-orange-800">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <span className="text-xl font-bold leading-none text-orange-600 dark:text-orange-400">{pendingFeedback}</span>
                        <span className="text-xs text-muted-foreground leading-none">Feedback Pendente</span>
                      </div>
                    )}
                    {conversionRate !== null && conversionRate > 0 && (
                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-violet-200 dark:border-violet-800">
                        <TrendingUp className="h-4 w-4 text-violet-600" />
                        <span className="text-xl font-bold leading-none text-violet-700 dark:text-violet-400">{conversionRate}%</span>
                        <span className="text-xs text-muted-foreground leading-none">Conversão</span>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAnalysePipeline}
                      disabled={scoring}
                      className="ml-auto gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                    >
                      {scoring
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Sparkles className="h-3.5 w-3.5" />}
                      {scoring ? 'Analisando…' : 'Analisar Funil'}
                    </Button>
                  </div>

                  {/* ── Score card ── */}
                  {scoreResult && selectedJobId && (
                    <PipelineHealthPanel
                      analysis={scoreResult}
                      jobId={selectedJobId}
                      scoring={scoring}
                      onRegenerate={handleAnalysePipeline}
                    />
                  )}

                  {/* Stage funnel */}
                  <div className="flex items-start gap-1.5 flex-wrap">
                    {funnel.map((s, i) => (
                      <div key={s.stage_id} className="flex items-start gap-1.5">
                        <div className="flex flex-col items-center gap-1">
                          <div className={cn(
                            'px-3 py-1.5 rounded-lg border text-center min-w-[80px]',
                            i === 0
                              ? 'bg-primary/10 border-primary/30'
                              : i === funnel.length - 1
                                ? 'bg-emerald-500/10 border-emerald-300 dark:border-emerald-700'
                                : 'bg-muted/60 border-border',
                          )}>
                            <p className={cn(
                              'text-lg font-bold leading-none',
                              i === funnel.length - 1 ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground',
                            )}>
                              {s.count}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[100px] truncate">{s.stage_name}</p>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-medium h-4">
                            {s.proceeded > 0 && <span className="text-emerald-600">↑{s.proceeded}</span>}
                            {s.rejected > 0  && <span className="text-red-500">✕{s.rejected}</span>}
                            {s.hold > 0      && <span className="text-amber-600">‖{s.hold}</span>}
                            {s.pending > 0   && <span className="text-orange-500">…{s.pending}</span>}
                          </div>
                        </div>
                        {i < funnel.length - 1 && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground mt-2 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <TooltipProvider>
                  <table className="min-w-max border-collapse text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th colSpan={staticColumns.length} className="border-r border-border" />
                        {stages.map((stage) => (
                          <th
                            key={stage.stage_id}
                            colSpan={stageSubColumns.length}
                            className="px-2 py-2 text-center font-semibold text-primary border-r border-border bg-primary/5"
                          >
                            {stage.stage_name}
                          </th>
                        ))}
                        <th colSpan={trailingColumns.length} />
                      </tr>
                      <tr className="bg-muted border-b border-border">
                        {staticColumns.map(col => (
                          <th
                            key={col.key}
                            className={cn('px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-r border-border', col.width)}
                          >
                            {col.label}
                          </th>
                        ))}
                        {stages.map((stage) =>
                          stageSubColumns.map((sub) => (
                            <th
                              key={`${stage.stage_id}-${sub}`}
                              className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-r border-border/50 min-w-[100px]"
                            >
                              {sub}
                            </th>
                          ))
                        )}
                        {trailingColumns.map(col => (
                          <th
                            key={col.key}
                            className={cn('px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-r border-border', col.width)}
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => {
                        const overallStatus = getOverallStatus(row.interviews, stages);
                        const finalFeedback = getFinalFeedback(row.interviews, stages);
                        return (
                          <tr key={row.candidate_id} className={cn(
                            'border-b border-border transition-colors',
                            overallStatus === 'rejected'  && 'bg-red-50/60 dark:bg-red-950/20 hover:bg-red-100/50 dark:hover:bg-red-950/30',
                            overallStatus === 'hold'      && 'bg-yellow-50/60 dark:bg-yellow-950/20 hover:bg-yellow-100/50 dark:hover:bg-yellow-950/30',
                            overallStatus === 'proceeded' && 'bg-emerald-50/60 dark:bg-emerald-950/20 hover:bg-emerald-100/50 dark:hover:bg-emerald-950/30',
                            !overallStatus               && 'hover:bg-muted/30',
                          )}>
                            {/* Static cells */}
                            <td className="px-3 py-2.5 text-muted-foreground border-r border-border">{idx + 1}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap border-r border-border">{row.recruiter_name || '—'}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap border-r border-border capitalize">
                              {sourceLabels[row.source] || row.source || '—'}
                              {row.source === 'referral' && row.referred_by && (
                                <div className="text-[11px] text-muted-foreground mt-0.5">por {row.referred_by}</div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 border-r border-border font-medium">
                              <TruncCell text={row.position_name} maxW={160} />
                            </td>
                            <td className="px-3 py-2.5 border-r border-border font-medium text-foreground">
                              <TruncCell text={row.candidate_name} maxW={150} />
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap border-r border-border">{row.phone || '—'}</td>
                            <td className="px-3 py-2.5 border-r border-border text-muted-foreground">
                              <TruncCell text={row.email} maxW={180} />
                            </td>
                            <td className="px-3 py-2.5 text-center border-r border-border">{row.total_experience ?? '—'}</td>
                            <td className="px-3 py-2.5 text-center border-r border-border">{row.relevant_experience ?? '—'}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap border-r border-border">{row.current_ctc || '—'}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap border-r border-border">{row.expected_ctc || '—'}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap border-r border-border">{row.notice_period || '—'}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap border-r border-border">
                              {overallStatus ? (
                                <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize', verdictColors[overallStatus] || 'bg-muted text-muted-foreground')}>
                                  {verdictLabels[overallStatus] || overallStatus.replace('_', ' ')}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>

                            {/* Dynamic stage cells */}
                            {stages.map((stage) => {
                              const iv = row.interviews[stage.stage_id];
                              return [
                                <td key={`${stage.stage_id}-status`} className="px-3 py-2.5 whitespace-nowrap border-r border-border/50">
                                  {iv?.verdict ? (
                                    <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize', verdictColors[iv.verdict] || 'bg-muted text-muted-foreground')}>
                                      {verdictLabels[iv.verdict] || iv.verdict.replace('_', ' ')}
                                    </span>
                                  ) : '—'}
                                </td>,
                                <td key={`${stage.stage_id}-interviewer`} className="px-3 py-2.5 whitespace-nowrap border-r border-border/50">
                                  {iv?.interviewer_name || '—'}
                                </td>,
                                <td key={`${stage.stage_id}-feedback`} className="px-3 py-2.5 border-r border-border/50">
                                  <TruncCell text={iv?.feedback} maxW={180} />
                                </td>,
                                <td key={`${stage.stage_id}-date`} className="px-3 py-2.5 whitespace-nowrap border-r border-border/50">
                                  {iv?.scheduled_date || '—'}
                                </td>,
                                <td key={`${stage.stage_id}-time`} className="px-3 py-2.5 whitespace-nowrap border-r border-border/50">
                                  {iv?.scheduled_time || '—'}
                                </td>,
                                <td key={`${stage.stage_id}-mode`} className="px-3 py-2.5 whitespace-nowrap border-r border-border/50 capitalize">
                                  {iv?.interview_mode ? (modeLabels[iv.interview_mode] || iv.interview_mode) : '—'}
                                </td>,
                              ];
                            })}

                            {/* Trailing cells */}
                            <td className="px-3 py-2.5 border-r border-border">
                              <TruncCell text={finalFeedback} maxW={180} />
                            </td>
                            <td className="px-3 py-2.5 border-r border-border">
                              <TruncCell text={row.notes} maxW={180} />
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {row.comms_rating != null ? `${row.comms_rating}/10` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </TooltipProvider>
              </div>
            </div>
          </>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
