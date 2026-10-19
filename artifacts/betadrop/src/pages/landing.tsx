import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { useGetActivity, useGetStats, useListCampaigns, getGetActivityQueryKey, type Activity, type Campaign } from '@workspace/api-client-react';
import { Page } from '@/components/shell';
import { DemoTag, ErrorBox, Skel } from '@/components/kit';
import { PricingGrid } from '@/pages/pricing';
import { ago, CATEGORIES, methodLabel, useAppState } from '@/lib/app';
import { localizeCampaign, useLocale } from '@/lib/i18n';

const clock = (s: string) => {
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' : d.toTimeString().slice(0, 8);
};

// Turns stored platform events into log lines in the format from the product spec.
function logLine(e: Activity) {
  const [subject, reward] = e.detail.split(' → ');
  switch (e.event) {
    case 'submission_verified': return { k: 'submission_verified', v: `"${subject}"`, tail: reward ? `-> ${reward}` : '' };
    case 'report_submitted': return { k: 'report_submitted', v: `"${subject}"`, tail: '-> review: 72h' };
    case 'application_created': return { k: 'application_created', v: `"${subject}"`, tail: '' };
    case 'campaign_deployed': return { k: 'campaign_deployed', v: `"${subject}"`, tail: '' };
    default: return { k: e.event, v: e.detail, tail: '' };
  }
}

