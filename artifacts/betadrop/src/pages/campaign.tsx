import { useState } from 'react';
import { Link, useParams } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, Lock, Send } from 'lucide-react';
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
import { ErrorBox, Field, InlineError, Skel, Status } from '@/components/kit';
import { useToast } from '@/hooks/use-toast';
import { APP_STATUS, fmtDate, fmtDateTime, invalidateAll, METHOD_LABEL, timeLeft, useSignedIn } from '@/lib/app';
import { localizeCampaign, useLocale } from '@/lib/i18n';

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
          { onSuccess: () => { invalidateAll(qc); toast({ title: t('Заявка отправлена'), description: t(c.autoApprove ? 'Кампания с автоодобрением.' : 'Фаундер рассмотрит её вручную.') }); } },
        );
      }}
    >
      {c.screeningQuestions.map((q, i) => (
        <Field key={i} label={`${i + 1}. ${q}`} hint={`${answers[i].length}/2000`}>
          <textarea className="inp" rows={3} maxLength={2000} value={answers[i]} onChange={(e) => setAnswers(answers.map((a, j) => (j === i ? e.target.value : a)))} data-testid={`input-answer-${i}`} />
        </Field>
      ))}
      <InlineError error={apply.error} />
      <button className="btn btn-primary self-start" disabled={!valid || apply.isPending} data-testid="button-apply">
        <Send className="w-3.5 h-3.5" /> {t(apply.isPending ? 'Отправка...' : 'Отправить заявку')}
      </button>
    </form>
  );
}

function SubmitForm({ app }: { app: Application }) {
  const { t } = useLocale();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [f, setF] = useState({ title: '', content: '', severity: 'medium' as SubmissionInputSeverity, mediaUrl: '', accountEmail: '', secretCode: '' });
  const create = useCreateSubmission();
  const m = app.method;
  const proofOk = m === 'secret_code' ? f.secretCode.trim().length > 0 : m === 'email_match' ? /.+@.+\..+/.test(f.accountEmail) : m === 'media' ? /^https?:\/\//.test(f.mediaUrl) : true;
  const valid = f.title.trim().length >= 3 && f.content.trim().length >= 20 && proofOk;
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
              ...(m === 'secret_code' ? { secretCode: f.secretCode.trim() } : {}),
              ...(m === 'email_match' ? { accountEmail: f.accountEmail.trim() } : {}),
              ...(m === 'media' ? { mediaUrl: f.mediaUrl.trim() } : {}),
            },
          },
          { onSuccess: () => { invalidateAll(qc); toast({ title: t('Отчёт отправлен'), description: t('Ожидает проверки фаундером.') }); } },
        );
      }}
    >
      <div className="grid sm:grid-cols-[1fr_160px] gap-3">
        <Field label="Заголовок отчёта">
          <input className="inp" maxLength={200} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder={t('CLI падает при пустом конфиге')} data-testid="input-report-title" />
        </Field>
        <Field label="Серьёзность">
          <select className="inp" value={f.severity} onChange={(e) => setF({ ...f, severity: e.target.value as SubmissionInputSeverity })} data-testid="select-severity">
            <option value="low">{t('низкая')}</option>
            <option value="medium">{t('средняя')}</option>
            <option value="high">{t('высокая')}</option>
            <option value="critical">{t('критическая')}</option>
          </select>
        </Field>
      </div>
      <Field label="Содержание" hint={t('{count} / мин. 20', { count: f.content.length })}>
        <textarea className="inp mono text-[12px]" rows={9} value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} placeholder={t('Шаги воспроизведения:\n1. ...\nОжидалось: ...\nФактически: ...\nОкружение: ...')} data-testid="input-report-content" />
      </Field>
      {m === 'secret_code' && (
        <Field label="Секретный код из продукта">
          <input className="inp mono" value={f.secretCode} onChange={(e) => setF({ ...f, secretCode: e.target.value })} data-testid="input-secret-code" />
        </Field>
      )}
      {m === 'email_match' && (
        <Field label="Email аккаунта в продукте">
          <input className="inp" type="email" value={f.accountEmail} onChange={(e) => setF({ ...f, accountEmail: e.target.value })} data-testid="input-account-email" />
        </Field>
      )}
      {m === 'media' && (
        <Field label="Ссылка на запись или скриншот" hint="http(s)://">
          <input className="inp" value={f.mediaUrl} onChange={(e) => setF({ ...f, mediaUrl: e.target.value })} data-testid="input-media-url" />
        </Field>
      )}
      <InlineError error={create.error} />
      <button className="btn btn-primary self-start" disabled={!valid || create.isPending} data-testid="button-submit-report">
        <Send className="w-3.5 h-3.5" /> {t(create.isPending ? 'Отправка...' : 'Отправить отчёт')}
      </button>
    </form>
  );
}

