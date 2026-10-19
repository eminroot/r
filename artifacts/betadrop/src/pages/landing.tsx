import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Check, FileCode2, Image, KeyRound, Mail, Webhook } from 'lucide-react';
import { useGetStats, useListCampaigns } from '@workspace/api-client-react';
import { Page } from '@/components/shell';
import { CampaignRow, ErrorBox, Skel, SkelRows } from '@/components/kit';
import { PricingGrid } from '@/pages/pricing';
import { useAppState } from '@/lib/app';
import { localizeCampaign, useLocale } from '@/lib/i18n';

function Terminal() {
  const { t, language } = useLocale();
  const { data: campaigns, isLoading } = useListCampaigns();
  const { data: stats } = useGetStats();
  const lines = useMemo(() => {
    const out: { t: string; k: string; v: string; c: string }[] = [];
    out.push({ t: 'boot', k: 'catalog.sync', v: 'GET /api/campaigns', c: 'hsl(var(--muted-foreground))' });
    (campaigns ?? []).slice(0, 7).forEach((c) => {
      out.push({
        t: c.method,
        k: c.demo ? 'demo.listed' : 'campaign.open',
        v: t('#{id} {title} — {available}/{total} слотов', { id: c.id, title: localizeCampaign(c).title, available: c.slots - c.filledSlots, total: c.slots }),
        c: c.demo ? 'hsl(var(--streak))' : 'hsl(var(--live))',
      });
    });
    if (stats) {
      out.push({ t: 'stats', k: 'reports.verified', v: String(stats.verifiedReports), c: 'hsl(var(--primary))' });
      out.push({ t: 'stats', k: 'slots.available', v: String(stats.availableSlots), c: 'hsl(var(--primary))' });
    }
    return out;
  }, [campaigns, stats, language, t]);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    if (!lines.length) return;
    const id = setInterval(() => setShown((s) => (s >= lines.length ? s : s + 1)), 140);
    return () => clearInterval(id);
  }, [lines.length]);

  return (
    <div className="panel terminal-log mono text-[12px] overflow-hidden" data-testid="terminal-log">
      <div className="h-8 border-b border-border flex items-center px-3 gap-3 bg-background">
        <span className="flex gap-1">
          <span className="w-2 h-2 border border-border" />
          <span className="w-2 h-2 border border-border" />
          <span className="w-2 h-2 border border-border" />
        </span>
        <span className="text-muted-foreground">betadrop / {t('журнал событий')}</span>
        <span className="ml-auto flex items-center gap-1.5 text-live">
          <span className="dot bg-live live-pulse" /> {t('в эфире')}
        </span>
      </div>
      <div className="p-3 min-h-[300px] leading-6">
        {isLoading && (
          <div className="flex flex-col gap-2 pt-1">
            {Array.from({ length: 6 }).map((_, i) => <Skel key={i} className="h-3" />)}
          </div>
        )}
        {lines.slice(0, shown).map((l, i) => (
          <div key={i} className="flex gap-3 fade-up whitespace-nowrap overflow-hidden">
            <span className="text-muted-foreground w-6 text-right tabular-nums">{String(i + 1).padStart(2, '0')}</span>
            <span className="w-24 shrink-0 truncate text-muted-foreground">[{l.t}]</span>
            <span style={{ color: l.c }} className="shrink-0">{l.k}</span>
            <span className="truncate">{l.v}</span>
          </div>
        ))}
        {!isLoading && (
          <div className="flex gap-3">
            <span className="text-muted-foreground w-6 text-right">$</span>
            <span className="caret" />
          </div>
        )}
      </div>
    </div>
  );
}

const METHODS = [
  { icon: KeyRound, k: 'secret_code', t: 'Секретный код', d: 'Код спрятан внутри продукта. Тестер находит его, проходя сценарий, и прикладывает к отчёту.', ok: true },
  { icon: Mail, k: 'email_match', t: 'Совпадение email', d: 'Тестер указывает email аккаунта, созданного в продукте. Фаундер сверяет его с базой пользователей.', ok: true },
  { icon: Image, k: 'media', t: 'Медиа-доказательство', d: 'Ссылка на запись экрана или скриншот, подтверждающий прохождение сценария.', ok: true },
  { icon: Webhook, k: 'webhook', t: 'Webhook API', d: 'Автоматическая верификация событий из вашего бэкенда. Внешний API пока не подключён.', ok: false },
];

