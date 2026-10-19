// Landing-page primitives ported from the MuhAI project (components/ui/lp.jsx and
// pages/Landing.jsx there). Every rule they read lives in styles/landing.css.
import { useEffect, useRef, useState, type ComponentType, type CSSProperties, type ElementType, type ReactNode, type RefObject } from 'react';
import { Link } from 'wouter';
import { Menu, Sparkles, X } from 'lucide-react';

import { languages, useLocale, type Language } from '@/lib/i18n';
import { REPO_URL, useAppState } from '@/lib/app';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

/** The long arrow: drawn across the whole 24 grid, which is where the buttons get their length. */
export function Arrow(props: { className?: string }) {
  return (
    <svg className="lucide" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M3 12h18m0 0-7-7m7 7-7 7" />
    </svg>
  );
}

type BtnProps = {
  to?: string; href?: string; type?: 'submit' | 'button'; label: string;
  variant?: '' | 'lime' | 'quiet' | 'ghost'; size?: '' | 'sm' | 'lg' | 'wide';
  onClick?: () => void; disabled?: boolean; className?: string;
};

/**
 * The signature control: a pill with a lime chip inside it that sweeps the label into view on
 * hover. The label is rendered twice on purpose (the chip's copy is what the sweep reveals);
 * the duplicate is hidden from assistive tech.
 */
export function Btn({ to, href, type, label, variant = '', size = '', onClick, disabled, className = '' }: BtnProps) {
  const cls = ['lp-btn', variant && `lp-btn--${variant}`, size && `lp-btn--${size}`, disabled && 'is-off', className].filter(Boolean).join(' ');
  const inner = (
    <>
      <span className="lp-btn__chip" aria-hidden="true">
        <span>{label}</span>
        <i className="lp-btn__ico"><Arrow /></i>
      </span>
      <span className="lp-btn__ghost" aria-hidden="true" />
      <span className="lp-btn__label">{label}</span>
    </>
  );
  if (type || disabled) return <button className={cls} type={type ?? 'button'} onClick={onClick} disabled={disabled}>{inner}</button>;
  if (href) return <a className={cls} href={href} onClick={onClick}>{inner}</a>;
  return <Link className={cls} href={to ?? '/'} onClick={onClick}>{inner}</Link>;
}

export function Eyebrow({ icon: Icon = Sparkles, tone = '', children }: { icon?: ComponentType<{ className?: string }>; tone?: '' | 'flat' | 'dark'; children: ReactNode }) {
  return (
    <span className={`lp-eyebrow${tone ? ` lp-eyebrow--${tone}` : ''}`}>
      <span className="lp-eyebrow__ico"><Icon /></span>
      {children}
    </span>
  );
}

const SHORT: Record<Language, string> = { en: 'EN', ru: 'RU', az: 'AZ' };

/** Three languages do not fit two flags, and a flag names a country, not a language: codes instead. */
export function LangPills({ dark = false }: { dark?: boolean }) {
  const { language, setLanguage, t } = useLocale();
  return (
    <div className={`lang${dark ? ' lang--dark' : ''}`} role="group" aria-label={t('Язык')}>
      {languages.map((l) => (
        <button key={l.value} type="button" lang={l.value} title={l.label} aria-label={l.label} aria-pressed={language === l.value} onClick={() => setLanguage(l.value)} data-testid={`button-lang-${l.value}`}>
          {SHORT[l.value]}
        </button>
      ))}
    </div>
  );
}

/* ---------- reveal ----------
   One IntersectionObserver for the page, opening each element once. The open state lives in
   React (not a class the observer writes), so a parent re-render cannot wipe it. */
const REVEAL_MARGIN = { rootMargin: '0px 0px -12% 0px', threshold: 0.01 };
let revealIO: IntersectionObserver | null = null;
const revealJobs = new WeakMap<Element, () => void>();

