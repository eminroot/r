import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'wouter';
import { RotateCw, X } from 'lucide-react';
import { errMsg, methodLabel, statusInfo } from '@/lib/app';
import type { Campaign } from '@workspace/api-client-react';
import { useLocale, localizeCampaign } from '@/lib/i18n';

export function Status({ s, kind = 'application' }: { s: string; kind?: 'application' | 'report' | 'campaign' }) {
  useLocale();
  const m = statusInfo(s, kind);
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] whitespace-nowrap" style={{ color: m.color }} data-testid={`status-${s}`}>
      <span className="dot" style={{ background: m.color }} />
      {m.label}
    </span>
  );
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
    <div className="panel p-4 flex items-start gap-3" style={{ borderColor: 'hsl(var(--destructive) / 0.5)' }} role="alert" data-testid="error-box">
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
    <div className="t-small text-destructive border px-3 py-2" style={{ borderColor: 'hsl(var(--destructive) / 0.4)', background: 'hsl(var(--destructive) / 0.05)' }} role="alert" data-testid="text-error">
      {errMsg(error)}
    </div>
  );
}

/** Plain empty state: one sentence of what is missing, one of what to do, one action. */
export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  const { t } = useLocale();
  return (
    <div className="border border-dashed border-border px-5 py-8" data-testid="empty-state">
      <div className="t-h3">{t(title)}</div>
      {hint && <p className="t-small muted mt-1 max-w-md">{t(hint)}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHead({ title, sub, right, back }: { title: string; sub?: string; right?: ReactNode; back?: { href: string; label: string } }) {
  const { t } = useLocale();
  return (
    <div className="mb-8">
      {back && <Link href={back.href} className="meta hover:text-foreground inline-block mb-3">{'← '}{t(back.label)}</Link>}
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

/** A row of key figures. Numbers in mono, labels in plain text. */
export function Stats({ items, loading }: { items: { label: string; value: ReactNode; hint?: string; color?: string; testid?: string }[]; loading?: boolean }) {
  const { t } = useLocale();
  return (
    <div className="grid gap-px bg-border border border-border mb-8" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(150px, 1fr))` }}>
      {items.map((s) => (
        <div key={s.label} className="bg-surface px-4 py-3">
          <div className="text-[12px] muted">{t(s.label)}</div>
          {loading ? <Skel className="h-6 w-12 mt-1.5" /> : (
            <div className="num text-[22px] font-semibold leading-tight mt-1" style={s.color ? { color: s.color } : undefined} data-testid={s.testid}>{s.value}</div>
          )}
          {s.hint && <div className="meta mt-0.5">{t(s.hint)}</div>}
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
      <div className="absolute inset-0 bg-foreground/30" onClick={onClose} />
      <div ref={box} className="relative panel w-full max-w-lg max-h-[90dvh] overflow-auto" role="dialog" aria-modal="true" aria-label={t(title)}>
        <div className="flex items-center justify-between border-b border-border px-5 h-12">
          <div className="t-h3">{t(title)}</div>
          <button className="btn btn-ghost btn-sm btn-icon" aria-label={t('Закрыть')} onClick={onClose} data-close data-testid="button-close-modal">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function DemoTag() {
  const { t } = useLocale();
  return <span className="tag" style={{ color: 'hsl(var(--streak))', borderColor: 'currentColor' }}>{t('демо')}</span>;
}

export function SlotBar({ filled, total }: { filled: number; total: number }) {
  const { t } = useLocale();
  const left = Math.max(0, total - filled);
  const pct = total ? Math.min(100, (filled / total) * 100) : 100;
  return (
    <div className="flex items-center gap-2 min-w-0" title={t('{count} из {total} мест свободно', { count: left, total })}>
      <div className="h-1.5 flex-1 min-w-10 bg-muted">
        <div className="h-full" style={{ width: `${pct}%`, background: left ? 'hsl(var(--foreground) / 0.55)' : 'hsl(var(--muted-foreground) / 0.4)' }} />
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
      className={`row-hover group grid grid-cols-1 ${CAMPAIGN_COLUMNS} gap-x-6 gap-y-2 items-center px-4 py-3.5`}
      data-testid={`card-campaign-${c.id}`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium truncate group-hover:underline">{c.title}</span>
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
