import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles } from 'lucide-react';
import { useJobs } from '@/hooks/useJobs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { assessmentTierLabels, type AssessmentTier } from '@/lib/assessment-tiers';
import { jobStatusLabels } from '@/types/jobs';

interface GenerateAssessmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GenerateAssessmentDialog({
  open,
  onOpenChange,
}: GenerateAssessmentDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { jobs, isLoading } = useJobs();
  const [selectedJobId, setSelectedJobId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const jobsWithDescription = jobs.filter((j) => j.description?.trim());

  const handleGenerate = async () => {
    if (!selectedJobId) return;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-assessment', {
        body: { job_id: selectedJobId },
      });
      if (error) {
        let description = 'Não foi possível gerar a avaliação';
        try {
          const body = await (error as { context?: { json?: () => Promise<{ error?: string }> } }).context?.json?.();
          if (body?.error) description = body.error;
        } catch {
          // ignore
        }
        throw new Error(description);
      }
      if (!data?.success) throw new Error(data?.error || 'Falha na geração');

      await queryClient.invalidateQueries({ queryKey: ['assessments'] });

      const stats = data.stats as {
        sections?: number;
        questions?: number;
        marks?: number;
        duration_minutes?: number;
        passing_score?: number;
      } | undefined;
      const tierData = data.tier as { id?: AssessmentTier; label?: string } | undefined;
      const tierLabel = tierData?.label
        ?? (tierData?.id ? assessmentTierLabels[tierData.id] : undefined);
      const statsLabel = stats
        ? `${stats.sections ?? 3} seções, ${stats.questions ?? 6} questões`
        : '3 seções, 6 questões';

      toast({
        title: 'Avaliação gerada com sucesso',
        description: tierLabel
          ? `${tierLabel} — rascunho criado (${statsLabel}). Revise e ative antes de usar.`
          : `Rascunho criado (${statsLabel}). Revise e ative antes de usar.`,
      });

      onOpenChange(false);
      setSelectedJobId('');
      navigate(`/assessments/${data.assessment.id}`);
    } catch (err) {
      toast({
        title: 'Falha na geração',
        description: err instanceof Error ? err.message : 'Não foi possível gerar a avaliação',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Gerar com IA
          </DialogTitle>
          <DialogDescription>
            Selecione uma vaga que contenha descrição. A IA gerará um rascunho de avaliação adequado ao nível da vaga para você revisar antes de ativar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Vaga</Label>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando vagas…</p>
            ) : jobsWithDescription.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma vaga com descrição encontrada. Adicione uma descrição à vaga primeiro em Vagas.
              </p>
            ) : (
              <Select value={selectedJobId || undefined} onValueChange={setSelectedJobId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma vaga" />
                </SelectTrigger>
                <SelectContent>
                  {jobsWithDescription.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title} ({jobStatusLabels[job.status]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancelar
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedJobId || jobsWithDescription.length === 0}
            className="gap-2"
          >
            {isGenerating ? (
              'Gerando…'
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Gerar Avaliação
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
