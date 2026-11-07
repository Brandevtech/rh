import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePreScreen, type AcademicRecord, type PreScreenData } from '@/hooks/usePreScreen';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, GraduationCap, MessageSquare, Briefcase, MapPin, Star, Laptop2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { analyzeCareer, formatYears } from '@/lib/candidateTenure';

interface PreScreenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateName: string;
}

const defaultAcademics: AcademicRecord[] = [
  { level: '10th', institution: '', marks: '', percentile: '' },
  { level: '12th', institution: '', marks: '', percentile: '' },
  { level: 'graduation', institution: '', marks: '', percentile: '' },
  { level: 'post_graduation', institution: '', marks: '', percentile: '' },
];

const levelLabels: Record<string, string> = {
  '10th': 'Ensino Fundamental (10th)',
  '12th': 'Ensino Médio (12th)',
  'graduation': 'Graduação',
  'post_graduation': 'Pós-Graduação',
};

const sectionHeadingClass =
  'text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2';

const fieldGridClass = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4';

function CtcInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex h-10 w-full items-stretch overflow-hidden rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      <span className="flex w-9 shrink-0 items-center justify-center border-r border-input bg-muted/40 text-sm text-muted-foreground">
        ₹
      </span>
      <input
        type="number"
        step="0.25"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 bg-transparent px-3 py-2 text-base outline-hidden placeholder:text-muted-foreground md:text-sm"
      />
      <span className="flex w-17 shrink-0 items-center justify-center border-l border-input bg-muted/40 px-1 text-[11px] leading-tight text-muted-foreground sm:w-18 sm:text-xs">
        Lakh(s)
      </span>
    </div>
  );
}

