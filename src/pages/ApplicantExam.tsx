import { useEffect, useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useParams, useNavigate } from 'react-router';
import { useApplicantAuth } from '@/hooks/useApplicantAuth';
import { useApplicantAssessments, useApplicantCandidateRecord } from '@/hooks/useApplicantPortal';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AssessmentPortalHeader } from '@/components/CompanyLogo';
import ExamInterface from '@/components/portal/ExamInterface';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function ApplicantExam() {
  usePageTitle('Avaliação');
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useApplicantAuth();
  const { data: assessments = [], isLoading: assessmentsLoading } = useApplicantAssessments();
  const { data: candidateRecord } = useApplicantCandidateRecord();
  const [assessmentInfo, setAssessmentInfo] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExam, setShowExam] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/applicant/login');
    }
  }, [user, authLoading, navigate]);

  // Find the assessment and load details
  useEffect(() => {
    const loadAssessment = async () => {
      if (!assessmentId || assessmentsLoading) return;

      const candidateAssessment = assessments.find(a => a.id === assessmentId);
      if (!candidateAssessment) {
        setError('Avaliação não encontrada ou não atribuída a você');
        setIsLoadingDetails(false);
        return;
      }

      try {
        // Fetch full assessment details including sections and questions
        const { data: assessment, error: assessmentError } = await supabase
          .from('assessments')
          .select('*')
          .eq('id', candidateAssessment.assessment_id)
          .single();

        if (assessmentError) throw assessmentError;

        // Fetch sections
        const { data: sections, error: sectionsError } = await supabase
          .from('assessment_sections')
          .select('*')
          .eq('assessment_id', assessment.id)
          .order('order_index');

        if (sectionsError) throw sectionsError;

        // Fetch questions for each section (excluding correct_answer for security)
        const { data: questions, error: questionsError } = await supabase
          .from('questions')
          .select('id, section_id, question_text, type, options, marks, order_index, coding_language, coding_starter_code, coding_test_cases, subjective_max_words, file_config')
          .in('section_id', sections.map(s => s.id))
          .order('order_index');

        if (questionsError) throw questionsError;

        // Construct the assessment info object
        const sectionsWithQuestions = sections.map(section => ({
          ...section,
          questions: questions
            .filter(q => q.section_id === section.id)
            .map((q) => {
              const base = {
                ...q,
                options:
                  q.type === 'mcq' && Array.isArray(q.options)
                    ? (q.options as Array<{ id: string; text: string }>).map((o) => ({
                        id: o.id,
                        text: o.text,
                      }))
                    : q.options,
              };
              if (q.type === 'file_upload') {
                return {
                  ...base,
                  file_config: q.file_config ?? {
                    allow_file: true,
                    allow_link: true,
                    allowed_mime_types: [
                      'image/jpeg',
                      'image/png',
                      'image/gif',
                      'image/webp',
                      'application/pdf',
                    ],
                    max_file_bytes: 10485760,
                    max_files: 1,
                  },
                };
              }
              return base;
            }),
        }));

        setAssessmentInfo({
          id: candidateAssessment.id,
          candidate_id: candidateAssessment.candidate_id,
          assessment_id: candidateAssessment.assessment_id,
          status: candidateAssessment.status,
          started_at: candidateAssessment.started_at,
          deadline: candidateAssessment.deadline,
          completed_at: candidateAssessment.completed_at,
          percentage: candidateAssessment.percentage,
          passed: candidateAssessment.passed,
          integrity_log: Array.isArray(candidateAssessment.integrity_log)
            ? candidateAssessment.integrity_log
            : [],
          candidate: {
            id: candidateAssessment.candidate_id,
            name: candidateRecord?.name ?? 'Candidato',
            email: candidateRecord?.email ?? '',
          },
          assessment: {
            ...assessment,
            sections: sectionsWithQuestions,
          },
        });
        setIsLoadingDetails(false);
      } catch (err: any) {
        console.error('Error loading assessment:', err);
        setError(err.message || 'Falha ao carregar a avaliação');
        setIsLoadingDetails(false);
      }
    };

    loadAssessment();
  }, [assessmentId, assessments, assessmentsLoading, candidateRecord]);

  if (authLoading || assessmentsLoading || isLoadingDetails) {
    return (
      <PortalLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Carregando sua avaliação...</p>
        </div>
      </PortalLayout>
    );
  }

  if (error || !assessmentInfo) {
    return (
      <PortalLayout>
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
            <p className="text-muted-foreground mb-4">{error || 'Avaliação não encontrada'}</p>
            <Button onClick={() => navigate('/applicant')}>Voltar ao Painel</Button>
          </CardContent>
        </Card>
      </PortalLayout>
    );
  }

  if (assessmentInfo.status === 'expired') {
    return (
      <PortalLayout>
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Avaliação Expirada</h2>
            <p className="text-muted-foreground mb-4">
              O prazo para esta avaliação encerrou em {format(new Date(assessmentInfo.deadline!), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}.
            </p>
            <Button onClick={() => navigate('/applicant')}>Voltar ao Painel</Button>
          </CardContent>
        </Card>
      </PortalLayout>
    );
  }

  if (assessmentInfo.status === 'completed' || assessmentInfo.status === 'evaluated') {
    return (
      <PortalLayout>
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Avaliação Concluída</h2>
            <p className="text-muted-foreground mb-2">
              Você concluiu {assessmentInfo.assessment.title} com sucesso.
            </p>
            {assessmentInfo.completed_at && (
              <p className="text-sm text-muted-foreground mb-4">
                Enviada em {format(new Date(assessmentInfo.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
            <p className="text-sm text-muted-foreground mb-4">
              Suas respostas foram enviadas. A equipe de recrutamento analisará sua avaliação e entrará em contato.
            </p>
            <Button onClick={() => navigate('/applicant')}>Voltar ao Painel</Button>
          </CardContent>
        </Card>
      </PortalLayout>
    );
  }

  // Show exam interface (for in_progress or starting invited)
  if (showExam || assessmentInfo.status === 'in_progress') {
    return (
      <ExamInterface
        assessmentInfo={assessmentInfo}
        accessToken="session"
        consentSource="exam_portal_applicant"
        homeHref="/applicant"
      />
    );
  }

  // Welcome screen for invited status
  return (
    <PortalLayout>
      <WelcomeScreen
        assessmentInfo={assessmentInfo}
        onBack={() => navigate('/applicant')}
        onStart={() => setShowExam(true)}
      />
    </PortalLayout>
  );
}

function WelcomeScreen({
  assessmentInfo,
  onBack,
  onStart,
}: {
  assessmentInfo: any;
  onBack: () => void;
  onStart: () => void;
}) {
  const [consentChecked, setConsentChecked] = useState(false);

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{assessmentInfo.assessment.title}</CardTitle>
        <CardDescription>{assessmentInfo.assessment.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{assessmentInfo.assessment.duration_minutes}</p>
            <p className="text-sm text-muted-foreground">Minutos</p>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{assessmentInfo.assessment.passing_score}%</p>
            <p className="text-sm text-muted-foreground">Nota de Corte</p>
          </div>
        </div>

        {assessmentInfo.deadline && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-center dark:bg-orange-950/30 dark:border-orange-800">
            <p className="text-orange-800 dark:text-orange-200">
              <Clock className="h-4 w-4 inline mr-2" />
              Realizar até: {format(new Date(assessmentInfo.deadline), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        )}

        <div className="border-t pt-6">
          <h3 className="font-semibold mb-2">Antes de começar:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Certifique-se de ter uma conexão estável com a internet</li>
            <li>Escolha um local tranquilo e sem distrações</li>
            <li>O cronômetro começará assim que você clicar em Iniciar</li>
            <li>Não é possível pausar a avaliação após o início</li>
            <li>Seu progresso será salvo automaticamente</li>
            <li>Trocas de aba e saídas de foco são monitoradas</li>
            <li>Durante a prova, um contador registrará trocas de aba e tempo fora da página</li>
          </ul>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm">
          <p className="font-medium text-amber-800 dark:text-amber-200 mb-2">Monitoramento de integridade</p>
          <p className="text-amber-700 dark:text-amber-300">
            Sair da aba da prova é registrado e compartilhado com a equipe de recrutamento. Permaneça nesta página para uma melhor experiência.
          </p>
        </div>

        <div className="flex items-start gap-2 rounded-lg border p-4">
          <Checkbox
            id="applicant-exam-consent"
            checked={consentChecked}
            onCheckedChange={(checked) => setConsentChecked(checked === true)}
          />
          <Label htmlFor="applicant-exam-consent" className="text-sm font-normal leading-snug cursor-pointer">
            Concordo que minhas respostas, atividade na prova (incluindo monitoramento de integridade) e resultados sejam processados para fins de avaliação no processo seletivo.
          </Label>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 justify-center pt-4">
          <Button variant="outline" onClick={onBack}>
            Voltar ao Painel
          </Button>
          <Button size="lg" onClick={onStart} disabled={!consentChecked}>
            Iniciar Avaliação
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-linear-to-br/srgb from-primary/5 via-background to-secondary/5 flex flex-col">
      <AssessmentPortalHeader homeHref="/applicant" />
      <main className="container mx-auto px-4 py-6 sm:py-8 flex-1 w-full">
        {children}
      </main>
    </div>
  );
}
