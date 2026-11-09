import { useState, useEffect } from 'react';
import { Footer } from '@/components/Footer';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useJobPostingMeta } from '@/hooks/useJobPostingMeta';
import { useParams, Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Briefcase, 
  MapPin, 
  Clock,
  Building2,
  GraduationCap,
  CheckCircle,
  ArrowLeft,
  Send,
  Upload,
  Linkedin,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { usePublicJobs, useSubmitApplication } from '@/hooks/useJobs';
import { useQuickApply } from '@/hooks/useApplicantJobs';
import { fetchApplicantApplicationEligibility } from '@/lib/applicantApplicationEligibility';
import { QuickApplyDialog } from '@/components/applicant/QuickApplyDialog';
import { isProfileIncomplete } from '@/lib/applicantProfile';
import { supabase } from '@/integrations/supabase/client';
import { format, isPast } from 'date-fns';
import { jobTypeLabels, experienceLevelLabels, experienceYearsLabels } from '@/types/jobs';
import type { Job, ExperienceYearsRange } from '@/types/jobs';
import { useToast } from '@/hooks/use-toast';
import { CompanyLogo, useCompanyDisplayName } from '@/components/CompanyLogo';

function JobCard({ job, onApply }: { job: Job; onApply: (job: Job) => void }) {
  const deadlinePassed = job.application_deadline && isPast(new Date(job.application_deadline));
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{job.title}</CardTitle>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="secondary">{jobTypeLabels[job.job_type]}</Badge>
              {job.experience_level && (
                <Badge variant="outline">{experienceLevelLabels[job.experience_level]}</Badge>
              )}
              {(job as any).experience_years_range && (
                <Badge variant="outline">
                  {experienceYearsLabels[(job as any).experience_years_range as ExperienceYearsRange] || (job as any).experience_years_range}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {job.description && (
          <p className="text-muted-foreground line-clamp-3">{job.description}</p>
        )}
        
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {(job as any).domain && (
            <div className="flex items-center gap-1">
              <Briefcase className="h-4 w-4" />
              {(job as any).domain}
            </div>
          )}
          {job.department && (
            <div className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              {job.department}
            </div>
          )}
          {job.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {job.location}
            </div>
          )}
        </div>

        {job.required_skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {job.required_skills.map(skill => (
              <Badge key={skill} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {job.application_deadline && (
              <p className={`text-sm flex items-center gap-1 ${deadlinePassed ? 'text-destructive' : 'text-muted-foreground'}`}>
                <Clock className="h-4 w-4" />
                {deadlinePassed ? 'Prazo encerrado' : `Prazo: ${format(new Date(job.application_deadline), 'dd/MM/yyyy')}`}
              </p>
            )}
          </div>
          <Button onClick={() => onApply(job)} className="gap-2" disabled={!!deadlinePassed}>
            <Send className="h-4 w-4" />
            {deadlinePassed ? 'Encerrada' : 'Candidatar-se'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function JobDetailView({ job, onApply, onBack }: { job: Job; onApply: (job: Job) => void; onBack: () => void }) {
  const deadlinePassed = job.application_deadline && isPast(new Date(job.application_deadline));
  
  return (
    <div className="max-w-4xl mx-auto">
      <Button variant="ghost" onClick={onBack} className="mb-6 gap-2">
        <ArrowLeft className="h-4 w-4" />
        Voltar para todas as vagas
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{job.title}</CardTitle>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="secondary">{jobTypeLabels[job.job_type]}</Badge>
                {job.experience_level && (
                  <Badge variant="outline">{experienceLevelLabels[job.experience_level]}</Badge>
                )}
                {(job as any).experience_years_range && (
                  <Badge variant="outline">
                    {experienceYearsLabels[(job as any).experience_years_range as ExperienceYearsRange] || (job as any).experience_years_range}
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
            <Button onClick={() => onApply(job)} size="lg" className="gap-2" disabled={!!deadlinePassed}>
              <Send className="h-4 w-4" />
              {deadlinePassed ? 'Closed' : 'Apply Now'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-6 text-sm">
            {(job as any).domain && (
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Área</p>
                  <p className="font-medium">{(job as any).domain}</p>
                </div>
              </div>
            )}
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
                  <p className="font-medium">
                    {experienceLevelLabels[job.experience_level]}
                    {(job as any).experience_years_range && (
                      <span className="text-muted-foreground ml-1">
                        ({experienceYearsLabels[(job as any).experience_years_range as ExperienceYearsRange] || (job as any).experience_years_range})
                      </span>
                    )}
                  </p>
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
                {job.required_skills.map(skill => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {job.application_deadline && (
            <p className={`text-sm flex items-center gap-2 pt-4 border-t ${deadlinePassed ? 'text-destructive' : 'text-muted-foreground'}`}>
              <Clock className="h-4 w-4" />
              Prazo de candidatura: {format(new Date(job.application_deadline), 'dd/MM/yyyy')}
              {deadlinePassed && ' (encerrado)'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Careers() {
  const companyName = useCompanyDisplayName();
  usePageTitle(companyName ? `Carreiras | ${companyName}` : 'Carreiras');
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { jobs, isLoading } = usePublicJobs();
  const submitApplication = useSubmitApplication();
  const quickApply = useQuickApply();
  
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [isQuickApplyOpen, setIsQuickApplyOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [useProfileResume, setUseProfileResume] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    linkedin_url: '',
    cover_letter: '',
    resume_file: null as File | null,
    resume_url: '',
  });

  const urlJob = id ? jobs.find(j => j.id === id) : null;

  useJobPostingMeta(
    urlJob
      ? {
          id: urlJob.id,
          title: urlJob.title,
          description: urlJob.description,
          location: urlJob.location,
          jobType: urlJob.job_type,
          datePosted: urlJob.created_at,
          validThrough: urlJob.application_deadline,
          companyName: companyName || 'The Talent App',
          jobUrl: typeof window !== 'undefined' ? `${window.location.origin}/careers/${urlJob.id}` : `/careers/${urlJob.id}`,
        }
      : null,
  );

  const handleApply = async (job: Job) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      toast({ 
        title: 'Autenticação necessária', 
        description: 'Por favor, faça login no portal do candidato para se candidatar às vagas.',
      });
      navigate('/applicant/login');
      return;
    }

    const { data: profile } = await supabase
      .from('applicant_profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (!profile) {
      toast({ title: 'Perfil não encontrado', description: 'Por favor, complete seu perfil de candidato primeiro.', variant: 'destructive' });
      navigate('/applicant/profile');
      return;
    }

    const eligibility = await fetchApplicantApplicationEligibility(profile.email, job.id);
    if (!eligibility.canApply) {
      toast({
        title: eligibility.reason === 'already_applied' ? 'Já candidatou-se' : 'Não é possível candidatar-se',
        description: eligibility.blockMessage,
        variant: eligibility.reason === 'hired' ? 'destructive' : 'default',
      });
      return;
    }

    if (isProfileIncomplete(profile)) {
      toast({
        title: 'Complete seu perfil primeiro',
        description: 'Adicione seu nome, telefone, LinkedIn, currículo e experiência para se candidatar.',
        variant: 'destructive',
      });
      navigate('/applicant/profile');
      return;
    }

    setSelectedJob(job);
    setIsQuickApplyOpen(true);
  };

  const handleQuickApplyConfirm = async (coverLetter?: string) => {
    if (!selectedJob) return;
    const result = await quickApply.mutateAsync({ job: selectedJob, cover_letter: coverLetter });
    setIsQuickApplyOpen(false);
    if (result.status !== 'already_applied') {
      setIsSubmitted(true);
    }
  };

  const fetchAndPrefill = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data: applicantProfile } = await supabase
      .from('applicant_profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (applicantProfile) {
      setForm(prev => ({
        ...prev,
        name: applicantProfile.full_name?.includes('@') ? prev.name : (applicantProfile.full_name || prev.name),
        email: applicantProfile.email || prev.email,
        phone: applicantProfile.phone || prev.phone,
        linkedin_url: applicantProfile.linkedin_url || prev.linkedin_url,
        resume_url: applicantProfile.resume_url || '',
      }));
      if (applicantProfile.resume_url) {
        setUseProfileResume(true);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!validTypes.includes(file.type)) {
        toast({ title: 'Tipo de arquivo inválido', description: 'Por favor, envie um documento PDF ou Word', variant: 'destructive' });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: 'Arquivo muito grande', description: 'O tamanho máximo do arquivo é 10MB', variant: 'destructive' });
        return;
      }
      setForm(prev => ({ ...prev, resume_file: file }));
      setUseProfileResume(false);
    }
  };

  const validateLinkedIn = (url: string) => {
    const linkedinPattern = /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/i;
    return linkedinPattern.test(url.trim());
  };

  const handleSubmit = async () => {
    if (!selectedJob || !form.name.trim() || !form.email.trim()) return;
    
    if (!form.linkedin_url.trim() || !validateLinkedIn(form.linkedin_url)) {
      toast({ title: 'URL do LinkedIn inválida', description: 'Informe uma URL válida do perfil no LinkedIn (ex: https://linkedin.com/in/seunome)', variant: 'destructive' });
      return;
    }

    if (!form.resume_file && !useProfileResume) {
      toast({ title: 'Currículo obrigatório', description: 'Por favor, envie seu currículo (PDF ou Word)', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    let resumeUrl = form.resume_url;

    try {
      if (form.resume_file) {
        const fileExt = form.resume_file.name.split('.').pop();
        const { data: { session } } = await supabase.auth.getSession();
        const fileName = session?.user
          ? `${session.user.id}-resume-${Date.now()}.${fileExt}`
          : `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(fileName, form.resume_file);

        if (uploadError) throw uploadError;

        resumeUrl = fileName;
      }

      await submitApplication.mutateAsync({
        job_id: selectedJob.id,
        job_title: selectedJob.title,
        applicant_name: form.name,
        applicant_email: form.email,
        applicant_phone: form.phone || undefined,
        cover_letter: form.cover_letter || undefined,
        linkedin_url: form.linkedin_url.trim(),
        resume_url: resumeUrl,
      });

      setIsSubmitted(true);
    } catch (error: any) {
      toast({ title: 'Falha no envio', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/careers" className="flex items-center gap-3">
              <CompanyLogo />
              <div className="hidden sm:block">
                <span className="text-xl font-bold text-foreground">Carreiras</span>
                <p className="text-xs text-muted-foreground">
                  {companyName ? `Faça parte do time ${companyName}` : 'Explore nossas vagas abertas'}
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <Link to="/applicant/login">
                <Button variant="default" size="sm">Portal do Candidato</Button>
              </Link>
              <Link to="/auth">
                <Button variant="outline" size="sm">Acesso RH</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {urlJob ? (
          <JobDetailView 
            job={urlJob} 
            onApply={handleApply}
            onBack={() => navigate('/careers')}
          />
        ) : (
          <>
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">
                {companyName ? `Faça Parte do Time ${companyName}` : 'Faça Parte da Nossa Equipe'}
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Buscamos talentos excepcionais para construir o futuro conosco. Conheça nossas vagas abertas e dê o próximo passo na sua carreira.
              </p>
            </div>

            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-6 bg-muted rounded w-3/4" />
                      <div className="h-4 bg-muted rounded w-1/2 mt-2" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-20 bg-muted rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <Card className="text-center py-12 max-w-md mx-auto">
                <CardContent>
                  <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma vaga aberta no momento</h3>
                  <p className="text-muted-foreground">
                    Volte em breve para conferir novas oportunidades.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {jobs.map(job => (
                  <JobCard key={job.id} job={job} onApply={handleApply} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Application Dialog — kept for backward compatibility but primary flow goes through applicant dashboard */}
        <Dialog open={isApplyOpen} onOpenChange={setIsApplyOpen}>
          <DialogContent className="max-h-[90dvh] overflow-y-auto">
            {isSubmitted ? (
              <>
                <DialogHeader>
                  <div className="flex justify-center mb-4">
                    <div className="rounded-full bg-primary/10 p-3">
                      <CheckCircle className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <DialogTitle className="text-center">Candidatura Enviada!</DialogTitle>
                  <DialogDescription className="text-center">
                    Obrigado por se candidatar para {selectedJob?.title}. Analisaremos sua candidatura e retornaremos em breve.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button onClick={() => setIsApplyOpen(false)} className="w-full">
                    Fechar
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Candidatar-se para {selectedJob?.title}</DialogTitle>
                  <DialogDescription>
                    Preencha o formulário abaixo para enviar sua candidatura.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome Completo *</Label>
                      <Input
                        id="name"
                        placeholder="Seu Nome Completo"
                        value={form.name}
                        onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="rahul@example.com"
                        value={form.email}
                        onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        placeholder="+91 98765 43210"
                        value={form.phone}
                        onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="linkedin">Perfil no LinkedIn *</Label>
                      <Input
                        id="linkedin"
                        placeholder="https://linkedin.com/in/seunome"
                        value={form.linkedin_url}
                        onChange={(e) => setForm(prev => ({ ...prev, linkedin_url: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resume">Currículo (PDF/Word, máx. 10MB) *</Label>
                    <Input
                      id="resume"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                    />
                    {useProfileResume && !form.resume_file && (
                      <p className="text-xs text-muted-foreground">Utilizando currículo do seu perfil</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cover_letter">Carta de Apresentação (opcional)</Label>
                    <Textarea
                      id="cover_letter"
                      placeholder="Conte-nos por que você é ideal para esta vaga..."
                      className="min-h-[100px]"
                      value={form.cover_letter}
                      onChange={(e) => setForm(prev => ({ ...prev, cover_letter: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsApplyOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isUploading || submitApplication.isPending || !form.name.trim() || !form.email.trim()}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {isUploading || submitApplication.isPending ? 'Enviando...' : 'Enviar Candidatura'}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        <QuickApplyDialog
          job={selectedJob}
          open={isQuickApplyOpen}
          onOpenChange={setIsQuickApplyOpen}
          onApply={handleQuickApplyConfirm}
          isPending={quickApply.isPending}
        />

        <Dialog open={isSubmitted && !isApplyOpen} onOpenChange={(open) => { if (!open) setIsSubmitted(false); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
              </div>
              <DialogTitle className="text-center">Candidatura Enviada!</DialogTitle>
              <DialogDescription className="text-center">
                Obrigado por se candidatar para {selectedJob?.title}. Analisaremos sua candidatura e retornaremos em breve.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-col gap-2">
              <Button onClick={() => navigate('/applicant')} className="w-full">
                Ver Minhas Candidaturas
              </Button>
              <Button variant="outline" onClick={() => setIsSubmitted(false)} className="w-full">
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
}