function Terminal() {
  const { t } = useLocale();
  const activity = useGetActivity({ query: { queryKey: getGetActivityQueryKey(), refetchInterval: 15000 } });
  const { data: campaigns } = useListCampaigns();
  const lines = useMemo(() => {
    const events = [...(activity.data ?? [])].reverse().slice(-9).map((e) => ({ time: clock(e.createdAt), ...logLine(e) }));
    if (events.length >= 3) return events;
    // A fresh install has no events yet: list what is open instead of inventing traffic.
    return (campaigns ?? []).slice(0, 6).map((c) => ({
      time: clock(c.createdAt),
      k: 'campaign_listed',
      v: `"${localizeCampaign(c).title}"`,
      tail: `| slots: ${c.slots - c.filledSlots}/${c.slots} | method: ${c.method.toUpperCase()}`,
    }));
  }, [activity.data, campaigns]);

  return (
    <div className="terminal min-w-0" data-testid="terminal-log">
      <div className="terminal-bar h-9 px-4 flex items-center justify-between text-[12px]">
        <span>betadrop.log</span>
        <span>{t('обновляется каждые 15 с')}</span>
      </div>
      <div className="px-4 py-3 min-h-[288px] overflow-hidden">
        {activity.isLoading && <div className="flex flex-col gap-3 pt-1">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-3 bg-[#21262d]" style={{ width: `${90 - i * 9}%` }} />)}</div>}
        {lines.map((l, i) => (
          <div key={i} className="truncate">
            <span className="dim">{'> '}[{l.time}] </span>
            <span>{l.k}: </span>
            <span className="hl">{l.v}</span>
            {l.tail && <span className="dim"> {l.tail}</span>}
          </div>
        ))}
        {!activity.isLoading && <div><span className="dim">{'> '}</span><span className="caret" /></div>}
      </div>
    </div>
  );
}

function FeedCard({ c: original }: { c: Campaign }) {
  const { t } = useLocale();
  const c = localizeCampaign(original);
  const left = c.slots - c.filledSlots;
  return (
    <article className="bg-surface p-5 flex flex-col gap-4 min-w-0" data-testid={`card-feed-${c.id}`}>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/app/campaigns/${c.id}`} className="t-h3 hover:underline">{c.title}</Link>
          {c.demo && <DemoTag />}
        </div>
        <div className="meta mt-1">{c.company} · {ago(c.createdAt)}</div>
      </div>
      <div><span className="tag !h-auto !py-1 !text-[12px] text-foreground whitespace-normal">[{c.reward}]</span></div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 t-small">
        <dt className="muted">{t('Проверка')}</dt><dd>{methodLabel(c.method)}</dd>
        <dt className="muted">{t('Стек')}</dt><dd className="truncate">{c.tags.join(', ') || c.category}</dd>
        <dt className="muted">{t('Места')}</dt><dd className="num">{t('{count} / {total} мест', { count: left, total: c.slots })}</dd>
      </dl>
      <Link href={`/app/campaigns/${c.id}`} className="btn btn-sm self-start mt-auto">{t('Подать заявку')}</Link>
    </article>
  );
}

function LiveFeed() {
  const { t } = useLocale();
  const [cat, setCat] = useState('');
  const { data, isLoading, error, refetch } = useListCampaigns();
  const open = (data ?? []).filter((c) => c.status === 'active' && c.filledSlots < c.slots && (!cat || c.category === cat)).slice(0, 3);
  return (
    <section className="mt-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="t-h2">{t('Сейчас в каталоге')}</h2>
          <p className="t-body muted mt-1">{t('Открытые бета-тесты с наградами и свободными местами.')}</p>
        </div>
        <div className="seg" role="tablist">
          {['', ...CATEGORIES].map((c) => (
            <button key={c || 'all'} role="tab" aria-selected={cat === c} data-active={cat === c} onClick={() => setCat(c)} data-testid={`tab-feed-${c || 'all'}`}>{c ? t(c) : t('Все')}</button>
          ))}
        </div>
      </div>
      {isLoading && <div className="grid md:grid-cols-3 gap-px bg-border border border-border">{[0, 1, 2].map((i) => <div key={i} className="bg-surface p-5 h-56"><Skel className="h-4 w-2/3" /><Skel className="h-3 w-1/3 mt-3" /></div>)}</div>}
      {error && <ErrorBox error={error} retry={() => refetch()} />}
      {data && open.length === 0 && <div className="border border-dashed border-border p-6 t-body muted">{t('В этой категории сейчас нет открытых тестов.')}</div>}
      {open.length > 0 && <div className="grid md:grid-cols-3 gap-px bg-border border border-border">{open.map((c) => <FeedCard key={c.id} c={c} />)}</div>}
      <Link href="/app/explore" className="inline-block mt-4 t-small text-primary hover:underline">{t('Весь каталог')} →</Link>
    </section>
  );
}

const VERIFICATION = [
  { k: 'secret_code', time: '0 мин', d: 'Спрячьте код в конце онбординга или в дашборде. Тестер вводит его в отчёте, сервер сверяет хеш.' },
  { k: 'email_match', time: '0 мин', d: 'Тестер указывает email, с которым зарегистрировался у вас. Вы сверяете его с базой в один клик.' },
  { k: 'media', time: '0 мин', d: 'Ссылка на Loom, YouTube или скриншоты консоли плюс текстовый разбор ошибок.' },
  { k: 'webhook', time: '15 мин', d: 'Ваш бэкенд сам сообщает о выполнении: POST /api/v1/verifications с ID тестера.' },
];

const VALUE = {
  startups: [
    'Четыре способа проверить, что сценарий пройден: код, email, запись экрана или webhook.',
    'Trust Score отсеивает ботов и случайных участников ещё до заявки.',
    'API-ключи и webhook для вашего бэкенда, экспорт в CSV, Jira и GitHub Issues.',
    'Коды наград выдаются сами, как только отчёт принят.',
  ],
  testers: [
    'Доступ к закрытым бетам инструментов для разработчиков.',
    'Лицензии, подписки и API-кредиты в одном хранилище.',
    'Профиль с картой активности и бейджами, который показывает вашу работу.',
    'Понятные сроки: 48 часов на отчёт, 72 часа на ответ фаундера.',
  ],
};

export default function Landing() {
  const { t } = useLocale();
  const { setRole } = useAppState();
  const { data: stats } = useGetStats();
  const figures: [string, number | undefined][] = [
    ['открытых кампаний', stats?.campaigns],
    ['тестеров', stats?.testers],
    ['принятых отчётов', stats?.verifiedReports],
    ['свободных мест', stats?.availableSlots],
  ];
  return (
    <Page wide>
      <section className="grid lg:grid-cols-[1fr_minmax(0,540px)] gap-10 lg:gap-16 items-center pt-6">
        <div className="min-w-0">
          <div className="mono text-[12px] muted">{t('[ИНФРАСТРУКТУРА ДЛЯ БЕТА-РЕЛИЗОВ]')}</div>
          <h1 className="t-display mt-5">
            {t('Инженерный фидбек для софта.')}{' '}
            <span className="muted">{t('Награды и доступ для первых пользователей.')}</span>
          </h1>
          <p className="t-lead mt-6 max-w-[540px]">
            {t('Стартапы получают баг-репорты и разборы онбординга от людей, которые читают логи. Тестеры получают подписки, API-кредиты и профиль, который показывает их работу.')}
          </p>
          <div className="flex flex-wrap gap-2 mt-8">
            <Link href="/app/founder/campaigns/new" onClick={() => setRole('founder')} className="btn btn-primary btn-lg" data-testid="link-hero-launch">{t('Запустить кампанию')}</Link>
            <Link href="/app/explore" onClick={() => setRole('tester')} className="btn btn-lg" data-testid="link-hero-explore">{t('Смотреть тесты')}</Link>
          </div>
          <dl className="flex flex-wrap gap-x-8 gap-y-3 mt-10">
            {figures.map(([k, v]) => (
              <div key={k}>
                <dd className="num text-[20px] font-semibold">{v ?? <Skel className="h-6 w-8" />}</dd>
                <dt className="text-[12px] muted">{t(k)}</dt>
              </div>
            ))}
          </dl>
        </div>
        <Terminal />
      </section>

      <section id="for-startups" className="mt-24 scroll-mt-16">
        <h2 className="t-h2 mb-5">{t('Что получает каждая сторона')}</h2>
        <div className="grid md:grid-cols-2 gap-px bg-border border border-border">
          {([['Стартапам', VALUE.startups], ['Тестировщикам', VALUE.testers]] as const).map(([title, points]) => (
            <div key={title} className="bg-surface">
              <div className="px-6 py-3 border-b border-border t-h3">{t(title)}</div>
              <ul className="px-6 py-2">
                {points.map((p) => <li key={p} className="py-2.5 t-body border-b border-border last:border-0">{t(p)}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <LiveFeed />

      <section className="mt-24">
        <h2 className="t-h2">{t('Как подтверждается выполнение')}</h2>
        <p className="t-body muted mt-1 mb-5">{t('Метод выбирается при создании кампании. Время указано для подключения на вашей стороне.')}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
          {VERIFICATION.map((m) => (
            <div key={m.k} className="bg-surface p-5 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2 mono text-[12px]">
                <span className="muted">{m.k}</span>
                <span>{t(m.time)}</span>
              </div>
              <div className="t-h3 mt-2">{methodLabel(m.k)}</div>
              <p className="t-small muted">{t(m.d)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-24">
        <h2 className="t-h2">{t('Тарифы для стартапов')}</h2>
        <p className="t-body muted mt-1 mb-5">{t('Starter бесплатный и работает уже сейчас. Оплата платных тарифов появится позже.')}</p>
        <PricingGrid />
      </section>
    </Page>
  );
}
