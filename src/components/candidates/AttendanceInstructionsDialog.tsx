import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  CalendarCheck,
  Copy,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  RotateCcw,
  UserCheck,
} from 'lucide-react';

interface AttendanceInstructionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateName?: string;
  candidateEmail?: string;
  candidatePhone?: string | null;
  jobTitle?: string;
  companyName?: string;
}

function generateDefaultMessage(params: {
  candidateName: string;
  jobTitle: string;
  companyName: string;
  address: string;
  date: string;
  time: string;
  contactPerson: string;
}): string {
  const { candidateName, jobTitle, companyName, address, date, time, contactPerson } = params;

  return `Olá, ${candidateName || 'candidato(a)'}!

Temos uma excelente notícia: você foi aprovado(a) no processo seletivo para a vaga de ${jobTitle || 'nosso time'} na ${companyName || 'nossa empresa'}!

Para darmos início ao seu processo de admissão e integração, solicitamos o seu comparecimento presencial:

📍 Local: ${address || '[Endereço da Empresa]'}
📅 Data: ${date || '[Data de comparecimento]'}
⏰ Horário: ${time || '09:00'}
👤 Procurar por: ${contactPerson || 'Equipe de Recursos Humanos'}

📋 Documentos necessários (Originais e Cópias):
1. Documento de Identidade (RG) e CPF
2. Carteira de Trabalho Digital (número do PIS/PASEP)
3. Comprovante de Residência recente (últimos 3 meses)
4. Certidão de Nascimento / Casamento
5. Certidão e CPF dos filhos menores de 14 anos (se houver)
6. Dados bancários para depósito de salário (Conta corrente)
7. Foto 3x4 recente

Por favor, responda a esta mensagem confirmando o recebimento e a sua presença na data indicada.

Seja muito bem-vindo(a) à nossa equipe!

Atenciosamente,
${companyName ? `${companyName} — ` : ''}Recursos Humanos`;
}

export function AttendanceInstructionsDialog({
  open,
  onOpenChange,
  candidateName = '',
  candidateEmail = '',
  candidatePhone = '',
  jobTitle = '',
  companyName = 'RIA RH',
}: AttendanceInstructionsDialogProps) {
  const { toast } = useToast();

  const [address, setAddress] = useState('Sede da Empresa');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [contactPerson, setContactPerson] = useState('Recursos Humanos');
  const [message, setMessage] = useState('');

  // Re-seed message on open or candidate change
  useEffect(() => {
    if (open) {
      setMessage(
        generateDefaultMessage({
          candidateName,
          jobTitle,
          companyName,
          address,
          date,
          time,
          contactPerson,
        }),
      );
    }
  }, [open, candidateName, jobTitle, companyName]);

  const handleResetToDefault = () => {
    setMessage(
      generateDefaultMessage({
        candidateName,
        jobTitle,
        companyName,
        address,
        date,
        time,
        contactPerson,
      }),
    );
    toast({ title: 'Mensagem atualizada com os campos acima' });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast({
        title: 'Mensagem copiada!',
        description: 'Texto copiado para a área de transferência.',
      });
    } catch {
      toast({
        title: 'Não foi possível copiar',
        description: 'Selecione o texto e copie manualmente.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenWhatsApp = () => {
    const cleanPhone = (candidatePhone || '').replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    const url = cleanPhone
      ? `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleSendEmailClient = () => {
    const subject = encodeURIComponent(`Parabéns! Instruções de Comparecimento — ${jobTitle || 'Admissão'}`);
    const body = encodeURIComponent(message);
    const mailto = `mailto:${candidateEmail}?subject=${subject}&body=${body}`;
    window.open(mailto, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <UserCheck className="h-5 w-5 text-emerald-600" />
            Convocação para Comparecimento & Admissão
          </DialogTitle>
          <DialogDescription>
            {candidateName ? <strong>{candidateName}</strong> : 'Candidato'}
            {jobTitle && ` — ${jobTitle}`}
            {' · Personalize as informações e envie para o candidato.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/30 p-3 rounded-lg border">
            <div className="space-y-1">
              <Label className="text-xs">Endereço de Comparecimento</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: Av. Paulista, 1000 - Bela Vista"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Data de Apresentação</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Horário</Label>
              <Input
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="Ex: 09:00"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Procurar por (Responsável)</Label>
              <Input
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Ex: Recursos Humanos / Gestor"
                className="h-8 text-xs"
              />
            </div>

            <div className="sm:col-span-2 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                onClick={handleResetToDefault}
              >
                <RotateCcw className="h-3 w-3" />
                Atualizar mensagem com estes dados
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Frase / Mensagem de Comparecimento (Editável)
              </Label>
              <span className="text-[11px] text-muted-foreground">
                Edite o texto livremente abaixo
              </span>
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={12}
              className="font-sans text-xs leading-relaxed resize-y min-h-60"
              placeholder="Digite a mensagem de comparecimento..."
            />
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-muted/20 flex-row flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-1.5 text-xs"
          >
            <Copy className="h-3.5 w-3.5" />
            Copiar Mensagem
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenWhatsApp}
              className="gap-1.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Enviar no WhatsApp
            </Button>

            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleSendEmailClient}
              className="gap-1.5 text-xs"
            >
              <Mail className="h-3.5 w-3.5" />
              Enviar por E-mail
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
