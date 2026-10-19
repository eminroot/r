import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@clerk/react';
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

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(() => (localStorage.getItem('bd-role') as Role) || 'tester');
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('bd-theme') as Theme) || 'light');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('bd-theme', theme);
  }, [theme]);
  const setRole = (r: Role) => {
    setRoleState(r);
    localStorage.setItem('bd-role', r);
  };
  return (
    <AppCtx.Provider value={{ role, setRole, theme, toggleTheme: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')) }}>
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
  return any?.data?.error || any?.data?.message || any?.message || 'Неизвестная ошибка';
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
  ];
  keys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
  qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === 'string' && (q.queryKey[0] as string).startsWith('/api/campaigns/') });
}

export function fmtDate(s: string | null | undefined) {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(s: string | null | undefined) {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function timeLeft(s: string | null | undefined) {
  if (!s) return null;
  const ms = new Date(s).getTime() - Date.now();
  if (isNaN(ms)) return null;
  if (ms <= 0) return 'истёк';
  const h = Math.floor(ms / 3600000);
  if (h < 48) return `${h} ч`;
  return `${Math.floor(h / 24)} дн`;
}

export const METHOD_LABEL: Record<string, string> = {
  secret_code: 'Секретный код',
  email_match: 'Совпадение email',
  media: 'Медиа-доказательство',
  webhook: 'Webhook',
};

export const APP_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'На рассмотрении', color: 'hsl(var(--streak))' },
  approved: { label: 'Одобрена', color: 'hsl(var(--live))' },
  rejected: { label: 'Отклонена', color: 'hsl(var(--destructive))' },
  submitted: { label: 'Отчёт отправлен', color: 'hsl(var(--primary))' },
  completed: { label: 'Завершена', color: 'hsl(var(--live))' },
  expired: { label: 'Истекла', color: 'hsl(var(--muted-foreground))' },
  active: { label: 'Активна', color: 'hsl(var(--live))' },
  paused: { label: 'Пауза', color: 'hsl(var(--streak))' },
};

export const CATEGORIES = ['DevTools', 'AI / ML', 'Web3', 'FinTech', 'Mobile'] as const;
