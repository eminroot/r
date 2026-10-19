// The landing page, built on the MuhAI design language (see components/lp.tsx and
// styles/landing.css): tinted hero with a dashboard that assembles on scroll, a category
// strip, a statement that lights up word by word over four pinned verification slabs, a
// bento grid, a dark live-catalog band, pricing, a capability rail, FAQ and a closing band.
import { useCallback, useMemo, useRef, useState, type ComponentType } from 'react';
import { Link } from 'wouter';
import {
  ArrowLeft, ArrowUpRight, Bot, Braces, CalendarClock, CircleCheck, Code2, Coins, Flame, FlaskConical, Gauge, Gift,
  Inbox, KeyRound, Layers, LayoutDashboard, ListChecks, Mail, MessagesSquare, Plus, ShieldCheck, Smartphone,
  Tag, Target, Video, Webhook, Wallet,
} from 'lucide-react';
import { useGetActivity, useGetStats, useListCampaigns, getGetActivityQueryKey, type Activity, type Campaign } from '@workspace/api-client-react';
import { Arrow, Btn, Count, Eyebrow, MarketingFooter, MarketingNav, Rv, clamp01, smooth, useCount, useInOnce, useScrollVar } from '@/components/lp';
import { ago, CATEGORIES, methodLabel, useAppState } from '@/lib/app';
import { localizeCampaign, useLocale } from '@/lib/i18n';

type Icon = ComponentType<{ className?: string; style?: React.CSSProperties }>;
type TFn = (s: string, v?: Record<string, string | number>) => string;

const heroMap = (rect: DOMRect, vh: number) => smooth(clamp01((vh * 0.8 - rect.top) / (vh * 0.95)));
const sayMap = (rect: DOMRect, vh: number) => clamp01((vh * 0.6 - rect.top) / (vh * 0.95));

/* Start poses for the four cards that assemble into the grid as the hero scrolls. */
const POSE = [
  { tx: -55, ty: -55, rx: -12.1, ry: 2.2, rz: -8.4, sc: 0.9 },
  { tx: -74, ty: -172, rx: -5.6, ry: 8.8, rz: -10.7, sc: 0.9 },
  { tx: 122, ty: -333, rx: -0.9, ry: -9.1, rz: 10.2, sc: 1.1 },
  { tx: 36, ty: -24, rx: 0, ry: 0, rz: 3, sc: 1.1 },
];
const poseVars = (i: number, live: boolean) => (live ? { '--tx': POSE[i].tx, '--ty': POSE[i].ty, '--rx': POSE[i].rx, '--ry': POSE[i].ry, '--rz': POSE[i].rz, '--sc': POSE[i].sc } as React.CSSProperties : undefined);

const SEV = ['#c9764a', '#e2c24f', '#6aa5e0', '#9db45f'];

// A fixed pseudo-random year of activity for the illustrations (no real user is shown).
const HEAT = Array.from({ length: 26 * 7 }, (_, i) => {
  const v = Math.sin(i * 12.9898) * 43758.5453;
  const r = v - Math.floor(v);
  return i > 150 ? (r < 0.25 ? 0 : r < 0.5 ? 2 : 3) : r < 0.45 ? 0 : r < 0.7 ? 1 : r < 0.88 ? 2 : 3;
});

function Heat({ weeks = 26 }: { weeks?: number }) {
  return <div className="lp-heat" aria-hidden="true">{HEAT.slice(-weeks * 7).map((l, i) => <i key={i} className={l ? `l${l}` : ''} />)}</div>;
}

