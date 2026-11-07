import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  useStartAssessment,
  useSaveResponse,
  useSubmitAssessment,
  useCandidateResponses,
  useLogIntegrityEvent,
  useCreateAssessmentFileUpload,
  resolvePortalAccessToken,
  type CandidateAssessmentInfo,
  type PortalQuestion,
} from '@/hooks/useCandidatePortal';
import { useToast } from '@/hooks/use-toast';
import {
  computeIntegrityStats,
  formatSecondsAway,
  getTabSwitchWarningMessage,
  normalizeIntegrityLog,
} from '@/lib/integrity';
import {
  ASSESSMENT_FILE_MAX_BYTES,
  buildFileUploadResponse,
  isAllowedGoogleDriveLink,
  isFileUploadAnswered,
  parseFileConfig,
  parseFileUploadResponse,
  type FileUploadFileMeta,
  type FileUploadLinkMeta,
} from '@/lib/assessmentFileUpload';
import { safeExternalUrl } from '@/lib/utils';
import { examEndsAt, isAttemptOverError } from '@/lib/assessmentGrading';
import type { IntegrityEvent } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Clock, ChevronLeft, ChevronRight, Send, AlertTriangle, Eye, CheckCircle2, Upload, Link2, X, FileText, Loader2 } from 'lucide-react';
import { CodeEditor } from './CodeEditor';
import { AssessmentPortalHeader } from '@/components/CompanyLogo';
import type { Json } from '@/integrations/supabase/types';
import type { ExecutionResult } from '@/hooks/useCodeExecution';

interface ExamInterfaceProps {
  assessmentInfo: CandidateAssessmentInfo;
  accessToken: string;
  consentSource?: string;
  homeHref?: string;
}

