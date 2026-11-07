import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserPlus, Trash2, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AssignInterviewersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateName: string;
}

interface InterviewerAssignment {
  id: string;
  interviewer_user_id: string;
  notes: string | null;
  created_at: string;
  profile?: { full_name: string; email: string };
}

/** Prefer full_name when it looks like a real name; else use email local part. */
function displayName(fullName: string | null | undefined, email: string | null | undefined): string {
  const name = (fullName || '').trim();
  if (name && !name.includes('@')) return name;
  if (email && email.includes('@')) return email.split('@')[0];
  return '—';
}

export function AssignInterviewersDialog({ open, onOpenChange, candidateId, candidateName }: AssignInterviewersDialogProps) {
  const [assignments, setAssignments] = useState<InterviewerAssignment[]>([]);
  const [availableInterviewers, setAvailableInterviewers] = useState<{ user_id: string; full_name: string; email: string }[]>([]);
  const [selectedInterviewer, setSelectedInterviewer] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    
    const { data: assigned } = await supabase
      .from('candidate_interviewers')
      .select('id, interviewer_user_id, notes, created_at')
      .eq('candidate_id', candidateId);

    const { data: conductors } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .eq('can_conduct_interviews', true)
      .order('full_name', { ascending: true });

    const assignedIds = (assigned || []).map(a => a.interviewer_user_id);
    const profileMap = new Map((conductors || []).map(p => [p.user_id, p]));

    // For assigned rows whose profile wasn't in the conductors list (flag may have been toggled off),
    // fetch their profiles separately so names still display correctly.
    const missingIds = assignedIds.filter(id => !profileMap.has(id));
    if (missingIds.length > 0) {
      const { data: extra } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', missingIds);
      (extra || []).forEach(p => profileMap.set(p.user_id, p));
    }

    setAssignments((assigned || []).map(a => ({
      ...a,
      profile: profileMap.get(a.interviewer_user_id),
    })));

    setAvailableInterviewers(
      (conductors || [])
        .filter(p => !assignedIds.includes(p.user_id))
        .map(p => ({
          user_id: p.user_id,
          full_name: displayName(p.full_name, p.email),
          email: p.email || '—',
        }))
    );

    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchData();
  }, [open, candidateId]);

  const handleAssign = async () => {
    if (!selectedInterviewer) return;
    setAdding(true);
    const { error } = await supabase
      .from('candidate_interviewers')
      .insert({
        candidate_id: candidateId,
        interviewer_user_id: selectedInterviewer,
        assigned_by: (await supabase.auth.getUser()).data.user?.id,
        notes: notes || null,
      });
    
    if (error) {
      toast.error('Falha ao atribuir entrevistador');
    } else {
      toast.success('Entrevistador atribuído com sucesso');
      setSelectedInterviewer('');
      setNotes('');
      await fetchData();
    }
    setAdding(false);
  };

  const handleRemove = async (assignmentId: string) => {
    const { error } = await supabase.from('candidate_interviewers').delete().eq('id', assignmentId);
    if (error) {
      toast.error('Falha ao remover entrevistador');
    } else {
      toast.success('Entrevistador removido com sucesso');
      await fetchData();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl min-w-0 sm:min-w-[420px] bg-background border shadow-lg overflow-hidden flex flex-col max-h-[90dvh]">
        <DialogHeader>
          <DialogTitle>Atribuir Entrevistadores</DialogTitle>
          <DialogDescription>
            Gerencie os entrevistadores atribuídos a <strong>{candidateName}</strong>. Entrevistadores atribuídos podem visualizar detalhes e avaliações do candidato.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {availableInterviewers.length > 0 && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Select value={selectedInterviewer} onValueChange={setSelectedInterviewer}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione um entrevistador" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableInterviewers.map(r => (
                        <SelectItem key={r.user_id} value={r.user_id}>
                          {r.full_name} — {r.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAssign} disabled={!selectedInterviewer || adding} size="sm">
                    <UserPlus className="h-4 w-4 mr-1" />
                    {adding ? 'Atribuindo...' : 'Atribuir'}
                  </Button>
                </div>
                {selectedInterviewer && (
                  <Textarea
                    placeholder="Observações para o entrevistador (opcional)"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                  />
                )}
              </div>
            )}

            {availableInterviewers.length === 0 && assignments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum entrevistador disponível. Ative a permissão "Pode Conduzir Entrevistas" para usuários em Configurações primeiro.
              </p>
            )}

            {assignments.length > 0 && (
              <div className="border rounded-lg overflow-x-auto overflow-y-auto bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">Entrevistador</TableHead>
                      <TableHead className="min-w-[180px]">E-mail</TableHead>
                      <TableHead className="min-w-[120px]">Observações</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map(a => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{displayName(a.profile?.full_name, a.profile?.email)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.profile?.email || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{a.notes || '—'}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemove(a.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {assignments.length === 0 && availableInterviewers.length > 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">Nenhum entrevistador atribuído ainda.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
