import { useState, useEffect, useMemo, useCallback } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useNavigate, Link, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useApplicantAuth } from '@/hooks/useApplicantAuth';
import { 
  useApplicantApplications, 
  useApplicantAssessments, 
  useStartAssessment,
  useApplicantUpdateProfile,
} from '@/hooks/useApplicantPortal';
import { useApplicantJobs, useQuickApply, useApplicantApplicationEligibility } from '@/hooks/useApplicantJobs';
import { 
  Briefcase, 
  ClipboardCheck, 
  User, 
  LogOut, 
  MapPin, 
  Clock,
  Calendar,
  AlertCircle,
  Play,
  Loader2,
  ExternalLink,
  Search,
  Sparkles,
  AlertTriangle,
  ChevronRight,
  UserPlus,
  Percent,
} from 'lucide-react';
import { format } from 'date-fns';
import { ApplicantPortalHeader, useCompanyDisplayName } from '@/components/CompanyLogo';
import { ApplicantProfileModal } from '@/components/applicant/ApplicantProfileModal';
import { ApplicantProfileView } from '@/components/applicant/ApplicantProfileView';
import { ApplicantFooter } from '@/components/applicant/ApplicantFooter';
import { ApplicantNotificationMenu } from '@/components/applicant/ApplicantNotificationMenu';
import { QuickApplyDialog } from '@/components/applicant/QuickApplyDialog';
import { ApplicantJobCard } from '@/components/applicant/ApplicantJobCard';
import { isProfileIncomplete, getProfileCompleteness, parseNotificationPrefs, getApplicantDisplayName, getApplicantFirstName, type NotificationPrefs } from '@/lib/applicantProfile';
import { getReferralShareCount } from '@/lib/jobShare';
import { buildApplicantSkillCorpus } from '@/lib/jobMatchScore';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  reviewing: 'bg-yellow-100 text-yellow-800',
  shortlisted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  converted: 'bg-purple-100 text-purple-800',
  invited: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  evaluated: 'bg-purple-100 text-purple-800',
  expired: 'bg-gray-100 text-gray-800',
};

const statusLabels: Record<string, string> = {
  new: 'Enviada',
  reviewing: 'Em Análise',
  shortlisted: 'Pré-selecionado',
  rejected: 'Não Selecionado',
  converted: 'Etapa de Entrevistas',
  invited: 'Pendente',
  in_progress: 'Em Andamento',
  completed: 'Concluída',
  evaluated: 'Avaliada',
  expired: 'Expirada',
};

const assessmentStatusLabels: Record<string, string> = {
  invited: 'Pendente',
  in_progress: 'Em Andamento',
  completed: 'Concluída',
  evaluated: 'Enviada',
  expired: 'Expirada',
};

function filterJobsByQuery<T extends { job: { title: string; department?: string; location?: string } }>(
  items: T[],
  searchQuery: string,
): T[] {
  if (!searchQuery) return items;
  const q = searchQuery.toLowerCase();
  return items.filter(({ job }) =>
    job.title.toLowerCase().includes(q) ||
    job.department?.toLowerCase().includes(q) ||
    job.location?.toLowerCase().includes(q),
  );
}

