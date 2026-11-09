import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MfaEnrollPanel } from '@/components/auth/MfaEnrollPanel';
import { useSsoSettings, type SsoSettings } from '@/hooks/useSystemConfig';
import { Loader2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AuditLogRow {
  id: string;
  created_at: string;
  action: string;
  entity_type: string;
  entity_id: string;
  actor_id: string | null;
}

export function SecuritySettingsTab() {
  const { sso, isLoading: ssoLoading, updateAsync, isUpdating } = useSsoSettings();
  const [form, setForm] = useState<SsoSettings>(sso);

  useEffect(() => {
    setForm(sso);
  }, [sso]);

  const auditQuery = useQuery({
    queryKey: ['audit_log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('id, created_at, action, entity_type, entity_id, actor_id')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AuditLogRow[];
    },
  });

  const saveSso = async () => {
    await updateAsync(form);
  };

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Autenticação de dois fatores (TOTP / 2FA)</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Proteja sua conta da equipe com um aplicativo autenticador. Obrigatório no login após ativado.
          </p>
        </div>
        <MfaEnrollPanel onEnrolled={() => undefined} />
      </section>

      <section className="space-y-3 border-t pt-6">
        <div>
          <h3 className="text-sm font-medium">Login Único SAML 2.0 (SSO)</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Registre os Provedores de Identidade (IdP) pela API admin do GoTrue. Ative aqui para exibir o botão de SSO na tela de login.
            Configure previamente as variáveis <code className="text-xs">GOTRUE_SAML_*</code> no container de autenticação.
          </p>
        </div>
        {ssoLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <div className="space-y-4 max-w-lg">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="sso-enabled">Exibir botão de SSO na tela de login</Label>
              <Switch
                id="sso-enabled"
                checked={form.enabled}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, enabled: checked }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sso-domain">Domínio de e-mail (iniciado pelo provedor)</Label>
              <Input
                id="sso-domain"
                placeholder="empresa.com.br"
                value={form.domain ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, domain: e.target.value || null }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sso-provider-id">ID do Provedor (opcional)</Label>
              <Input
                id="sso-provider-id"
                placeholder="UUID da API admin de SSO do GoTrue"
                value={form.provider_id ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, provider_id: e.target.value || null }))}
              />
            </div>
            <Button onClick={saveSso} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar configurações de SSO
            </Button>
          </div>
        )}
      </section>

      <section className="space-y-3 border-t pt-6">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium">Registro de auditoria (Audit Log)</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Registro imutável de atualizações de candidatos, agendamentos de entrevistas, decisões de contratação e alterações de perfil. Últimos 50 eventos.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => auditQuery.refetch()} disabled={auditQuery.isFetching}>
            <RefreshCw className={`h-4 w-4 mr-1 ${auditQuery.isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
        {auditQuery.isError && (
          <Alert variant="destructive">
            <AlertDescription>
              {(auditQuery.error as Error).message.includes('audit_log')
                ? 'A tabela de auditoria ainda não está disponível — aplique a migration 20260902000001 após revisão.'
                : (auditQuery.error as Error).message}
            </AlertDescription>
          </Alert>
        )}
        {auditQuery.isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Identificador</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(auditQuery.data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-6">
                      Nenhum registro de auditoria encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  (auditQuery.data ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {new Date(row.created_at).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-xs font-medium">{row.action}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.entity_type}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-xs">
                        {row.entity_id}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
