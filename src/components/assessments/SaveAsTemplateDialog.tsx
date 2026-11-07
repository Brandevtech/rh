import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTemplates, assessmentToTemplateData } from '@/hooks/useTemplates';
import type { AssessmentWithDetails } from '@/types/database';

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessment: AssessmentWithDetails;
}

export function SaveAsTemplateDialog({
  open,
  onOpenChange,
  assessment,
}: SaveAsTemplateDialogProps) {
  const { createTemplate } = useTemplates();
  const [name, setName] = useState(assessment.title + ' (Modelo)');
  const [description, setDescription] = useState(assessment.description || '');

  const handleSave = async () => {
    const templateData = assessmentToTemplateData(assessment);
    
    await createTemplate.mutateAsync({
      name,
      description,
      template_data: templateData,
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Salvar como Modelo</DialogTitle>
          <DialogDescription>
            Salve esta avaliação como um modelo reutilizável para futuras vagas e testes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Nome do Modelo</Label>
            <Input
              id="template-name"
              placeholder="Ex: Modelo de Desenvolvedor Frontend"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-description">Descrição</Label>
            <Textarea
              id="template-description"
              placeholder="Breve descrição deste modelo..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            Este modelo incluirá:
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>{assessment.sections.length} seção(ões)</li>
              <li>{assessment.sections.reduce((acc, s) => acc + s.questions.length, 0)} questão(ões)</li>
              <li>Duração: {assessment.duration_minutes} minutos</li>
              <li>Nota de corte: {assessment.passing_score}%</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={createTemplate.isPending || !name.trim()}>
            {createTemplate.isPending ? 'Salvando...' : 'Salvar Modelo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
