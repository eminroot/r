import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'wouter';
import { Inbox, RotateCw, X, type LucideIcon } from 'lucide-react';
import { errMsg, methodLabel, statusInfo } from '@/lib/app';
import type { Campaign } from '@workspace/api-client-react';
import { useLocale, localizeCampaign } from '@/lib/i18n';

const TONE: Record<string, string> = {
  pending: 'tag-warn', approved: 'tag-ok', completed: 'tag-ok', active: 'tag-ok',
  rejected: 'tag-stop', submitted: 'tag-cool', expired: '', paused: 'tag-warn',
};

/** A status is a tint pill and the word. */
export function Status({ s, kind = 'application' }: { s: string; kind?: 'application' | 'report' | 'campaign' }) {
  useLocale();
  const m = statusInfo(s, kind);
  const tone = kind === 'campaign' && s === 'completed' ? '' : TONE[s] ?? '';
  return <span className={`tag ${tone}`} data-testid={`status-${s}`}>{m.label}</span>;
}

export function Skel({ className = '' }: { className?: string }) {
  return <div className={`skel ${className}`} />;
}

export function SkelRows({ n = 4, h = 'h-14' }: { n?: number; h?: string }) {
  return (
    <div className="stack" aria-busy="true">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className={`${h} px-4 flex items-center gap-4`}>
          <Skel className="h-3 w-1/3" />
          <Skel className="h-3 w-1/6" />
          <Skel className="h-3 w-16 ml-auto" />
        </div>
      ))}
    </div>
  );
}

export function ErrorBox({ error, retry }: { error: unknown; retry?: () => void }) {
  const { t } = useLocale();
  return (
    <div className="panel p-4 flex items-start gap-3" style={{ background: 'var(--stop-bg)', borderColor: 'transparent' }} role="alert" data-testid="error-box">
      <div className="flex-1 min-w-0">
        <div className="t-small font-medium">{t('Не удалось загрузить данные')}</div>
        <div className="meta mt-1 break-words">{errMsg(error)}</div>
      </div>
      {retry && (
        <button className="btn btn-sm" onClick={retry} data-testid="button-retry">
          <RotateCw className="w-3 h-3" /> {t('Повторить')}
        </button>
      )}
    </div>
  );
}

export function InlineError({ error }: { error: unknown }) {
  useLocale();
  if (!error) return null;
  return (
    <div className="t-small px-3.5 py-2.5 rounded-[12px]" style={{ color: 'var(--stop)', background: 'var(--stop-bg)' }} role="alert" data-testid="text-error">
      {errMsg(error)}
    </div>
  );
}