export function PreScreenDialog({ open, onOpenChange, candidateId, candidateName }: PreScreenDialogProps) {
  const { prescreen, isLoading, upsert } = usePreScreen(candidateId);
  const { user } = useAuth();
  const { data: tenureHint } = useQuery({
    queryKey: ['prescreen-tenure', candidateId],
    enabled: open && !!candidateId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidates')
        .select('work_experience, education, role_applied, job:jobs(title, description, required_skills)')
        .eq('id', candidateId)
        .maybeSingle();
      if (error) throw error;
      const job = data?.job as { title?: string; description?: string; required_skills?: string[] } | null;
      return analyzeCareer({
        workExperience: data?.work_experience,
        education: data?.education,
        target: {
          jobTitle: job?.title ?? null,
          jobDescription: job?.description ?? null,
          roleApplied: data?.role_applied ?? null,
          requiredSkills: job?.required_skills ?? null,
        },
      });
    },
  });

  const [form, setForm] = useState({
    total_experience_years: '' as string,
    relevant_experience_years: '' as string,
    relevant_experience_domain: '',
    current_ctc: '',
    expected_ctc: '',
    notice_period: '',
    lwd: '',
    current_location: '',
    preferred_location: '',
    open_to_relocation: '' as string,
    work_mode_preference: [] as string[],
    comms_rating: '' as string,
    nutshell: '',
    academics: defaultAcademics,
  });

  useEffect(() => {
    if (prescreen) {
      const existingAcademics = (prescreen.academics as AcademicRecord[] | null) || [];
      const mergedAcademics = defaultAcademics.map(def => {
        const found = existingAcademics.find(a => a.level === def.level);
        return found || def;
      });

      setForm({
        total_experience_years: prescreen.total_experience_years?.toString() ?? '',
        relevant_experience_years: prescreen.relevant_experience_years?.toString() ?? '',
        relevant_experience_domain: prescreen.relevant_experience_domain ?? '',
        current_ctc: prescreen.current_ctc ?? '',
        expected_ctc: prescreen.expected_ctc ?? '',
        notice_period: prescreen.notice_period ?? '',
        lwd: prescreen.lwd ?? '',
        current_location: prescreen.current_location ?? '',
        preferred_location: prescreen.preferred_location ?? '',
        open_to_relocation: prescreen.open_to_relocation ?? '',
        work_mode_preference: prescreen.work_mode_preference ?? [],
        comms_rating: prescreen.comms_rating?.toString() ?? '',
        nutshell: prescreen.nutshell ?? '',
        academics: mergedAcademics,
      });
    } else if (!isLoading) {
      setForm({
        total_experience_years: '',
        relevant_experience_years: '',
        relevant_experience_domain: '',
        current_ctc: '',
        expected_ctc: '',
        notice_period: '',
        lwd: '',
        current_location: '',
        preferred_location: '',
        open_to_relocation: '',
        work_mode_preference: [],
        comms_rating: '',
        nutshell: '',
        academics: defaultAcademics,
      });
    }
  }, [prescreen, isLoading]);

  useEffect(() => {
    if (prescreen || isLoading) return;
    if (!tenureHint || tenureHint.roles.length === 0) return;
    setForm((prev) => ({
      ...prev,
      total_experience_years: prev.total_experience_years || String(tenureHint.totalProfessionalYears),
      relevant_experience_years: prev.relevant_experience_years || String(tenureHint.relevantYears),
    }));
  }, [tenureHint, prescreen, isLoading]);

  const updateAcademic = (index: number, field: keyof AcademicRecord, value: string) => {
    setForm(prev => {
      const updated = [...prev.academics];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, academics: updated };
    });
  };

  const handleSave = async () => {
    const data: Omit<PreScreenData, 'id'> = {
      candidate_id: candidateId,
      total_experience_years: form.total_experience_years ? parseFloat(form.total_experience_years) : null,
      relevant_experience_years: form.relevant_experience_years ? parseFloat(form.relevant_experience_years) : null,
      relevant_experience_domain: form.relevant_experience_domain || undefined,
      current_ctc: form.current_ctc || undefined,
      expected_ctc: form.expected_ctc || undefined,
      notice_period: form.notice_period || undefined,
      lwd: form.lwd || undefined,
      current_location: form.current_location || undefined,
      preferred_location: form.preferred_location || undefined,
      open_to_relocation: form.open_to_relocation || null,
      work_mode_preference: form.work_mode_preference.length > 0 ? form.work_mode_preference : null,
      comms_rating: form.comms_rating ? parseFloat(form.comms_rating) : null,
      nutshell: form.nutshell || undefined,
      academics: form.academics.filter(a => a.institution || a.marks || a.percentile),
      screened_by: user?.id,
    };
    await upsert.mutateAsync(data);
    onOpenChange(false);
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-4xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid w-[calc(100%-1rem)] max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b px-4 pb-3 pt-4 sm:px-6 sm:pt-6">
          <DialogTitle className="flex items-center gap-2 pr-6 text-left">
            <MessageSquare className="h-5 w-5 shrink-0 text-primary" />
            <span className="truncate">Pré-Triagem: {candidateName}</span>
          </DialogTitle>
          <DialogDescription className="text-left">
            Registre as informações obtidas durante a chamada de pré-triagem.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          <div className="space-y-8 pb-2">
            {/* Experience & Compensation */}
            <section>
              <h3 className={sectionHeadingClass}>
                <Briefcase className="h-4 w-4 shrink-0" /> Experiência e Remuneração
              </h3>
              <div className={fieldGridClass}>
                <div className="space-y-2">
                  <Label>Experiência Total (anos)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="e.g. 4"
                    value={form.total_experience_years}
                    onChange={e => setForm(prev => ({ ...prev, total_experience_years: e.target.value }))}
                  />
                  {tenureHint && tenureHint.roles.length > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      Linha do tempo do CV: {formatYears(tenureHint.totalProfessionalYears)} profissional (treinamentos excluídos)
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Experiência Relevante (anos)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="e.g. 3"
                    value={form.relevant_experience_years}
                    onChange={e => setForm(prev => ({ ...prev, relevant_experience_years: e.target.value }))}
                  />
                  {tenureHint && tenureHint.roles.length > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      Linha do tempo do CV: {formatYears(tenureHint.relevantYears)} relevante
                      {tenureHint.relevantRoleLabels.length ? ` (${tenureHint.relevantRoleLabels.join(', ')})` : ''}
                    </p>
                  )}
                </div>
                <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                  <Label>Área de Experiência Relevante</Label>
                  <Input
                    placeholder="ex: Vendas B2B, Desenvolvimento Frontend"
                    value={form.relevant_experience_domain}
                    onChange={e => setForm(prev => ({ ...prev, relevant_experience_domain: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Remuneração Atual</Label>
                  <CtcInput
                    placeholder="e.g. 8.25"
                    value={form.current_ctc}
                    onChange={(value) => setForm(prev => ({ ...prev, current_ctc: value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pretensão Salarial</Label>
                  <CtcInput
                    placeholder="e.g. 11"
                    value={form.expected_ctc}
                    onChange={(value) => setForm(prev => ({ ...prev, expected_ctc: value }))}
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* Notice Period & Location */}
            <section>
              <h3 className={sectionHeadingClass}>
                <MapPin className="h-4 w-4 shrink-0" /> Aviso Prévio e Localização
              </h3>
              <div className={fieldGridClass}>
                  <div className="space-y-2">
                  <Label>Aviso Prévio</Label>
                  <Select
                    value={form.notice_period}
                    onValueChange={(value) => setForm(prev => ({ ...prev, notice_period: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o aviso prévio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Immediate">Imediato</SelectItem>
                      <SelectItem value="Serving">Cumprindo aviso</SelectItem>
                      <SelectItem value="Notice">Em aviso prévio</SelectItem>
                      <SelectItem value="0 - 7 days">0 - 7 dias</SelectItem>
                      <SelectItem value="7 - 15 days">7 - 15 dias</SelectItem>
                      <SelectItem value="15 - 30 days">15 - 30 dias</SelectItem>
                      <SelectItem value="30 - 45 days">30 - 45 dias</SelectItem>
                      <SelectItem value="45 - 60 days">45 - 60 dias</SelectItem>
                      <SelectItem value="More than 60 days">Mais de 60 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Último Dia de Trabalho (LWD)</Label>
                  <Input
                    placeholder="e.g. 15 March 2026"
                    value={form.lwd}
                    onChange={e => setForm(prev => ({ ...prev, lwd: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Localização Atual</Label>
                  <Input
                    placeholder="e.g. Noida"
                    value={form.current_location}
                    onChange={e => setForm(prev => ({ ...prev, current_location: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Localização Preferida</Label>
                  <Input
                    placeholder="e.g. Noida, Delhi NCR"
                    value={form.preferred_location}
                    onChange={e => setForm(prev => ({ ...prev, preferred_location: e.target.value }))}
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* Mobility & Work Mode */}
            <section>
              <h3 className={sectionHeadingClass}>
                <Laptop2 className="h-4 w-4 shrink-0" /> Mobilidade e Modelo de Trabalho
              </h3>
              <div className="space-y-5">
                {/* Open to Relocation */}
                <div className="space-y-2">
                  <Label>Disponibilidade para Mudança?</Label>
                  <div className="flex flex-wrap gap-2">
                    {(['yes', 'no', 'maybe'] as const).map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, open_to_relocation: prev.open_to_relocation === opt ? '' : opt }))}
                        className={cn(
                          'rounded-md border px-4 py-1.5 text-sm font-medium transition-all',
                          form.open_to_relocation === opt
                            ? opt === 'yes'
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : opt === 'no'
                              ? 'border-red-500 bg-red-500 text-white'
                              : 'border-amber-500 bg-amber-500 text-white'
                            : 'border-border bg-muted text-muted-foreground hover:bg-muted-foreground/10'
                        )}
                      >
                        {opt === 'yes' ? 'Sim' : opt === 'no' ? 'Não' : 'Talvez'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Work Mode Preference */}
                <div className="space-y-2">
                  <Label>Preferência de Modelo de Trabalho <span className="text-xs font-normal text-muted-foreground">(selecione todos os aplicáveis)</span></Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'wfo',     label: 'Presencial' },
                      { value: 'wfh',     label: 'Remoto' },
                      { value: 'hybrid',  label: 'Híbrido' },
                      { value: 'flexible',label: 'Flexível' },
                    ].map(opt => {
                      const selected = form.work_mode_preference.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setForm(prev => ({
                            ...prev,
                            work_mode_preference: selected
                              ? prev.work_mode_preference.filter(v => v !== opt.value)
                              : [...prev.work_mode_preference, opt.value],
                          }))}
                          className={cn(
                            'rounded-md border px-3 py-1.5 text-sm font-medium transition-all',
                            selected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-muted text-muted-foreground hover:bg-muted-foreground/10'
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <Separator />

            {/* Communication Rating - Highlighted */}
            <section className="rounded-lg border border-primary/20 bg-primary/5 p-4 sm:p-5">
              <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                <MessageSquare className="h-4 w-4 shrink-0" /> Avaliação de Comunicação
                <Badge variant="outline" className="border-primary/30 text-[10px] font-normal text-primary">Importante</Badge>
              </h3>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                <div className="flex flex-wrap gap-1.5">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button
                      key={n}
                      type="button"
                      className={cn(
                        'h-8 w-8 rounded-md text-xs font-semibold transition-all sm:h-9 sm:w-9',
                        form.comms_rating && parseFloat(form.comms_rating) >= n
                          ? n >= 8 ? 'bg-green-500 text-white' : n >= 5 ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'
                          : 'bg-muted text-muted-foreground hover:bg-muted-foreground/10'
                      )}
                      onClick={() => setForm(prev => ({ ...prev, comms_rating: n.toString() }))}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                {form.comms_rating && (
                  <Badge
                    className={cn(
                      'w-fit px-3 py-1 text-sm',
                      parseFloat(form.comms_rating) >= 8
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : parseFloat(form.comms_rating) >= 6
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : parseFloat(form.comms_rating) >= 4
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    )}
                    variant="secondary"
                  >
                    <Star className="mr-1 h-3.5 w-3.5" />
                    {parseFloat(form.comms_rating) >= 8 ? 'Excelente' : parseFloat(form.comms_rating) >= 6 ? 'Bom' : parseFloat(form.comms_rating) >= 4 ? 'Médio' : 'Abaixo da Média'}
                  </Badge>
                )}
              </div>
            </section>

            <Separator />

            {/* Academics */}
            <section>
              <h3 className={sectionHeadingClass}>
                <GraduationCap className="h-4 w-4 shrink-0" /> Formação Acadêmica
              </h3>
              <div className="space-y-4">
                {form.academics.map((acad, idx) => (
                  <div key={acad.level} className="space-y-3 rounded-lg bg-muted/30 p-3 sm:p-4">
                    <span className="text-sm font-medium">{levelLabels[acad.level]}</span>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Instituição</Label>
                        <Input
                          placeholder="Escola / Universidade"
                          value={acad.institution}
                          onChange={e => updateAcademic(idx, 'institution', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Nota / Coeficiente</Label>
                        <Input
                          placeholder="ex: 85% ou 8.5"
                          value={acad.marks}
                          onChange={e => updateAcademic(idx, 'marks', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                        <Label className="text-xs">Percentil</Label>
                        <Input
                          placeholder="e.g. 92nd"
                          value={acad.percentile}
                          onChange={e => updateAcademic(idx, 'percentile', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <Separator />

            {/* Nutshell */}
            <section>
              <h3 className={sectionHeadingClass}>
                Resumo da Conversa
              </h3>
              <Textarea
                placeholder="Principais destaques da chamada de pré-triagem..."
                rows={4}
                className="min-h-26 resize-y"
                value={form.nutshell}
                onChange={e => setForm(prev => ({ ...prev, nutshell: e.target.value }))}
              />
            </section>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t bg-background px-4 py-3 sm:px-6 sm:py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={upsert.isPending}>
            {upsert.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...</> : 'Salvar Pré-Triagem'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
