import { useState } from 'react';
import { BellRing, Share, SquarePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { isPushPromptSnoozed, snoozePushPrompt } from '@/lib/webPush';

/**
 * Soft prompt for push notifications, shown inside the notification panel so
 * it only appears after the user opens it. The browser permission dialog is
 * requested from the "Turn on" tap and never on load. In an iOS Safari tab,
 * where push needs the installed app, it explains Add to Home Screen instead.
 */
export function PushPromptCard() {
  const { availability, configured, permission, subscribed, isLoading, enable } = usePushNotifications();
  const [snoozed, setSnoozed] = useState(() => isPushPromptSnoozed());

  if (isLoading || !configured || subscribed || snoozed) return null;
  if (availability === 'unsupported' || permission === 'denied') return null;

  const dismiss = () => {
    snoozePushPrompt();
    setSnoozed(true);
  };

  return (
    <div className="relative mx-3 my-2 rounded-lg border border-primary/20 bg-primary/5 p-3 pr-8">
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2 top-2 rounded p-0.5 text-muted-foreground hover:text-foreground"
        aria-label="Agora não"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start gap-2.5">
        <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        {availability === 'needs-install' ? (
          <div className="space-y-1 text-xs">
            <p className="font-semibold text-foreground">Receba notificações neste iPhone ou iPad</p>
            <p className="text-muted-foreground leading-snug">
              Toque em <Share className="inline h-3.5 w-3.5 align-text-bottom" aria-label="Compartilhar" /> no Safari, escolha{' '}
              <span className="whitespace-nowrap">
                <SquarePlus className="inline h-3.5 w-3.5 align-text-bottom" aria-hidden /> Adicionar à Tela de Início
              </span>
              , depois abra o app pela tela de início e ative as notificações lá.
            </p>
          </div>
        ) : (
          <div className="space-y-2 text-xs">
            <div className="space-y-0.5">
              <p className="font-semibold text-foreground">Ativar notificações push</p>
              <p className="text-muted-foreground leading-snug">
                Receba lembretes de entrevistas e atualizações neste dispositivo, mesmo com o app fechado.
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" disabled={enable.isPending} onClick={() => enable.mutate()}>
                {enable.isPending ? 'Ativando…' : 'Ativar'}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={dismiss}>
                Agora não
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
