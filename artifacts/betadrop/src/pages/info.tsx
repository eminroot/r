import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Copy } from 'lucide-react';
import {
  useHealthCheck,
  useListApiKeys,
  getListApiKeysQueryKey,
  useCreateApiKey,
  useRevokeApiKey,
  useGetIntegrations,
  getGetIntegrationsQueryKey,
  useUpdateIntegrations,
  useTestWebhook,
  useRotateWebhookSecret,
  useListSubmissions,
  getListSubmissionsQueryKey,
  type ApiKeyCreated,
} from '@workspace/api-client-react';
import { Page } from '@/components/shell';
import { ErrorBox, Field, InlineError, Modal, PageHead, SectionHead, Skel, SkelRows } from '@/components/kit';
import { useToast } from '@/hooks/use-toast';
import { errMsg, fmtDate, fmtDateTime, invalidateAll, useSignedIn } from '@/lib/app';
import { exportCsv, exportJira } from '@/lib/export';
import { useLocale } from '@/lib/i18n';

const origin = typeof window === 'undefined' ? '' : window.location.origin;
const API = `${origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/api`;

function CopyText({ text, label = 'Скопировать' }: { text: string; label?: string }) {
  const { t } = useLocale();
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className="btn btn-sm" onClick={() => navigator.clipboard?.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1400); }).catch(() => undefined)}>
      {ok ? <Check className="w-3.5 h-3.5 text-live" /> : <Copy className="w-3.5 h-3.5" />} {t(ok ? 'Скопировано' : label)}
    </button>
  );
}

