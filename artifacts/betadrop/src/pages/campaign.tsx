import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import {
  useGetCampaign,
  getGetCampaignQueryKey,
  useGetProfile,
  getGetProfileQueryKey,
  useListApplications,
  getListApplicationsQueryKey,
  useListSubmissions,
  getListSubmissionsQueryKey,
  useApplyCampaign,
  useCreateSubmission,
  type Application,
  type Campaign,
  type SubmissionInputSeverity,
} from '@workspace/api-client-react';
import { Page } from '@/components/shell';
import { DemoTag, ErrorBox, Field, InlineError, SlotBar, Skel, Status } from '@/components/kit';
import { useToast } from '@/hooks/use-toast';
import { fmtDate, fmtDateTime, invalidateAll, methodLabel, SEVERITIES, severityLabel, statusInfo, timeLeft, useSignedIn } from '@/lib/app';
import { localizeCampaign, useLocale } from '@/lib/i18n';

const TP = { role: 'tester' as const };

function ApplyForm({ c }: { c: Campaign }) {
  const { t } = useLocale();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [answers, setAnswers] = useState<string[]>(c.screeningQuestions.map(() => ''));
  const apply = useApplyCampaign();
  const valid = answers.every((a) => a.trim().length >= 2);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        apply.mutate(
          { data: { campaignId: c.id, answers: answers.map((a) => a.trim()) } },
          { onSuccess: (a) => { invalidateAll(qc); toast({ title: t(a.status === 'approved' ? 'Заявка одобрена сразу' : 'Заявка отправлена'), description: t(a.status === 'approved' ? 'У вас 48 часов, чтобы пройти сценарий и отправить отчёт.' : 'Фаундер ответит здесь же. Статус обновится сам.') }); } },
        );
      }}
    >
      {c.screeningQuestions.map((q, i) => (
        <Field key={i} label={q} hint={`${answers[i].length} / 2000`}>
          <textarea className="inp" rows={2} maxLength={2000} value={answers[i]} onChange={(e) => setAnswers(answers.map((a, j) => (j === i ? e.target.value : a)))} data-testid={`input-answer-${i}`} />
        </Field>
      ))}
      <InlineError error={apply.error} />
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" disabled={!valid || apply.isPending} data-testid="button-apply">{t(apply.isPending ? 'Отправляем...' : 'Подать заявку')}</button>
        {c.autoApprove && <span className="t-small muted">{t('С Trust Score от {count} заявка одобряется сразу.', { count: c.autoApproveTrust })}</span>}
      </div>
    </form>
  );
}

function SubmitForm({ app, locked }: { app: Application; locked: boolean }) {
  const { t } = useLocale();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [f, setF] = useState({ title: '', content: '', severity: 'medium' as SubmissionInputSeverity, mediaUrl: '', accountEmail: '', secretCode: '' });
  const create = useCreateSubmission();
  const m = app.method;
  const mediaOk = !f.mediaUrl.trim() || /^https?:\/\/\S+$/.test(f.mediaUrl.trim());
  const proofOk = m === 'secret_code' ? f.secretCode.trim().length > 0 : m === 'email_match' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.accountEmail.trim()) : m === 'media' ? f.mediaUrl.trim().length > 0 : true;
  const valid = f.title.trim().length >= 3 && f.content.trim().length >= 20 && proofOk && mediaOk && !locked;
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate(
          {
            data: {
              applicationId: app.id,
              title: f.title.trim(),
              content: f.content.trim(),
              severity: f.severity,
              ...(f.mediaUrl.trim() ? { mediaUrl: f.mediaUrl.trim() } : {}),
              ...(m === 'secret_code' ? { secretCode: f.secretCode.trim() } : {}),
              ...(m === 'email_match' ? { accountEmail: f.accountEmail.trim() } : {}),
            },
          },
          { onSuccess: () => { invalidateAll(qc); toast({ title: t('Отчёт отправлен'), description: t('Фаундер проверит его в течение 72 часов.') }); } },
        );
      }}
    >
      <div className="grid sm:grid-cols-[1fr_170px] gap-3">
        <Field label="Заголовок">
          <input className="inp" maxLength={200} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder={t('CLI падает при пустом конфиге')} data-testid="input-report-title" />
        </Field>
        <Field label="Серьёзность">
          <select className="inp" value={f.severity} onChange={(e) => setF({ ...f, severity: e.target.value as SubmissionInputSeverity })} data-testid="select-severity">
            {SEVERITIES.map((s) => <option key={s} value={s}>{severityLabel(s)}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Что произошло" hint={t('{count} символов, нужно от 20', { count: f.content.trim().length })}>
        <textarea className="inp mono text-[13px]" rows={8} value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} placeholder={t('Шаги:\n1. ...\nОжидал: ...\nПолучил: ...\nОкружение: ...')} data-testid="input-report-content" />
      </Field>
      {m === 'secret_code' && (
        <Field label="Секретный код из продукта">
          <input className="inp mono" autoComplete="off" value={f.secretCode} onChange={(e) => setF({ ...f, secretCode: e.target.value })} data-testid="input-secret-code" />
        </Field>
      )}
      {m === 'email_match' && (
        <Field label="Email, с которым вы зарегистрировались в продукте">
          <input className="inp" type="email" value={f.accountEmail} onChange={(e) => setF({ ...f, accountEmail: e.target.value })} data-testid="input-account-email" />
        </Field>
      )}
      <Field label={m === 'media' ? 'Ссылка на запись экрана или скриншоты' : 'Ссылка на запись экрана'} hint={m === 'media' ? 'обязательно' : 'необязательно, +5 к Trust Score вместо +2'} error={mediaOk ? undefined : 'Нужна ссылка, начинающаяся с http:// или https://'}>
        <input className="inp" value={f.mediaUrl} onChange={(e) => setF({ ...f, mediaUrl: e.target.value })} placeholder="https://www.loom.com/share/..." aria-invalid={!mediaOk} data-testid="input-media-url" />
      </Field>
      <InlineError error={create.error} />
      <button className="btn btn-primary self-start" disabled={!valid || create.isPending} data-testid="button-submit-report">{t(create.isPending ? 'Отправляем...' : 'Отправить отчёт')}</button>
    </form>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="t-body muted">{children}</p>;
}

