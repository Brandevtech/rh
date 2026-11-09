import { useSearchParams } from 'react-router';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useValidateAccessToken } from '@/hooks/useCandidatePortal';
import { Loader2, AlertCircle, ShieldX, Clock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useState } from 'react';
import ExamInterface from '@/components/portal/ExamInterface';
import { AssessmentPortalHeader } from '@/components/CompanyLogo';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function CandidatePortal() {
  usePageTitle('Portal de Avaliação');
  const [searchParams] = useSearchParams();
  const accessToken = searchParams.get('token') ?? undefined;
  const { data: assessmentInfo, isLoading, error } = useValidateAccessToken(accessToken);
  const [showExam, setShowExam] = useState(false);

  if (!accessToken) {
    return (
      <PortalLayout>
        <ErrorCard
          icon={<ShieldX className="h-12 w-12 text-destructive" />}
          title="Link de Acesso Inválido"
          description="O token de acesso não foi informado. Por favor, utilize o link recebido no seu e-mail de convite."
        />
      </PortalLayout>
    );
  }

  if (isLoading) {
    return (
      <PortalLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Validando seu acesso...</p>
        </div>
      </PortalLayout>
    );
  }

  if (error || !assessmentInfo) {
    return (
      <PortalLayout>
        <ErrorCard
          icon={<AlertCircle className="h-12 w-12 text-destructive" />}
          title="Acesso Negado"
          description="Este link de avaliação é inválido ou expirou. Por favor, entre em contato com o RH para obter um novo convite."
        />
      </PortalLayout>
    );
  }

  if (assessmentInfo.status === 'expired') {
    return (
      <PortalLayout>
        <ErrorCard
          icon={<Clock className="h-12 w-12 text-muted-foreground" />}
          title="Avaliação Expirada"
          description={`Esta avaliação expirou em ${format(new Date(assessmentInfo.deadline!), 'dd/MM/yyyy')}. Entre em contato com o RH se precisar de um novo convite.`}
        />
      </PortalLayout>
    );
  }

  if (assessmentInfo.status === 'completed' || assessmentInfo.status === 'evaluated') {
    return (
      <PortalLayout>
        <CompletedCard assessmentInfo={assessmentInfo} />
      </PortalLayout>
    );
  }

  if (showExam || assessmentInfo.status === 'in_progress') {
    return (
      <ExamInterface
        assessmentInfo={assessmentInfo}
        accessToken={accessToken}
        consentSource="exam_portal_magic_link"
      />
    );
  }

  return (
    <PortalLayout>
      <WelcomeCard assessmentInfo={assessmentInfo} onStart={() => setShowExam(true)} />
    </PortalLayout>
  );
}

function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AssessmentPortalHeader />
      <main className="container mx-auto px-4 py-8 max-w-2xl">{children}</main>
    </div>
  );
}

function ErrorCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="text-center">
      <CardContent className="pt-10 pb-10">
        <div className="flex justify-center mb-4">{icon}</div>
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function WelcomeCard({
  assessmentInfo,
  onStart,
}: {
  assessmentInfo: NonNullable<ReturnType<typeof useValidateAccessToken>['data']>;
  onStart: () => void;
}) {
  const [consentChecked, setConsentChecked] = useState(false);
  const totalQuestions = assessmentInfo.assessment.sections.reduce(
    (sum, s) => sum + s.questions.length,
    0
  );
  const totalMarks = assessmentInfo.assessment.sections.reduce(
    (sum, s) => sum + s.questions.reduce((qSum, q) => qSum + q.marks, 0),
    0
  );

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{assessmentInfo.assessment.title}</CardTitle>
        {assessmentInfo.assessment.description && (
          <CardDescription className="mt-2">{assessmentInfo.assessment.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Bem-vindo(a),</p>
          <p className="text-lg font-medium">{assessmentInfo.candidate.name}</p>
          <p className="text-sm text-muted-foreground">{assessmentInfo.candidate.email}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-2xl font-bold text-primary">{assessmentInfo.assessment.duration_minutes}</p>
            <p className="text-xs text-muted-foreground">Minutos</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-2xl font-bold text-primary">{totalQuestions}</p>
            <p className="text-xs text-muted-foreground">Questões</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-2xl font-bold text-primary">{totalMarks}</p>
            <p className="text-xs text-muted-foreground">Pontos Totais</p>
          </div>
        </div>

        {assessmentInfo.deadline && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Prazo: {format(new Date(assessmentInfo.deadline), 'dd/MM/yyyy HH:mm')}</span>
          </div>
        )}

        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm">
          <p className="font-medium text-amber-800 dark:text-amber-200 mb-2">Instruções Importantes:</p>
          <ul className="list-disc list-inside text-amber-700 dark:text-amber-300 space-y-1">
            <li>Após o início, o cronômetro não pode ser pausado</li>
            <li>Suas respostas são salvas automaticamente a cada 30 segundos</li>
            <li>Trocas de aba e perda de foco são monitoradas</li>
            <li>Após iniciar, um contador registra trocas de aba e tempo fora da prova</li>
            <li>Certifique-se de manter uma conexão de internet estável</li>
          </ul>
        </div>

        <div className="flex items-start gap-2 rounded-lg border p-4">
          <Checkbox
            id="exam-consent"
            checked={consentChecked}
            onCheckedChange={(checked) => setConsentChecked(checked === true)}
          />
          <Label htmlFor="exam-consent" className="text-sm font-normal leading-snug cursor-pointer">
            Concordo que minhas respostas, atividade na prova (incluindo monitoramento de integridade) e resultados sejam processados para fins de avaliação no processo seletivo.
          </Label>
        </div>

        <Button onClick={onStart} className="w-full" size="lg" disabled={!consentChecked}>
          Iniciar Avaliação
        </Button>
      </CardContent>
    </Card>
  );
}

function CompletedCard({
  assessmentInfo,
}: {
  assessmentInfo: NonNullable<ReturnType<typeof useValidateAccessToken>['data']>;
}) {
  return (
    <Card className="text-center">
      <CardContent className="pt-10 pb-10">
        <div className="flex justify-center mb-4">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Avaliação Concluída</h2>
        <p className="text-muted-foreground mb-6">
          Você concluiu com sucesso a prova {assessmentInfo.assessment.title}.
        </p>

        {assessmentInfo.completed_at && (
          <p className="text-sm text-muted-foreground mb-4">
            Enviada em {format(new Date(assessmentInfo.completed_at), 'dd/MM/yyyy HH:mm')}
          </p>
        )}

        <p className="text-sm text-muted-foreground">
          Suas respostas foram enviadas. A equipe de recrutamento analisará sua avaliação e entrará em contato em breve.
        </p>
      </CardContent>
    </Card>
  );
}
