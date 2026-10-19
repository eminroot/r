import { type ComponentType, type ReactNode, useState } from 'react';
import { Link, Redirect, useLocation } from 'wouter';
import { Show, useClerk, useUser } from '@clerk/react';
import { BookOpen, Compass, FlaskConical, Flame, Gift, Inbox, LogOut, Megaphone, Menu, Moon, Plug, Sun, UserRound, X } from 'lucide-react';
import { useGetProfile, useListSubmissions, getListSubmissionsQueryKey, useListApplications, getListApplicationsQueryKey } from '@workspace/api-client-react';
import { useAppState, useSignedIn, type Role } from '@/lib/app';
import { useLocale } from '@/lib/i18n';
import { LangPills, MarketingFooter, MarketingNav } from '@/components/lp';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

export function Logo() {
  return <Link href="/" className="brand" data-testid="link-home">Betadrop</Link>;
}

type Dest = { href: string; label: string; icon: ComponentType; badge?: number; match?: (loc: string) => boolean };

function useDestinations(): Dest[] {
  const { role } = useAppState();
  const { signedIn } = useSignedIn();
  const FP = { role: 'founder' as const };
  const TP = { role: 'tester' as const };
  // Counts ride the tile: what is waiting on you, nothing else.
  const subs = useListSubmissions(FP, { query: { enabled: signedIn && role === 'founder', queryKey: getListSubmissionsQueryKey(FP) } });
  const apps = useListApplications(FP, { query: { enabled: signedIn && role === 'founder', queryKey: getListApplicationsQueryKey(FP) } });
  const mine = useListApplications(TP, { query: { enabled: signedIn && role === 'tester', queryKey: getListApplicationsQueryKey(TP) } });
  const inbox = (subs.data ?? []).filter((s) => s.status === 'pending').length + (apps.data ?? []).filter((a) => a.status === 'pending').length;
  const due = (mine.data ?? []).filter((a) => a.status === 'approved').length;
  return role === 'tester'
    ? [
        { href: '/app/explore', label: 'Каталог', icon: Compass, match: (l) => l === '/app/explore' || l.startsWith('/app/campaigns/') },
        { href: '/app/tester/dashboard', label: 'Мои тесты', icon: FlaskConical, badge: due },
        { href: '/app/tester/vault', label: 'Награды', icon: Gift },
        { href: '/app/tester/profile/me', label: 'Профиль', icon: UserRound, match: (l) => l.startsWith('/app/tester/profile') },
      ]
    : [
        { href: '/app/founder/campaigns', label: 'Кампании', icon: Megaphone, match: (l) => l.startsWith('/app/founder/campaigns') },
        { href: '/app/founder/submissions', label: 'Входящие', icon: Inbox, badge: inbox },
        { href: '/app/founder/settings/integrations', label: 'Интеграции', icon: Plug },
        { href: '/app/explore', label: 'Каталог', icon: Compass, match: (l) => l === '/app/explore' || l.startsWith('/app/campaigns/') },
      ];
}

function RailItem({ d, onPick }: { d: Dest; onPick?: () => void }) {
  const { t } = useLocale();
  const [loc] = useLocation();
  const active = d.match ? d.match(loc) : loc === d.href;
  const I = d.icon;
  return (
    <Link href={d.href} className="rail__item" data-active={active} aria-current={active ? 'page' : undefined} onClick={onPick} data-testid={`link-nav-${d.href.split('/').pop()}`}>
      <span className="rail__tile"><I />{d.badge ? <span className="rail__badge num">{d.badge > 99 ? '99+' : d.badge}</span> : null}</span>
      <span className="rail__label">{t(d.label)}</span>
    </Link>
  );
}

function Rail() {
  const dests = useDestinations();
  return (
    <nav className="rail" aria-label="Primary">
      <div className="rail__group">{dests.map((d) => <RailItem key={d.href} d={d} />)}</div>
      <span className="rail__rule" aria-hidden="true" />
      <div className="rail__group rail__group--foot">
        <RailItem d={{ href: '/docs', label: 'Документация', icon: BookOpen }} />
      </div>
    </nav>
  );
}