function Participation({ c }: { c: Campaign }) {
  const { t } = useLocale();
  const { signedIn } = useSignedIn();
  const { data: profile } = useGetProfile({ query: { enabled: signedIn, queryKey: getGetProfileQueryKey() } });
  const apps = useListApplications(TP, { query: { enabled: signedIn, queryKey: getListApplicationsQueryKey(TP), refetchInterval: 30000 } });
  const subs = useListSubmissions(TP, { query: { enabled: signedIn, queryKey: getListSubmissionsQueryKey(TP), refetchInterval: 30000 } });

  if (c.demo) return <Note>{t('Это демо-кампания. Она показывает, как выглядит тест, и не принимает заявки.')}</Note>;
  if (!signedIn) {
    return (
      <div className="flex flex-col gap-4">
        <Note>{t('Войдите, чтобы ответить на вопросы фаундера и подать заявку.')}</Note>
        <div className="flex gap-2">
          <Link href="/sign-in" className="btn btn-primary">{t('Войти')}</Link>
          <Link href="/sign-up" className="btn">{t('Создать аккаунт')}</Link>
        </div>
      </div>
    );
  }
  if (profile && profile.id === c.ownerId) {
    return (
      <div className="flex flex-col gap-4">
        <Note>{t('Это ваша кампания. Заявки и отчёты приходят во входящие.')}</Note>
        <div className="flex gap-2">
          <Link href="/app/founder/submissions" className="btn btn-primary">{t('Открыть входящие')}</Link>
          <Link href="/app/founder/campaigns" className="btn">{t('Все кампании')}</Link>
        </div>
      </div>
    );
  }
  if (apps.isLoading) return <Skel className="h-24" />;
  if (apps.error) return <ErrorBox error={apps.error} retry={() => apps.refetch()} />;
  const app = (apps.data ?? []).find((a) => a.campaignId === c.id);
  const mine = (subs.data ?? []).filter((s) => app && s.applicationId === app.id);

  if (!app) {
    if (c.status !== 'active') return <Note>{t('Набор закрыт. Статус кампании: {status}.', { status: statusInfo(c.status, 'campaign').label })}</Note>;
    if (c.filledSlots >= c.slots) return <Note>{t('Все места заняты. Если кто-то не успеет сдать отчёт, место освободится.')}</Note>;
    if (profile && profile.trustScore < c.minTrust) return <Note>{t('Нужен Trust Score от {min}, у вас {score}. Он растёт за принятые отчёты.', { min: c.minTrust, score: profile.trustScore })}</Note>;
    return <ApplyForm c={c} />;
  }

  const verifyWait = app.method === 'webhook' && !app.verifiedAt;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Status s={app.status} />
        <span className="meta">{t('заявка от {date}', { date: fmtDate(app.createdAt) })}</span>
      </div>
      {app.status === 'pending' && <Note>{t('Фаундер рассматривает заявку. Ответ появится здесь.')}</Note>}
      {app.status === 'rejected' && <Note>{t('Фаундер отклонил заявку. В каталоге есть другие тесты.')}</Note>}
      {app.status === 'expired' && <Note>{t('Отчёт не пришёл за 48 часов, заявка закрыта. Trust Score снижен на 10.')}</Note>}
      {app.status === 'completed' && <Note>{t('Отчёт принят. Награда ждёт в хранилище.')} <Link href="/app/tester/vault" className="text-primary hover:underline">{t('Открыть награды')}</Link></Note>}
      {app.status === 'approved' && (
        <>
          <ol className="flex flex-col gap-3 t-body">
            <li className="flex gap-3"><span className="num muted">1</span><span>{t('Откройте продукт по личной ссылке, по ней фаундер узнает вас.')}<a href={app.productUrl} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1.5 mono text-[12px] text-primary break-all hover:underline" data-testid="link-personal">{app.productUrl} <ExternalLink className="w-3 h-3 shrink-0" /></a></span></li>
            <li className="flex gap-3"><span className="num muted">2</span><span>{t('Пройдите сценарий из инструкции выше.')}</span></li>
            <li className="flex gap-3"><span className="num muted">3</span><span>{t('Отправьте отчёт до {date}. Осталось {left}.', { date: fmtDateTime(app.deadline), left: timeLeft(app.deadline) ?? '' })}</span></li>
          </ol>
          {app.method === 'webhook' && (
            <div className={`px-4 py-3 t-small rounded-[12px] ${verifyWait ? 'bg-[var(--pg)]' : 'bg-[var(--ok-bg)] text-[var(--ok)]'}`}>
              {verifyWait ? t('Ждём подтверждения от продукта. Оно приходит само, когда вы выполните целевое действие.') : t('Продукт подтвердил выполнение {date}.', { date: fmtDateTime(app.verifiedAt) })}
            </div>
          )}
          <div className="border-t border-border pt-5"><SubmitForm app={app} locked={verifyWait} /></div>
        </>
      )}
      {mine.length > 0 && (
        <div className="stack">
          {mine.map((s) => (
            <div key={s.id} className="px-4 py-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-medium">{s.title}</span>
                <Status s={s.status} kind="report" />
                <span className="meta ml-auto">{fmtDateTime(s.createdAt)}</span>
              </div>
              {s.status === 'pending' && <div className="t-small muted mt-1">{t('Фаундер ответит до {date}. Если не ответит, отчёт примут автоматически.', { date: fmtDateTime(s.reviewDeadline) })}</div>}
              {s.reason && <div className="t-small mt-1">{t('Причина отказа: {reason}', { reason: s.reason })}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CampaignPage() {
  const { t } = useLocale();
  const { id } = useParams<{ id: string }>();
  const cid = Number(id);
  const valid = Number.isInteger(cid) && cid > 0;
  const { data, isLoading, error, refetch } = useGetCampaign(cid, { query: { enabled: valid, queryKey: getGetCampaignQueryKey(cid) } });
  const c = data ? localizeCampaign(data) : undefined;
  const facts: [string, ReactNode][] = c ? [
    ['Награда', c.reward],
    ['Проверка', methodLabel(c.method)],
    ['Места', <SlotBar filled={c.filledSlots} total={c.slots} />],
    ['Мин. Trust Score', <span className="num">{c.minTrust}</span>],
    ['Отбор', c.autoApprove ? t('сразу при Trust Score от {count}', { count: c.autoApproveTrust }) : t('вручную')],
    ['Сроки', t('48 ч на отчёт, 72 ч на проверку')],
    ['Опубликована', fmtDate(c.createdAt)],
  ] : [];
  return (
    <Page>
      <Link href="/app/explore" className="meta hover:text-foreground inline-block mb-5">{'← '}{t('Каталог')}</Link>
      {!valid && <ErrorBox error={{ message: 'Кампания не найдена' }} />}
      {isLoading && <div className="flex flex-col gap-3"><Skel className="h-8 w-1/2" /><Skel className="h-4 w-1/3" /><Skel className="h-48" /></div>}
      {error && <ErrorBox error={error} retry={() => refetch()} />}
      {c && (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-10">
          <div className="flex flex-col gap-10 min-w-0">
            <header>
              <div className="flex gap-3 flex-wrap items-center meta">
                <span>{c.company} · {c.category}</span>
                {c.demo && <DemoTag />}
                {c.status !== 'active' && <Status s={c.status} kind="campaign" />}
              </div>
              <h1 className="t-h1 mt-2" data-testid="text-campaign-title">{c.title}</h1>
              {c.tags.length > 0 && <div className="flex gap-1.5 flex-wrap mt-3">{c.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}</div>}
            </header>
            <section>
              <h2 className="t-h3 mb-2">{t('О продукте')}</h2>
              <p className="t-body whitespace-pre-wrap">{c.description}</p>
            </section>
            <section>
              <h2 className="t-h3 mb-2">{t('Что нужно сделать')}</h2>
              <div className="code !whitespace-pre-wrap">{c.instructions}</div>
            </section>
            <section className="panel p-5">
              <h2 className="t-h3 mb-4">{t('Участие')}</h2>
              <Participation c={c} />
            </section>
          </div>
          <aside className="self-start lg:sticky lg:top-16 flex flex-col gap-3">
            <dl className="stack">
              {facts.map(([k, v]) => (
                <div key={k} className="px-4 py-3 grid grid-cols-[110px_1fr] gap-3 items-center">
                  <dt className="text-[12px] muted">{t(k)}</dt>
                  <dd className="t-small min-w-0 break-words">{v}</dd>
                </div>
              ))}
            </dl>
            {!c.demo && /^https?:\/\//.test(c.productUrl) && (
              <a href={c.productUrl} target="_blank" rel="noreferrer" className="btn w-full" data-testid="link-product">{t('Сайт продукта')} <ExternalLink className="w-3 h-3" /></a>
            )}
          </aside>
        </div>
      )}
    </Page>
  );
}
