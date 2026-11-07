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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Users } from 'lucide-react';
import { exportToCSV, formatDateForExport } from '@/lib/exportUtils';
import { useToast } from '@/hooks/use-toast';

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  linkedin_url?: string | null;
  role_applied?: string | null;
  skills?: string[] | null;
  notes?: string | null;
  created_at: string;
}

interface ExportCandidatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: Candidate[];
}

const AVAILABLE_COLUMNS = [
  { id: 'name', label: 'Nome', key: 'name' },
  { id: 'email', label: 'E-mail', key: 'email' },
  { id: 'phone', label: 'Telefone', key: 'phone' },
  { id: 'linkedin_url', label: 'LinkedIn', key: 'linkedin_url' },
  { id: 'role_applied', label: 'Cargo Desejado', key: 'role_applied' },
  { id: 'skills', label: 'Habilidades', key: 'skills' },
  { id: 'notes', label: 'Observações', key: 'notes' },
  { id: 'created_at', label: 'Data de Cadastro', key: 'created_at' },
] as const;

export function ExportCandidatesDialog({
  open,
  onOpenChange,
  candidates,
}: ExportCandidatesDialogProps) {
  const { toast } = useToast();
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'name',
    'email',
    'phone',
    'role_applied',
    'skills',
    'created_at',
  ]);

  const toggleColumn = (columnId: string) => {
    setSelectedColumns(prev =>
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  const handleExport = () => {
    if (selectedColumns.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nenhuma coluna selecionada',
        description: 'Por favor, selecione ao menos uma coluna para exportar.',
      });
      return;
    }

    try {
      const columns = selectedColumns.map(id => {
        const col = AVAILABLE_COLUMNS.find(c => c.id === id)!;
        return {
          key: col.key,
          label: col.label,
          format: (value: unknown) => {
            if (col.id === 'created_at') {
              return formatDateForExport(value as string);
            }
            if (col.id === 'skills') {
              const skills = value as string[] | null;
              return skills?.join(', ') ?? '';
            }
            return String(value ?? '');
          },
        };
      });

      const filename = `candidatos-${new Date().toISOString().split('T')[0]}`;
      exportToCSV(candidates, columns, filename);
      toast({ title: `Exportados ${candidates.length} candidato(s)` });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Falha na exportação',
        description: error.message,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Exportar Candidatos
          </DialogTitle>
          <DialogDescription>
            Exporte os dados dos candidatos para um arquivo CSV.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Colunas a incluir</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AVAILABLE_COLUMNS.map((column) => (
                <div key={column.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cand-${column.id}`}
                    checked={selectedColumns.includes(column.id)}
                    onCheckedChange={() => toggleColumn(column.id)}
                  />
                  <label
                    htmlFor={`cand-${column.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {column.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-muted rounded-lg text-sm">
            <p className="font-medium">Resumo da exportação</p>
            <p className="text-muted-foreground mt-1">
              {candidates.length} candidato(s) com {selectedColumns.length} coluna(s)
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={selectedColumns.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
