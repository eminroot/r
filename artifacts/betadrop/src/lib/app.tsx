import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@clerk/react';
import { t, getLocale, getLanguage } from './i18n';
import type { QueryClient } from '@tanstack/react-query';
import {
  getListCampaignsQueryKey,
  getListApplicationsQueryKey,
  getListSubmissionsQueryKey,
  getListRewardsQueryKey,
  getGetDashboardQueryKey,
  getGetProfileQueryKey,
  getGetActivityQueryKey,
  getGetStatsQueryKey,
  getListApiKeysQueryKey,
  getGetIntegrationsQueryKey,
} from '@workspace/api-client-react';

export type Role = 'tester' | 'founder';
type Theme = 'light' | 'dark';

interface Ctx {
  role: Role;
  setRole: (r: Role) => void;
  theme: Theme;
  toggleTheme: () => void;
}

const AppCtx = createContext<Ctx | null>(null);

// Storage can be unavailable (private mode, blocked cookies); the app must still work.
function read(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* not persisted */ }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(() => (read('bd-role') === 'founder' ? 'founder' : 'tester'));
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = read('bd-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  const setRole = (r: Role) => {
    setRoleState(r);
    write('bd-role', r);
  };
  return (
    <AppCtx.Provider value={{ role, setRole, theme, toggleTheme: () => setTheme((t) => { const next = t === 'light' ? 'dark' : 'light'; write('bd-theme', next); return next; }) }}>
      {children}
    </AppCtx.Provider>
  );
}

export function useAppState() {
  const c = useContext(AppCtx);
  if (!c) throw new Error('AppStateProvider missing');
  return c;
}

export function useSignedIn() {
  const { isSignedIn, isLoaded } = useAuth();
  return { signedIn: !!isSignedIn, loaded: isLoaded };
}

export function errMsg(e: unknown): string {
  const any = e as { data?: { error?: string; message?: string } | null; message?: string } | null;
  return t(any?.data?.error || any?.data?.message || any?.message || 'Что-то пошло не так. Попробуйте ещё раз.');
}

export function invalidateAll(qc: QueryClient) {
  const keys = [
    getListCampaignsQueryKey(),
    getListApplicationsQueryKey(),
    getListSubmissionsQueryKey(),
    getListRewardsQueryKey(),
    getGetDashboardQueryKey(),
    getGetProfileQueryKey(),
    getGetActivityQueryKey(),
    getGetStatsQueryKey(),
    getListApiKeysQueryKey(),
    getGetIntegrationsQueryKey(),
  ];
  keys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
  qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === 'string' && /^\/api\/(campaigns|profiles)\//.test(q.queryKey[0] as string) });
}

// Many browsers ship without Azerbaijani month names ("M10"), so AZ dates are formatted by hand.
const AZ_MONTHS = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avq', 'sen', 'okt', 'noy', 'dek'];
const pad = (n: number) => String(n).padStart(2, '0');

// Missing dates render as an empty string; callers decide what to show instead.
export function fmtDate(s: string | null | undefined, utc = false) {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  if (getLanguage() === 'az') {
    const [y, m, day] = utc ? [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()] : [d.getFullYear(), d.getMonth(), d.getDate()];
    return `${day} ${AZ_MONTHS[m]} ${y}`;
  }
  return d.toLocaleDateString(getLocale(), { day: 'numeric', month: 'short', year: 'numeric', ...(utc ? { timeZone: 'UTC' } : {}) });
}

export function fmtDateTime(s: string | null | undefined) {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  if (getLanguage() === 'az') return `${d.getDate()} ${AZ_MONTHS[d.getMonth()]}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return d.toLocaleString(getLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function timeLeft(s: string | null | undefined) {
  if (!s) return null;
  const ms = new Date(s).getTime() - Date.now();
  if (isNaN(ms)) return null;
  if (ms <= 0) return t('срок вышел');
  const h = Math.floor(ms / 3600000);
  if (h < 1) return t('меньше часа');
  if (h < 48) return t('{count} ч', { count: h });
  return t('{count} дн', { count: Math.floor(h / 24) });
}

export function ago(s: string | null | undefined) {
  if (!s) return '';
  const ms = Date.now() - new Date(s).getTime();
  if (isNaN(ms)) return '';
  const m = Math.floor(ms / 60000);
  if (m < 1) return t('только что');
  if (m < 60) return t('{count} мин назад', { count: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('{count} ч назад', { count: h });
  const d = Math.floor(h / 24);
  if (d < 30) return t('{count} дн назад', { count: d });
  return fmtDate(s);
}

const methodLabels: Record<string, string> = {
  secret_code: 'Секретный код',
  email_match: 'Email аккаунта',
  media: 'Запись экрана',
  webhook: 'Webhook API',
};
export const methodLabel = (m: string) => t(methodLabels[m] ?? m);
export const METHODS = ['secret_code', 'email_match', 'media', 'webhook'] as const;

const statusMessages: Record<string, { label: string; color: string }> = {
  pending: { label: 'Ждёт решения', color: 'hsl(var(--streak))' },
  approved: { label: 'Одобрена', color: 'hsl(var(--live))' },
  rejected: { label: 'Отклонена', color: 'hsl(var(--destructive))' },
  submitted: { label: 'Отчёт на проверке', color: 'hsl(var(--primary))' },
  completed: { label: 'Завершена', color: 'hsl(var(--live))' },
  expired: { label: 'Срок вышел', color: 'hsl(var(--muted-foreground))' },
  active: { label: 'Идёт набор', color: 'hsl(var(--live))' },
  paused: { label: 'На паузе', color: 'hsl(var(--streak))' },
};
// Reports reuse application statuses but read differently.
const reportMessages: Record<string, string> = { pending: 'На проверке', approved: 'Принят', rejected: 'Отклонён' };
export function statusInfo(s: string, kind: 'application' | 'report' | 'campaign' = 'application') {
  const base = statusMessages[s] ?? { label: s, color: 'hsl(var(--muted-foreground))' };
  if (kind === 'campaign' && s === 'completed') return { label: t('Завершена'), color: 'hsl(var(--muted-foreground))' };
  return { color: base.color, label: t(kind === 'report' ? reportMessages[s] ?? base.label : base.label) };
}

const severityLabels: Record<string, string> = { low: 'Низкая', medium: 'Средняя', high: 'Высокая', critical: 'Критическая' };
export const severityLabel = (s: string) => t(severityLabels[s] ?? s);
export const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

export const CATEGORIES = ['DevTools', 'AI / ML', 'Web3', 'FinTech', 'Mobile'] as const;
