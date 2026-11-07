import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical, Copy } from 'lucide-react';
import { useStageTemplates } from '@/hooks/useInterviewPipeline';
import { Textarea } from '@/components/ui/textarea';

interface StageTemplateManagerProps {
  onApplyTemplate?: (stages: { name: string; order: number }[]) => void;
  showApply?: boolean;
}

export function StageTemplateManager({ onApplyTemplate, showApply }: StageTemplateManagerProps) {
  const { templates, isLoading, createTemplate, deleteTemplate } = useStageTemplates();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stages, setStages] = useState<{ name: string; order: number }[]>([
    { name: 'Triagem Inicial', order: 1 },
    { name: 'Entrevista Técnica', order: 2 },
    { name: 'Entrevista RH / Final', order: 3 },
  ]);

  const addStage = () => {
    setStages(prev => [...prev, { name: '', order: prev.length + 1 }]);
  };

  const removeStage = (idx: number) => {
    setStages(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })));
  };

  const updateStageName = (idx: number, newName: string) => {
    setStages(prev => prev.map((s, i) => i === idx ? { ...s, name: newName } : s));
  };

  const handleCreate = () => {
    if (!name.trim() || stages.some(s => !s.name.trim())) return;
    createTemplate.mutate({ name, description, stages }, {
      onSuccess: () => {
        setShowCreate(false);
        setName('');
        setDescription('');
        setStages([
          { name: 'Triagem Inicial', order: 1 },
          { name: 'Entrevista Técnica', order: 2 },
          { name: 'Entrevista RH / Final', order: 3 },
        ]);
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Modelos de Etapas de Entrevista</h3>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1">
          <Plus className="w-4 h-4" /> Novo Modelo
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando modelos...</div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum modelo cadastrado. Crie um para configurar rapidamente as etapas das vagas.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{t.name}</h4>
                    {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {t.stages.map((s, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {s.order}. {s.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {showApply && onApplyTemplate && (
                      <Button size="sm" variant="outline" onClick={() => onApplyTemplate(t.stages)} className="gap-1">
                        <Copy className="w-3 h-3" /> Aplicar
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => deleteTemplate.mutate(t.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Template Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Modelo de Etapas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome do Modelo</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Processo Técnico Padrão" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição (opcional)</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva quando utilizar este modelo" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Etapas</Label>
              {stages.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                  <Input
                    value={s.name}
                    onChange={e => updateStageName(i, e.target.value)}
                    placeholder="Nome da etapa"
                    className="flex-1"
                  />
                  {stages.length > 1 && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeStage(i)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={addStage} className="w-full gap-1">
                <Plus className="w-3.5 h-3.5" /> Adicionar Etapa
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || stages.some(s => !s.name.trim()) || createTemplate.isPending}>
              {createTemplate.isPending ? 'Criando...' : 'Criar Modelo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