/* ---------- the console mock in the hero ---------- */
function AppMock({ live = false }: { live?: boolean }) {
  const { t } = useLocale();
  const rows: [string, string, string][] = [
    [t('Критическая'), '12%', '3'],
    [t('Высокая'), '28%', '7'],
    [t('Средняя'), '40%', '10'],
    [t('Низкая'), '20%', '5'],
  ];
  return (
    <div className="lp-app">
      <div className="lp-app__rail" aria-hidden="true">
        <i className="on"><Inbox /></i>
        <i><FlaskConical /></i>
        <i><Gift /></i>
        <i><ShieldCheck /></i>
        <span className="sp" />
        <span className="lp-app__me" />
      </div>
      <div className="lp-app__main">
        <div className="lp-app__bar">
          <div>
            <div className="lp-app__ttl">{t('Входящие')}</div>
            <div className="lp-app__sub">{t('Все отчёты проверены в срок')}</div>
          </div>
          <span className="lp-app__pick">Drift Labs <Plus style={{ width: 13, height: 13, opacity: 0.4 }} /></span>
          <span className="lp-app__plus" aria-hidden="true"><Plus /></span>
        </div>
        <div className="lp-app__grid">
          <div className="lp-hcard lp-hcard--tall" style={poseVars(0, live)}>
            <div className="lp-panel">
              <div className="lp-panel__top">
                <div className="lp-panel__k">Trust Score</div>
                <span className="lp-tag lp-tag--dark" style={{ marginLeft: 'auto' }}>+5</span>
              </div>
              <div className="lp-panel__big">82<small>/100</small></div>
              <div style={{ marginTop: 14, flex: 1, minHeight: 0, overflow: "hidden" }}><Heat weeks={13} /></div>
              <div className="lp-panel__foot" style={{ paddingTop: 14 }}>
                <div className="lp-panel__cell"><b>24</b><span>{t('принято отчётов')}</span></div>
                <div className="lp-panel__cell"><b>{t('{count} дн.', { count: 14 })}</b><span>{t('Серия')}</span></div>
              </div>
            </div>
          </div>
          <div className="lp-hcard" style={poseVars(1, live)}>
            <div className="lp-panel">
              <div className="lp-panel__top">
                <div>
                  <div className="lp-panel__k">{t('Свободные места')}</div>
                  <div className="lp-panel__d">{t('Набор открыт')}</div>
                </div>
                <span className="lp-tag lp-tag--ok" style={{ marginLeft: 'auto' }}>+6</span>
              </div>
              <div className="lp-panel__big" style={{ marginTop: 'auto' }}>38<small>/50</small></div>
            </div>
          </div>
          <div className="lp-hcard" style={poseVars(2, live)}>
            <div className="lp-panel lp-log">
              <div className="lp-panel__top"><div className="lp-panel__k">betadrop.log</div><span className="lp-tag lp-tag--lime" style={{ marginLeft: 'auto' }}>live</span></div>
              <div style={{ paddingTop: 10 }}>
                <div className="lp-log__line"><em>15:42 </em><b>submission_verified</b> @alex_dev</div>
                <div className="lp-log__line"><em>15:43 </em><b>campaign_deployed</b> slots: 50</div>
                <div className="lp-log__line"><em>15:45 </em><b>bug_reported</b> #104 CRITICAL</div>
              </div>
            </div>
          </div>
          <div className="lp-hcard lp-hcard--wide" style={poseVars(3, live)}>
            <div className="lp-panel">
              <div className="lp-panel__top">
                <div>
                  <div className="lp-panel__k">{t('Отчёты по серьёзности')}</div>
                  <div className="lp-panel__d">{t('За эту неделю')}</div>
                </div>
                <span className="lp-tag" style={{ marginLeft: 'auto' }}>25</span>
              </div>
              <div className="lp-bars" aria-hidden="true">{[12, 28, 40, 20].map((n, i) => <i key={i} style={{ flex: n, background: SEV[i] }} />)}</div>
              <div className="lp-brk">
                {rows.map(([k, p, v], i) => (
                  <div className="lp-brk__row" key={k}><i style={{ background: SEV[i] }} /><span>{k}</span><em>{p}</em><b>{v}</b></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- slab visuals: one floating card per verification method ---------- */
function Float({ className = '', style, children }: { className?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  return <div className={`lp-panel ${className}`} style={{ boxShadow: '0 2px 4px rgba(36,36,38,.05), 0 16px 40px rgba(36,36,38,.12)', ...style }}>{children}</div>;
}

function Rows({ rows }: { rows: [string, React.ReactNode, string?][] }) {
  return (
    <div className="lp-brk" style={{ paddingTop: 14 }}>
      {rows.map(([k, v, tone]) => (
        <div className="lp-brk__row" key={k}>
          <span>{k}</span>
          {tone ? <span className={`lp-tag lp-tag--${tone}`} style={{ marginLeft: 'auto' }}>{v}</span> : <b style={{ marginLeft: 'auto', minWidth: 0 }}>{v}</b>}
        </div>
      ))}
    </div>
  );
}

function CodeMock() {
  const { t } = useLocale();
  return (
    <Float>
      <div className="lp-panel__top"><div className="lp-panel__k">{t('Проверка кода')}</div><span className="lp-tag lp-tag--ok" style={{ marginLeft: 'auto' }}>{t('совпал')}</span></div>
      <Rows rows={[[t('Ввод тестера'), <span className="mono">EGG-42</span>], [t('Хранится'), <span className="mono">sha256 9f2c…</span>], [t('Отчёт'), t('принят к проверке'), 'ok']]} />
    </Float>
  );
}

function EmailMock() {
  const { t } = useLocale();
  return (
    <Float>
      <div className="lp-panel__top"><div className="lp-panel__k">{t('Сверка email')}</div><span className="lp-tag" style={{ marginLeft: 'auto' }}>3</span></div>
      <Rows rows={[['alex@devmail.io', t('найден'), 'ok'], ['nadia.qa@proton.me', t('найден'), 'ok'], ['k.test@mail.com', t('нет в базе'), 'warn']]} />
    </Float>
  );
}

function MediaMock() {
  const { t } = useLocale();
  return (
    <Float>
      <div className="lp-panel__top"><div className="lp-panel__k">{t('Запись экрана')}</div><span className="lp-tag lp-tag--stop" style={{ marginLeft: 'auto' }}>{t('Критическая')}</span></div>
      <Rows rows={[[t('Ссылка'), 'loom.com/share/…'], [t('Длительность'), '4:12'], ['Trust Score', '+5', 'ok']]} />
    </Float>
  );
}

function WebhookMock() {
  const { t } = useLocale();
  return (
    <Float>
      <div className="lp-panel__top"><div className="lp-panel__k mono" style={{ fontSize: 12.5 }}>POST /api/v1/verifications</div><span className="lp-tag lp-tag--ok" style={{ marginLeft: 'auto' }}>200</span></div>
      <Rows rows={[['campaignId', <span className="mono">12</span>], ['betadropId', <span className="mono">user_2abc…</span>], ['status', t('выполнение подтверждено'), 'ok']]} />
    </Float>
  );
}

const SLABS: { method: string; icon: Icon; title: string; body: string; foot: string; Art: ComponentType }[] = [
  { method: 'secret_code', icon: KeyRound, title: 'Спрячьте код в продукте, тестер найдёт его сам.', body: 'Код стоит в конце онбординга или в дашборде. Сервер хранит только его хеш и сверяет ввод тестера.', foot: 'Подключение: 0 минут.', Art: CodeMock },
  { method: 'email_match', icon: Mail, title: 'Тестер называет email, вы сверяете в один клик.', body: 'Он указывает адрес, с которым зарегистрировался у вас. Вы видите его рядом с отчётом и проверяете по своей базе.', foot: 'Подключение: 0 минут.', Art: EmailMock },
  { method: 'media', icon: Video, title: 'Запись экрана вместо пересказа.', body: 'Ссылка на Loom, YouTube или скриншоты консоли плюс текстовый разбор. Отчёт с записью даёт тестеру +5 к Trust Score.', foot: 'Подключение: 0 минут.', Art: MediaMock },
  { method: 'webhook', icon: Webhook, title: 'Ваш бэкенд сам подтверждает выполнение.', body: 'Когда тестер дошёл до целевого действия, сервер вызывает POST /api/v1/verifications с его ID. Без вызова отчёт не отправить.', foot: 'Подключение: около 15 минут.', Art: WebhookMock },
];
const SLAB_BG = ['/img/art-1.jpg', '/img/art-2.jpg', '/img/art-3.jpg', '/img/art-4.jpg'];

/* ---------- bento visuals ---------- */
function VaultMock() {
  const { t } = useLocale();
  return (
    <div style={{ width: '100%', paddingBottom: 24 }}>
      <Float style={{ borderColor: 'rgba(36,36,38,.1)' }}>
        <div className="lp-panel__top"><span className="lp-tag lp-tag--ok">{t('Принят')}</span><span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-75)' }}>{t('1 мин назад')}</span></div>
        <div style={{ fontSize: 15, paddingTop: 12 }}>{t('12 месяцев Drift Pro')}</div>
        <div className="mono" style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--pg)', fontSize: 13 }}>DRIFT-PRO-7F2K</div>
      </Float>
    </div>
  );
}

function ScoreMock() {
  const { t } = useLocale();
  const [ref, on] = useInOnce();
  const r = 56;
  const c = 2 * Math.PI * r;
  const score = useCount(82, on);
  return (
    <div ref={ref} style={{ display: 'grid', placeItems: 'center', paddingBottom: 26 }}>
      <svg viewBox="0 0 140 140" style={{ width: 186, height: 186 }} aria-hidden="true">
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(36,36,38,.08)" strokeWidth="8" />
        <circle cx="70" cy="70" r={r} fill="none" stroke="#35363b" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={on ? c * (1 - 0.82) : c} style={{ transition: 'stroke-dashoffset 1.25s cubic-bezier(0.16, 1, 0.3, 1)' }} transform="rotate(-90 70 70)" />
        <text x="70" y="72" textAnchor="middle" fontSize="32" fill="#242426" letterSpacing="-1.2" style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round(score)}</text>
        <text x="70" y="90" textAnchor="middle" fontSize="9.5" fill="rgba(36,36,38,.5)">{t('из 100')}</text>
      </svg>
    </div>
  );
}

function ReportsMock() {
  const { t } = useLocale();
  const [ref, on] = useInOnce();
  const r: [string, string, string, string, number][] = [
    ['#104', t('Утечка памяти при входе'), 'stop', t('Критическая'), 72],
    ['#105', t('Пустой экран после импорта'), 'warn', t('Высокая'), 48],
  ];
  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', paddingBottom: 24 }}>
      {r.map(([no, title, tone, label, hours]) => (
        <Float key={no} style={{ borderColor: 'rgba(36,36,38,.1)' }}>
          <div className="lp-panel__top"><span style={{ fontSize: 12, color: 'var(--ink-75)' }}>{no}</span><span className={`lp-tag lp-tag--${tone}`} style={{ marginLeft: 'auto' }}>{label}</span></div>
          <div style={{ fontSize: 17, letterSpacing: '-0.02em', paddingTop: 8, textAlign: 'left' }}>{title}</div>
          <div className="lp-brk__row" style={{ paddingTop: 8 }}><span style={{ fontSize: 13 }}>{t('Ответить за')}</span><b style={{ marginLeft: 'auto' }}><Count to={hours} on={on} /> {t('ч')}</b></div>
        </Float>
      ))}
    </div>
  );
}

function DeadlineMock() {
  const { t } = useLocale();
  const [ref, on] = useInOnce();
  const side = (label: string, n: number, unit: string) => (
    <Float style={{ flex: '0 1 86px', padding: '12px 10px', minWidth: 0, opacity: 0.6, textAlign: 'center' }}>
      <div style={{ fontSize: 15, letterSpacing: '-0.02em' }}><Count to={n} on={on} />{unit}</div>
      <div style={{ fontSize: 11, color: 'var(--ink-75)', paddingTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
    </Float>
  );
  return (
    <div ref={ref} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', width: '100%', minWidth: 0, paddingBottom: 28, justifyContent: 'center' }}>
      {side(t('заявка'), 1, ' ' + t('мин'))}
      <Float style={{ flex: '1 1 150px', maxWidth: 170, padding: 16, textAlign: 'center', minWidth: 0 }}>
        <div style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 12, background: 'var(--pg)', margin: '0 auto 10px' }}><CalendarClock style={{ width: 18, height: 18, color: 'var(--ink-50)' }} /></div>
        <div style={{ fontSize: 22, letterSpacing: '-0.02em' }}><Count to={48} on={on} /> {t('ч')}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-75)', paddingTop: 2 }}>{t('на отчёт')}</div>
      </Float>
      {side(t('проверка'), 72, ' ' + t('ч'))}
    </div>
  );
}

function StreakMock() {
  const { t } = useLocale();
  return (
    <div style={{ width: '100%', paddingBottom: 24 }}>
      <Float style={{ borderColor: 'rgba(36,36,38,.1)', padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 16 }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 12, background: 'rgba(201,118,74,.14)', color: '#a85a2f', flex: '0 0 auto' }}><Flame style={{ width: 17, height: 17 }} /></span>
          <div style={{ minWidth: 0, textAlign: 'left' }}>
            <div style={{ fontSize: 14 }}>{t('{count} дней подряд', { count: 14 })}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-75)' }}>{t('лучшая серия: {count}', { count: 31 })}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--pg)', fontSize: 13, color: 'var(--ink-75)' }}>
          {t('Заморозок: 1 из 2')}
          <span style={{ marginLeft: 'auto', display: 'grid', placeItems: 'center', width: 24, height: 24, borderRadius: 8, background: 'var(--lime)', color: '#242426' }}><CircleCheck style={{ width: 13, height: 13 }} /></span>
        </div>
      </Float>
    </div>
  );
}