function DashboardStatCard({
  title,
  value,
  description,
  icon: Icon,
  valueClassName,
  onClick,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  valueClassName?: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className={cn(onClick && 'cursor-pointer hover:bg-muted/30 transition-colors')}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold', valueClassName)}>{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function BrowseJobsSection({ 
  profileIncomplete, 
  onOpenProfile,
  applications,
  onReferralShared,
}: { 
  profileIncomplete: boolean; 
  onOpenProfile: () => void;
  applications: { job_id: string }[];
  onReferralShared?: () => void;
}) {
  const { profile } = useApplicantAuth();
  const { jobs, isLoading, relevantJobs, otherJobs } = useApplicantJobs();
  const { canApply, blockMessage } = useApplicantApplicationEligibility();
  const hasProfileMatchData = buildApplicantSkillCorpus(profile).length > 0;
  const quickApply = useQuickApply();
  const [searchQuery, setSearchQuery] = useState('');
  const [quickApplyJob, setQuickApplyJob] = useState<typeof jobs[0] | null>(null);

  const appliedJobIds = new Set(applications.map((a) => a.job_id));

  const filteredRelevantJobs = useMemo(
    () => filterJobsByQuery(relevantJobs, searchQuery),
    [relevantJobs, searchQuery],
  );
  const filteredOtherJobs = useMemo(
    () => filterJobsByQuery(otherJobs, searchQuery),
    [otherJobs, searchQuery],
  );
  const hasFilteredResults = filteredRelevantJobs.length > 0 || filteredOtherJobs.length > 0;

  const handleQuickApply = (job: typeof jobs[0]) => {
    if (profileIncomplete) {
      onOpenProfile();
      return;
    }
    if (!canApply) return;
    setQuickApplyJob(job);
  };

  const handleConfirmApply = async (coverLetter?: string) => {
    if (!quickApplyJob) return;
    await quickApply.mutateAsync({ job: quickApplyJob, cover_letter: coverLetter });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Vagas Abertas</CardTitle>
            <CardDescription>Consulte e candidate-se às vagas com um clique</CardDescription>
          </div>
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar vagas..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {profileIncomplete && (
          <div 
            className="mb-4 p-3 border border-amber-200 bg-amber-50 rounded-lg flex items-start sm:items-center gap-3 cursor-pointer hover:bg-amber-100 transition-colors"
            onClick={onOpenProfile}
          >
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <p className="text-sm text-amber-800 min-w-0">
              <span className="font-medium">Complete seu perfil para ativar a candidatura com um clique.</span>{' '}
              Adicione seu nome, telefone, LinkedIn e currículo primeiro.
            </p>
          </div>
        )}

        {!profileIncomplete && !canApply && blockMessage && (
          <div className="mb-4 p-3 border border-muted bg-muted/40 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground min-w-0">{blockMessage}</p>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">Nenhuma vaga aberta encontrada</h3>
            <p className="text-muted-foreground">Volte em breve para conferir novas oportunidades.</p>
          </div>
        ) : searchQuery && !hasFilteredResults ? (
          <div className="text-center py-12">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">Nenhuma vaga correspondente</h3>
            <p className="text-muted-foreground">Tente outro termo de busca.</p>
          </div>
        ) : (
          <div className="space-y-8">
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Relevante para você</h3>
                <Badge variant="secondary" className="text-xs">
                  {filteredRelevantJobs.length}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground -mt-2">
                Vagas que combinam com seu perfil em 60% ou mais.
              </p>
              {filteredRelevantJobs.length > 0 ? (
                filteredRelevantJobs.map(({ job, matchScore }) => (
                  <ApplicantJobCard
                    key={job.id}
                    job={job}
                    matchScore={matchScore}
                    showMatchScore={hasProfileMatchData}
                    isRelevant
                    alreadyApplied={appliedJobIds.has(job.id)}
                    applyBlocked={!canApply && !appliedJobIds.has(job.id)}
                    applyBlockMessage={!appliedJobIds.has(job.id) ? blockMessage : undefined}
                    profileIncomplete={profileIncomplete}
                    isApplying={quickApply.isPending && quickApplyJob?.id === job.id}
                    onQuickApply={handleQuickApply}
                    onReferralShared={onReferralShared}
                  />
                ))
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium">Nenhuma recomendação forte ainda</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {hasProfileMatchData
                      ? 'Nenhuma das vagas abertas atinge 60% de compatibilidade no momento. Explore outras vagas abaixo.'
                      : 'Complete seu perfil e envie seu currículo para visualizar recomendações personalizadas.'}
                  </p>
                  {!hasProfileMatchData && (
                    <Button variant="outline" size="sm" className="mt-3" onClick={onOpenProfile}>
                      Completar perfil
                    </Button>
                  )}
                </div>
              )}
            </section>

            {filteredOtherJobs.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Outras vagas</h3>
                  <Badge variant="outline" className="text-xs">
                    {filteredOtherJobs.length}
                  </Badge>
                </div>
                {filteredOtherJobs.map(({ job, matchScore }) => (
                  <ApplicantJobCard
                    key={job.id}
                    job={job}
                    matchScore={matchScore}
                    showMatchScore={hasProfileMatchData}
                    alreadyApplied={appliedJobIds.has(job.id)}
                    applyBlocked={!canApply && !appliedJobIds.has(job.id)}
                    applyBlockMessage={!appliedJobIds.has(job.id) ? blockMessage : undefined}
                    profileIncomplete={profileIncomplete}
                    isApplying={quickApply.isPending && quickApplyJob?.id === job.id}
                    onQuickApply={handleQuickApply}
                    onReferralShared={onReferralShared}
                  />
                ))}
              </section>
            )}
          </div>
        )}
      </CardContent>

      <QuickApplyDialog
        job={quickApplyJob}
        open={!!quickApplyJob}
        onOpenChange={(open) => { if (!open) setQuickApplyJob(null); }}
        onApply={handleConfirmApply}
        isPending={quickApply.isPending}
      />
    </Card>
  );
}

const APPLICANT_TABS = ['profile', 'jobs', 'applications', 'assessments'] as const;

