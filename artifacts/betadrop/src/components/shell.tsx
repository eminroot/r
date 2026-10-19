import { type ReactNode, useState } from 'react';
import { Link, Redirect, useLocation } from 'wouter';
import { Show, useClerk, useUser } from '@clerk/react';
import { Flame, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { useGetProfile } from '@workspace/api-client-react';
import { useAppState, type Role } from '@/lib/app';
import { useLocale } from '@/lib/i18n';
import { LanguageSwitcher } from './language-switcher';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
export const REPO_URL = 'https://github.com/eminroot/r';

export function Logo() {
  return (
    <Link href="/" className="shrink-0 mono font-semibold tracking-[0.06em] text-[13px]" data-testid="link-home">
      [BETADROP]
    </Link>
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
    <div className="seg !h-7 [&>button]:!h-[26px] [&>button]:!px-2.5 [&>button]:!text-[12px]" role="group" aria-label={t('Режим')} data-testid="switch-role">
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
  return (
    <button className="btn btn-ghost btn-sm btn-icon" onClick={toggleTheme} aria-label={t(theme === 'light' ? 'Тёмная тема' : 'Светлая тема')} title={t(theme === 'light' ? 'Тёмная тема' : 'Светлая тема')} data-testid="button-theme">
      {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
    </button>
  );
}

function Streak() {
  const { t } = useLocale();
  const { data } = useGetProfile();
  const days = data?.streak ?? 0;
  return (
    <Link href="/app/tester/profile/me" className="hidden lg:inline-flex items-center gap-1 h-7 px-2 border border-border mono text-[12px] text-streak" title={t('Дней подряд с полезным действием (UTC)')} data-testid="text-streak">
      <Flame className="w-3.5 h-3.5" />{t('{count} ДН.', { count: days })}
    </Link>
  );
}

function UserMenu() {
  const { t } = useLocale();
  const { user } = useUser();
  const { signOut } = useClerk();
  const name = user?.username || user?.firstName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || '';
  return (
    <div className="flex items-center gap-1">
      {name && <span className="hidden xl:inline mono text-[12px] muted max-w-[140px] truncate" data-testid="text-user">{name}</span>}
      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => signOut({ redirectUrl: basePath || '/' })} aria-label={t('Выйти')} title={t('Выйти')} data-testid="button-logout">
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}

const TESTER_NAV = [
  { href: '/app/explore', label: 'Каталог' },
  { href: '/app/tester/dashboard', label: 'Мои тесты' },
  { href: '/app/tester/vault', label: 'Награды' },
  { href: '/app/tester/profile/me', label: 'Профиль' },
];
const FOUNDER_NAV = [
  { href: '/app/founder/campaigns', label: 'Кампании' },
  { href: '/app/founder/submissions', label: 'Входящие' },
  { href: '/app/founder/settings/integrations', label: 'Интеграции' },
  { href: '/app/explore', label: 'Каталог' },
];
const PUBLIC_NAV = [
  { href: '/app/explore', label: 'Каталог тестов' },
  { href: '/#for-startups', label: 'Для стартапов' },
  { href: '/pricing', label: 'Тарифы' },
  { href: '/docs', label: 'API' },
];

function isActive(loc: string, href: string) {
  if (href.startsWith('/#')) return false;
  if (href === '/app/tester/profile/me') return loc.startsWith('/app/tester/profile');
  if (href === '/app/founder/campaigns') return loc.startsWith('/app/founder/campaigns');
  return loc === href;
}

function NavLinks({ links, className, onPick }: { links: { href: string; label: string }[]; className: string; onPick?: () => void }) {
  const { t } = useLocale();
  const [loc] = useLocation();
  return (
    <>
      {links.map((l) =>
        l.href.startsWith('/#') ? (
          <a key={l.href} href={`${basePath}${l.href}`} className={className} onClick={onPick}>{t(l.label)}</a>
        ) : (
          <Link key={l.href} href={l.href} className={className} data-active={isActive(loc, l.href)} onClick={onPick} data-testid={`link-nav-${l.href.split('/').pop()}`}>
            {t(l.label)}
          </Link>
        ),
      )}
    </>
  );
}

export function Header() {
  const { t } = useLocale();
  const { role, setRole } = useAppState();
  const [open, setOpen] = useState(false);
  const links = role === 'tester' ? TESTER_NAV : FOUNDER_NAV;
  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="max-w-[1200px] mx-auto px-4 h-12 flex items-center gap-4">
        <Logo />
        <nav className="hidden md:flex items-center">
          <Show when="signed-in"><NavLinks links={links} className="navlink" /></Show>
          <Show when="signed-out"><NavLinks links={PUBLIC_NAV} className="navlink" /></Show>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Show when="signed-in">
            <Streak />
            <RoleSwitch />
          </Show>
          <div className="hidden sm:block"><LanguageSwitcher /></div>
          <ThemeBtn />
          <Show when="signed-in"><UserMenu /></Show>
          <Show when="signed-out">
            <Link href="/sign-in" className="btn btn-sm hidden sm:inline-flex" data-testid="link-sign-in">{t('Войти')}</Link>
            <Link href="/app/founder/campaigns/new" onClick={() => setRole('founder')} className="btn btn-sm btn-primary" data-testid="link-launch">{t('Запустить тест')}</Link>
          </Show>
          <button className="md:hidden btn btn-ghost btn-sm btn-icon" aria-label={t('Меню')} aria-expanded={open} onClick={() => setOpen(!open)} data-testid="button-menu">
            {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-border bg-surface flex flex-col">
          <Show when="signed-in"><NavLinks links={links} className="px-4 py-3 t-body border-b border-border" onPick={() => setOpen(false)} /></Show>
          <Show when="signed-out">
            <NavLinks links={[...PUBLIC_NAV, { href: '/sign-in', label: 'Войти' }]} className="px-4 py-3 t-body border-b border-border" onPick={() => setOpen(false)} />
          </Show>
          <div className="px-4 py-3 sm:hidden"><LanguageSwitcher /></div>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  const { t } = useLocale();
  const links: [string, string, boolean?][] = [
    ['/docs', 'Документация API'],
    [REPO_URL, 'Исходный код', true],
    ['/docs#status', 'Статус системы'],
    ['/docs#rules', 'Правила и арбитраж'],
    ['/pricing', 'Тарифы'],
  ];
  return (
    <footer className="border-t border-border mt-20">
      <div className="max-w-[1200px] mx-auto px-4 py-6 flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="meta">{t('бета-тесты с проверкой результата')}</span>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 t-small muted">
          {links.map(([href, label, external]) => external
            ? <a key={href} href={href} target="_blank" rel="noreferrer" className="hover:text-foreground">{t(label)}</a>
            : <Link key={href} href={href} className="hover:text-foreground">{t(label)}</Link>)}
        </nav>
      </div>
    </footer>
  );
}

export function Page({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <Header />
      <main className={`flex-1 w-full mx-auto px-4 pt-10 pb-6 ${wide ? 'max-w-[1200px]' : 'max-w-[1040px]'}`}>{children}</main>
      <Footer />
    </div>
  );
}

export function Private({ children }: { children: ReactNode }) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}