/** Empty state: an icon tile, what is missing, what to do about it, one action. */
export function Empty({ title, hint, action, icon: Icon = Inbox }: { title: string; hint?: string; action?: ReactNode; icon?: LucideIcon }) {
  const { t } = useLocale();
  return (
    <div className="panel px-6 py-10 flex flex-col items-center text-center" data-testid="empty-state">
      <span className="ico-tile mb-4"><Icon /></span>
      <div className="t-h2 !text-[20px]">{t(title)}</div>
      {hint && <p className="t-body muted mt-1.5 max-w-md">{t(hint)}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHead({ title, sub, right, back, eyebrow, icon: Icon }: { title: string; sub?: string; right?: ReactNode; back?: { href: string; label: string }; eyebrow?: string; icon?: LucideIcon }) {
  const { t } = useLocale();
  return (
    <div className="page-head">
      {back ? (
        <Link href={back.href} className="page-eyebrow hover:text-[var(--ink)]">{'← '}{t(back.label)}</Link>
      ) : eyebrow ? (
        <div className="page-eyebrow">{Icon && <Icon />}{t(eyebrow)}</div>
      ) : null}
      <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
        <div className="min-w-0">
          <h1 className="t-h1">{t(title)}</h1>
          {sub && <p className="t-body muted mt-2 max-w-2xl">{t(sub)}</p>}
        </div>
        {right && <div className="flex gap-2 flex-wrap shrink-0">{right}</div>}
      </div>
    </div>
  );
}

export function SectionHead({ title, count, right }: { title: string; count?: number; right?: ReactNode }) {
  const { t } = useLocale();
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <h2 className="t-h3 flex items-baseline gap-2">{t(title)}{count !== undefined && <span className="num text-[12px] muted font-normal">{count}</span>}</h2>
      {right}
    </div>
  );
}

/** A row of figure cards: label above, the number large and tabular. */
export function Stats({ items, loading }: { items: { label: string; value: ReactNode; hint?: string; color?: string; testid?: string }[]; loading?: boolean }) {
  const { t } = useLocale();
  return (
    <div className="grid gap-3 mb-8" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(170px, 1fr))` }}>
      {items.map((s) => (
        <div key={s.label} className="panel px-5 py-4">
          <div className="text-[13px] muted">{t(s.label)}</div>
          {loading ? <Skel className="h-8 w-14 mt-2" /> : (
            <div className="num text-[30px] font-medium tracking-[-0.03em] leading-tight mt-1.5" style={s.color ? { color: s.color } : undefined} data-testid={s.testid}>{s.value}</div>
          )}
          {s.hint && <div className="meta mt-1">{t(s.hint)}</div>}
        </div>
      ))}
    </div>
  );
}

export function Field({ label, hint, children, error }: { label: string; hint?: string; children: ReactNode; error?: string }) {
  const { t } = useLocale();
  return (
    <label className="flex flex-col gap-1.5 min-w-0">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-medium">{t(label)}</span>
        {hint && <span className="meta">{t(hint)}</span>}
      </span>
      {children}
      {error && <span className="text-[12px] text-destructive">{t(error)}</span>}
    </label>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const { t } = useLocale();
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    box.current?.querySelector<HTMLElement>('input, textarea, select, button:not([data-close])')?.focus();
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') close.current(); };
    window.addEventListener('keydown', h);
    return () => { window.removeEventListener('keydown', h); previous?.focus?.(); };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[rgba(36,36,38,0.32)] backdrop-blur-[2px]" onClick={onClose} />
      <div ref={box} className="relative w-full max-w-lg max-h-[90dvh] overflow-auto bg-[var(--card)] rounded-[20px] shadow-[0_2px_4px_rgba(36,36,38,0.05),0_24px_60px_rgba(36,36,38,0.18)]" role="dialog" aria-modal="true" aria-label={t(title)}>
        <div className="flex items-center justify-between border-b border-[var(--ink-07)] px-6 h-14">
          <div className="t-h3">{t(title)}</div>
          <button className="btn btn-ghost btn-sm btn-icon" aria-label={t('Закрыть')} onClick={onClose} data-close data-testid="button-close-modal">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function DemoTag() {
  const { t } = useLocale();
  return <span className="tag tag-warn">{t('демо')}</span>;
}

export function SlotBar({ filled, total }: { filled: number; total: number }) {
  const { t } = useLocale();
  const left = Math.max(0, total - filled);
  const pct = total ? Math.min(100, (filled / total) * 100) : 100;
  return (
    <div className="flex items-center gap-2 min-w-0" title={t('{count} из {total} мест свободно', { count: left, total })}>
      <div className="h-1.5 flex-1 min-w-10 rounded-full bg-[var(--pg)] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: left ? 'var(--act)' : 'var(--ink-25)' }} />
      </div>
      <span className="num text-[12px] muted whitespace-nowrap">{left ? t('{count} / {total} мест', { count: left, total }) : t('мест нет')}</span>
    </div>
  );
}

export const CAMPAIGN_COLUMNS = 'md:grid-cols-[minmax(0,1fr)_150px_minmax(0,190px)_150px]';

export function CampaignRow({ c: original }: { c: Campaign }) {
  const c = localizeCampaign(original);
  return (
    <Link
      href={`/app/campaigns/${c.id}`}
      className={`row-hover group grid grid-cols-1 ${CAMPAIGN_COLUMNS} gap-x-6 gap-y-2 items-center px-5 py-4`}
      data-testid={`card-campaign-${c.id}`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[15px] truncate group-hover:underline">{c.title}</span>
          {c.demo && <DemoTag />}
          {c.status !== 'active' && <Status s={c.status} kind="campaign" />}
        </div>
        <div className="meta mt-0.5 truncate">{c.company} · {c.category}{c.tags.length > 0 && ` · ${c.tags.slice(0, 3).join(', ')}`}</div>
      </div>
      <div className="text-[13px] muted">{methodLabel(c.method)}</div>
      <div className="text-[13px] truncate" title={c.reward}>{c.reward}</div>
      <SlotBar filled={c.filledSlots} total={c.slots} />
    </Link>
  );
}
