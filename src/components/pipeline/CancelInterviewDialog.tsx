import { useEffect, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  INTERVIEW_CANCEL_REASONS,
  type InterviewCancelReason,
} from '@/lib/interviewPanelists';

interface CancelInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateName?: string | null;
  isSubmitting?: boolean;
  onConfirm: (reason: InterviewCancelReason, note?: string) => void;
  overlayClassName?: string;
}

export function CancelInterviewDialog({
  open,
  onOpenChange,
  candidateName,
  isSubmitting = false,
  onConfirm,
  overlayClassName,
}: CancelInterviewDialogProps) {
  const [reason, setReason] = useState<InterviewCancelReason | ''>('');
  const [note, setNote] = useState('');
  const [reasonError, setReasonError] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setNote('');
      setReasonError(false);
    }
  }, [open]);

  const handleConfirm = () => {
    if (!reason) {
      setReasonError(true);
      return;
    }
    onConfirm(reason, note.trim() || undefined);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !isSubmitting) onOpenChange(false); }}>
      <DialogContent
        className={overlayClassName ? 'z-70' : undefined}
        overlayClassName={overlayClassName}
      >
        <DialogHeader>
          <DialogTitle>Cancelar entrevista?</DialogTitle>
          <DialogDescription>
            {candidateName ? (
              <>
                Isso desmarca o horário agendado para <strong>{candidateName}</strong>.
                O candidato permanece na mesma etapa do processo (como não agendado). Isso não conta como falta nem reprovação.
              </>
            ) : (
              <>
                Isso desmarca o horário agendado. O candidato permanece na mesma etapa do processo.
                Isso não conta como falta nem reprovação.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-2">
            <Label>
              Motivo <span className="text-destructive">*</span>
            </Label>
            <RadioGroup
              value={reason}
              onValueChange={(value) => {
                setReason(value as InterviewCancelReason);
                setReasonError(false);
              }}
              className="gap-2"
            >
              {INTERVIEW_CANCEL_REASONS.map((item) => (
                <div key={item.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={item.value} id={`cancel-reason-${item.value}`} />
                  <Label htmlFor={`cancel-reason-${item.value}`} className="font-normal cursor-pointer">
                    {item.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {reasonError && (
              <p className="text-xs text-destructive">Selecione um motivo para o cancelamento.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cancel-interview-note">Observação (opcional)</Label>
            <Textarea
              id="cancel-interview-note"
              rows={2}
              placeholder="Informações relevantes para os entrevistadores…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Os entrevistadores envolvidos serão notificados no sistema e por e-mail.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
            Manter agendamento
          </Button>
          <Button variant="destructive" disabled={isSubmitting || !reason} onClick={handleConfirm}>
            {isSubmitting ? 'Cancelando…' : 'Cancelar entrevista'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
