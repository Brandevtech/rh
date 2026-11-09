import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useComplianceSettings,
  SUB_PROCESSORS,
  type ComplianceSettings,
} from '@/hooks/useSystemConfig';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function ComplianceSettingsTab() {
  const { compliance, isLoading, updateAsync, isUpdating } = useComplianceSettings();
  const [form, setForm] = useState<ComplianceSettings>(compliance);

  useEffect(() => {
    setForm(compliance);
  }, [compliance]);

  const save = async () => {
    await updateAsync(form);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando configurações de conformidade...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertDescription>
          Ganchos de conformidade e governança de dados. A fila completa de requisições de titulares (DSAR/exclusão) é tratada em fase dedicada.
          Consulte <code className="text-xs">docs/COMPLIANCE.md</code>.
        </AlertDescription>
      </Alert>

      <section className="space-y-4 max-w-xl">
        <div>
          <h3 className="text-sm font-medium">URLs de Privacidade & Termos Legais</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Exibidas no rodapé da área do candidato e nos fluxos de consentimento quando configuradas.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="privacy-url">URL da Política de Privacidade</Label>
          <Input
            id="privacy-url"
            type="url"
            placeholder="https://suaempresa.com.br/privacidade"
            value={form.privacy_policy_url ?? ''}
            onChange={(e) => setForm((prev) => ({ ...prev, privacy_policy_url: e.target.value || null }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="terms-url">URL dos Termos de Uso</Label>
          <Input
            id="terms-url"
            type="url"
            placeholder="https://suaempresa.com.br/termos"
            value={form.terms_url ?? ''}
            onChange={(e) => setForm((prev) => ({ ...prev, terms_url: e.target.value || null }))}
          />
        </div>
      </section>

      <section className="space-y-4 max-w-xl border-t pt-6">
        <div>
          <h3 className="text-sm font-medium">Encarregado de Dados / DPO (LGPD / DPDP)</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Nome e e-mail informados no rodapé do portal para solicitações e direitos dos titulares de dados.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="grievance-name">Nome do Encarregado (DPO)</Label>
          <Input
            id="grievance-name"
            value={form.grievance_officer_name ?? ''}
            onChange={(e) => setForm((prev) => ({ ...prev, grievance_officer_name: e.target.value || null }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="grievance-email">E-mail do Encarregado (DPO)</Label>
          <Input
            id="grievance-email"
            type="email"
            value={form.grievance_officer_email ?? ''}
            onChange={(e) => setForm((prev) => ({ ...prev, grievance_officer_email: e.target.value || null }))}
          />
        </div>
        <Button onClick={save} disabled={isUpdating}>
          {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Salvar configurações de conformidade
        </Button>
      </section>

      <section className="space-y-3 border-t pt-6">
        <div>
          <h3 className="text-sm font-medium">Operadores e Sub-processadores de Dados</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Processadores em uso atualmente. A organização deve manter acordos de processamento de dados (DPA) com cada fornecedor. Esta lista é de caráter informativo.
          </p>
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Processador</TableHead>
                <TableHead>Finalidade</TableHead>
                <TableHead>Localização / Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SUB_PROCESSORS.map((sp) => (
                <TableRow key={sp.name}>
                  <TableCell className="text-sm font-medium">{sp.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{sp.purpose}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{sp.location}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">
          A residência dos dados é escolhida pelo administrador (região Supabase, região AWS SES). O uso do Gemini e transferências internacionais devem ser informados em sua política de privacidade.
        </p>
      </section>
    </div>
  );
}