export default function ExamInterface({ assessmentInfo, accessToken, consentSource = 'exam_portal_magic_link', homeHref }: ExamInterfaceProps) {
  const startAssessment = useStartAssessment();
  const saveResponse = useSaveResponse();
  const submitAssessment = useSubmitAssessment();
  const logIntegrity = useLogIntegrityEvent();
  const { toast } = useToast();
  const { data: savedResponses = [] } = useCandidateResponses(assessmentInfo.id, accessToken);

  const [integrityLog, setIntegrityLog] = useState<IntegrityEvent[]>(() =>
    normalizeIntegrityLog(assessmentInfo.integrity_log)
  );
  const [hiddenSince, setHiddenSince] = useState<number | null>(null);
  const [currentAwaySeconds, setCurrentAwaySeconds] = useState(0);
  const hiddenSinceRef = useRef<number | null>(null);

  // Flatten all questions
  const allQuestions = useMemo(() => {
    return assessmentInfo.assessment.sections.flatMap((s) =>
      s.questions.map((q) => ({ ...q, sectionTitle: s.title }))
    );
  }, [assessmentInfo]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, Json>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isStarted, setIsStarted] = useState(assessmentInfo.status === 'in_progress');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Initialize responses from saved data
  useEffect(() => {
    if (savedResponses.length > 0) {
      const initialResponses: Record<string, Json> = {};
      savedResponses.forEach((r) => {
        initialResponses[r.question_id] = r.response;
      });
      setResponses(initialResponses);
    }
  }, [savedResponses]);

  // Calculate remaining time
  useEffect(() => {
    if (assessmentInfo.started_at && isStarted) {
      const endTime = examEndsAt(
        assessmentInfo.started_at,
        assessmentInfo.assessment.duration_minutes,
        assessmentInfo.deadline,
      );
      if (endTime !== null) {
        setTimeRemaining(Math.max(0, Math.floor((endTime - Date.now()) / 1000)));
      }
    }
  }, [assessmentInfo.started_at, assessmentInfo.assessment.duration_minutes, assessmentInfo.deadline, isStarted]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!isStarted) return;

    const autoSaveInterval = setInterval(() => {
      saveAllResponses();
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, [isStarted, responses]);

  const logIntegrityRef = useRef(logIntegrity);
  logIntegrityRef.current = logIntegrity;

  // Current question context for integrity events
  const currentQuestionRef = useRef<{
    question_id: string;
    question_index: number;
    section_title: string;
  } | null>(null);
  const questionWhenHiddenRef = useRef<typeof currentQuestionRef.current>(null);

  useEffect(() => {
    const q = allQuestions[currentIndex];
    currentQuestionRef.current = q
      ? {
          question_id: q.id,
          question_index: currentIndex + 1,
          section_title: q.sectionTitle,
        }
      : null;
  }, [allQuestions, currentIndex]);

  // Track tab visibility and integrity events
  useEffect(() => {
    if (!isStarted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const timestamp = new Date().toISOString();
        const questionCtx = currentQuestionRef.current;
        questionWhenHiddenRef.current = questionCtx;
        const tabSwitchEvent: IntegrityEvent = {
          type: 'tab_switch',
          timestamp,
          ...(questionCtx ?? {}),
        };

        setIntegrityLog((prev) => {
          const nextLog = [...prev, tabSwitchEvent];
          const switchCount = computeIntegrityStats(nextLog).tabSwitchCount;
          const warning = getTabSwitchWarningMessage(switchCount);
          toast({
            title: warning.title,
            description: warning.description,
            variant: warning.variant,
          });
          return nextLog;
        });

        hiddenSinceRef.current = Date.now();
        setHiddenSince(hiddenSinceRef.current);
        setCurrentAwaySeconds(0);

        logIntegrityRef.current.mutate({
          candidateAssessmentId: assessmentInfo.id,
          event: tabSwitchEvent,
          accessToken,
        });
      } else if (hiddenSinceRef.current) {
        const duration = Math.floor((Date.now() - hiddenSinceRef.current) / 1000);
        const questionCtx = questionWhenHiddenRef.current ?? currentQuestionRef.current;
        const focusEvent: IntegrityEvent = {
          type: 'focus_lost',
          timestamp: new Date().toISOString(),
          duration_seconds: duration,
          ...(questionCtx ?? {}),
        };

        setIntegrityLog((prev) => [...prev, focusEvent]);
        hiddenSinceRef.current = null;
        questionWhenHiddenRef.current = null;
        setHiddenSince(null);
        setCurrentAwaySeconds(0);

        logIntegrityRef.current.mutate({
          candidateAssessmentId: assessmentInfo.id,
          event: focusEvent,
          accessToken,
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isStarted, assessmentInfo.id, accessToken, toast]);

  // Live counter for current away session
  useEffect(() => {
    if (!isStarted || hiddenSince === null) return;

    const interval = setInterval(() => {
      setCurrentAwaySeconds(Math.floor((Date.now() - hiddenSince) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isStarted, hiddenSince]);

  const integrityStats = useMemo(
    () => computeIntegrityStats(integrityLog, hiddenSince ? currentAwaySeconds : 0),
    [integrityLog, hiddenSince, currentAwaySeconds]
  );

  const responsesRef = useRef(responses);
  useEffect(() => { responsesRef.current = responses; }, [responses]);
  const isSubmittedRef = useRef(false);

  const beaconTokenRef = useRef<string | null>(accessToken === 'session' ? null : accessToken);
  useEffect(() => {
    if (!isStarted) return;
    if (accessToken !== 'session') {
      beaconTokenRef.current = accessToken;
      return;
    }
    let cancelled = false;
    resolvePortalAccessToken(accessToken, assessmentInfo.id)
      .then((token) => {
        if (!cancelled) beaconTokenRef.current = token;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isStarted, accessToken, assessmentInfo.id]);

  const sendAutoCompleteBeacon = useCallback(() => {
    const token = beaconTokenRef.current;
    if (!token) return;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    navigator.sendBeacon(
      `${supabaseUrl}/functions/v1/candidate-portal?apikey=${anonKey}`,
      new Blob([JSON.stringify({
        action: 'auto-complete',
        access_token: token,
        data: { responses: responsesRef.current },
      })], { type: 'application/json' })
    );
  }, []);

  // Beforeunload warning + sendBeacon on browser close
  useEffect(() => {
    if (!isStarted) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSubmittedRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };

    const handlePageHide = () => {
      if (isSubmittedRef.current) return;
      sendAutoCompleteBeacon();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [isStarted, sendAutoCompleteBeacon]);

  const handleStart = async () => {
    if (assessmentInfo.status === 'invited') {
      await startAssessment.mutateAsync({
        candidateAssessmentId: assessmentInfo.id,
        accessToken,
        consentSource,
      });
    }
    setIsStarted(true);
    const endTime = examEndsAt(
      new Date().toISOString(),
      assessmentInfo.assessment.duration_minutes,
      assessmentInfo.deadline,
    );
    setTimeRemaining(endTime === null ? null : Math.max(0, Math.floor((endTime - Date.now()) / 1000)));
  };

  const saveAllResponses = useCallback(async () => {
    const savePromises = Object.entries(responses)
      .filter(([, response]) => response !== null && response !== undefined && response !== '')
      .map(([questionId, response]) =>
        saveResponse.mutateAsync({
          candidateAssessmentId: assessmentInfo.id,
          questionId,
          response,
          accessToken,
        })
      );
    const results = await Promise.allSettled(savePromises);
    const blocking = results.find(
      (r): r is PromiseRejectedResult => r.status === 'rejected' && !isAttemptOverError(r.reason),
    );
    if (blocking) throw blocking.reason;
  }, [responses, assessmentInfo.id, saveResponse, accessToken]);

  const handleAutoSubmit = async () => {
    if (isSubmittedRef.current) return;
    isSubmittedRef.current = true;
    try {
      await saveAllResponses();
      await submitAssessment.mutateAsync({
        candidateAssessmentId: assessmentInfo.id,
        accessToken,
      });
      setIsSubmitted(true);
    } catch (err) {
      isSubmittedRef.current = false;
      console.error('Auto-submit failed:', err);
      sendAutoCompleteBeacon();
    }
  };

  const handleSubmit = async () => {
    isSubmittedRef.current = true;
    try {
      await saveAllResponses();
      await submitAssessment.mutateAsync({
        candidateAssessmentId: assessmentInfo.id,
        accessToken,
      });
      setIsSubmitted(true);
    } catch (err) {
      isSubmittedRef.current = false;
      const message = err instanceof Error ? err.message : 'Falha ao enviar a avaliação';
      toast({
        variant: 'destructive',
        title: 'Falha ao enviar',
        description: message,
      });
    }
  };

  const handleResponseChange = (questionId: string, value: Json) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const currentQuestion = allQuestions[currentIndex];
  const answeredCount = Object.keys(responses).filter((qId) => {
    const q = allQuestions.find((aq) => aq.id === qId);
    const val = responses[qId];
    if (q?.type === 'file_upload') return isFileUploadAnswered(val);
    return val !== null && val !== '' && val !== undefined;
  }).length;

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isStarted) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AssessmentPortalHeader homeHref={homeHref} />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <Clock className="h-12 w-12 mx-auto text-primary mb-4" />
              <h2 className="text-xl font-semibold mb-2">Pronto para Começar?</h2>
              <p className="text-muted-foreground mb-6">
                Você terá {assessmentInfo.assessment.duration_minutes} minutos para responder a {allQuestions.length} questões.
              </p>
              <Button onClick={handleStart} disabled={startAssessment.isPending} className="w-full">
                {startAssessment.isPending ? 'Iniciando...' : 'Iniciar Avaliação'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AssessmentPortalHeader homeHref={homeHref} />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Avaliação Concluída</h2>
              <p className="text-muted-foreground mb-2">
                Você concluiu {assessmentInfo.assessment.title} com sucesso.
              </p>
              <p className="text-sm text-muted-foreground">
                Suas respostas foram enviadas. A equipe de recrutamento analisará sua avaliação e entrará em contato.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-card border-b shadow-xs">
        <AssessmentPortalHeader sticky={false} className="border-b-0" homeHref={homeHref} />
        <div className="container mx-auto px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{assessmentInfo.assessment.title}</p>
            <p className="text-xs text-muted-foreground truncate">{assessmentInfo.candidate.name}</p>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 justify-end shrink-0">
            <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 text-xs sm:text-sm">
              <Eye className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">
                {integrityStats.tabSwitchCount} {integrityStats.tabSwitchCount === 1 ? 'troca' : 'trocas'}
                {' · '}
                {formatSecondsAway(integrityStats.totalSecondsAway)} fora
              </span>
            </div>

            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              timeRemaining !== null && timeRemaining < 300 
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' 
                : 'bg-muted'
            }`}>
              <Clock className="h-4 w-4" />
              <span className="font-mono font-medium">
                {timeRemaining !== null ? formatTime(timeRemaining) : '--:--'}
              </span>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" disabled={submitAssessment.isPending}>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Prova
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Enviar Avaliação?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Você respondeu {answeredCount} de {allQuestions.length} questões.
                    {answeredCount < allQuestions.length && (
                      <span className="block mt-2 text-amber-600 font-medium">
                        <AlertTriangle className="h-4 w-4 inline mr-1" />
                        Atenção: algumas questões ainda não foram respondidas!
                      </span>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Continuar Prova</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSubmit}>Enviar Agora</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <div className="container mx-auto px-4 pb-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            Eventos de integridade são registrados e compartilhados com a equipe de recrutamento.
          </p>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Question Palette */}
        <aside className="hidden md:block w-64 border-r bg-muted/30 p-4 overflow-y-auto">
          <h3 className="text-sm font-medium mb-3">Questões</h3>
          <div className="grid grid-cols-5 gap-2">
            {allQuestions.map((q, idx) => {
              const isAnswered =
                q.type === 'file_upload'
                  ? isFileUploadAnswered(responses[q.id])
                  : responses[q.id] !== undefined && responses[q.id] !== null && responses[q.id] !== '';
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground'
                      : isAnswered
                      ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700'
                      : 'bg-background border hover:bg-muted'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-4 text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/50 border border-green-300 dark:border-green-700"></span>
              <span>Respondidas ({answeredCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-background border"></span>
              <span>Não respondidas ({allQuestions.length - answeredCount})</span>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 p-3 space-y-2">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              Monitor de Integridade
            </p>
            <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
              <p>Trocas de aba: <span className="font-medium">{integrityStats.tabSwitchCount}</span></p>
              <p>Tempo fora: <span className="font-medium">{formatSecondsAway(integrityStats.totalSecondsAway)}</span></p>
            </div>
            <p className="text-[11px] text-amber-700/90 dark:text-amber-300/90 leading-snug">
              Eventos de integridade são registrados e compartilhados com a equipe de recrutamento.
            </p>
          </div>
        </aside>

        {/* Question Area */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {currentQuestion && (
            <QuestionDisplay
              question={currentQuestion}
              questionNumber={currentIndex + 1}
              totalQuestions={allQuestions.length}
              response={responses[currentQuestion.id]}
              onResponseChange={(value) => handleResponseChange(currentQuestion.id, value)}
              accessToken={accessToken}
              candidateAssessmentId={assessmentInfo.id}
            />
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Anterior
            </Button>
            <Button
              onClick={() => setCurrentIndex((prev) => Math.min(allQuestions.length - 1, prev + 1))}
              disabled={currentIndex === allQuestions.length - 1}
            >
              Próxima
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
}

interface QuestionDisplayProps {
  question: PortalQuestion & { sectionTitle: string };
  questionNumber: number;
  totalQuestions: number;
  response: Json | undefined;
  onResponseChange: (value: Json) => void;
  onExecutionResult?: (result: ExecutionResult) => void;
  accessToken?: string;
  candidateAssessmentId: string;
}

function QuestionDisplay({
  question,
  questionNumber,
  totalQuestions,
  response,
  onResponseChange,
  onExecutionResult,
  accessToken,
  candidateAssessmentId,
}: QuestionDisplayProps) {
  const { toast } = useToast();
  const createUpload = useCreateAssessmentFileUpload();
  const [linkInput, setLinkInput] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'mcq': return 'Múltipla Escolha';
      case 'coding': return 'Programação';
      case 'subjective': return 'Dissertativa';
      case 'file_upload': return 'Envio de Arquivo';
      default: return type;
    }
  };

  const getCodeFromResponse = (): string => {
    if (response === undefined || response === null) {
      return question.coding_starter_code ?? '';
    }
    if (typeof response === 'string') {
      return response;
    }
    if (typeof response === 'object' && 'code' in (response as object)) {
      return String((response as { code: unknown }).code);
    }
    return question.coding_starter_code ?? '';
  };

  const handleCodeChange = (code: string) => {
    const currentResponse = typeof response === 'object' && response !== null ? response : {};
    onResponseChange({ ...currentResponse, code } as Json);
  };

  const handleExecutionResult = (result: ExecutionResult) => {
    const currentResponse = typeof response === 'object' && response !== null ? response : {};
    const currentCode = getCodeFromResponse();
    onResponseChange({
      ...currentResponse,
      code: currentCode,
      execution_result: {
        passed_count: result.passed_count,
        total_count: result.total_count,
        score_percentage: result.score_percentage,
        success: result.success,
      },
    } as Json);
    onExecutionResult?.(result);
  };

  const fileCfg = parseFileConfig(question.file_config);
  const fileResponse = parseFileUploadResponse(response);
  const currentFile = fileResponse?.file ?? null;
  const currentLink = fileResponse?.link ?? null;

  const commitFileUploadParts = (parts: {
    file?: FileUploadFileMeta | null;
    link?: FileUploadLinkMeta | null;
  }) => {
    const next = buildFileUploadResponse(parts);
    if (!next) {
      onResponseChange(null as unknown as Json);
      return;
    }
    onResponseChange(next as unknown as Json);
  };

  const handleFileSelected = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file || !accessToken) return;

    if (file.size > ASSESSMENT_FILE_MAX_BYTES) {
      toast({
        variant: 'destructive',
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo permitido é 10 MB. Envie um arquivo menor ou cole um link do Google Drive.',
      });
      return;
    }

    if (!fileCfg.allowed_mime_types.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Tipo de arquivo não suportado',
        description: 'Envie uma imagem (JPEG, PNG, GIF, WebP) ou PDF.',
      });
      return;
    }

    setUploading(true);
    try {
      const uploaded = await createUpload.mutateAsync({
        candidateAssessmentId,
        questionId: question.id,
        file,
        accessToken,
      });
      commitFileUploadParts({ file: uploaded, link: currentLink });
      toast({ title: 'Arquivo enviado com sucesso' });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Falha no envio',
        description: err instanceof Error ? err.message : 'Não foi possível enviar o arquivo',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveLink = () => {
    const url = linkInput.trim();
    if (!url) {
      setLinkError('Informe um link do Google Drive');
      return;
    }
    if (!isAllowedGoogleDriveLink(url)) {
      setLinkError('Apenas links de compartilhamento do Google Drive ou Google Docs são permitidos (https).');
      return;
    }
    setLinkError(null);
    commitFileUploadParts({ file: currentFile, link: { url } });
    setLinkInput('');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Badge variant="outline">{question.sectionTitle}</Badge>
          <span className="text-sm text-muted-foreground">
            Questão {questionNumber} de {totalQuestions}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Badge>{getTypeLabel(question.type)}</Badge>
          <Badge variant="secondary">{question.marks} {question.marks === 1 ? 'ponto' : 'pontos'}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <CardTitle className="text-lg mb-6">{question.question_text}</CardTitle>

        {question.type === 'mcq' && question.options && (
          <RadioGroup
            value={String(response ?? '')}
            onValueChange={(value) => onResponseChange(value)}
            className="space-y-3"
          >
            {question.options.map((opt) => (
              <div
                key={opt.id}
                className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <RadioGroupItem value={opt.id} id={opt.id} />
                <Label htmlFor={opt.id} className="flex-1 cursor-pointer">
                  {opt.text}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {question.type === 'subjective' && (
          <div className="space-y-2">
            <Textarea
              value={String(response ?? '')}
              onChange={(e) => onResponseChange(e.target.value)}
              placeholder="Digite sua resposta aqui..."
              className="min-h-[200px]"
            />
            {question.subjective_max_words && (
              <p className="text-xs text-muted-foreground text-right">
                Máximo de palavras: {question.subjective_max_words}
              </p>
            )}
          </div>
        )}

        {question.type === 'coding' && (
          <CodeEditor
            code={getCodeFromResponse()}
            language={question.coding_language ?? 'javascript'}
            testCases={question.coding_test_cases ?? []}
            questionId={question.id}
            accessToken={accessToken}
            onCodeChange={handleCodeChange}
            onExecutionResult={handleExecutionResult}
          />
        )}

        {question.type === 'file_upload' && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Envie um arquivo (imagem ou PDF, máx. 10 MB) e/ou um link compartilhado do Google Drive.
              Arquivos com mais de 10 MB devem usar o link do Drive.
            </p>

            {fileCfg.allow_file && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Envio de arquivo
                </Label>
                {currentFile ? (
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{currentFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(currentFile.size / 1024).toFixed(1)} KB · {currentFile.mime}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => commitFileUploadParts({ file: null, link: currentLink })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Input
                      type="file"
                      accept={fileCfg.allowed_mime_types.join(',')}
                      disabled={uploading}
                      onChange={(e) => {
                        void handleFileSelected(e.target.files);
                        e.target.value = '';
                      }}
                    />
                    {uploading && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Enviando…
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {fileCfg.allow_link && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Link do Google Drive
                </Label>
                {currentLink ? (
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="min-w-0 flex-1">
                      {safeExternalUrl(currentLink.url) ? (
                      <a
                        href={safeExternalUrl(currentLink.url)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary underline break-all"
                      >
                        {currentLink.url}
                      </a>
                      ) : (
                        <span className="text-sm break-all">{currentLink.url}</span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => commitFileUploadParts({ file: currentFile, link: null })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      value={linkInput}
                      onChange={(e) => {
                        setLinkInput(e.target.value);
                        setLinkError(null);
                      }}
                      placeholder="https://drive.google.com/..."
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" onClick={handleSaveLink}>
                      Salvar link
                    </Button>
                  </div>
                )}
                {linkError && <p className="text-xs text-destructive">{linkError}</p>}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