function HeatMock() {
  return <div style={{ width: '100%', paddingBottom: 24 }}><Float><Heat weeks={22} /></Float></div>;
}

const BENTO: { badge: string; icon: Icon; title: string; body: string; Art: ComponentType }[] = [
  { badge: 'Профиль', icon: LayoutDashboard, title: 'Карта активности', body: '52 недели работы тестера одним взглядом, как на GitHub.', Art: HeatMock },
  { badge: 'Хранилище', icon: Gift, title: 'Коды наград', body: 'Код появляется в хранилище, как только отчёт принят.', Art: VaultMock },
  { badge: 'Репутация', icon: Gauge, title: 'Trust Score', body: 'Растёт за принятые отчёты и падает за пропущенные сроки.', Art: ScoreMock },
  { badge: 'Входящие', icon: ListChecks, title: 'Отчёты по серьёзности', body: 'Критические сверху, экспорт в CSV, Jira и GitHub Issues.', Art: ReportsMock },
  { badge: 'Сроки', icon: CalendarClock, title: '48 и 72 часа', body: 'Тестер сдаёт отчёт за 48 часов, фаундер отвечает за 72.', Art: DeadlineMock },
  { badge: 'Серия', icon: Flame, title: 'Серия и заморозки', body: 'За 7 дней подряд даётся заморозка, и пропущенный день не обнуляет серию.', Art: StreakMock },
];
const BENTO_COLS: [number, 'tall' | 'short', 'a' | 'b' | 'c'][][] = [
  [[0, 'tall', 'a'], [4, 'short', 'c']],
  [[1, 'short', 'b'], [3, 'tall', 'a']],
  [[2, 'tall', 'c'], [5, 'short', 'b']],
];

