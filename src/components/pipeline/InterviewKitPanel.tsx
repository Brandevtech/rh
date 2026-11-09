import { ChevronDown, HelpCircle, Loader2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { InterviewKit } from '@/lib/scorecardTemplates';

interface InterviewKitPanelProps {
  kit: InterviewKit | null | undefined;
  isLoading?: boolean;
  isGenerating?: boolean;
  onGenerate?: (forceGemini?: boolean) => void;
  /** When false, hide Generate kit / Regerar com IA (read-only questions only). */
  allowGenerate?: boolean;
  defaultOpen?: boolean;
  compact?: boolean;
}

function KitSourceBadge({ source }: { source: InterviewKit['source'] }) {
  if (source === 'gemini') {
    return (
      <Badge variant="secondary" className="text-[10px] h-5 gap-1 font-normal">
        <Sparkles className="w-3 h-3" />
        Gerado por IA
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] h-5 font-normal text-muted-foreground">
      Modelo padrão
    </Badge>
  );
}

export function InterviewKitPanel({
  kit,
  isLoading,
  isGenerating,
  onGenerate,
  allowGenerate = true,
  defaultOpen = false,
  compact = false,
}: InterviewKitPanelProps) {
  const hasQuestions = (kit?.questions?.length ?? 0) > 0;
  const canGenerate = allowGenerate && !!onGenerate;

  return (
    <div className={cn('rounded-lg border bg-muted/20', compact ? 'p-3' : 'p-4')}>
      <details className="group" open={defaultOpen}>
        <summary className="flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <span className="text-sm font-medium flex items-center gap-1.5 flex-wrap">
            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
            Kit de Perguntas
            <span className="text-xs text-muted-foreground font-normal">(somente leitura)</span>
            {kit && hasQuestions && <KitSourceBadge source={kit.source} />}
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180 shrink-0" />
        </summary>

        <div className="mt-3 space-y-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Carregando perguntas…
            </div>
          ) : hasQuestions ? (
            <>
              <ol className="space-y-2 list-decimal list-inside text-sm text-foreground">
                {kit!.questions.map((q, i) => (
                  <li key={i} className="leading-relaxed pl-1">{q}</li>
                ))}
              </ol>
              {kit!.generated_at && (
                <p className="text-[11px] text-muted-foreground">
                  Gerado em {new Date(kit!.generated_at).toLocaleDateString('pt-BR')}
                </p>
              )}
              {canGenerate && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  disabled={isGenerating}
                  onClick={() => onGenerate!(true)}
                >
                  {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Regenerate with AI
                </Button>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Perguntas sugeridas para esta etapa — utilize como guia durante a entrevista.
              </p>
              {canGenerate && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  disabled={isGenerating}
                  onClick={() => onGenerate!(true)}
                >
                  {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {isGenerating ? 'Gerando…' : 'Gerar kit de perguntas'}
                </Button>
              )}
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
