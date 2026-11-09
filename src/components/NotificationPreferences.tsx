import { Loader2, Moon, Smartphone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useNotificationPrefs, usePushNotifications } from '@/hooks/usePushNotifications';
import {
  PUSH_NOTIFICATION_TYPES,
  isPushTypeEnabled,
  type PushNotificationType,
} from '../../supabase/functions/_shared/pushPayload.ts';

const TYPE_ORDER = Object.keys(PUSH_NOTIFICATION_TYPES) as PushNotificationType[];

const PUSH_TYPE_PT_LABELS: Record<PushNotificationType, string> = {
  interview_scheduled: 'Entrevistas agendadas',
  interview_reminder: 'Lembretes de entrevistas',
  interview_cancelled: 'Entrevistas canceladas',
  verdict_submitted: 'Feedbacks de entrevista enviados',
  new_application: 'Novas candidaturas em minhas vagas',
  candidate_assigned: 'Candidatos atribuídos a mim',
  assessment_completed: 'Avaliações enviadas por candidatos',
  assessment_graded: 'Avaliações corrigidas',
  chitra_warning: 'Avisos e pendências importantes',
  chitra_nudge: 'Lembretes do assistente',
  chitra_praise: 'Reconhecimentos e destaques',
};
const DEFAULT_QUIET_START = '22:00';
const DEFAULT_QUIET_END = '07:00';

function DeviceStatus() {
  const { availability, configured, permission, subscribed, isLoading, enable, disable } = usePushNotifications();
  const busy = enable.isPending || disable.isPending;

  let note: string | null = null;
  if (!isLoading && !configured) note = 'As notificações push não estão configuradas neste servidor.';
  else if (availability === 'needs-install')
    note = 'No iPhone e iPad, adicione o app à Tela de Início (Compartilhar → Adicionar à Tela de Início), abra por lá e ative esta opção.';
  else if (availability === 'unsupported') note = 'Este navegador não suporta notificações push.';
  else if (permission === 'denied') note = 'As notificações estão bloqueadas para este site. Permita-as nas configurações do navegador e tente novamente.';

  const canToggle = !isLoading && configured && availability === 'available' && permission !== 'denied';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="push-device" className="flex items-center gap-1.5">
          <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
          Notificações push neste dispositivo
        </Label>
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Switch
            id="push-device"
            checked={subscribed}
            disabled={!canToggle}
            onCheckedChange={(on) => (on ? enable.mutate() : disable.mutate())}
          />
        )}
      </div>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

export function NotificationPreferences() {
  const { prefs, isLoading, update } = useNotificationPrefs();
  const quietOn = !!(prefs.quiet_hours_start && prefs.quiet_hours_end);

  return (
    <div className="min-w-0 space-y-4">
      <DeviceStatus />
      <Separator />

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label htmlFor="push-all">Notificações push</Label>
              <p className="text-xs text-muted-foreground">Aplica-se a todos os seus dispositivos.</p>
            </div>
            <Switch
              id="push-all"
              checked={prefs.push_enabled}
              onCheckedChange={(on) => update.mutate({ push_enabled: on })}
            />
          </div>

          <div className={prefs.push_enabled ? 'space-y-2.5' : 'space-y-2.5 opacity-50'}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notificar-me sobre</p>
            {TYPE_ORDER.map((type) => (
              <div key={type} className="flex items-center justify-between gap-3">
                <Label htmlFor={`push-type-${type}`} className="font-normal">
                  {PUSH_TYPE_PT_LABELS[type] || PUSH_NOTIFICATION_TYPES[type].label}
                </Label>
                <Switch
                  id={`push-type-${type}`}
                  checked={isPushTypeEnabled(type, prefs)}
                  disabled={!prefs.push_enabled}
                  onCheckedChange={(on) => update.mutate({ types: { ...prefs.types, [type]: on } })}
                />
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="push-quiet" className="flex items-center gap-1.5">
                  <Moon className="h-3.5 w-3.5 text-muted-foreground" />
                  Horário de silêncio
                </Label>
                <p className="text-xs text-muted-foreground">Sem notificações nesta janela de horário, no seu fuso horário.</p>
              </div>
              <Switch
                id="push-quiet"
                checked={quietOn}
                disabled={!prefs.push_enabled}
                onCheckedChange={(on) =>
                  update.mutate(
                    on
                      ? { quiet_hours_start: DEFAULT_QUIET_START, quiet_hours_end: DEFAULT_QUIET_END }
                      : { quiet_hours_start: null, quiet_hours_end: null },
                  )
                }
              />
            </div>
            {quietOn && (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  aria-label="Início do horário de silêncio"
                  value={prefs.quiet_hours_start ?? ''}
                  disabled={!prefs.push_enabled}
                  onChange={(e) => e.target.value && update.mutate({ quiet_hours_start: e.target.value })}
                />
                <span className="text-xs text-muted-foreground">até</span>
                <Input
                  type="time"
                  aria-label="Fim do horário de silêncio"
                  value={prefs.quiet_hours_end ?? ''}
                  disabled={!prefs.push_enabled}
                  onChange={(e) => e.target.value && update.mutate({ quiet_hours_end: e.target.value })}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