function Block({ title, sub, children, right }: { title: string; sub?: string; children: ReactNode; right?: ReactNode }) {
  const { t } = useLocale();
  return (
    <section className="grid lg:grid-cols-[260px_minmax(0,1fr)] gap-x-10 gap-y-4 py-10 border-t border-border first:border-t-0 first:pt-0">
      <div>
        <h2 className="t-h3">{t(title)}</h2>
        {sub && <p className="t-small muted mt-1.5">{t(sub)}</p>}
        {right && <div className="mt-3">{right}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function ApiKeys() {
  const { t } = useLocale();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { signedIn } = useSignedIn();
  const keys = useListApiKeys({ query: { enabled: signedIn, queryKey: getListApiKeysQueryKey() } });
  const create = useCreateApiKey();
  const revoke = useRevokeApiKey();
  const [name, setName] = useState('');
  const [created, setCreated] = useState<ApiKeyCreated | null>(null);
  const [revoking, setRevoking] = useState<number | null>(null);
  return (
    <Block title="API-ключи" sub="Ключ нужен вашему бэкенду, чтобы подтверждать выполнение через webhook. Не больше пяти активных ключей.">
      {created && (
        <div className="panel p-4 mb-4" style={{ borderColor: 'hsl(var(--live))' }} data-testid="panel-new-key">
          <div className="t-small font-medium">{t('Ключ «{name}» создан. Сохраните его сейчас: больше мы его не покажем.', { name: created.name })}</div>
          <div className="flex gap-2 items-center mt-3">
            <code className="code flex-1 !py-2 break-all !whitespace-normal" data-testid="text-new-key">{created.token}</code>
            <CopyText text={created.token} />
          </div>
          <button className="btn btn-sm mt-3" onClick={() => setCreated(null)}>{t('Я сохранил ключ')}</button>
        </div>
      )}
      <form className="flex gap-2 mb-4" onSubmit={(e) => { e.preventDefault(); create.mutate({ data: { name: name.trim() } }, { onSuccess: (k) => { setCreated(k); setName(''); invalidateAll(qc); } }); }}>
        <input className="inp max-w-xs" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Название, например production')} aria-label={t('Название ключа')} data-testid="input-key-name" />
        <button className="btn btn-primary" disabled={name.trim().length < 2 || create.isPending} data-testid="button-create-key">{t('Создать ключ')}</button>
      </form>
      <InlineError error={create.error} />
      {keys.isLoading && <SkelRows n={2} h="h-12" />}
      {keys.error && <ErrorBox error={keys.error} retry={() => keys.refetch()} />}
      {keys.data && keys.data.length === 0 && <p className="t-small muted">{t('Активных ключей нет.')}</p>}
      {keys.data && keys.data.length > 0 && (
        <div className="border border-border overflow-x-auto">
          <table className="tbl min-w-[520px]">
            <thead><tr><th>{t('Название')}</th><th>{t('Ключ')}</th><th>{t('Создан')}</th><th>{t('Последний вызов')}</th><th /></tr></thead>
            <tbody>
              {keys.data.map((k) => (
                <tr key={k.id} data-testid={`row-key-${k.id}`}>
                  <td className="font-medium">{k.name}</td>
                  <td className="mono text-[12px] muted">{k.prefix}…</td>
                  <td className="meta">{fmtDate(k.createdAt)}</td>
                  <td className="meta">{k.lastUsedAt ? fmtDateTime(k.lastUsedAt) : t('не использовался')}</td>
                  <td className="r"><button className="btn btn-sm btn-danger" onClick={() => setRevoking(k.id)} data-testid={`button-revoke-${k.id}`}>{t('Отозвать')}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={revoking !== null} onClose={() => setRevoking(null)} title="Отозвать ключ?">
        <p className="t-body">{t('Запросы с этим ключом сразу начнут получать ошибку 401. Отменить это нельзя.')}</p>
        <div className="flex gap-2 justify-end mt-5">
          <button className="btn" onClick={() => setRevoking(null)}>{t('Отмена')}</button>
          <button className="btn btn-danger" disabled={revoke.isPending} onClick={() => revoking !== null && revoke.mutate({ id: revoking }, { onSuccess: () => { setRevoking(null); invalidateAll(qc); toast({ title: t('Ключ отозван') }); }, onError: (e) => toast({ title: t('Не получилось'), description: errMsg(e), variant: 'destructive' }) })} data-testid="button-confirm-revoke">{t('Отозвать')}</button>
        </div>
      </Modal>
    </Block>
  );
}

const EVENTS = ['application.created', 'submission.created', 'submission.approved', 'submission.rejected'];

function Webhook() {
  const { t } = useLocale();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { signedIn } = useSignedIn();
  const cfg = useGetIntegrations({ query: { enabled: signedIn, queryKey: getGetIntegrationsQueryKey() } });
  const save = useUpdateIntegrations();
  const test = useTestWebhook();
  const rotate = useRotateWebhookSecret();
  const [form, setForm] = useState<{ webhookUrl: string; githubRepo: string } | null>(null);
  const [reveal, setReveal] = useState(false);
  useEffect(() => { if (cfg.data && !form) setForm({ webhookUrl: cfg.data.webhookUrl, githubRepo: cfg.data.githubRepo }); }, [cfg.data, form]);
  const d = cfg.data;
  const dirty = !!d && !!form && (form.webhookUrl !== d.webhookUrl || form.githubRepo !== d.githubRepo);
  const delivered = d?.lastDeliveryStatus;
  return (
    <Block title="Webhook" sub="Мы отправляем POST на ваш адрес, когда приходит заявка или отчёт и когда отчёт принят или отклонён. Тело подписано HMAC-SHA256.">
        {cfg.isLoading && <Skel className="h-32" />}
        {cfg.error && <ErrorBox error={cfg.error} retry={() => cfg.refetch()} />}
        {d && form && (
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); save.mutate({ data: { webhookUrl: form.webhookUrl.trim(), githubRepo: form.githubRepo.trim() } }, { onSuccess: (r) => { setForm({ webhookUrl: r.webhookUrl, githubRepo: r.githubRepo }); qc.setQueryData(getGetIntegrationsQueryKey(), r); toast({ title: t('Настройки сохранены') }); } }); }}>
            <Field label="Адрес webhook" hint="только публичный https">
              <input className="inp mono text-[13px]" value={form.webhookUrl} onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })} placeholder="https://api.example.com/betadrop" data-testid="input-webhook-url" />
            </Field>
            <Field label="Репозиторий GitHub для issues" hint="owner/repo">
              <input className="inp mono text-[13px]" value={form.githubRepo} onChange={(e) => setForm({ ...form, githubRepo: e.target.value })} placeholder="acme/app" data-testid="input-github-repo" />
            </Field>
            <InlineError error={save.error} />
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary" disabled={!dirty || save.isPending} data-testid="button-save-integrations">{t('Сохранить')}</button>
              <button type="button" className="btn" disabled={!d.webhookUrl || dirty || test.isPending} onClick={() => test.mutate(undefined, { onSuccess: (r) => qc.setQueryData(getGetIntegrationsQueryKey(), r), onError: (e) => toast({ title: t('Не получилось'), description: errMsg(e), variant: 'destructive' }) })} data-testid="button-test-webhook">{t(test.isPending ? 'Отправляем...' : 'Отправить тестовое событие')}</button>
            </div>
            <div className="stack mt-2">
              <div className="px-4 py-3 grid sm:grid-cols-[140px_minmax(0,1fr)_auto] gap-2 items-center">
                <span className="text-[12px] muted">{t('Секрет подписи')}</span>
                <code className="mono text-[12px] break-all" data-testid="text-webhook-secret">{reveal ? d.webhookSecret : `${d.webhookSecret.slice(0, 10)}${'•'.repeat(16)}`}</code>
                <div className="flex gap-1">
                  <button type="button" className="btn btn-sm" onClick={() => setReveal(!reveal)}>{t(reveal ? 'Скрыть' : 'Показать')}</button>
                  <CopyText text={d.webhookSecret} />
                  <button type="button" className="btn btn-sm" disabled={rotate.isPending} onClick={() => rotate.mutate(undefined, { onSuccess: (r) => { qc.setQueryData(getGetIntegrationsQueryKey(), r); toast({ title: t('Новый секрет создан'), description: t('Старый перестал работать. Обновите его на сервере.') }); } })}>{t('Заменить')}</button>
                </div>
              </div>
              <div className="px-4 py-3 grid sm:grid-cols-[140px_minmax(0,1fr)] gap-2 items-center">
                <span className="text-[12px] muted">{t('Последняя доставка')}</span>
                <span className="t-small" data-testid="text-last-delivery">
                  {d.lastDeliveryAt ? (
                    <>
                      <span className="mono" style={{ color: delivered && delivered >= 200 && delivered < 300 ? 'hsl(var(--live))' : 'hsl(var(--destructive))' }}>{delivered ? `HTTP ${delivered}` : t('нет ответа')}</span>
                      <span className="muted"> · {d.lastDeliveryEvent} · {fmtDateTime(d.lastDeliveryAt)}</span>
                    </>
                  ) : <span className="muted">{t('Событий ещё не было')}</span>}
                </span>
              </div>
              <div className="px-4 py-3 grid sm:grid-cols-[140px_minmax(0,1fr)] gap-2">
                <span className="text-[12px] muted">{t('События')}</span>
                <span className="mono text-[12px]">{EVENTS.join(', ')}</span>
              </div>
            </div>
          </form>
        )}
    </Block>
  );
}

function Exports() {
  const { t } = useLocale();
  const { signedIn } = useSignedIn();
  const FP = { role: 'founder' as const };
  const subs = useListSubmissions(FP, { query: { enabled: signedIn, queryKey: getListSubmissionsQueryKey(FP) } });
  const all = subs.data ?? [];
  const rows: [string, string, ReactNode][] = [
    ['CSV', 'Все отчёты одним файлом.', <button className="btn btn-sm" disabled={!all.length} onClick={() => exportCsv(all)}>{t('Скачать')}</button>],
    ['Jira', 'CSV в формате импорта Jira: Summary, Description, Priority, Labels.', <button className="btn btn-sm" disabled={!all.length} onClick={() => exportJira(all)}>{t('Скачать')}</button>],
    ['GitHub Issues', 'Укажите репозиторий выше, и у каждого отчёта во входящих появится кнопка создания issue.', <Link href="/app/founder/submissions" className="btn btn-sm">{t('Во входящие')}</Link>],
    ['Slack', 'Уведомления в канал появятся позже. Пока можно направить webhook в Slack через свой обработчик.', <span className="tag">{t('скоро')}</span>],
  ];
  return (
    <Block title="Экспорт отчётов" sub={subs.data ? t('Отчётов сейчас: {count}.', { count: all.length }) : undefined}>
      <div className="stack">
        {rows.map(([name, d, action]) => (
          <div key={name} className="px-4 py-3 grid sm:grid-cols-[140px_minmax(0,1fr)_auto] gap-2 items-center">
            <span className="font-medium t-small">{name}</span>
            <span className="t-small muted">{t(d)}</span>
            <span>{action}</span>
          </div>
        ))}
      </div>
    </Block>
  );
}

export function Integrations() {
  return (
    <Page>
      <PageHead title="Интеграции" sub="Подключите BETADROP к своему бэкенду и трекеру задач." right={<Link href="/docs#api" className="btn">API</Link>} />
      <ApiKeys />
      <Webhook />
      <Exports />
    </Page>
  );
}

function Health() {
  const { t } = useLocale();
  const { data, isLoading, error } = useHealthCheck();
  const ok = data?.status === 'ok';
  if (isLoading) return <Skel className="h-5 w-28" />;
  return (
    <span className="inline-flex items-center gap-2 t-small" style={{ color: ok ? 'hsl(var(--live))' : 'hsl(var(--destructive))' }} data-testid="status-health">
      <span className="dot" style={{ background: 'currentColor' }} />
      {error || !ok ? t('API не отвечает') : t('API работает')}
    </span>
  );
}

const verifyExample = `curl -X POST ${API}/v1/verifications \\
  -H "Authorization: Bearer bd_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"campaignId": 12, "betadropId": "user_2abc..."}'

# 200 {"applicationId": 40, "status": "verified", "verifiedAt": "..."}
# 200 {"status": "already_verified", ...}  repeated calls are safe
# 401 key missing or revoked
# 404 no application from this tester in your campaign
# 409 tester is not approved yet, or the campaign uses another method`;

const signatureExample = `import { createHmac, timingSafeEqual } from "node:crypto";

// req.rawBody: the exact bytes received, before JSON parsing
function verify(req, secret) {
  const ts = req.headers["x-betadrop-timestamp"];
  const sig = req.headers["x-betadrop-signature"]; // "sha256=<hex>"
  const expected = "sha256=" + createHmac("sha256", secret).update(\`\${ts}.\${req.rawBody}\`).digest("hex");
  const fresh = Math.abs(Date.now() / 1000 - Number(ts)) < 300;
  return fresh && sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}`;

const payloadExample = `{
  "type": "submission.created",
  "createdAt": "2026-05-04T15:42:01.000Z",
  "data": { "submissionId": 104, "campaignId": 12, "username": "alex_dev",
            "title": "Memory leak on auth flow", "severity": "critical", "mediaUrl": "" }
}`;

function DocSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const { t } = useLocale();
  return (
    <section id={id} className="scroll-mt-20 py-8 border-t border-border first:border-t-0 first:pt-0">
      <h2 className="t-h2 mb-4">{t(title)}</h2>
      <div className="flex flex-col gap-3 t-body max-w-[680px]">{children}</div>
    </section>
  );
}

export function Docs() {
  const { t } = useLocale();
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);
  const toc = [
    ['flow', 'Как проходит тест'],
    ['trust', 'Trust Score, серия, бейджи'],
    ['methods', 'Способы проверки'],
    ['api', 'API подтверждений'],
    ['webhooks', 'Webhooks'],
    ['status', 'Статус'],
    ['rules', 'Правила и споры'],
  ];
  return (
    <Page>
      <PageHead title="Документация" sub="Как устроен цикл теста и как подключить свой бэкенд." />
      <div className="grid md:grid-cols-[200px_minmax(0,1fr)] gap-10">
        <nav className="hidden md:flex flex-col gap-0.5 sticky top-20 self-start">
          {toc.map(([id, label]) => <a key={id} href={`#${id}`} className="t-small muted hover:text-foreground py-1">{t(label)}</a>)}
        </nav>
        <div className="min-w-0">
          <DocSection id="flow" title="Как проходит тест">
            <ol className="flex flex-col gap-2 list-decimal pl-5">
              <li>{t('Заявка. Тестер отвечает на 1-3 вопроса фаундера. Фаундер одобряет вручную или включает автоодобрение для Trust Score от заданного порога.')}</li>
              <li>{t('Выполнение. Одобренный тестер получает личную ссылку на продукт с параметром ?betadrop_id=... и 48 часов на отчёт.')}</li>
              <li>{t('Отчёт. Тестер описывает, что нашёл, и прикладывает доказательство выбранным способом.')}</li>
              <li>{t('Проверка. У фаундера 72 часа. Если он не ответил, отчёт принимается автоматически. Принятый отчёт сразу приносит код награды из пула кампании.')}</li>
            </ol>
            <p className="muted">{t('Если тестер не успел за 48 часов, заявка закрывается, место возвращается в кампанию, Trust Score снижается на 10.')}</p>
          </DocSection>
          <DocSection id="trust" title="Trust Score, серия, бейджи">
            <p>{t('Trust Score от 0 до 100, у нового профиля 50. Принятый отчёт даёт +2, с записью экрана +5. Отклонённый отчёт или пропущенный срок: -10. Кампании с наградой дороже $50 открыты только при Trust Score от 80.')}</p>
            <p>{t('Серия считает дни подряд (UTC), в которые вы подали заявку, отправили отчёт или получили одобрение. За каждые 7 активных дней подряд даётся заморозка, их можно накопить две. Заморозка спасает серию, если вы пропустили день.')}</p>
            <p>{t('Бейджи: FIRST_DROP за первый принятый отчёт, BUG_HUNTER_L1/L2/L3 за 5/25/100 принятых отчётов, DEEP_AUDITOR за 10 отчётов с записью экрана, STREAK_30 и STREAK_100 за серию.')}</p>
          </DocSection>
          <DocSection id="methods" title="Способы проверки">
            <div className="border border-border overflow-x-auto">
              <table className="tbl min-w-[520px]">
                <thead><tr><th>{t('Метод')}</th><th>{t('Что присылает тестер')}</th><th>{t('Подключение')}</th></tr></thead>
                <tbody>
                  <tr><td className="mono text-[12px]">secret_code</td><td>{t('Код, найденный в продукте. Сервер сравнивает хеш.')}</td><td>{t('0 мин')}</td></tr>
                  <tr><td className="mono text-[12px]">email_match</td><td>{t('Email аккаунта в продукте. Фаундер сверяет при проверке.')}</td><td>{t('0 мин')}</td></tr>
                  <tr><td className="mono text-[12px]">media</td><td>{t('Ссылку на запись экрана или скриншоты.')}</td><td>{t('0 мин')}</td></tr>
                  <tr><td className="mono text-[12px]">webhook</td><td>{t('Только отчёт. Выполнение подтверждает ваш бэкенд.')}</td><td>{t('15 мин')}</td></tr>
                </tbody>
              </table>
            </div>
          </DocSection>
          <DocSection id="api" title="API подтверждений">
            <p>{t('Для кампаний с методом webhook. Создайте ключ в интеграциях и вызовите этот адрес, когда тестер выполнил целевое действие. ID тестера приходит в параметре betadrop_id личной ссылки.')}</p>
            <div className="code" data-testid="code-verify">{verifyExample}</div>
          </DocSection>
          <DocSection id="webhooks" title="Webhooks">
            <p>{t('Если в интеграциях указан адрес, мы отправляем на него POST с JSON. Заголовки: X-Betadrop-Event, X-Betadrop-Timestamp и X-Betadrop-Signature. Ответ должен прийти за 5 секунд; повторных попыток пока нет.')}</p>
            <div className="code">{payloadExample}</div>
            <p>{t('Проверка подписи на Node.js:')}</p>
            <div className="code">{signatureExample}</div>
          </DocSection>
          <DocSection id="status" title="Статус">
            <Health />
            <p className="muted">{t('Сроки заявок и отчётов проверяются раз в минуту.')}</p>
          </DocSection>
          <DocSection id="rules" title="Правила и споры">
            <ul className="flex flex-col gap-2 list-disc pl-5">
              <li>{t('Фаундер отклоняет отчёт только с причиной, тестер её видит.')}</li>
              <li>{t('Коды наград видит только тестер, которому они выданы. Публичное API их не отдаёт.')}</li>
              <li>{t('Нельзя тестировать собственные кампании и подавать несколько заявок в одну кампанию.')}</li>
              <li>{t('Арбитраж спорных отчётов администрацией появится позже. Пока спор решается напрямую с фаундером.')}</li>
            </ul>
            <p><Link href="/app/explore" className="text-primary hover:underline">{t('Перейти в каталог')}</Link></p>
          </DocSection>
        </div>
      </div>
    </Page>
  );
}
