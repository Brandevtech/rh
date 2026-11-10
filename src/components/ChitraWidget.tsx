import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Eye, X, Minus, ChevronDown, Send, Loader2 } from 'lucide-react';
import { useNotifications, cleanMessage, type AppNotification } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { extensions } from '@/lib/extensions';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { isPublicRoute } from '@/lib/publicRoutes';

// ── Custom animated eye for the launcher button ───────────────────────────────

function ChitraEyeIcon({ className }: { className?: string }) {
  return (
    // chitra-eye-wrapper carries the blink (scaleY) animation
    <span className={cn('chitra-eye-wrapper', className)}>
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ overflow: 'visible' }}
      >
        {/* Outer eye shape — static, gets squished by the blink wrapper */}
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />

        {/* Iris + pupil — this group gets the gaze translation */}
        <g className="chitra-eye-gaze">
          {/* Iris ring */}
          <circle cx="12" cy="12" r="3" />
          {/* Pupil dot */}
          <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
        </g>
      </svg>
    </span>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ChitraAvatar({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return (
    <div className={cn(
      'rounded-full bg-primary flex items-center justify-center shrink-0 shadow-xs border border-primary/20',
      size === 'sm' ? 'h-7 w-7' : 'h-9 w-9',
    )}>
      <Eye className={cn('text-primary-foreground', size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5')} />
    </div>
  );
}

function MessageBubble({
  n,
  onAction,
  messages,
  isOpen,
}: {
  n: AppNotification;
  onAction: (link: string, id: string) => void;
  messages: AppNotification[];
  isOpen: boolean;
}) {
  // User's own queries appear as right-aligned bubbles
  if (n.source === 'user') {
    return (
      <div className="flex items-start justify-end gap-2">
        <div className="min-w-0 max-w-[85%] space-y-1">
          <div className="rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-xs text-primary-foreground shadow-xs">
            <p className="leading-snug">{n.message || n.title}</p>
          </div>
          <p className="text-[10px] text-muted-foreground/60 text-right pr-0.5">
            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
          </p>
        </div>
      </div>
    );
  }

  const typeColor: Record<string, string> = {
    chitra_warning: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 text-foreground',
    chitra_praise:  'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-foreground',
  };
  const bubbleClass = typeColor[n.type] ?? 'bg-muted/60 dark:bg-muted/30 border-border text-foreground';
  const Attachment = extensions.ChitraMessageAttachment;

  return (
    <div className={cn('flex items-start gap-2', !n.is_read && 'opacity-100', n.is_read && 'opacity-85')}>
      <ChitraAvatar size="sm" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className={cn('rounded-2xl rounded-tl-sm border px-3 py-2.5 text-xs shadow-xs', bubbleClass)}>
          {n.type !== 'chitra_query' && n.title !== 'Chitragupta' && n.title !== 'R-IA' && (
            <p className="font-semibold text-foreground leading-tight">{n.title}</p>
          )}
          <p className="text-muted-foreground leading-snug mt-0.5">{cleanMessage(n.message)}</p>
          {Attachment && <Attachment notification={n} messages={messages} isOpen={isOpen} />}
        </div>

        {/* Action buttons */}
        {n.action_buttons && n.action_buttons.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-0.5">
            {n.action_buttons.map(btn => (
              <button
                key={btn.label}
                onClick={() => onAction(btn.link, n.id)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-foreground dark:bg-primary/20 font-medium transition-colors border border-primary/20"
              >
                {btn.label === 'View drafts' ? 'Ver rascunhos' : btn.label}
              </button>
            ))}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground/60 pl-0.5">
          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
          {!n.is_read && (
            <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" />
          )}
        </p>
      </div>
    </div>
  );
}

// ── Shared state (mobile header button + widget) ────────────────────────────

interface ChitraContextValue {
  isOpen: boolean;
  unreadCount: number;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const ChitraContext = createContext<ChitraContextValue | null>(null);

function useChitraContext() {
  const ctx = useContext(ChitraContext);
  if (!ctx) throw new Error('Chitra components must be used within ChitraProvider');
  return ctx;
}

/** Optional access for mutual exclusion with other floating panels (e.g. Pipeline Radar). */
export function useOptionalChitra(): ChitraContextValue | null {
  return useContext(ChitraContext);
}

export function ChitraNavButton() {
  const location = useLocation();
  const { user, isStaff } = useAuth();
  const isMobile = useIsMobile();
  const { isOpen, unreadCount, toggle } = useChitraContext();

  if (!user || !isStaff || !isMobile || isPublicRoute(location.pathname)) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors focus:outline-hidden md:hidden',
        isOpen
          ? 'border-primary/50 bg-primary/15 text-primary dark:bg-primary/30 dark:text-primary-foreground'
          : 'border-primary/30 bg-primary/5 text-primary hover:border-primary/50 hover:bg-primary/15 dark:border-primary/40 dark:bg-primary/20 dark:text-primary-foreground',
      )}
      aria-label={isOpen ? 'Fechar R-IA' : 'Abrir R-IA'}
      aria-pressed={isOpen}
    >
      <ChitraEyeIcon className="h-5 w-5" />
      {unreadCount > 0 && !isOpen && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}

export function ChitraProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, isStaff } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const userClosedRef = useRef(false);
  const { notifications, isLoading: notificationsLoading } = useNotifications();

  const chitraMessages = notifications.filter(
    n => n.source === 'chitra' || n.source === 'user',
  );
  const unreadCount = notifications.filter(n => n.source === 'chitra' && !n.is_read).length;
  const latestChitraId = chitraMessages[0]?.id ?? null;
  const initializedRef = useRef(false);
  const seenLatestIdRef = useRef<string | null>(null);

  const open = useCallback(() => {
    setIsOpen(true);
    userClosedRef.current = false;
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    userClosedRef.current = true;
  }, []);

  const toggle = useCallback(() => {
    setIsOpen(prev => {
      const next = !prev;
      userClosedRef.current = !next;
      return next;
    });
  }, []);

  useEffect(() => {
    if (notificationsLoading) return;

    if (!initializedRef.current) {
      seenLatestIdRef.current = latestChitraId;
      initializedRef.current = true;
      return;
    }

    // Mobile: manual open only. Sync width check avoids useIsMobile's false initial state.
    if (window.innerWidth < 768) {
      seenLatestIdRef.current = latestChitraId;
      return;
    }

    if (latestChitraId && latestChitraId !== seenLatestIdRef.current) {
      open();
    }
    seenLatestIdRef.current = latestChitraId;
  }, [latestChitraId, notificationsLoading, open]);

  const contextValue: ChitraContextValue = {
    isOpen,
    unreadCount,
    open,
    close,
    toggle,
  };

  const showChitra = !!user && isStaff && !isPublicRoute(location.pathname);

  return (
    <ChitraContext.Provider value={contextValue}>
      {children}
      {showChitra ? <ChitraWidget /> : null}
    </ChitraContext.Provider>
  );
}

// ── Main Widget ───────────────────────────────────────────────────────────────

function ChitraWidget() {
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { isOpen, open, close } = useChitraContext();
  const { notifications, markRead, markAllRead, refetch: refetchNotifications } = useNotifications();
  const [isMinimized, setIsMinimized] = useState(false);
  const [headerOffset, setHeaderOffset] = useState(56);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Chitra messages + user queries — both displayed in the widget
  const chitraMessages = notifications.filter(
    n => n.source === 'chitra' || n.source === 'user',
  );
  const unreadCount = notifications.filter(n => n.source === 'chitra' && !n.is_read).length;
  const panelOpen = isOpen && !isMinimized;

  useEffect(() => {
    if (isOpen) setIsMinimized(false);
  }, [isOpen]);

  useEffect(() => {
    if (isMobile) close();
  }, [location.pathname, isMobile, close]);

  useEffect(() => {
    if (!isMobile || !panelOpen) return;

    const header = document.querySelector('[data-app-header]');
    if (!header) return;

    const update = () => setHeaderOffset(header.getBoundingClientRect().bottom);
    update();

    const ro = new ResizeObserver(update);
    ro.observe(header);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [isMobile, panelOpen]);

  // Scroll to bottom when new messages arrive while open
  useEffect(() => {
    if (isOpen && !isMinimized && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chitraMessages.length, isOpen, isMinimized]);

  // Mark all read when opening
  useEffect(() => {
    if (isOpen && !isMinimized && unreadCount > 0) {
      const timer = setTimeout(() => markAllRead(), 1500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isMinimized]);

  const handleAction = async (link: string, notifId: string) => {
    await markRead(notifId);
    navigate(link);
  };

  const handleClose = () => {
    close();
  };

  const handleSendMessage = async () => {
    const msg = chatInput.trim();
    if (!msg || isSending) return;
    setChatInput('');
    setIsSending(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const { data: fnData } = await supabase.functions.invoke('chitra-chat', {
        body: { message: msg },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (fnData?.error) console.error('chitra-chat error:', fnData.error);
      // Function has committed the notification insert — refetch immediately
      // rather than waiting for realtime (which requires the table to be in the publication)
      await refetchNotifications();
    } catch (e) {
      console.error('chitra-chat invoke error:', e);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const launcherClass = cn(
    'relative h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200',
    'bg-primary hover:bg-primary/90 text-primary-foreground active:scale-95',
    'ring-2 ring-white dark:ring-background',
  );

  const panelHeader = (
    <div className="flex items-center gap-2.5 px-4 py-3 bg-primary text-primary-foreground shrink-0 border-b border-primary/20">
      <div className="p-1 rounded-full bg-white/20">
        <Eye className="h-4 w-4 text-primary-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary-foreground leading-tight">R-IA</p>
        <p className="text-[10px] text-primary-foreground/75 leading-tight">Assistente de RH com IA · RIA</p>
      </div>
      {!isMobile && (
        <button
          onClick={() => setIsMinimized(true)}
          className="p-1 rounded-md text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 transition-colors"
          title="Minimizar"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
      )}
      <button
        onClick={handleClose}
        className="p-1 rounded-md text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 transition-colors"
        title="Fechar"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  const messagesBody = chitraMessages.length === 0 ? (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center px-6 py-8">
      <div className="p-3 rounded-full bg-primary/10 text-primary">
        <Eye className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">R-IA está monitorando</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[260px] leading-relaxed">
          {isSuperAdmin
            ? "As mensagens aparecerão aqui. Pergunte qualquer coisa sobre o funil de recrutamento."
            : "As mensagens da R-IA aparecerão aqui. Ela entrará em contato quando uma ação for necessária."}
        </p>
      </div>
    </div>
  ) : (
    <div ref={scrollRef} className="overflow-y-auto flex-1 p-4 space-y-4">
      {[...chitraMessages].reverse().map(n => (
        <MessageBubble
          key={n.id}
          n={n}
          onAction={handleAction}
          messages={chitraMessages}
          isOpen={isOpen}
        />
      ))}
      {isSending && (
        <div className="flex items-center gap-2">
          <ChitraAvatar size="sm" />
          <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl rounded-tl-sm px-3 py-2.5">
            <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
          </div>
        </div>
      )}
    </div>
  );

  const chatInputBar = isSuperAdmin ? (
    <div className="shrink-0 border-t border-border p-2.5 bg-background pb-safe">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Pergunte qualquer coisa à R-IA…"
          disabled={isSending}
          className="flex-1 text-xs rounded-xl border border-border bg-muted/40 px-3 py-2 outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-transparent placeholder:text-muted-foreground/50 disabled:opacity-50 text-foreground"
        />
        <button
          onClick={handleSendMessage}
          disabled={!chatInput.trim() || isSending}
          className="shrink-0 h-8 w-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shadow-xs"
          title="Enviar"
        >
          {isSending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  ) : null;

  return (
    <>
      {panelOpen && isMobile && (
        <div
          className="fixed inset-x-0 z-30 flex flex-col bg-background border-t border-border md:hidden"
          style={{ top: headerOffset, bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {panelHeader}
          {messagesBody}
          {chatInputBar}
        </div>
      )}

      {!isMobile && (
      <div className="fixed z-50 bottom-5 right-5 flex flex-col items-end gap-3">
        {panelOpen && (
          <div
            className="w-[340px] rounded-2xl shadow-2xl border border-border bg-card overflow-hidden flex flex-col opacity-100 transition-all duration-200"
            style={{ maxHeight: isSuperAdmin ? '520px' : '480px' }}
          >
            {panelHeader}
            {messagesBody}
            {chatInputBar}
          </div>
        )}

        <button
          onClick={() => {
            if (panelOpen) {
              handleClose();
            } else {
              setIsMinimized(false);
              open();
            }
          }}
          className={launcherClass}
          aria-label={panelOpen ? "Fechar R-IA" : "Abrir R-IA"}
        >
          {panelOpen ? (
            <ChevronDown className="h-5 w-5 text-primary-foreground" />
          ) : (
            <ChitraEyeIcon className="text-primary-foreground" />
          )}

          {unreadCount > 0 && !panelOpen && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none shadow-sm">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}

          {unreadCount > 0 && !panelOpen && (
            <span className="absolute inset-0 rounded-full animate-ping bg-primary opacity-30" />
          )}
        </button>
      </div>
      )}
    </>
  );
}