function RoleSwitch() {
  const { t } = useLocale();
  const { role, setRole } = useAppState();
  const [, nav] = useLocation();
  const pick = (r: Role) => {
    setRole(r);
    nav(r === 'tester' ? '/app/tester/dashboard' : '/app/founder/campaigns');
  };
  return (
    <div className="seg" role="group" aria-label={t('Режим')} data-testid="switch-role">
      {(['tester', 'founder'] as Role[]).map((r) => (
        <button key={r} onClick={() => pick(r)} data-active={role === r} aria-pressed={role === r} data-testid={`button-role-${r}`}>
          {r === 'tester' ? t('Тестер') : t('Фаундер')}
        </button>
      ))}
    </div>
  );
}

function ThemeBtn() {
  const { t } = useLocale();
  const { theme, toggleTheme } = useAppState();
  const label = t(theme === 'light' ? 'Тёмная тема' : 'Светлая тема');
  return <button className="icon-btn" onClick={toggleTheme} aria-label={label} title={label} data-testid="button-theme">{theme === 'light' ? <Moon /> : <Sun />}</button>;
}

function Streak() {
  const { t } = useLocale();
  const { data } = useGetProfile();
  return (
    <Link href="/app/tester/profile/me" className="chip hidden lg:inline-flex" title={t('Дней подряд с полезным действием (UTC)')} data-testid="text-streak">
      <Flame style={{ width: 15, height: 15, color: 'hsl(var(--streak))' }} />{t('Серия:')} <b>{data?.streak ?? 0}</b>
    </Link>
  );
}

function UserMenu() {
  const { t } = useLocale();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { data } = useGetProfile();
  const { role } = useAppState();
  const name = data?.username || user?.username || user?.firstName || '';
  return (
    <div className="flex items-center gap-1">
      <span className="hidden xl:flex items-center gap-2.5 pl-1 pr-2" data-testid="text-user">
        <span className="avatar-disc" style={{ width: 34, height: 34, fontSize: 12 }}>{name.slice(0, 1).toUpperCase()}</span>
        <span className="flex flex-col leading-tight">
          <span className="text-[13.5px]">{name}</span>
          <span className="text-[11.5px] muted">{t(role === 'tester' ? 'Тестер' : 'Фаундер')}</span>
        </span>
      </span>
      <button className="icon-btn" onClick={() => signOut({ redirectUrl: basePath || '/' })} aria-label={t('Выйти')} title={t('Выйти')} data-testid="button-logout"><LogOut /></button>
    </div>
  );
}

function Topbar() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const dests = useDestinations();
  return (
    <>
      <header className="topbar">
        <button className="icon-btn mobile-nav" aria-label={t('Меню')} aria-expanded={open} onClick={() => setOpen(!open)} data-testid="button-menu">{open ? <X /> : <Menu />}</button>
        <Logo />
        <div className="ml-auto flex items-center gap-2">
          <Streak />
          <RoleSwitch />
          <div className="hidden sm:block"><LangPills /></div>
          <div className="hidden sm:block"><ThemeBtn /></div>
          <UserMenu />
        </div>
      </header>
      {open && (
        <div className="mobile-nav sticky top-[60px] z-20 bg-[var(--card)] border-b border-[var(--ink-07)] px-3 py-2 grid-cols-4 gap-1">
          {dests.map((d) => <RailItem key={d.href} d={d} onPick={() => setOpen(false)} />)}
          <div className="col-span-4 flex items-center justify-center gap-3 py-2 sm:hidden"><LangPills /><ThemeBtn /></div>
        </div>
      )}
    </>
  );
}

/** Signed in: rail + top bar. Signed out: the landing's nav pill and footer around the page. */
export function Page({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <>
      <Show when="signed-in">
        <div className="app-shell">
          <Rail />
          <Topbar />
          <main className={`page-wrap${wide ? '' : ' page-wrap--narrow'}`}>{children}</main>
        </div>
      </Show>
      <Show when="signed-out">
        <div className="lp mk">
          <MarketingNav solid />
          <main className="mk-main"><div className={`page-wrap${wide ? '' : ' page-wrap--narrow'}`}>{children}</div></main>
          <MarketingFooter />
        </div>
      </Show>
    </>
  );
}

export function Private({ children }: { children: ReactNode }) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out"><Redirect to="/sign-in" /></Show>
    </>
  );
}
