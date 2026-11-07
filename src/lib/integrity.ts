import type { IntegrityEvent } from '@/types/database';

export type RawIntegrityEvent = {
  type?: string;
  timestamp?: string;
  duration_seconds?: number;
  question_id?: string;
  question_index?: number;
  section_title?: string;
};

export function normalizeIntegrityEventType(type?: string): IntegrityEvent['type'] {
  if (type === 'focus_loss') return 'focus_lost';
  if (type === 'tab_switch' || type === 'focus_lost' || type === 'fullscreen_exit') {
    return type;
  }
  return 'tab_switch';
}

export function normalizeIntegrityEvent(event: RawIntegrityEvent): IntegrityEvent {
  return {
    type: normalizeIntegrityEventType(event.type),
    timestamp: event.timestamp || new Date().toISOString(),
    duration_seconds: typeof event.duration_seconds === 'number' ? event.duration_seconds : undefined,
    question_id: typeof event.question_id === 'string' ? event.question_id : undefined,
    question_index: typeof event.question_index === 'number' ? event.question_index : undefined,
    section_title: typeof event.section_title === 'string' ? event.section_title : undefined,
  };
}

export function normalizeIntegrityLog(log: unknown): IntegrityEvent[] {
  if (!Array.isArray(log)) return [];
  return log.map((event) =>
    typeof event === 'object' && event !== null
      ? normalizeIntegrityEvent(event as RawIntegrityEvent)
      : { type: 'tab_switch', timestamp: new Date().toISOString() }
  );
}

export interface IntegrityStats {
  tabSwitchCount: number;
  totalSecondsAway: number;
  eventCount: number;
}

export function computeIntegrityStats(
  log: RawIntegrityEvent[],
  currentSessionAwaySeconds = 0
): IntegrityStats {
  let tabSwitchCount = 0;
  let totalSecondsAway = currentSessionAwaySeconds;

  for (const raw of log) {
    const type = normalizeIntegrityEventType(raw.type);
    if (type === 'tab_switch') tabSwitchCount++;
    if (type === 'focus_lost' && typeof raw.duration_seconds === 'number') {
      totalSecondsAway += raw.duration_seconds;
    }
  }

  return {
    tabSwitchCount,
    totalSecondsAway,
    eventCount: log.length,
  };
}

export function formatSecondsAway(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function getIntegrityEventLabel(type?: string): string {
  switch (normalizeIntegrityEventType(type)) {
    case 'tab_switch':
      return 'Troca de aba';
    case 'focus_lost':
      return 'Perda de foco';
    case 'fullscreen_exit':
      return 'Saída de tela cheia';
    default:
      return 'Evento desconhecido';
  }
}

export function getTabSwitchWarningMessage(switchCount: number): {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
} {
  if (switchCount >= 5) {
    return {
      title: 'Aviso de integridade',
      description: 'Trocas repetidas de aba podem comprometer sua avaliação. Permaneça nesta página.',
      variant: 'destructive',
    };
  }
  if (switchCount >= 3) {
    return {
      title: 'Aviso importante de integridade',
      description: 'Múltiplas trocas de aba foram registradas. Por favor, retorne à sua prova.',
      variant: 'destructive',
    };
  }
  return {
    title: 'Troca de aba registrada',
    description: 'Sair desta aba é monitorado e compartilhado com a equipe de recrutamento.',
  };
}
