import { type ReactNode, useState } from 'react';
import { Link, Redirect, useLocation } from 'wouter';
import { Show, useClerk, useUser } from '@clerk/react';
import { Flame, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { useGetProfile } from '@workspace/api-client-react';
import { useAppState, type Role } from '@/lib/app';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 shrink-0" data-testid="link-home">
      <span className="mono font-bold tracking-[0.08em] text-[13px]">[BETADROP]</span>
    </Link>
  );
}

function RoleSwitch() {
  const { role, setRole } = useAppState();
  const [, nav] = useLocation();
  const pick = (r: Role) => {
    setRole(r);
    nav(r === 'tester' ? '/app/tester/dashboard' : '/app/founder/campaigns');
  };
  return (
    <div className="flex border border-border h-7 mono text-[11px]" data-testid="switch-role">
      {(['tester', 'founder'] as Role[]).map((r) => (
        <button
          key={r}
          onClick={() => pick(r)}
          className={`px-2.5 transition-colors ${role === r ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
          data-testid={`button-role-${r}`}
        >
          {r === 'tester' ? 'Tester' : 'Founder'}
        </button>
      ))}
    </div>
  );
}

function ThemeBtn() {
  const { theme, toggleTheme } = useAppState();
  return (
    <button className="btn btn-ghost btn-sm w-7 px-0" onClick={toggleTheme} aria-label="Тема" data-testid="button-theme">
      {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
    </button>
  );
}

function Streak() {
  const { data } = useGetProfile();
  return <span className="hidden xl:flex mono text-[11px] items-center gap-1 text-streak" title="Серия активности по дням UTC"><Flame className="w-3.5 h-3.5" />{data?.streak ?? 0} DAYS</span>;
}

function UserChip() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const name = user?.username || user?.firstName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'user';
  return (
    <div className="flex items-center gap-1">
      <span className="hidden lg:flex items-center gap-2 h-7 px-2 border border-border mono text-[11px]" data-testid="text-user">
        <span className="w-4 h-4 bg-primary text-primary-foreground grid place-items-center text-[9px] font-bold">{name[0]?.toUpperCase()}</span>
        {name}
      </span>
      <button className="btn btn-ghost btn-sm w-7 px-0" onClick={() => signOut({ redirectUrl: basePath || '/' })} aria-label="Выйти" data-testid="button-logout">
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function useNav() {
  const { role } = useAppState();
  const common = [{ href: '/app/explore', label: 'Каталог' }];
  const tester = [
    { href: '/app/tester/dashboard', label: 'Дашборд' },
    { href: '/app/tester/vault', label: 'Хранилище' },
    { href: '/app/tester/profile/me', label: 'Профиль' },
  ];
  const founder = [
    { href: '/app/founder/campaigns', label: 'Кампании' },
    { href: '/app/founder/submissions', label: 'Заявки и отчёты' },
    { href: '/app/founder/settings/integrations', label: 'Интеграции' },
  ];
  return [...common, ...(role === 'tester' ? tester : founder)];
}

export function Header() {
  const { setRole } = useAppState();
  const [loc] = useLocation();
  const links = useNav();
  const [open, setOpen] = useState(false);
  const isActive = (h: string) => loc === h || (h.includes('/profile/') && loc.startsWith('/app/tester/profile')) || (h === '/app/founder/campaigns' && loc.startsWith('/app/founder/campaigns'));
  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="max-w-[1280px] mx-auto px-4 h-12 flex items-center gap-4">
        <Logo />
        <nav className="hidden md:flex items-center ml-2">
          <Show when="signed-in">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="navlink" data-active={isActive(l.href)} data-testid={`link-nav-${l.href.split('/').pop()}`}>
                {l.label}
              </Link>
            ))}
          </Show>
          <Show when="signed-out">
            <Link href="/app/explore" className="navlink" data-active={loc === '/app/explore'}>Каталог</Link>
            <Link href="/app/founder/campaigns/new" onClick={() => setRole('founder')} className="navlink">Для стартапов</Link>
            <Link href="/pricing" className="navlink" data-active={loc === '/pricing'}>Тарифы</Link>
            <Link href="/docs" className="navlink" data-active={loc === '/docs'}>Документация</Link>
          </Show>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Show when="signed-in">
            <Streak />
            <RoleSwitch />
            <ThemeBtn />
            <UserChip />
          </Show>
          <Show when="signed-out">
            <ThemeBtn />
            <Link href="/sign-in" className="btn btn-sm btn-ghost" data-testid="link-sign-in">Войти</Link>
            <Link href="/app/founder/campaigns/new" onClick={() => setRole('founder')} className="btn btn-sm btn-primary" data-testid="link-sign-up">Запустить тест</Link>
          </Show>
          <button className="md:hidden btn btn-ghost btn-sm w-7 px-0" onClick={() => setOpen(!open)} data-testid="button-menu">
            {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-border bg-surface flex flex-col" onClick={() => setOpen(false)}>
          {[...links, { href: '/pricing', label: 'Тарифы' }, { href: '/docs', label: 'Документация' }].map((l) => (
            <Link key={l.href} href={l.href} className="px-4 py-3 text-sm border-b border-border">{l.label}</Link>
          ))}
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border mt-16">
      <div className="max-w-[1280px] mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr] gap-8 text-sm">
        <div className="col-span-2 md:col-span-1">
          <Logo />
          <p className="meta mt-3 max-w-xs">Площадка, где технические бета-тестеры получают лицензии и API-кредиты за полезные отчёты.</p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="label-k mb-1">Продукт</div>
          <Link href="/app/explore" className="text-muted-foreground hover:text-foreground">Каталог</Link>
          <Link href="/pricing" className="text-muted-foreground hover:text-foreground">Тарифы</Link>
          <Link href="/docs" className="text-muted-foreground hover:text-foreground">Документация</Link>
        </div>
        <div className="flex flex-col gap-2">
          <div className="label-k mb-1">Тестерам</div>
          <Link href="/app/tester/dashboard" className="text-muted-foreground hover:text-foreground">Дашборд</Link>
          <Link href="/app/tester/vault" className="text-muted-foreground hover:text-foreground">Хранилище наград</Link>
        </div>
        <div className="flex flex-col gap-2">
          <div className="label-k mb-1">Фаундерам</div>
          <Link href="/app/founder/campaigns/new" className="text-muted-foreground hover:text-foreground">Новая кампания</Link>
          <Link href="/app/founder/settings/integrations" className="text-muted-foreground hover:text-foreground">Интеграции</Link>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="max-w-[1280px] mx-auto px-4 h-10 flex items-center justify-between meta">
          <span>BETADROP / {new Date().getFullYear()}</span>
          <span>build core: secret_code · email_match · media</span>
        </div>
      </div>
    </footer>
  );
}

export function Page({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <Header />
      <main className={`flex-1 w-full mx-auto px-4 py-8 ${wide ? 'max-w-[1280px]' : 'max-w-[1120px]'}`}>{children}</main>
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