export default function ApplicantDashboard() {
  const companyName = useCompanyDisplayName();
  usePageTitle(companyName ? `${companyName} | Portal do Candidato` : 'Portal do Candidato');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab = APPLICANT_TABS.includes(tabParam as typeof APPLICANT_TABS[number])
    ? (tabParam as typeof APPLICANT_TABS[number])
    : 'profile';
  const { user, profile, isLoading: authLoading, signOut, updateProfile } = useApplicantAuth();
  const { data: applications = [], isLoading: appsLoading } = useApplicantApplications();
  const { data: assessments = [], isLoading: assessmentsLoading } = useApplicantAssessments();
  const startAssessment = useStartAssessment();
  const updateProfileMutation = useApplicantUpdateProfile();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [referralCount, setReferralCount] = useState(0);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(
    parseNotificationPrefs(null),
  );

  const refreshReferralCount = useCallback(() => {
    if (user?.id) {
      setReferralCount(getReferralShareCount(user.id));
    }
  }, [user?.id]);

  useEffect(() => {
    refreshReferralCount();
  }, [refreshReferralCount]);

  useEffect(() => {
    if (profile?.notification_prefs) {
      setNotificationPrefs(parseNotificationPrefs(profile.notification_prefs));
    }
  }, [profile]);

  const setActiveTab = (tab: typeof APPLICANT_TABS[number]) => {
    setSearchParams(tab === 'profile' ? {} : { tab });
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/applicant/login');
    }
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/applicant/login');
  };

  const handleNotificationChange = async (key: keyof NotificationPrefs, value: boolean) => {
    const next = { ...notificationPrefs, [key]: value };
    setNotificationPrefs(next);
    const { error } = await updateProfile({ notification_prefs: next });
    if (error) {
      setNotificationPrefs(notificationPrefs);
    }
  };

  const handleStartAssessment = async (assessmentId: string) => {
    await startAssessment.mutateAsync(assessmentId);
    navigate(`/exam/${assessmentId}`);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const profileIncomplete = isProfileIncomplete(profile);
  const profileCompleteness = getProfileCompleteness(profile);
  const openAssessments = assessments.filter(
    (a) => a.status === 'invited' || a.status === 'in_progress',
  ).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Incomplete Profile Notice */}
      {profileIncomplete && (
        <div
          className="bg-amber-50 border-b border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors"
          onClick={() => setIsProfileOpen(true)}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-start sm:items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <p className="text-sm text-amber-800 min-w-0">
              <span className="font-medium">Seu perfil está incompleto.</span>{' '}
              Clique aqui para preencher nome, telefone, LinkedIn e currículo — eles serão aproveitados automaticamente nas candidaturas.
            </p>
          </div>
        </div>
      )}

      <ApplicantPortalHeader
        homeHref="/applicant"
        actions={
          <>
            <span className="text-sm text-muted-foreground hidden md:flex items-center gap-2 truncate max-w-[180px]">
              {profile?.avatar_url && (
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={profile.avatar_url} alt={getApplicantDisplayName(profile ?? {})} />
                  <AvatarFallback className="text-xs">
                    {(getApplicantDisplayName(profile ?? {}) || profile?.email || 'A').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              {getApplicantDisplayName(profile ?? {}) || profile?.email}
            </span>
            <ApplicantNotificationMenu
              notificationPrefs={notificationPrefs}
              onNotificationChange={handleNotificationChange}
              pending={updateProfileMutation.isPending}
            />
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </>
        }
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Bem-vindo(a) de volta, {profile ? (getApplicantFirstName(profile) || 'Candidato') : 'Candidato'}!</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe suas candidaturas e realize avaliações em um só lugar.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <DashboardStatCard
            title="Preenchimento do Perfil"
            value={`${profileCompleteness.percent}%`}
            description={profileCompleteness.isComplete ? 'Perfil completo' : 'Complete para ativar candidatura rápida'}
            icon={Percent}
            valueClassName={
              profileCompleteness.percent === 100
                ? 'text-green-600'
                : profileCompleteness.percent >= 60
                  ? 'text-amber-600'
                  : undefined
            }
            onClick={() => setActiveTab('profile')}
          />
          <DashboardStatCard
            title="Vagas Indicadas"
            value={referralCount}
            description={referralCount > 0 ? 'Vagas compartilhadas com amigos' : 'Indique vagas para amigos'}
            icon={UserPlus}
            onClick={() => setActiveTab('jobs')}
          />
          <DashboardStatCard
            title="Candidaturas"
            value={appsLoading ? '—' : applications.length}
            description={applications.length === 1 ? '1 candidatura enviada' : `${applications.length} candidaturas enviadas`}
            icon={Briefcase}
            onClick={() => setActiveTab('applications')}
          />
          <DashboardStatCard
            title="Avaliações Pendentes"
            value={assessmentsLoading ? '—' : openAssessments}
            description={openAssessments > 0 ? 'Pendentes ou em andamento' : 'Nenhuma avaliação pendente'}
            icon={ClipboardCheck}
            onClick={() => setActiveTab('assessments')}
          />
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as typeof APPLICANT_TABS[number])}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto gap-1">
            <TabsTrigger value="profile" className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs sm:text-sm">
              <User className="h-4 w-4 shrink-0" />
              <span className="truncate">Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs sm:text-sm">
              <ExternalLink className="h-4 w-4 shrink-0" />
              <span className="truncate">Vagas Abertas</span>
            </TabsTrigger>
            <TabsTrigger value="applications" className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs sm:text-sm">
              <Briefcase className="h-4 w-4 shrink-0" />
              <span className="truncate">Minhas Candidaturas</span>
            </TabsTrigger>
            <TabsTrigger value="assessments" className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs sm:text-sm">
              <ClipboardCheck className="h-4 w-4 shrink-0" />
              <span className="truncate">Avaliações</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            {profile && (
              <ApplicantProfileView
                profile={profile}
                onEdit={() => setIsProfileOpen(true)}
              />
            )}
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications">
            <Card>
              <CardHeader>
                <CardTitle>Suas Candidaturas</CardTitle>
                <CardDescription>Acompanhe o status de todas as suas candidaturas</CardDescription>
              </CardHeader>
              <CardContent>
                {appsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : applications.length === 0 ? (
                  <div className="text-center py-12">
                    <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Nenhuma candidatura ainda</h3>
                    <p className="text-muted-foreground mb-4">
                      Explore as vagas abertas e candidate-se para a vaga desejada.
                    </p>
                    <Link to="/applicant?tab=jobs">
                      <Button>Explorar Vagas</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {applications.map((app) => (
                      <Link
                        key={app.id}
                        to={`/applicant/applications/${app.id}`}
                        className="block border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-semibold">{app.job?.title || 'Position'}</h4>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              {app.job?.department && (
                                <span>{app.job.department}</span>
                              )}
                              {app.job?.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {app.job.location}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Candidatou-se em {format(new Date(app.created_at), 'dd/MM/yyyy')}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-start shrink-0 flex-wrap justify-end">
                            {app.application_form_status === 'pending' && (
                              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                                Formulário pendente
                              </Badge>
                            )}
                            {app.application_form_status === 'submitted' && (
                              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                                Formulário preenchido
                              </Badge>
                            )}
                            <Badge className={cn(statusColors[app.status] || 'bg-gray-100')}>
                              {statusLabels[app.status] || app.status}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assessments Tab */}
          <TabsContent value="assessments">
            <Card>
              <CardHeader>
                <CardTitle>Suas Avaliações</CardTitle>
                <CardDescription>Realize as avaliações atribuídas para prosseguir no processo seletivo</CardDescription>
              </CardHeader>
              <CardContent>
                {assessmentsLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map(i => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : assessments.length === 0 ? (
                  <div className="text-center py-12">
                    <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Nenhuma avaliação atribuída</h3>
                    <p className="text-muted-foreground">
                      Quando você for selecionado para uma prova ou teste técnico, ela aparecerá aqui.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assessments.map((assessment) => (
                      <div key={assessment.id} className="border rounded-lg p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold">{assessment.assessment?.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {assessment.assessment?.description}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {assessment.assessment?.duration_minutes} minutos
                              </span>
                              {assessment.deadline &&
                                (assessment.status === 'invited' || assessment.status === 'in_progress') && (
                                <span className="flex items-center gap-1 text-orange-600">
                                  <AlertCircle className="h-3 w-3" />
                                  Prazo: {format(new Date(assessment.deadline), 'dd/MM/yyyy')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <Badge className={statusColors[assessment.status] || 'bg-gray-100'}>
                              {assessmentStatusLabels[assessment.status] || statusLabels[assessment.status] || assessment.status}
                            </Badge>
                            {assessment.status === 'invited' && (
                              <Button 
                                size="sm"
                                onClick={() => handleStartAssessment(assessment.id)}
                                disabled={startAssessment.isPending}
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Iniciar
                              </Button>
                            )}
                            {assessment.status === 'in_progress' && (
                              <Button 
                                size="sm"
                                onClick={() => navigate(`/exam/${assessment.id}`)}
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Continuar
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Browse Jobs Tab */}
          <TabsContent value="jobs">
            <BrowseJobsSection 
              profileIncomplete={profileIncomplete}
              onOpenProfile={() => setIsProfileOpen(true)}
              applications={applications}
              onReferralShared={refreshReferralCount}
            />
          </TabsContent>
        </Tabs>
      </main>

      <ApplicantProfileModal open={isProfileOpen} onOpenChange={setIsProfileOpen} />
      <ApplicantFooter />
    </div>
  );
}
