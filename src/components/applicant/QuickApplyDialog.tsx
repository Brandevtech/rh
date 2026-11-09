import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { Loader2, Send } from 'lucide-react';
import type { Job } from '@/types/jobs';

interface QuickApplyDialogProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (coverLetter?: string) => Promise<void>;
  isPending: boolean;
}

export function QuickApplyDialog({
  job,
  open,
  onOpenChange,
  onApply,
  isPending = false,
}: QuickApplyDialogProps) {
  const [coverLetter, setCoverLetter] = useState('');

  useEffect(() => {
    if (open) setCoverLetter('');
  }, [open, job?.id]);

  const handleApply = async () => {
    await onApply(coverLetter.trim() || undefined);
    setCoverLetter('');
    onOpenChange(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) setCoverLetter('');
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Candidatura Rápida</DialogTitle>
          <DialogDescription>
            Candidate-se para {job?.title} usando seu perfil salvo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="cover_letter">Carta de Apresentação (opcional)</Label>
          <Textarea
            id="cover_letter"
            placeholder="Conte-nos por que você tem o perfil ideal para esta vaga..."
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleApply} disabled={isPending} className="gap-1">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar Candidatura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
