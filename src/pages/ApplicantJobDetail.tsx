import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useApplicantAuth } from '@/hooks/useApplicantAuth';
import { useApplicantApplications } from '@/hooks/useApplicantPortal';
import { useApplicantJob, useQuickApply, useApplicantApplicationEligibility } from '@/hooks/useApplicantJobs';
import { ApplicantPortalHeader, useCompanyDisplayName } from '@/components/CompanyLogo';
import { QuickApplyDialog } from '@/components/applicant/QuickApplyDialog';
import { JobShareButton } from '@/components/applicant/JobShareButton';
import { isProfileIncomplete } from '@/lib/applicantProfile';
import { getMatchScoreColorClass } from '@/lib/jobMatchScore';
import { jobTypeLabels, experienceLevelLabels } from '@/types/jobs';
import { format, isPast } from 'date-fns';
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle,
  Clock,
  GraduationCap,
  Loader2,
  MapPin,
  Send,
  Sparkles,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ApplicantJobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const companyName = useCompanyDisplayName();
  const { user, profile, isLoading: authLoading } = useApplicantAuth();
  const { data: applications = [] } = useApplicantApplications();
  const { job, matchScore, isRelevant, isLoading, error } = useApplicantJob(id);
  const { canApply, blockMessage } = useApplicantApplicationEligibility(id);
  const quickApply = useQuickApply();
  const [isQuickApplyOpen, setIsQuickApplyOpen] = useState(false);

  usePageTitle(
    job?.title
      ? `${job.title} | ${companyName || 'Portal do Candidato'}`
      : companyName
        ? `${companyName} | Detalhes da Vaga`
        : 'Detalhes da Vaga',
  );

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/applicant/login');
    }
  }, [user, authLoading, navigate]);

  const profileIncomplete = isProfileIncomplete(profile);
  const alreadyApplied = applications.some((app) => app.job_id === job?.id);
  const deadlinePassed = job?.application_deadline && isPast(new Date(job.application_deadline));

  const handleQuickApply = () => {
    if (profileIncomplete) {
      navigate('/applicant/profile');
      return;
    }
    if (!canApply) return;
    setIsQuickApplyOpen(true);
  };

  const handleConfirmApply = async (coverLetter?: string) => {
    if (!job) return;
    await quickApply.mutateAsync({ job, cover_letter: coverLetter });
    setIsQuickApplyOpen(false);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <ApplicantPortalHeader homeHref="/applicant" />
        <main className="max-w-4xl mx-auto px-4 py-8 w-full space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  if (!user) return null;

  if (error || !job) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <ApplicantPortalHeader homeHref="/applicant" />
        <main className="max-w-4xl mx-auto px-4 py-8 w-full">
          <Button variant="ghost" asChild className="mb-6 gap-2">
            <Link to="/applicant?tab=jobs">
              <ArrowLeft className="h-4 w-4" />
              Voltar para Vagas Abertas
            </Link>
          </Button>
          <Card className="text-center py-12">
            <CardContent>
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Vaga não encontrada</h2>
              <p className="text-muted-foreground">Esta oportunidade pode ter sido encerrada ou removida.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ApplicantPortalHeader homeHref="/applicant" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <Button variant="ghost" asChild className="mb-6 gap-2">
          <Link to="/applicant?tab=jobs">
            <ArrowLeft className="h-4 w-4" />
            Back to Browse Jobs
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <CardTitle className="text-2xl">{job.title}</CardTitle>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="secondary">{jobTypeLabels[job.job_type]}</Badge>
                  {job.experience_level && (
                    <Badge variant="outline">
                      {experienceLevelLabels[job.experience_level]}
                    </Badge>
                  )}
                  {isRelevant && (
                    <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary border-primary/20">
                      <Sparkles className="h-3 w-3" />
                      Relevante para você
                    </Badge>
                  )}
                  {alreadyApplied && (
                    <Badge className="bg-green-100 text-green-800 gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Candidatou-se
                    </Badge>
                  )}
                  {deadlinePassed && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Prazo Encerrado
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 shrink-0">
                <JobShareButton job={job} />
                {alreadyApplied ? (
                  <Button variant="outline" disabled className="gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Candidatou-se
                  </Button>
                ) : !canApply ? (
                  <Button variant="outline" disabled className="gap-2" title={blockMessage}>
                    Candidatura Rápida
                  </Button>
                ) : (
                  <Button onClick={handleQuickApply} disabled={!!deadlinePassed || quickApply.isPending} className="gap-2">
                    {quickApply.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {deadlinePassed ? 'Encerrada' : profileIncomplete ? 'Complete o Perfil para Candidatar-se' : 'Candidatura Rápida'}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          {!alreadyApplied && !canApply && blockMessage && (
            <div className="px-6 pb-2">
              <p className="text-sm text-muted-foreground border rounded-lg p-3 bg-muted/30">{blockMessage}</p>
            </div>
          )}

          <CardContent className="space-y-6">
            {matchScore > 0 && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Compatibilidade</span>
                  <span className={cn('text-sm font-bold ml-auto', getMatchScoreColorClass(matchScore))}>
                    {matchScore}%
                  </span>
                </div>
                <Progress value={matchScore} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  Baseado em suas habilidades, experiência e formação comparadas aos requisitos da vaga.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-6 text-sm">
              {job.department && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Equipe</p>
                    <p className="font-medium">{job.department}</p>
                  </div>
                </div>
              )}
              {job.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Localização</p>
                    <p className="font-medium">{job.location}</p>
                  </div>
                </div>
              )}
              {job.experience_level && (
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Experiência</p>
                    <p className="font-medium">{experienceLevelLabels[job.experience_level]}</p>
                  </div>
                </div>
              )}
            </div>

            {job.description && (
              <div>
                <h3 className="font-semibold mb-2">Sobre esta vaga</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{job.description}</p>
              </div>
            )}

            {job.required_skills.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Habilidades Necessárias</h3>
                <div className="flex flex-wrap gap-2">
                  {job.required_skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="whitespace-normal break-words max-w-full text-left py-1 px-3 leading-snug">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {job.application_deadline && (
              <p
                className={cn(
                  'text-sm flex items-center gap-2 pt-4 border-t',
                  deadlinePassed ? 'text-destructive' : 'text-muted-foreground',
                )}
              >
                <Clock className="h-4 w-4" />
                Prazo de candidatura: {format(new Date(job.application_deadline), 'dd/MM/yyyy')}
                {deadlinePassed && ' (encerrado)'}
              </p>
            )}
          </CardContent>
        </Card>
      </main>

      <QuickApplyDialog
        job={job}
        open={isQuickApplyOpen}
        onOpenChange={setIsQuickApplyOpen}
        onApply={handleConfirmApply}
        isPending={quickApply.isPending}
      />
    </div>
  );
}