function ActionPanel({ c }: { c: Campaign }) {
  const { t } = useLocale();
  const { signedIn } = useSignedIn();
  const { data: profile } = useGetProfile({ query: { enabled: signedIn, queryKey: getGetProfileQueryKey() } });
  const tp = { role: 'tester' as const };
  const apps = useListApplications(tp, { query: { enabled: signedIn, queryKey: getListApplicationsQueryKey(tp), refetchInterval: 30000 } });
  const subs = useListSubmissions(tp, { query: { enabled: signedIn, queryKey: getListSubmissionsQueryKey(tp), refetchInterval: 30000 } });

  if (c.demo) {
    return (
      <div className="flex gap-3 items-start">
        <Lock className="w-4 h-4 text-streak mt-0.5" />
        <div>
          <div className="text-sm font-medium">{t('Демо-кампания')}</div>
          <p className="meta mt-1">{t('Показывает формат кампании. Заявки на демо-кампании не принимаются.')}</p>
        </div>
      </div>
    );
  }
  if (!signedIn) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{t('Войдите, чтобы пройти скрининг и подать заявку.')}</p>
        <div className="flex gap-2">
          <Link href="/sign-in" className="btn btn-primary">{t('Войти')}</Link>
          <Link href="/sign-up" className="btn">{t('Регистрация')}</Link>
        </div>
      </div>
    );
  }
  if (profile && profile.id === c.ownerId) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm">{t('Это ваша кампания.')}</p>
        <div className="flex gap-2">
          <Link href="/app/founder/campaigns" className="btn">{t('Управление')}</Link>
          <Link href="/app/founder/submissions" className="btn btn-primary">{t('Заявки и отчёты')}</Link>
        </div>
      </div>
    );
  }
  if (apps.isLoading) return <Skel className="h-24" />;
  if (apps.error) return <ErrorBox error={apps.error} retry={() => apps.refetch()} />;
  const app = (apps.data ?? []).find((a) => a.campaignId === c.id);
  const mySubs = (subs.data ?? []).filter((s) => app && s.applicationId === app.id);

  if (!app) {
    if (c.status !== 'active') return <p className="text-sm text-muted-foreground">{t('Кампания не принимает заявки (статус: {status}).', { status: APP_STATUS[c.status]?.label ?? c.status })}</p>;
    if (c.filledSlots >= c.slots) return <p className="text-sm text-muted-foreground">{t('Все слоты заняты.')}</p>;
    if (profile && profile.trustScore < c.minTrust)
      return <p className="text-sm">{t('Нужен trust score не ниже {min}. Ваш: {score}.', { min: c.minTrust, score: profile.trustScore })}</p>;
    return <ApplyForm c={c} />;
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Status s={app.status} />
        <span className="meta">{t('заявка #{id} / {date}', { id: app.id, date: fmtDate(app.createdAt) })}</span>
        {app.deadline && <span className="meta text-streak">{t('дедлайн {date} ({left})', { date: fmtDateTime(app.deadline), left: timeLeft(app.deadline) ?? '—' })}</span>}
      </div>
      {app.status === 'pending' && <p className="text-sm text-muted-foreground">{t('Фаундер рассматривает заявку. Статус обновляется автоматически.')}</p>}
      {app.status === 'rejected' && <p className="text-sm text-muted-foreground">{t('Заявка отклонена.')}</p>}
      {app.status === 'approved' && <SubmitForm app={app} />}
      {mySubs.length > 0 && (
        <div className="flex flex-col gap-px bg-border border border-border">
          {mySubs.map((s) => (
            <div key={s.id} className="bg-surface p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{s.title}</span>
                <Status s={s.status} />
                <span className="meta ml-auto">{fmtDateTime(s.createdAt)}</span>
              </div>
              {s.reason && <div className="meta mt-1.5">{t('причина: {reason}', { reason: s.reason })}</div>}
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
  const { data, isLoading, error, refetch } = useGetCampaign(cid, { query: { enabled: Number.isFinite(cid), queryKey: getGetCampaignQueryKey(cid) } });
  const c = data ? localizeCampaign(data) : undefined;
  return (
    <Page>
      <Link href="/app/explore" className="meta inline-flex items-center gap-1 hover:text-foreground mb-5"><ArrowLeft className="w-3 h-3" /> {t('каталог')}</Link>
      {isLoading && <div className="flex flex-col gap-3"><Skel className="h-8 w-1/2" /><Skel className="h-4 w-1/3" /><Skel className="h-48" /></div>}
      {error && <ErrorBox error={error} retry={() => refetch()} />}
      {c && (
        <div className="grid lg:grid-cols-[1fr_340px] gap-6 fade-up">
          <div className="flex flex-col gap-6 min-w-0">
            <div>
              <div className="flex gap-2 flex-wrap items-center">
                <span className="label-k">{c.company} / {c.category}</span>
                {c.demo && <span className="tag" style={{ color: 'hsl(var(--streak))', borderColor: 'currentColor' }}>{t('Демо-кампания')}</span>}
                <Status s={c.status} />
              </div>
              <h1 className="text-3xl font-semibold tracking-tight mt-2" data-testid="text-campaign-title">{c.title}</h1>
              <div className="flex gap-1.5 flex-wrap mt-3">{c.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>
            </div>
            <section className="panel p-5">
              <div className="label-k mb-2">{t('описание')}</div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{c.description}</p>
            </section>
            <section className="panel p-5">
              <div className="label-k mb-2">{t('инструкции')}</div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap mono text-[12.5px]">{c.instructions}</p>
            </section>
            <section className="panel p-5">
              <div className="label-k mb-4">{t(c.demo ? 'участие' : 'скрининг и отчёт')}</div>
              <ActionPanel c={c} />
            </section>
          </div>
          <aside className="flex flex-col gap-px bg-border border border-border self-start lg:sticky lg:top-16">
            {[
              ['награда', c.reward],
              ['верификация', METHOD_LABEL[c.method] ?? c.method],
              ['слоты', t('{count} свободно из {total}', { count: c.slots - c.filledSlots, total: c.slots })],
              ['мин. trust', String(c.minTrust)],
              ['одобрение', t(c.autoApprove ? 'автоматическое' : 'ручное')],
              ['опубликована', fmtDate(c.createdAt)],
            ].map(([k, v]) => (
              <div key={k} className="bg-surface px-4 py-3 flex justify-between gap-4">
                <span className="label-k">{t(k)}</span>
                <span className="text-[13px] text-right">{v}</span>
              </div>
            ))}
            <div className="bg-surface p-4">
              <div className="flex gap-px mb-3">
                {Array.from({ length: c.slots }).map((_, j) => (
                  <span key={j} className="flex-1 h-2" style={{ background: j < c.filledSlots ? 'hsl(var(--border))' : 'hsl(var(--live))' }} />
                ))}
              </div>
              {/^https?:\/\//.test(c.productUrl) && (
                <a href={c.productUrl} target="_blank" rel="noreferrer" className="btn w-full" data-testid="link-product">{t('Открыть продукт')} <ExternalLink className="w-3 h-3" /></a>
              )}
            </div>
          </aside>
        </div>
      )}
    </Page>
  );
}