export default function Landing() {
  const { t } = useLocale();
  const { setRole } = useAppState();
  const { data: campaigns, isLoading, error, refetch } = useListCampaigns();
  const { data: stats } = useGetStats();
  return (
    <Page wide>
      <section className="grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-14 items-center pt-6 pb-16 border-b border-border">
        <div className="fade-up">
          <div className="label-k flex items-center gap-2"><span className="dot bg-live live-pulse" /> {t('Инфраструктура для бета-релизов')}</div>
          <h1 className="text-4xl md:text-[46px] leading-[1.08] font-bold tracking-tight mt-4">
            {t('Инженерный фидбек для софта.')}
            <br />
            <span className="text-primary">{t('Награды и доступ для первых пользователей.')}</span>
          </h1>
          <p className="text-base text-muted-foreground mt-5 max-w-lg leading-relaxed">
            {t('Фаундеры публикуют бета-кампании. Технические тестеры проходят сценарии, присылают воспроизводимые отчёты и получают лицензии и API-кредиты — только после проверки.')}
          </p>
          <div className="flex flex-wrap gap-2 mt-7">
            <Link href="/app/founder/campaigns/new" onClick={() => setRole('founder')} className="btn btn-primary btn-lg" data-testid="link-hero-signup">{t('Запустить кампанию')} <ArrowRight className="w-4 h-4" /></Link>
            <Link href="/app/explore" onClick={() => setRole('tester')} className="btn btn-lg" data-testid="link-hero-explore">{t('Исследовать тесты')}</Link>
          </div>
          <div className="grid grid-cols-4 gap-px bg-border border border-border mt-10 max-w-lg">
            {[
              ['кампаний', stats?.campaigns],
              ['тестеров', stats?.testers],
              ['отчётов', stats?.verifiedReports],
              ['слотов', stats?.availableSlots],
            ].map(([k, v]) => (
              <div key={k as string} className="bg-surface px-3 py-2.5">
                <div className="mono text-lg font-semibold tabular-nums">{v ?? '—'}</div>
                <div className="label-k">{t(String(k))}</div>
              </div>
            ))}
          </div>
        </div>
        <Terminal />
      </section>

      <section id="for-founders" className="grid md:grid-cols-2 gap-px bg-border border border-border mt-16">
        {[
          { k: '01 / тестерам', t: 'Отчёты, которые конвертируются в лицензии', pts: ['Скрининг из 1–3 вопросов вместо анкет', 'Дедлайн и статус каждой заявки на одном экране', 'Коды наград в хранилище, копирование в один клик', 'Trust score, XP и серия активности растут только от реальных действий'] },
          { k: '02 / фаундерам', t: 'Структурированный фидбек от людей, которые читают логи', pts: ['От 1 до 15 слотов на кампанию, коды наград загружаются заранее', 'Минимальный trust score отсекает случайных участников', 'Одобрение или отклонение с причиной, экспорт в CSV', 'Верификация через код, email или медиа'] },
        ].map((b, i) => (
          <div key={b.k} className="bg-surface p-8">
            <div className="label-k" style={{ color: i ? 'hsl(var(--streak))' : 'hsl(var(--primary))' }}>{t(b.k)}</div>
            <h2 className="text-xl font-semibold mt-3 tracking-tight">{t(b.t)}</h2>
            <ul className="mt-5 flex flex-col gap-2.5">
              {b.pts.map((p) => (
                <li key={p} className="flex gap-2.5 text-sm"><Check className="w-4 h-4 text-live shrink-0 mt-0.5" />{t(p)}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="mt-16">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="label-k">{t('каталог / сейчас')}</div>
            <h2 className="text-2xl font-semibold tracking-tight mt-1">{t('Открытые кампании')}</h2>
          </div>
          <Link href="/app/explore" className="btn btn-sm">{t('Весь каталог')} <ArrowRight className="w-3 h-3" /></Link>
        </div>
        {isLoading && <SkelRows n={5} />}
        {error && <ErrorBox error={error} retry={() => refetch()} />}
        {campaigns && (
          <div className="flex flex-col gap-px bg-border border border-border">
            {campaigns.slice(0, 6).map((c, i) => <CampaignRow key={c.id} c={c} i={i} />)}
            {campaigns.length === 0 && <div className="bg-surface p-6 meta">{t('Кампаний пока нет.')}</div>}
          </div>
        )}
      </section>

      <section className="mt-16">
        <div className="label-k">{t('верификация')}</div>
        <h2 className="text-2xl font-semibold tracking-tight mt-1 mb-5">{t('Как подтверждается прохождение')}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
          {METHODS.map((m) => (
            <div key={m.k} className="bg-surface p-5 flex flex-col gap-3 group">
              <div className="flex items-center justify-between">
                <m.icon className="w-5 h-5 text-primary transition-transform group-hover:-translate-y-0.5" />
                <span className="tag" style={m.ok ? { color: 'hsl(var(--live))', borderColor: 'currentColor' } : undefined}>{t(m.ok ? 'доступно' : 'не подключено')}</span>
              </div>
              <div className="mono text-[11px] text-muted-foreground">{m.k}</div>
              <div className="font-semibold text-sm">{t(m.t)}</div>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{t(m.d)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <div className="label-k">{t('тарифы')}</div>
        <h2 className="text-2xl font-semibold tracking-tight mt-1 mb-5">{t('Для фаундеров')}</h2>
        <PricingGrid />
      </section>

      <section className="mt-16 panel p-8 flex flex-col md:flex-row gap-6 md:items-center justify-between">
        <div className="flex items-start gap-4">
          <FileCode2 className="w-6 h-6 text-primary mt-1" />
          <div>
            <div className="text-lg font-semibold">{t('Документация ядра')}</div>
            <p className="text-sm text-muted-foreground mt-1">{t('Жизненный цикл кампании, заявки, отчёта и награды — без маркетинга.')}</p>
          </div>
        </div>
        <Link href="/docs" className="btn">{t('Читать документацию')} <ArrowRight className="w-3 h-3" /></Link>
      </section>
    </Page>
  );
}