function onReveal(el: Element, fire: () => void) {
  if (typeof IntersectionObserver === 'undefined') { fire(); return undefined; }
  if (!revealIO) {
    revealIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const job = revealJobs.get(e.target);
        revealIO?.unobserve(e.target);
        revealJobs.delete(e.target);
        job?.();
      });
    }, REVEAL_MARGIN);
  }
  revealJobs.set(el, fire);
  revealIO.observe(el);
  return () => { revealIO?.unobserve(el); revealJobs.delete(el); };
}

function onScreen(el: Element) {
  const r = el.getBoundingClientRect();
  return r.top < window.innerHeight && r.bottom > 0;
}

export function Rv({ as: As = 'div', y, delay = 0, now = false, className = '', style, children, ...rest }: { as?: ElementType; y?: number; delay?: number; now?: boolean; className?: string; style?: CSSProperties; children?: ReactNode; [k: string]: unknown }) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (shown) return undefined;
    if (now) { setShown(true); return undefined; }
    const el = ref.current;
    if (!el) return undefined;
    if (onScreen(el)) { setShown(true); return undefined; }
    return onReveal(el, () => setShown(true));
  }, [shown, now]);
  const s: Record<string, string | number> = { ...(style as Record<string, string | number>) };
  if (delay) s['--rv-d'] = `${delay}ms`;
  if (y != null) s['--rv-y'] = `${y}px`;
  return <As {...rest} ref={ref} style={s} className={`lp-rv ${className}${shown ? ' is-in' : ''}`}>{children}</As>;
}

export function useInOnce<T extends HTMLElement = HTMLDivElement>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (on) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    if (onScreen(el)) { setOn(true); return undefined; }
    return onReveal(el, () => setOn(true));
  }, [on]);
  return [ref, on];
}

const still = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function useCount(to: number, on: boolean, ms = 1100) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!on) return undefined;
    if (still()) { setN(to); return undefined; }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      setN(to * easeOut(t));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, on, ms]);
  return n;
}

export function Count({ to, on, pre = '', ms }: { to: number; on: boolean; pre?: string; ms?: number }) {
  const n = useCount(to, on, ms);
  return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{pre}{Math.round(n).toLocaleString('en-US')}</span>;
}

/* ---------- scroll progress ----------
   Writes 0 to 1 into a CSS custom property, so scrolling never renders React. */
export const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
export const smooth = (n: number) => n * n * (3 - 2 * n);

export function useScrollVar(ref: RefObject<HTMLElement | null>, map: (rect: DOMRect, vh: number) => number, name = '--p') {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (still()) { el.style.setProperty(name, '1'); return undefined; }
    let raf = 0;
    const write = () => { raf = 0; el.style.setProperty(name, map(el.getBoundingClientRect(), window.innerHeight).toFixed(4)); };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(write); };
    write();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { if (raf) cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, [ref, map, name]);
}