const CATEGORY_ICON: Record<string, Icon> = { DevTools: Code2, 'AI / ML': Bot, Web3: Wallet, FinTech: Coins, Mobile: Smartphone };

/* ---------- the live catalog in the dark band ---------- */
function clock(s: string) {
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' : d.toTimeString().slice(0, 5);
}
function logLine(e: Activity) {
  const [subject, reward] = e.detail.split(' → ');
  return { k: e.event, v: `"${subject}"`, tail: reward ? `-> ${reward}` : '' };
}

function FeedCard({ c: original }: { c: Campaign }) {
  const { t } = useLocale();
  const c = localizeCampaign(original);
  return (
    <Link href={`/app/campaigns/${c.id}`} className="lp-feed__card" data-testid={`card-feed-${c.id}`}>
      <div>
        <div className="lp-feed__title">{c.title}</div>
        <div className="lp-feed__meta">{c.company} · {ago(c.createdAt)}{c.demo ? ` · ${t('демо')}` : ''}</div>
      </div>
      <span className="lp-feed__reward">{c.reward}</span>
      <div className="lp-feed__rows">
        <div className="lp-brk__row"><span>{t('Проверка')}</span><b style={{ marginLeft: 'auto' }}>{methodLabel(c.method)}</b></div>
        <div className="lp-brk__row"><span>{t('Стек')}</span><b style={{ marginLeft: 'auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.tags.slice(0, 3).join(', ') || c.category}</b></div>
        <div className="lp-brk__row"><span>{t('Места')}</span><b style={{ marginLeft: 'auto' }}>{t('{count} / {total} мест', { count: c.slots - c.filledSlots, total: c.slots })}</b></div>
      </div>
    </Link>
  );
}

function LiveCatalog() {
  const { t } = useLocale();
  const [cat, setCat] = useState('');
  const { data, isLoading } = useListCampaigns();
  const activity = useGetActivity({ query: { queryKey: getGetActivityQueryKey(), refetchInterval: 15000 } });
  const open = (data ?? []).filter((c) => c.status === 'active' && c.filledSlots < c.slots && (!cat || c.category === cat)).slice(0, 3);
  const lines = useMemo(() => [...(activity.data ?? [])].slice(0, 3).map((e) => ({ time: clock(e.createdAt), ...logLine(e) })), [activity.data]);
  return (
    <div className="lp-show__glass">
      <div className="lp-feed__tabs">
        <div className="seg" role="tablist">
          {['', ...CATEGORIES].map((c) => <button key={c || 'all'} role="tab" aria-selected={cat === c} data-active={cat === c} onClick={() => setCat(c)} data-testid={`tab-feed-${c || 'all'}`}>{c ? t(c) : t('Все')}</button>)}
        </div>
      </div>
      {isLoading && <div className="lp-feed">{[0, 1, 2].map((i) => <div key={i} className="lp-feed__card" style={{ height: 230 }}><div className="skel" style={{ height: 16, width: '70%' }} /></div>)}</div>}
      {data && open.length === 0 && <div className="lp-feed__empty">{t('В этой категории сейчас нет открытых тестов.')}</div>}
      {open.length > 0 && <div className="lp-feed">{open.map((c) => <FeedCard key={c.id} c={c} />)}</div>}
      {lines.length > 0 && (
        <div className="lp-panel lp-log lp-feed__log" data-testid="terminal-log">
          {lines.map((l, i) => <div key={i} className="lp-log__line"><em>{'> '}[{l.time}] </em><b>{l.k}</b> {l.v} <em>{l.tail}</em></div>)}
        </div>
      )}
    </div>
  );
}

const PLANS = [
  { name: 'Starter', price: '0', note: 'Чтобы проверить первую гипотезу.', live: true, feats: ['1 активная кампания', 'До 15 мест на тест', 'Secret Code и Email Match', 'Ручной просмотр отчётов', 'Обычное место в каталоге'] },
  { name: 'Growth', price: '59', note: 'Для команд, которые тестируют каждый релиз.', live: false, feats: ['До 3 кампаний', 'До 100 мест на тест', 'Все 4 метода, включая Webhook API', 'Таргетинг по ОС, стеку, гео и Trust Score', 'Экспорт CSV, webhooks, Jira'] },
  { name: 'Scale', price: '189', note: 'Для продуктов с большим потоком тестеров.', live: false, feats: ['Без лимита кампаний', 'Без лимита мест', 'Глубокий скрининг и ручной отбор', 'GitHub Issues, Jira, Slack и API', '1 продвижение в топ каталога в месяц'] },
];

export function PricingPlans() {
  const { t } = useLocale();
  const { setRole } = useAppState();
  return (
    <div className="lp-price__grid">
      {PLANS.map((p) => (
        <div className="lp-plan" key={p.name} data-testid={`card-plan-${p.name.toLowerCase()}`}>
          <div className="lp-plan__name">{p.name}</div>
          <p className="lp-plan__note">{t(p.note)}</p>
          <div className="lp-plan__price"><em>$</em>{p.price}<span>/{t('мес')}</span></div>
          <div className="lp-plan__per">{p.live ? t('доступно сейчас') : t('оплата появится позже')}</div>
          {p.live
            ? <Btn to="/app/founder/campaigns/new" onClick={() => setRole('founder')} label={t('Начать бесплатно')} size="wide" />
            : <Btn label={t('Скоро')} variant="quiet" size="wide" disabled />}
          <ul className="lp-plan__feats">
            {p.feats.map((f, j) => <li key={f}>{j === 0 ? <CircleCheck /> : <Plus />}{t(f)}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}

const RAIL: { title: string; body: string; icon: Icon; facts: [string, string][] }[] = [
  { title: 'Стартапам', icon: Target, body: 'Проверенные отчёты от людей, которые читают логи, без ручной раздачи наград.', facts: [['Методы проверки', '4'], ['Мест на кампанию', 'до 15 на Starter'], ['Экспорт', 'CSV, Jira, GitHub']] },
  { title: 'Тестировщикам', icon: Gift, body: 'Доступ к закрытым бетам и награды за работу, которую видно в профиле.', facts: [['Награды', 'лицензии, подписки, кредиты'], ['Срок на отчёт', '48 часов'], ['Профиль', 'карта активности и бейджи']] },
  { title: 'Защита от ботов', icon: ShieldCheck, body: 'Trust Score отсекает случайных участников, а награды дороже $50 доступны только от 80.', facts: [['Старт', '50'], ['Принятый отчёт', '+2 или +5'], ['Пропущенный срок', '-10']] },
  { title: 'API и webhooks', icon: Braces, body: 'Подтверждайте выполнение со своего бэкенда и получайте события о заявках и отчётах.', facts: [['Подпись', 'HMAC-SHA256'], ['Ключей', 'до 5'], ['Подключение', 'около 15 минут']] },
];

const FAQ: { tab: string; qs: [string, string][] }[] = [
  { tab: 'Тестерам', qs: [
    ['Сколько стоит участие?', 'Ничего. Вы подаёте заявку, проходите сценарий и получаете награду за принятый отчёт.'],
    ['Что будет, если я не успею за 48 часов?', 'Заявка закроется, место вернётся в кампанию, а Trust Score снизится на 10.'],
    ['Как поднять Trust Score?', 'Отправляйте подробные отчёты. Принятый отчёт даёт +2, с записью экрана +5.'],
  ] },
  { tab: 'Фаундерам', qs: [
    ['Сколько тестеров можно набрать?', 'На Starter до 15 мест в одной кампании. Тарифы с большими лимитами появятся вместе с оплатой.'],
    ['Что если я не успею проверить отчёт?', 'Через 72 часа отчёт принимается автоматически, и тестер получает код награды.'],
    ['Можно ли отбирать тестеров автоматически?', 'Да. Включите автоодобрение и задайте порог Trust Score. Остальные заявки ждут вашего решения.'],
  ] },
  { tab: 'Награды', qs: [
    ['Какие награды можно выдавать?', 'Любые коды: лицензии, подписки, API-кредиты. Вы загружаете их при создании кампании, по одному на место.'],
    ['Кто видит коды?', 'Только тестер, которому код выдан. Публичное API их не отдаёт.'],
    ['Будут ли выплаты в криптовалюте?', 'Позже. Сейчас награды выдаются кодами.'],
  ] },
];

/** Puts React nodes into a translated template, so word order stays the translator's. */
function fill(template: string, parts: Record<string, React.ReactNode>) {
  return template.split(/\{(\w+)\}/).map((piece, i) => (i % 2 ? <span key={i}>{parts[piece]}</span> : piece));
}

function lastWordHighlighted(text: string, className: string) {
  const words = text.split(/\s+/);
  return <>{words.slice(0, -1).join(' ')} <span className={className}>{words[words.length - 1]}</span></>;
}

export default function Landing() {
  const { t } = useLocale();
  const { setRole } = useAppState();
  const stage = useRef<HTMLDivElement>(null);
  const sayRef = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  useScrollVar(stage, heroMap);
  useScrollVar(sayRef, sayMap);
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(0);
  const [slide, setSlide] = useState(0);
  const { data: stats } = useGetStats();
  const [statsRef, statsOn] = useInOnce<HTMLDivElement>();

  const say = t('Betadrop соединяет стартапы с техническими тестировщиками: тестер проходит ваш сценарий, присылает воспроизводимый отчёт и получает награду только после проверки.');
  const words = say.split(/\s+/);

  const onTrack = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setSlide(max <= 0 ? 0 : Math.round((el.scrollLeft / max) * (RAIL.length - 1)));
  }, []);
  const move = (dir: number) => {
    const el = track.current;
    if (!el) return;
    const card = el.querySelector('.lp-rcard');
    el.scrollBy({ left: dir * (card ? card.getBoundingClientRect().width + 20 : el.clientWidth), behavior: 'smooth' });
  };
  const founder = () => setRole('founder');

  return (
    <div className="lp">
      <MarketingNav />

      {/* ---------- hero ---------- */}
      <header className="lp-hero">
        <div className="lp-shell">
          <div className="lp-hero__head">
            <Rv as="h1" y={48} delay={60} className="lp-d1 lp-hero__title">{t('Инженерный фидбек для софта.')}</Rv>
            <Rv as="p" y={72} delay={120} className="lp-lead lp-hero__lead">{t('Награды и ранний доступ для первых пользователей. Стартапы получают проверенные баг-репорты, тестеры получают лицензии, API-кредиты и профиль, который показывает их работу.')}</Rv>
            <Rv y={96} delay={180} className="lp-hero__cta">
              <Btn to="/app/founder/campaigns/new" onClick={founder} label={t('Запустить кампанию')} size="lg" />
              <Link href="/app/explore" onClick={() => setRole('tester')} className="lp-trust" data-testid="link-hero-explore">
                <div className="lp-trust__row" aria-hidden="true">
                  {[Code2, Bot, Wallet, Smartphone].map((I, i) => <span className="lp-trust__dot" key={i}><I style={{ width: 14, height: 14 }} /></span>)}
                </div>
                <span className="lp-trust__label">{t('Тестируете софт? Откройте каталог тестов.')}</span>
              </Link>
            </Rv>
          </div>
        </div>
        <div className="lp-shell">
          <Rv y={128} delay={240} className="lp-rv--zoom">
            <div className="lp-stage" ref={stage}><AppMock live /></div>
          </Rv>
        </div>
      </header>

      {/* ---------- category strip ---------- */}
      <section className="lp-sec lp-strip" id="categories">
        <div className="lp-shell">
          <Rv className="lp-strip__bar">
            <p ref={statsRef}>
              {stats ? fill(t('Открыто кампаний: {campaigns}. Свободных мест: {slots}.'), {
                campaigns: <b style={{ fontWeight: 500, color: 'var(--ink)' }}><Count to={stats.campaigns} on={statsOn} /></b>,
                slots: <b style={{ fontWeight: 500, color: 'var(--ink)' }}><Count to={stats.availableSlots} on={statsOn} /></b>,
              }) : t('Кампании по направлениям')}
            </p>
            <a className="lp-strip__link" href="#how"><i><ArrowUpRight /></i>{t('Как это работает')}</a>
          </Rv>
          <Rv delay={80} className="lp-strip__panel">
            {CATEGORIES.map((c) => {
              const I = CATEGORY_ICON[c];
              return <Link href="/app/explore" className="lp-strip__item" key={c} style={{ textDecoration: 'none' }}><I /><span>{t(c)}</span></Link>;
            })}
          </Rv>
        </div>
      </section>

      {/* ---------- statement + pinned verification slabs ---------- */}
      <section className="lp-sec lp-stack" id="how">
        <div className="lp-stack__pin">
          <div className="lp-say" ref={sayRef}>
            <div className="lp-shell">
              <h2 className="lp-say__text" style={{ '--n': words.length } as React.CSSProperties}>
                {words.map((w, i) => <span className="lp-say__w" key={i} style={{ '--i': i } as React.CSSProperties}>{w}{i < words.length - 1 ? ' ' : ''}</span>)}
              </h2>
              <div className="lp-say__trio">
                {([[ListChecks, 'Заявка', 'один-три вопроса'], [FlaskConical, 'Отчёт', 'за 48 часов'], [Gift, 'Награда', 'после проверки']] as [Icon, string, string][]).map(([I, b, s]) => (
                  <div className="lp-say__cell" key={b}>
                    <span className="lp-say__ico"><I /></span>
                    <div style={{ minWidth: 0 }}><b>{t(b)}</b><span>{t(s)}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="lp-slabs">
            {SLABS.map((s, i) => (
              <div className={`lp-slab${i % 2 ? ' lp-slab--flip' : ''}`} key={s.method}>
                <div className="lp-shell" style={{ width: '100%' }}>
                  <div className="lp-slab__card">
                    <div className="lp-slab__say">
                      <Eyebrow icon={s.icon} tone="flat">{methodLabel(s.method)}</Eyebrow>
                      <h3 className="lp-d4">{t(s.title)}</h3>
                      <p className="lp-lead">{t(s.body)}</p>
                      <div className="lp-slab__foot"><CircleCheck />{t(s.foot)}</div>
                    </div>
                    <div className="lp-slab__art" style={{ '--art': `url(${import.meta.env.BASE_URL.replace(/\/$/, '')}${SLAB_BG[i]})` } as React.CSSProperties}>
                      <span className="lp-slab__ghost lp-slab__ghost--a" aria-hidden="true" />
                      <span className="lp-slab__ghost lp-slab__ghost--b" aria-hidden="true" />
                      <div className="lp-slab__mock"><s.Art /></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- bento ---------- */}
      <section className="lp-sec lp-sec--pad lp-bento">
        <div className="lp-shell">
          <div className="lp-bento__head">
            <Rv><Eyebrow icon={Layers} tone="flat">{t('Для тестеров и фаундеров')}</Eyebrow></Rv>
            <Rv as="h2" delay={60} className="lp-d3">{t('Всё, что нужно честному бета-тесту')}</Rv>
            <Rv as="p" delay={120} className="lp-lead">{t('Сроки, репутация и награды работают сами, без таблиц и переписки.')}</Rv>
          </div>
          <div className="lp-bento__grid">
            {BENTO_COLS.map((col, ci) => (
              <div className="lp-bento__col" key={ci}>
                {col.map(([i, size, tone], ri) => {
                  const c = BENTO[i];
                  return (
                    <Rv key={c.title} y={32} delay={ci * 90 + ri * 60} className={`lp-bcard lp-bcard--${size} lp-bcard--${tone}`}>
                      <Eyebrow icon={c.icon}>{t(c.badge)}</Eyebrow>
                      <h3 className="lp-d5 lp-bcard__title">{t(c.title)}</h3>
                      <p className="lp-bcard__body">{t(c.body)}</p>
                      <div className="lp-bcard__art"><c.Art /></div>
                    </Rv>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- live catalog, dark band ---------- */}
      <section className="lp-sec lp-show">
        <div className="lp-show__slab lp-dark">
          <div className="lp-show__head">
            <Rv><Eyebrow icon={Tag} tone="dark">{t('Сейчас в каталоге')}</Eyebrow></Rv>
            <Rv as="h2" delay={60} className="lp-d3">{t('Открытые бета-тесты')}</Rv>
            <Rv as="p" delay={120} className="lp-lead lp-lead--dark">{t('Награда, способ проверки и свободные места видны до заявки.')}</Rv>
          </div>
          <Rv delay={160} className="lp-show__frame"><LiveCatalog /></Rv>
          <div className="lp-show__list">
            {([[ListChecks, 'Заявка за минуту', 'Ответьте на вопросы фаундера, и заявка уйдёт.'], [ArrowUpRight, 'Личная ссылка', 'После одобрения продукт открывается по ссылке с вашим betadrop_id.'], [Gift, 'Награда в хранилище', 'Код приходит сразу после того, как отчёт принят.']] as [Icon, string, string][]).map(([I, b, d], i) => (
              <Rv key={b} delay={i * 90} className="lp-show__cell">
                <b><i><I /></i>{t(b)}</b>
                <span>{t(d)}</span>
              </Rv>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- pricing ---------- */}
      <section className="lp-sec lp-sec--pad lp-price" id="pricing">
        <div className="lp-shell">
          <div className="lp-price__head">
            <Rv><Eyebrow icon={Tag} tone="flat">{t('Тарифы')}</Eyebrow></Rv>
            <Rv as="h2" delay={60} className="lp-d3">{lastWordHighlighted(t('Начните бесплатно и растите вместе с продуктом'), 'lp-price__hi')}</Rv>
            <Rv as="p" delay={120} className="lp-lead">{t('Платите за кампании, а не за пользователей. Starter бесплатный и доступен сейчас.')}</Rv>
          </div>
          <Rv delay={120}><PricingPlans /></Rv>
          <Rv delay={120} className="lp-ent">
            <div className="lp-ent__text">
              <Eyebrow icon={KeyRound}>{t('Ранний доступ')}</Eyebrow>
              <h3 className="lp-d4">{t('Все четыре метода уже открыты на Starter')}</h3>
              <p className="lp-lead">{t('Пока оплата не подключена, webhooks, API-ключи и экспорт работают бесплатно. Лимиты Starter (1 кампания, 15 мест) действуют.')}</p>
            </div>
            <Btn to="/docs" label={t('Документация API')} />
          </Rv>
        </div>
      </section>

      {/* ---------- capability rail ---------- */}
      <section className="lp-sec lp-rail">
        <div className="lp-rail__slab lp-dark">
          <div className="lp-rail__head">
            <div>
              <Rv><Eyebrow icon={Target} tone="dark">{t('Две стороны')}</Eyebrow></Rv>
              <Rv as="h2" delay={60} className="lp-d3">{t('Что получает каждая сторона')}</Rv>
              <Rv as="p" delay={120} className="lp-lead lp-lead--dark">{t('Одни и те же правила для тех, кто тестирует, и для тех, кто запускает тест.')}</Rv>
            </div>
          </div>
          <div className="lp-rail__track" ref={track} onScroll={onTrack}>
            {RAIL.map((c, i) => (
              <article className={`lp-rcard lp-rcard--${i % 4}`} key={c.title}>
                <div className="lp-rcard__say">
                  <h3 className="lp-d4">{t(c.title)}</h3>
                  <p>{t(c.body)}</p>
                </div>
                <div className="lp-rcard__facts">
                  <div className="lp-rcard__art" aria-hidden="true"><c.icon /></div>
                  {c.facts.map(([k, v]) => <div className="lp-rcard__fact" key={k}><span>{t(k)}</span><b>{t(v)}</b></div>)}
                </div>
              </article>
            ))}
          </div>
          <div className="lp-rail__foot">
            <div className="lp-rail__nav">
              <button onClick={() => move(-1)} aria-label={t('Назад')}><ArrowLeft /></button>
              <button onClick={() => move(1)} aria-label={t('Дальше')}><Arrow /></button>
            </div>
            <div className="lp-rail__bar" aria-hidden="true">{RAIL.map((c, i) => <i key={c.title} className={i === slide ? 'on' : ''} />)}</div>
          </div>
        </div>
      </section>

      {/* ---------- faq ---------- */}
      <section className="lp-sec lp-sec--pad lp-faq" id="faq">
        <div className="lp-shell">
          <div className="lp-faq__head">
            <Rv><Eyebrow icon={MessagesSquare} tone="flat">{t('Вопросы')}</Eyebrow></Rv>
            <Rv as="h2" delay={60} className="lp-d3">{t('Частые')} <em>{t('вопросы')}</em></Rv>
            <Rv as="p" delay={120} className="lp-lead">{t('Про заявки, проверку и награды. Если ответа нет, загляните в документацию.')}</Rv>
          </div>
          <div className="lp-faq__grid">
            <Rv className="lp-faq__side">
              {FAQ.map((g, i) => <button key={g.tab} className={i === tab ? 'on' : ''} onClick={() => { setTab(i); setOpen(0); }}>{t(g.tab)}</button>)}
            </Rv>
            <div className="lp-faq__list">
              {FAQ[tab].qs.map(([q, a], i) => (
                <Rv key={q} delay={i * 60} className={`lp-q${open === i ? ' on' : ''}`}>
                  <button className="lp-q__btn" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>{t(q)}<i><Plus /></i></button>
                  <div className="lp-q__body"><div><p>{t(a)}</p></div></div>
                </Rv>
              ))}
              <Rv delay={120} className="lp-ask">
                <div className="lp-ask__text">
                  <Eyebrow icon={Braces}>{t('Документация')}</Eyebrow>
                  <h3 className="lp-d4">{t('Подключаете свой бэкенд?')}</h3>
                  <p className="lp-lead">{t('Пример вызова API подтверждений и проверки подписи webhook есть в документации.')}</p>
                </div>
                <Btn to="/docs" label={t('Открыть документацию')} />
              </Rv>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- closing ---------- */}
      <div className="lp-closewrap">
        <section className="lp-close lp-dark">
          <div className="lp-close__head">
            <Rv as="h2" className="lp-d2">{t('Готовы запустить первый бета-тест?')}</Rv>
            <Rv as="p" delay={60} className="lp-lead lp-lead--dark">{t('Опишите продукт, задайте вопросы и загрузите коды наград. Это займёт минут десять.')}</Rv>
            <Rv delay={120}><Btn to="/app/founder/campaigns/new" onClick={founder} label={t('Запустить кампанию')} variant="lime" size="lg" /></Rv>
          </div>
          <Rv delay={160} className="lp-close__stage"><AppMock /></Rv>
        </section>
      </div>

      <MarketingFooter />
    </div>
  );
}
