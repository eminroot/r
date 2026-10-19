import { Link } from 'wouter';
import { useHealthCheck } from '@workspace/api-client-react';
import { Page } from '@/components/shell';
import { PageHead, Skel } from '@/components/kit';

function Health() {
  const { data, isLoading, error } = useHealthCheck();
  const ok = data?.status === 'ok';
  if (isLoading) return <Skel className="h-5 w-28" />;
  return (
    <span className="tag" style={{ color: ok ? 'hsl(var(--live))' : 'hsl(var(--destructive))', borderColor: 'currentColor' }} data-testid="status-health">
      <span className={`dot ${ok ? 'live-pulse' : ''}`} style={{ background: 'currentColor' }} />
      API {error ? 'недоступен' : data?.status ?? '—'}
    </span>
  );
}

const INTEGRATIONS = [
  { k: 'clerk', t: 'Аутентификация (Clerk)', d: 'Вход и регистрация пользователей.', s: 'подключено' },
  { k: 'secret_code', t: 'Верификация: секретный код', d: 'Сверка кода, спрятанного в продукте.', s: 'доступно' },
  { k: 'email_match', t: 'Верификация: email', d: 'Тестер указывает email аккаунта; сверка вручную.', s: 'доступно' },
  { k: 'media', t: 'Верификация: медиа', d: 'Ссылка на запись экрана или скриншот.', s: 'доступно' },
  { k: 'webhook', t: 'Webhook API', d: 'Автоматическая верификация событий из вашего бэкенда.', s: 'запланировано' },
  { k: 'payments', t: 'Платежи', d: 'Оплата тарифов Growth и Scale.', s: 'запланировано' },
  { k: 'slack', t: 'Уведомления в Slack / Telegram', d: 'Оповещения о новых заявках и отчётах.', s: 'запланировано' },
];

export function Integrations() {
  return (
    <Page>
      <PageHead k="фаундер / настройки" title="Интеграции" sub="Честный статус: что работает в текущей сборке, а что только запланировано." right={<Health />} />
      <div className="flex flex-col gap-px bg-border border border-border">
        {INTEGRATIONS.map((i) => {
          const live = i.s !== 'запланировано';
          return (
            <div key={i.k} className="bg-surface px-4 py-4 grid md:grid-cols-[1fr_auto] gap-3 items-center" data-testid={`row-integration-${i.k}`}>
              <div>
                <div className="flex items-center gap-2"><span className="text-sm font-medium">{i.t}</span><span className="mono text-[11px] text-muted-foreground">{i.k}</span></div>
                <div className="text-[13px] text-muted-foreground mt-0.5">{i.d}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="tag" style={{ color: live ? 'hsl(var(--live))' : 'hsl(var(--streak))', borderColor: 'currentColor' }}>{i.s}</span>
                {!live && <button className="btn btn-sm" disabled>Подключить</button>}
              </div>
            </div>
          );
        })}
      </div>
    </Page>
  );
}

const SECTIONS = [
  { id: 'lifecycle', t: 'Жизненный цикл', body: 'Кампания (active / paused / completed) → заявка тестера (pending → approved / rejected) → отчёт (pending → approved / rejected) → награда в хранилище. Одобренная заявка получает дедлайн на отправку отчёта; просроченные заявки получают статус expired.' },
  { id: 'campaigns', t: 'Создание кампании', body: 'Обязательные поля: название (3–120), компания (2–80), описание (20–5000), категория (DevTools, AI / ML, Web3, FinTech, Mobile), награда (3–150), метод верификации, слоты 1–15, инструкции (10–10000), URL продукта http(s), 1–3 вопроса скрининга, минимальный trust score 0–100. Количество кодов наград должно быть не меньше количества слотов. Для secret_code обязателен секретный код.' },
  { id: 'verification', t: 'Верификация', body: 'secret_code — тестер вводит код, найденный в продукте. email_match — тестер указывает email аккаунта, фаундер сверяет его. media — тестер прикладывает http(s)-ссылку на запись или скриншот. webhook — внешний API пока не подключён.' },
  { id: 'review', t: 'Ревью', body: 'Фаундер одобряет или отклоняет заявки и отчёты. Отклонение отчёта требует причину, она видна тестеру. Одобрение отчёта выдаёт тестеру один код награды. Отчёты экспортируются в CSV.' },
  { id: 'reputation', t: 'Репутация', body: 'Новый профиль начинает с trust score 50, XP 0 и серией 0. Значения меняются только от реальных событий: одобренных и отклонённых отчётов. Календарь вклада показывает 52 недели действий.' },
  { id: 'api', t: 'API', body: 'Ядро доступно через внутренний REST API (/api/campaigns, /api/applications, /api/submissions, /api/rewards, /api/profile, /api/dashboard). Публичный внешний webhook API не подключён: ключей и подписанных событий пока нет.' },
];

export function Docs() {
  return (
    <Page>
      <PageHead k="документация" title="Ядро BETADROP" sub="Что уже работает в текущей сборке." right={<Health />} />
      <div className="grid md:grid-cols-[200px_1fr] gap-8">
        <nav className="flex md:flex-col gap-1 md:sticky md:top-16 self-start overflow-x-auto">
          {SECTIONS.map((s, i) => <a key={s.id} href={`#${s.id}`} className="mono text-[12px] text-muted-foreground hover:text-foreground px-2 py-1 border-l border-border hover:border-primary whitespace-nowrap">{String(i + 1).padStart(2, '0')} {s.t}</a>)}
        </nav>
        <div className="flex flex-col gap-px bg-border border border-border">
          {SECTIONS.map((s, i) => (
            <section key={s.id} id={s.id} className="bg-surface p-6 scroll-mt-16">
              <div className="label-k">{String(i + 1).padStart(2, '0')}</div>
              <h2 className="text-lg font-semibold mt-1">{s.t}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground mt-2">{s.body}</p>
            </section>
          ))}
          <section className="bg-surface p-6">
            <pre className="mono text-[12px] bg-background border border-border p-4 overflow-x-auto">{`POST /api/applications
{ "campaignId": 12, "answers": ["..."] }

POST /api/submissions
{ "applicationId": 40, "title": "...", "content": "...",
  "severity": "high", "secretCode": "..." }`}</pre>
            <Link href="/app/explore" className="btn btn-sm mt-4">Перейти в каталог</Link>
          </section>
        </div>
      </div>
    </Page>
  );
}