/** The nav pill turns dark while its centre line sits over a dark band. */
function useNavTone(setDark: (v: boolean) => void) {
  useEffect(() => {
    let raf = 0;
    let last: boolean | null = null;
    const read = () => {
      raf = 0;
      const over = [...document.querySelectorAll('.lp-dark')].some((b) => { const r = b.getBoundingClientRect(); return r.top <= 40 && r.bottom >= 40; });
      if (over !== last) { last = over; setDark(over); }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { if (raf) cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, [setDark]);
}

export const MARKETING_LINKS: [string, string][] = [
  ['/app/explore', 'Каталог тестов'],
  ['/#how', 'Как это работает'],
  ['/pricing', 'Тарифы'],
  ['/docs', 'API'],
];

function NavLink({ href, label, onClick }: { href: string; label: string; onClick?: () => void }) {
  const { t } = useLocale();
  return href.startsWith('/#')
    ? <a href={`${basePath}${href}`} onClick={onClick}>{t(label)}</a>
    : <Link href={href} onClick={onClick}>{t(label)}</Link>;
}

/** The floating 1200px pill: transparent at the top, white once the page moves, dark over dark bands. */
export function MarketingNav({ solid = false }: { solid?: boolean }) {
  const { t } = useLocale();
  const { setRole } = useAppState();
  const [stuck, setStuck] = useState(false);
  const [dark, setDark] = useState(false);
  const [menu, setMenu] = useState(false);
  useNavTone(setDark);
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    if (!menu) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [menu]);
  const launch = () => setRole('founder');
  return (
    <>
      <div className={`lp-navwrap${stuck || solid ? ' is-stuck' : ''}${dark ? ' is-dark' : ''}`}>
        <Rv as="nav" y={-56} now className="lp-nav">
          <Link className="lp-nav__brand" href="/" data-testid="link-home">Betadrop</Link>
          <div className="lp-nav__links">{MARKETING_LINKS.map(([href, label]) => <NavLink key={href} href={href} label={label} />)}</div>
          <div className="lp-nav__right">
            <LangPills dark={dark} />
            <button className="lp-burger" onClick={() => setMenu(true)} aria-label={t('Меню')}><Menu style={{ width: 18, height: 18 }} /></button>
            <Link className="lp-nav__login" href="/sign-in" data-testid="link-sign-in">{t('Войти')}</Link>
            <Btn to="/app/founder/campaigns/new" onClick={launch} label={t('Запустить тест')} size="sm" />
          </div>
        </Rv>
      </div>
      <div className={`lp-drawer${menu ? ' is-open' : ''}`} aria-hidden={!menu}>
        <div className="lp-drawer__top">
          <Link className="lp-nav__brand" href="/" onClick={() => setMenu(false)}>Betadrop</Link>
          <button className="lp-burger" onClick={() => setMenu(false)} aria-label={t('Закрыть')}><X style={{ width: 18, height: 18 }} /></button>
        </div>
        <div className="lp-drawer__body">
          {MARKETING_LINKS.map(([href, label]) => <NavLink key={href} href={href} label={label} onClick={() => setMenu(false)} />)}
          <Link href="/sign-in" onClick={() => setMenu(false)}>{t('Войти')}</Link>
          <div className="lp-drawer__foot">
            <LangPills />
            <Btn to="/app/founder/campaigns/new" label={t('Запустить тест')} onClick={() => { launch(); setMenu(false); }} />
          </div>
        </div>
      </div>
    </>
  );
}

const FOOT_COLS: { h: string; items: [string, string, boolean?][] }[] = [
  { h: 'Продукт', items: [['/app/explore', 'Каталог тестов'], ['/pricing', 'Тарифы'], ['/#how', 'Как это работает']] },
  { h: 'Тестерам', items: [['/app/tester/dashboard', 'Мои тесты'], ['/app/tester/vault', 'Награды'], ['/app/tester/profile/me', 'Профиль']] },
  { h: 'Фаундерам', items: [['/app/founder/campaigns/new', 'Новая кампания'], ['/app/founder/submissions', 'Входящие'], ['/app/founder/settings/integrations', 'Интеграции']] },
  { h: 'Ресурсы', items: [['/docs', 'Документация API'], ['/docs#status', 'Статус системы'], ['/docs#rules', 'Правила и арбитраж'], [REPO_URL, 'Исходный код', true]] },
];

export function MarketingFooter() {
  const { t } = useLocale();
  return (
    <footer className="lp-foot">
      <div className="lp-shell">
        <div className="lp-foot__grid">
          <div className="lp-foot__brand">
            <Link className="lp-nav__brand" href="/">Betadrop</Link>
            <p>{t('Бета-тесты для софта с проверкой результата и наградами за принятые отчёты.')}</p>
          </div>
          {FOOT_COLS.map((c) => (
            <div className="lp-foot__col" key={c.h}>
              <h4>{t(c.h)}</h4>
              {c.items.map(([href, label, external]) => external
                ? <a key={href} href={href} target="_blank" rel="noreferrer">{t(label)}</a>
                : href.startsWith('/#') ? <a key={href} href={`${basePath}${href}`}>{t(label)}</a>
                : <Link key={href} href={href}>{t(label)}</Link>)}
            </div>
          ))}
        </div>
        <div className="lp-foot__mark" aria-hidden="true"><span>Betadrop</span></div>
        <div className="lp-foot__bar"><p>© {new Date().getFullYear()} Betadrop. {t('Все права защищены.')}</p></div>
      </div>
    </footer>
  );
}
