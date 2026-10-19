import { useEffect, type ReactNode } from 'react';
import { Link } from 'wouter';
import { AlertTriangle, RotateCw, X } from 'lucide-react';
import { APP_STATUS, errMsg, METHOD_LABEL } from '@/lib/app';
import type { Campaign } from '@workspace/api-client-react';
import { useLocale, localizeCampaign } from '@/lib/i18n';

export function Status({ s }: { s: string }) {
  const { t } = useLocale();
  const m = APP_STATUS[s] ?? { label: s, color: 'hsl(var(--muted-foreground))' };
  return (
    <span className="tag" style={{ color: m.color, borderColor: 'currentColor' }} data-testid={`status-${s}`}>
      <span className="dot" style={{ background: m.color }} />
      {t(m.label)}
    </span>
  );
}

export function Skel({ className = '' }: { className?: string }) {
  return <div className={`skel ${className}`} />;
}

export function SkelRows({ n = 4, h = 'h-12' }: { n?: number; h?: string }) {
  return (
    <div className="flex flex-col gap-px border border-border bg-border">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className={`bg-surface ${h} px-4 flex items-center gap-4`}>
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
    <div className="panel border-destructive/50 p-4 flex items-start gap-3" data-testid="error-box">
      <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{t('Запрос не выполнен')}</div>
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
    <div className="text-xs mono text-destructive border border-destructive/40 bg-destructive/5 px-3 py-2" data-testid="text-error">
      {errMsg(error)}
    </div>
  );
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  const { t } = useLocale();
  return (
    <div className="panel grid-bg px-6 py-12 flex flex-col items-center text-center gap-2" data-testid="empty-state">
      <div className="w-8 h-8 border border-border bg-surface grid grid-cols-2 grid-rows-2 mb-2">
        <span className="bg-primary/70" />
        <span />
        <span />
        <span className="bg-streak/70" />
      </div>
      <div className="text-sm font-semibold">{t(title)}</div>
      {hint && <div className="meta max-w-sm">{t(hint)}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function PageHead({ k, title, sub, right }: { k: string; title: string; sub?: string; right?: ReactNode }) {
  const { t } = useLocale();
  return (
    <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between border-b border-border pb-5 mb-6">
      <div>
        <div className="label-k">{t(k)}</div>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">{t(title)}</h1>
        {sub && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{t(sub)}</p>}
      </div>
      {right && <div className="flex gap-2 flex-wrap">{right}</div>}
    </div>
  );
}

export function Stat({ k, v, accent, testid }: { k: string; v: ReactNode; accent?: string; testid?: string }) {
  const { t } = useLocale();
  return (
    <div className="bg-surface p-4">
      <div className="label-k">{t(k)}</div>
      <div className="text-2xl font-semibold mono mt-2 tabular-nums" style={accent ? { color: accent } : undefined} data-testid={testid}>
        {v}
      </div>
    </div>
  );
}

export function Field({ label, hint, children, error }: { label: string; hint?: string; children: ReactNode; error?: string }) {
  const { t } = useLocale();
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium">{t(label)}</span>
        {hint && <span className="meta">{t(hint)}</span>}
      </span>
      {children}
      {error && <span className="text-[11px] mono text-destructive">{t(error)}</span>}
    </label>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const { t } = useLocale();
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/30" onClick={onClose} />
      <div className="relative panel w-full max-w-lg fade-up max-h-[90dvh] overflow-auto" role="dialog">
        <div className="flex items-center justify-between border-b border-border px-4 h-11">
          <div className="text-sm font-semibold">{t(title)}</div>
          <button className="btn btn-ghost btn-sm" aria-label={t('Закрыть')} onClick={onClose} data-testid="button-close-modal">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export function CampaignRow({ c: original, i = 0 }: { c: Campaign; i?: number }) {
  const { t } = useLocale();
  const c = localizeCampaign(original);
  const left = c.slots - c.filledSlots;
  return (
    <Link
      href={`/app/campaigns/${c.id}`}
      className="row-hover group grid grid-cols-1 md:grid-cols-[1fr_140px_150px_110px] gap-2 md:gap-4 items-center px-4 py-3 bg-surface fade-up"
      style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
      data-testid={`card-campaign-${c.id}`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">{c.title}</span>
          {c.demo && <span className="tag" style={{ color: 'hsl(var(--streak))', borderColor: 'currentColor' }}>{t('Демо-кампания')}</span>}
          {c.status !== 'active' && <Status s={c.status} />}
        </div>
        <div className="meta mt-1 truncate">
          {c.company} / {c.category} {c.tags.length > 0 && `/ ${c.tags.slice(0, 3).join(' · ')}`}
        </div>
      </div>
      <div className="meta">{t(METHOD_LABEL[c.method] ?? c.method)}</div>
      <div className="text-xs truncate">{c.reward}</div>
      <div className="flex items-center gap-2 md:justify-end">
        <div className="flex gap-px">
          {Array.from({ length: Math.min(c.slots, 15) }).map((_, j) => (
            <span key={j} className="w-1.5 h-3" style={{ background: j < c.filledSlots ? 'hsl(var(--border))' : 'hsl(var(--live))' }} />
          ))}
        </div>
        <span className="mono text-[11px] tabular-nums text-muted-foreground">{left}/{c.slots}</span>
      </div>
    </Link>
  );
}
