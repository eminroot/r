import { useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import {
  useListCampaigns,
  getListCampaignsQueryKey,
  useCreateCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
  useListApplications,
  getListApplicationsQueryKey,
  useReviewApplication,
  useListSubmissions,
  getListSubmissionsQueryKey,
  useReviewSubmission,
  useGetDashboard,
  getGetDashboardQueryKey,
  useGetIntegrations,
  getGetIntegrationsQueryKey,
  type Campaign,
  type CampaignInputCategory,
  type CampaignInputMethod,
  type CampaignUpdateStatus,
  type ReviewInputDecision,
} from '@workspace/api-client-react';
import { Page } from '@/components/shell';
import { Empty, ErrorBox, Field, InlineError, Modal, PageHead, SkelRows, Stats, Status } from '@/components/kit';
import { useToast } from '@/hooks/use-toast';
import { CATEGORIES, errMsg, fmtDate, fmtDateTime, invalidateAll, METHODS, methodLabel, severityLabel, timeLeft, useSignedIn } from '@/lib/app';
import { exportCsv, exportJira, githubIssueUrl } from '@/lib/export';
import { useLocale } from '@/lib/i18n';

const MINE = { mine: true };
const FP = { role: 'founder' as const };

function EditModal({ c, onClose }: { c: Campaign; onClose: () => void }) {
  const { t } = useLocale();
  const qc = useQueryClient();
  const { toast } = useToast();
  const upd = useUpdateCampaign();
  const [f, setF] = useState({ title: c.title, description: c.description, instructions: c.instructions });
  const ok = f.title.trim().length >= 3 && f.description.trim().length >= 20 && f.instructions.trim().length >= 10;
  return (
    <Modal open onClose={onClose} title="Изменить кампанию">
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); upd.mutate({ id: c.id, data: { title: f.title.trim(), description: f.description.trim(), instructions: f.instructions.trim() } }, { onSuccess: () => { invalidateAll(qc); toast({ title: t('Изменения сохранены') }); onClose(); } }); }}>
        <Field label="Название"><input className="inp" maxLength={120} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} data-testid="input-edit-title" /></Field>
        <Field label="О продукте" hint="от 20 символов"><textarea className="inp" rows={4} maxLength={5000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} data-testid="input-edit-description" /></Field>
        <Field label="Что нужно сделать" hint="от 10 символов"><textarea className="inp mono text-[13px]" rows={6} maxLength={10000} value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} data-testid="input-edit-instructions" /></Field>
        <p className="meta">{t('Награду, места и способ проверки после запуска изменить нельзя: тестеры уже согласились на эти условия.')}</p>
        <InlineError error={upd.error} />
        <div className="flex gap-2 justify-end"><button type="button" className="btn" onClick={onClose}>{t('Отмена')}</button><button className="btn btn-primary" disabled={!ok || upd.isPending} data-testid="button-save-campaign">{t('Сохранить')}</button></div>
      </form>
    </Modal>
  );
}

export function FounderCampaigns() {
  const { t } = useLocale();
  const { signedIn } = useSignedIn();
  const qc = useQueryClient();
  const { toast } = useToast();
  const list = useListCampaigns(MINE, { query: { enabled: signedIn, queryKey: getListCampaignsQueryKey(MINE), refetchInterval: 30000 } });
  const dash = useGetDashboard({ query: { enabled: signedIn, queryKey: getGetDashboardQueryKey() } });
  const upd = useUpdateCampaign();
  const del = useDeleteCampaign();
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [deleting, setDeleting] = useState<Campaign | null>(null);
  const setStatus = (c: Campaign, status: CampaignUpdateStatus) =>
    upd.mutate({ id: c.id, data: { status } }, { onSuccess: () => { invalidateAll(qc); toast({ title: t(status === 'paused' ? 'Набор приостановлен' : status === 'active' ? 'Набор снова открыт' : 'Кампания завершена') }); }, onError: (e) => toast({ title: t('Не получилось'), description: errMsg(e), variant: 'destructive' }) });
  const own = (list.data ?? []).filter((c) => !c.demo);

  return (
    <Page wide>
      <PageHead title="Кампании" sub="На Starter одна кампания может набирать тестеров одновременно. Пауза закрывает набор, но одобренные тестеры могут сдать отчёт." right={<Link href="/app/founder/campaigns/new" className="btn btn-primary" data-testid="link-new-campaign"><Plus className="w-4 h-4" /> {t('Новая кампания')}</Link>} />
      <Stats loading={dash.isLoading} items={[
        { label: 'Кампаний', value: dash.data?.campaigns ?? 0 },
        { label: 'Заявок всего', value: dash.data?.totalApplications ?? 0 },
        { label: 'Отчётов ждут проверки', value: dash.data?.pendingReviews ?? 0, color: dash.data?.pendingReviews ? 'hsl(var(--streak))' : undefined },
      ]} />
      {list.isLoading && <SkelRows n={3} />}
      {list.error && <ErrorBox error={list.error} retry={() => list.refetch()} />}
      {list.data && own.length === 0 && <Empty title="Кампаний пока нет" hint="Опишите продукт, задайте до трёх вопросов тестерам и загрузите коды наград. Это займёт минут десять." action={<Link href="/app/founder/campaigns/new" className="btn btn-primary btn-sm">{t('Создать кампанию')}</Link>} />}
      {own.length > 0 && (
        <div className="border border-border overflow-x-auto">
          <table className="tbl min-w-[820px]">
            <thead><tr><th>{t('Кампания')}</th><th>{t('Статус')}</th><th>{t('Проверка')}</th><th>{t('Места')}</th><th>{t('Создана')}</th><th /></tr></thead>
            <tbody>
              {own.map((c) => (
                <tr key={c.id} data-testid={`row-campaign-${c.id}`}>
                  <td className="max-w-[320px]"><Link href={`/app/campaigns/${c.id}`} className="font-medium hover:underline">{c.title}</Link><div className="meta truncate">{c.reward}</div></td>
                  <td><Status s={c.status} kind="campaign" /></td>
                  <td className="muted">{methodLabel(c.method)}</td>
                  <td className="num">{c.filledSlots} / {c.slots}</td>
                  <td className="meta">{fmtDate(c.createdAt)}</td>
                  <td>
                    <div className="flex gap-1 justify-end">
                      <button className="btn btn-sm" onClick={() => setEditing(c)} data-testid={`button-edit-${c.id}`}>{t('Изменить')}</button>
                      {c.status === 'active' && <button className="btn btn-sm" disabled={upd.isPending} onClick={() => setStatus(c, 'paused')} data-testid={`button-pause-${c.id}`}>{t('Пауза')}</button>}
                      {c.status !== 'active' && <button className="btn btn-sm" disabled={upd.isPending} onClick={() => setStatus(c, 'active')} data-testid={`button-resume-${c.id}`}>{t('Открыть набор')}</button>}
                      {c.status !== 'completed' && <button className="btn btn-sm" disabled={upd.isPending} onClick={() => setStatus(c, 'completed')} data-testid={`button-complete-${c.id}`}>{t('Завершить')}</button>}
                      <button className="btn btn-sm btn-icon btn-danger" aria-label={t('Удалить')} title={t('Удалить')} onClick={() => setDeleting(c)} data-testid={`button-delete-${c.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <EditModal c={editing} onClose={() => setEditing(null)} />}
      <Modal open={!!deleting} onClose={() => { setDeleting(null); del.reset(); }} title="Удалить кампанию?">
        <p className="t-body">{t('«{title}» исчезнет из каталога насовсем. Удалить можно только кампанию без заявок; если они уже есть, завершите её.', { title: deleting?.title ?? '' })}</p>
        <div className="mt-3"><InlineError error={del.error} /></div>
        <div className="flex gap-2 justify-end mt-5">
          <button className="btn" onClick={() => { setDeleting(null); del.reset(); }}>{t('Отмена')}</button>
          <button className="btn btn-danger" disabled={del.isPending} onClick={() => deleting && del.mutate({ id: deleting.id }, { onSuccess: () => { invalidateAll(qc); toast({ title: t('Кампания удалена') }); setDeleting(null); } })} data-testid="button-confirm-delete">{t('Удалить')}</button>
        </div>
      </Modal>
    </Page>
  );
}

const METHOD_HELP: Record<string, string> = {
  secret_code: 'Спрячьте код в конце сценария. Сервер хранит только его хеш.',
  email_match: 'Тестер пишет email, с которым зарегистрировался. Вы сверяете его с базой при проверке отчёта.',
  media: 'Тестер прикладывает ссылку на запись экрана или скриншоты.',
  webhook: 'Ваш бэкенд вызывает POST /api/v1/verifications, когда тестер выполнил действие. Ключ API выпускается в интеграциях.',
};

export function NewCampaign() {
  const { t } = useLocale();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, nav] = useLocation();
  const create = useCreateCampaign();
  const [f, setF] = useState({
    title: '', company: '', description: '', category: 'DevTools' as CampaignInputCategory, tags: '', reward: '', rewardValue: 0,
    method: 'secret_code' as CampaignInputMethod, slots: 5, instructions: '', productUrl: '', questions: [''], minTrust: 50,
    autoApprove: false, autoApproveTrust: 70, secretCode: '', rewardCodes: '',
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((prev) => ({ ...prev, [k]: v }));
  const codes = f.rewardCodes.split('\n').map((s) => s.trim()).filter(Boolean);
  const tags = f.tags.split(',').map((s) => s.trim()).filter(Boolean);
  const qs = f.questions.map((q) => q.trim());
  const highValue = f.rewardValue > 50;
  const errs: Record<string, string> = {};
  if (f.title.trim().length < 3) errs.title = 'Нужно от 3 символов';
  if (f.company.trim().length < 2) errs.company = 'Нужно от 2 символов';
  if (f.description.trim().length < 20) errs.description = 'Нужно от 20 символов';
  if (f.reward.trim().length < 3) errs.reward = 'Нужно от 3 символов';
  if (f.instructions.trim().length < 10) errs.instructions = 'Нужно от 10 символов';
  if (!/^https?:\/\/\S+$/.test(f.productUrl.trim())) errs.productUrl = 'Ссылка должна начинаться с http:// или https://';
  if (qs.some((q) => q.length < 3)) errs.questions = 'Каждый вопрос от 3 символов';
  if (codes.length < f.slots) errs.rewardCodes = t('Нужно {count} кодов, сейчас {current}', { count: f.slots, current: codes.length });
  if (codes.length > 15) errs.rewardCodes = 'Не больше 15 кодов';
  if (new Set(codes).size !== codes.length) errs.rewardCodes = 'Коды повторяются';
  if (f.method === 'secret_code' && f.secretCode.trim().length < 4) errs.secretCode = 'Нужно от 4 символов';
  if (tags.length > 8) errs.tags = 'Не больше 8 тегов';
  if (!(f.rewardValue >= 0 && f.rewardValue <= 100000)) errs.rewardValue = 'От 0 до 100000';
  const [touched, setTouched] = useState(false);
  const ok = Object.keys(errs).length === 0;
  const e = (k: string) => (touched && errs[k] ? errs[k] : undefined);

  return (
    <Page>
      <PageHead back={{ href: '/app/founder/campaigns', label: 'Кампании' }} title="Новая кампания" sub="Тестеры увидят описание, вопросы и награду. Коды наград загружаются сразу: каждый принятый отчёт получает один код." />
      <form
        noValidate
        className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-8"
        onSubmit={(ev) => {
          ev.preventDefault();
          setTouched(true);
          if (!ok) return;
          create.mutate(
            { data: { title: f.title.trim(), company: f.company.trim(), description: f.description.trim(), category: f.category, tags, reward: f.reward.trim(), rewardValue: f.rewardValue, method: f.method, slots: f.slots, instructions: f.instructions.trim(), productUrl: f.productUrl.trim(), screeningQuestions: qs, minTrust: f.minTrust, autoApprove: f.autoApprove, autoApproveTrust: f.autoApproveTrust, ...(f.method === 'secret_code' ? { secretCode: f.secretCode.trim() } : {}), rewardCodes: codes } },
            { onSuccess: (c) => { invalidateAll(qc); toast({ title: t('Кампания опубликована') }); nav(`/app/campaigns/${c.id}`); } },
          );
        }}
      >
        <div className="flex flex-col gap-10 min-w-0">
          <section className="flex flex-col gap-4">
            <h2 className="t-h3">{t('Продукт')}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Название кампании" error={e('title')}><input className="inp" maxLength={120} value={f.title} onChange={(x) => set('title', x.target.value)} placeholder={t('Проверьте импорт CSV')} data-testid="input-title" /></Field>
              <Field label="Компания" error={e('company')}><input className="inp" maxLength={80} value={f.company} onChange={(x) => set('company', x.target.value)} data-testid="input-company" /></Field>
              <Field label="Категория"><select className="inp" value={f.category} onChange={(x) => set('category', x.target.value as CampaignInputCategory)} data-testid="select-category">{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
              <Field label="Ссылка на продукт" error={e('productUrl')}><input className="inp" inputMode="url" value={f.productUrl} onChange={(x) => set('productUrl', x.target.value)} placeholder="https://" data-testid="input-product-url" /></Field>
            </div>
            <Field label="Теги" hint="через запятую, до 8" error={e('tags')}><input className="inp" value={f.tags} onChange={(x) => set('tags', x.target.value)} placeholder="cli, rust, postgres" data-testid="input-tags" /></Field>
            <Field label="О продукте" error={e('description')}><textarea className="inp" rows={4} maxLength={5000} value={f.description} onChange={(x) => set('description', x.target.value)} data-testid="input-description" /></Field>
            <Field label="Что нужно сделать" hint="шаги сценария" error={e('instructions')}><textarea className="inp mono text-[13px]" rows={6} maxLength={10000} value={f.instructions} onChange={(x) => set('instructions', x.target.value)} placeholder={t('1. Зарегистрируйтесь по ссылке\n2. ...\n3. ...')} data-testid="input-instructions" /></Field>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="t-h3">{t('Вопросы к заявке')}</h2>
            <p className="t-small muted -mt-1">{t('От одного до трёх. Например: ОС, опыт с технологией, конфигурация железа.')}</p>
            {f.questions.map((q, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="num text-[12px] muted w-4">{i + 1}</span>
                <input className="inp" maxLength={250} value={q} onChange={(x) => set('questions', f.questions.map((y, j) => (j === i ? x.target.value : y)))} placeholder={t('С какими базами данных вы работали?')} aria-label={t('Вопрос {count}', { count: i + 1 })} data-testid={`input-question-${i}`} />
                {f.questions.length > 1 && <button type="button" className="btn btn-sm btn-icon" aria-label={t('Удалить вопрос')} onClick={() => set('questions', f.questions.filter((_, j) => j !== i))}><Trash2 className="w-3.5 h-3.5" /></button>}
              </div>
            ))}
            {e('questions') && <span className="text-[12px] text-destructive">{t(e('questions')!)}</span>}
            {f.questions.length < 3 && <button type="button" className="btn btn-sm self-start" onClick={() => set('questions', [...f.questions, ''])} data-testid="button-add-question"><Plus className="w-3.5 h-3.5" /> {t('Добавить вопрос')}</button>}
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="t-h3">{t('Проверка и награда')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border" role="radiogroup" aria-label={t('Способ проверки')}>
              {METHODS.map((m) => (
                <button type="button" role="radio" aria-checked={f.method === m} key={m} onClick={() => set('method', m)} className={`p-3 text-left transition-colors ${f.method === m ? 'bg-foreground text-background' : 'bg-surface hover:bg-muted'}`} data-testid={`button-method-${m}`}>
                  <div className="t-small font-medium">{methodLabel(m)}</div>
                  <div className={`mono text-[11px] mt-0.5 ${f.method === m ? 'opacity-70' : 'muted'}`}>{m}</div>
                </button>
              ))}
            </div>
            <p className="t-small muted">{t(METHOD_HELP[f.method])}{f.method === 'webhook' && <> <Link href="/app/founder/settings/integrations" className="text-primary hover:underline">{t('Открыть интеграции')}</Link></>}</p>
            {f.method === 'secret_code' && <Field label="Секретный код" hint="тестер найдёт его в продукте" error={e('secretCode')}><input className="inp mono" maxLength={120} autoComplete="off" value={f.secretCode} onChange={(x) => set('secretCode', x.target.value)} data-testid="input-secret-code" /></Field>}
            <div className="grid sm:grid-cols-[1fr_160px] gap-4">
              <Field label="Награда" error={e('reward')}><input className="inp" maxLength={150} value={f.reward} onChange={(x) => set('reward', x.target.value)} placeholder={t('12 месяцев Pro')} data-testid="input-reward" /></Field>
              <Field label="Стоимость, $" hint="примерно" error={e('rewardValue')}><input type="number" min={0} className="inp num" value={f.rewardValue} onChange={(x) => set('rewardValue', Number(x.target.value))} data-testid="input-reward-value" /></Field>
            </div>
            <Field label="Коды наград" hint={t('по одному в строке, {count} из {total}', { count: codes.length, total: f.slots })} error={e('rewardCodes')}><textarea className="inp mono text-[13px]" rows={5} value={f.rewardCodes} onChange={(x) => set('rewardCodes', x.target.value)} placeholder={'PRO-7F2K-91XA\nPRO-Q8LM-0C3D'} data-testid="input-reward-codes" /></Field>
          </section>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-16 self-start">
          <div className="panel p-5 flex flex-col gap-5">
            <Field label="Мест" hint="до 15 на Starter">
              <div className="flex items-center gap-3">
                <input type="range" min={1} max={15} value={f.slots} onChange={(x) => set('slots', Number(x.target.value))} className="flex-1 accent-[hsl(var(--primary))]" data-testid="input-slots" />
                <span className="num w-6 text-right">{f.slots}</span>
              </div>
            </Field>
            <Field label="Минимальный Trust Score" hint="0-100">
              <input type="number" min={0} max={100} className="inp num" value={highValue ? Math.max(80, f.minTrust) : f.minTrust} disabled={highValue && f.minTrust < 80} onChange={(x) => set('minTrust', Math.max(0, Math.min(100, Number(x.target.value))))} data-testid="input-min-trust" />
            </Field>
            {highValue && <p className="text-[12px] muted -mt-3">{t('Награда дороже $50: участвовать смогут только тестеры с Trust Score от 80.')}</p>}
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 t-small cursor-pointer"><input type="checkbox" checked={f.autoApprove} onChange={(x) => set('autoApprove', x.target.checked)} className="accent-[hsl(var(--primary))]" data-testid="checkbox-auto-approve" /> {t('Одобрять заявки сразу')}</label>
              {f.autoApprove && (
                <Field label="при Trust Score от">
                  <input type="number" min={0} max={100} className="inp num" value={f.autoApproveTrust} onChange={(x) => set('autoApproveTrust', Math.max(0, Math.min(100, Number(x.target.value))))} data-testid="input-auto-approve-trust" />
                </Field>
              )}
              <p className="text-[12px] muted">{t(f.autoApprove ? 'Остальные заявки ждут вашего решения.' : 'Каждую заявку вы одобряете вручную.')}</p>
            </div>
          </div>
          <div className="panel p-5 flex flex-col gap-3">
            {touched && !ok && <p className="t-small text-destructive">{t('Проверьте поля, отмеченные красным: {count}.', { count: Object.keys(errs).length })}</p>}
            <InlineError error={create.error} />
            <button className="btn btn-primary w-full" disabled={create.isPending} data-testid="button-create-campaign">{t(create.isPending ? 'Публикуем...' : 'Опубликовать')}</button>
            <p className="text-[12px] muted">{t('Тестер получает 48 часов на отчёт, вы 72 часа на проверку. Потом отчёт принимается автоматически.')}</p>
          </div>
        </aside>
      </form>
    </Page>
  );
}

function RejectModal({ title, onClose, onConfirm, pending, error, minLength }: { title: string; onClose: () => void; onConfirm: (r: string) => void; pending: boolean; error: unknown; minLength: number }) {
  const { t } = useLocale();
  const [r, setR] = useState('');
  return (
    <Modal open onClose={onClose} title={title}>
      <Field label="Причина" hint={minLength ? t('от {count} символов, тестер её увидит', { count: minLength }) : 'необязательно'}>
        <textarea className="inp" rows={4} maxLength={2000} value={r} onChange={(e) => setR(e.target.value)} data-testid="input-reason" />
      </Field>
      {minLength > 0 && <p className="meta mt-2">{t('Отклонённый отчёт снижает Trust Score тестера на 10.')}</p>}
      <div className="mt-3"><InlineError error={error} /></div>
      <div className="flex gap-2 justify-end mt-4">
        <button className="btn" onClick={onClose}>{t('Отмена')}</button>
        <button className="btn btn-danger" disabled={pending || r.trim().length < minLength} onClick={() => onConfirm(r.trim())} data-testid="button-confirm-reject">{t('Отклонить')}</button>
      </div>
    </Modal>
  );
}

export function FounderSubmissions() {
  const { t } = useLocale();
  const { signedIn } = useSignedIn();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<'apps' | 'reports'>('apps');
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const campaigns = useListCampaigns(MINE, { query: { enabled: signedIn, queryKey: getListCampaignsQueryKey(MINE) } });
  const apps = useListApplications(FP, { query: { enabled: signedIn, queryKey: getListApplicationsQueryKey(FP), refetchInterval: 30000 } });
  const subs = useListSubmissions(FP, { query: { enabled: signedIn, queryKey: getListSubmissionsQueryKey(FP), refetchInterval: 30000 } });
  const integrations = useGetIntegrations({ query: { enabled: signedIn, queryKey: getGetIntegrationsQueryKey() } });
  const repo = integrations.data?.githubRepo;
  const revA = useReviewApplication();
  const revS = useReviewSubmission();
  const [rejectA, setRejectA] = useState<number | null>(null);
  const [rejectS, setRejectS] = useState<number | null>(null);
  const questions = useMemo(() => new Map((campaigns.data ?? []).map((c) => [c.id, c.screeningQuestions])), [campaigns.data]);
  const done = (message: string) => () => { invalidateAll(qc); toast({ title: t(message) }); setRejectA(null); setRejectS(null); };
  const fail = (e: unknown) => toast({ title: t('Не получилось'), description: errMsg(e), variant: 'destructive' });
  const reviewApp = (id: number, decision: ReviewInputDecision, reason?: string) => revA.mutate({ id, data: { decision, ...(reason ? { reason } : {}) } }, { onSuccess: done(decision === 'approved' ? 'Заявка одобрена. У тестера 48 часов.' : 'Заявка отклонена'), onError: fail });
  const reviewSub = (id: number, decision: ReviewInputDecision, reason?: string) => revS.mutate({ id, data: { decision, ...(reason ? { reason } : {}) } }, { onSuccess: done(decision === 'approved' ? 'Отчёт принят, код награды отправлен тестеру' : 'Отчёт отклонён'), onError: fail });

  const aList = (apps.data ?? []).filter((a) => filter === 'all' || a.status === 'pending');
  const sList = (subs.data ?? []).filter((s) => filter === 'all' || s.status === 'pending');
  const pa = (apps.data ?? []).filter((a) => a.status === 'pending').length;
  const ps = (subs.data ?? []).filter((s) => s.status === 'pending').length;
  const all = subs.data ?? [];

  return (
    <Page wide>
      <PageHead
        title="Входящие"
        sub="Заявки тестеров и их отчёты. На отчёт у вас 72 часа, после этого он принимается автоматически."
        right={<>
          <button className="btn" onClick={() => exportCsv(all)} disabled={!all.length} data-testid="button-export-csv">{t('Экспорт CSV')}</button>
          <button className="btn" onClick={() => exportJira(all)} disabled={!all.length} data-testid="button-export-jira">{t('CSV для Jira')}</button>
        </>}
      />
      <div className="flex flex-wrap gap-3 justify-between mb-5">
        <div className="seg" role="tablist">
          {([['apps', 'Заявки', pa], ['reports', 'Отчёты', ps]] as const).map(([k, l, n]) => (
            <button key={k} role="tab" aria-selected={tab === k} data-active={tab === k} onClick={() => setTab(k)} data-testid={`tab-${k}`}>
              {t(l)} {n > 0 && <span className="num text-[11px] px-1 bg-streak text-white">{n}</span>}
            </button>
          ))}
        </div>
        <div className="seg">
          {(['pending', 'all'] as const).map((k) => <button key={k} data-active={filter === k} onClick={() => setFilter(k)} data-testid={`filter-${k}`}>{t(k === 'pending' ? 'Ждут решения' : 'Все')}</button>)}
        </div>
      </div>

      {tab === 'apps' && (
        <>
          {apps.isLoading && <SkelRows n={4} />}
          {apps.error && <ErrorBox error={apps.error} retry={() => apps.refetch()} />}
          {apps.data && aList.length === 0 && <Empty title={filter === 'pending' ? 'Новых заявок нет' : 'Заявок пока нет'} hint="Заявки появятся здесь, как только тестеры ответят на вопросы кампании." />}
          {aList.length > 0 && (
            <div className="stack">
              {aList.map((a) => {
                const qs = questions.get(a.campaignId) ?? [];
                return (
                  <article key={a.id} className="p-5" data-testid={`row-founder-application-${a.id}`}>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <Link href={`/app/tester/profile/${a.username}`} className="mono font-medium hover:underline">@{a.username}</Link>
                      <span className="num text-[12px]" style={{ color: a.trustScore >= 80 ? 'hsl(var(--live))' : a.trustScore < 40 ? 'hsl(var(--destructive))' : undefined }}>Trust {a.trustScore}</span>
                      <Status s={a.status} />
                      <span className="meta ml-auto">{a.campaignTitle} · {fmtDateTime(a.createdAt)}</span>
                    </div>
                    <dl className="mt-4 flex flex-col gap-3 max-w-3xl">
                      {a.answers.map((ans, i) => (
                        <div key={i}>
                          {qs[i] && <dt className="text-[12px] muted">{qs[i]}</dt>}
                          <dd className="t-body whitespace-pre-wrap">{ans}</dd>
                        </div>
                      ))}
                    </dl>
                    {a.status === 'approved' && (
                      <div className="meta mt-3">
                        {t('Отчёт до {date}', { date: fmtDateTime(a.deadline) })}
                        {a.method === 'webhook' && ` · ${a.verifiedAt ? t('выполнение подтверждено') : t('ждём вызова webhook')}`}
                        {` · betadrop_id=${a.userId}`}
                      </div>
                    )}
                    {a.status === 'pending' && (
                      <div className="flex gap-2 mt-4">
                        <button className="btn btn-sm btn-primary" disabled={revA.isPending} onClick={() => reviewApp(a.id, 'approved')} data-testid={`button-approve-application-${a.id}`}>{t('Одобрить')}</button>
                        <button className="btn btn-sm" onClick={() => setRejectA(a.id)} data-testid={`button-reject-application-${a.id}`}>{t('Отклонить')}</button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'reports' && (
        <>
          {subs.isLoading && <SkelRows n={4} />}
          {subs.error && <ErrorBox error={subs.error} retry={() => subs.refetch()} />}
          {subs.data && sList.length === 0 && <Empty title={filter === 'pending' ? 'Все отчёты проверены' : 'Отчётов пока нет'} hint="Отчёты присылают тестеры с одобренными заявками." />}
          {sList.length > 0 && (
            <div className="stack">
              {sList.map((s) => (
                <article key={s.id} className="p-5" data-testid={`row-founder-submission-${s.id}`}>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="t-h3">{s.title}</span>
                    <span className="tag" style={s.severity === 'critical' || s.severity === 'high' ? { color: 'hsl(var(--destructive))', borderColor: 'currentColor' } : undefined}>{severityLabel(s.severity)}</span>
                    <Status s={s.status} kind="report" />
                  </div>
                  <div className="meta mt-1"><Link href={`/app/tester/profile/${s.username}`} className="hover:underline">@{s.username}</Link> · {s.campaignTitle} · {fmtDateTime(s.createdAt)}</div>
                  <div className="code !whitespace-pre-wrap mt-4 max-h-72 overflow-auto">{s.content}</div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 t-small">
                    {s.accountEmail && <span><span className="muted">{t('Email в продукте')}:</span> <span className="mono">{s.accountEmail}</span></span>}
                    {s.mediaUrl && <a href={s.mediaUrl} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 hover:underline">{t('Запись экрана')} <ExternalLink className="w-3 h-3" /></a>}
                    {s.status === 'pending' && <span className="text-streak">{t('Ответить до {date} (осталось {left})', { date: fmtDateTime(s.reviewDeadline), left: timeLeft(s.reviewDeadline) ?? '' })}</span>}
                    {s.reason && <span><span className="muted">{t('Причина отказа')}:</span> {s.reason}</span>}
                    {repo && <a href={githubIssueUrl(repo, s)} target="_blank" rel="noreferrer" className="muted hover:text-foreground inline-flex items-center gap-1">{t('Создать issue в GitHub')} <ExternalLink className="w-3 h-3" /></a>}
                  </div>
                  {s.status === 'pending' && (
                    <div className="flex gap-2 mt-4">
                      <button className="btn btn-sm btn-primary" disabled={revS.isPending} onClick={() => reviewSub(s.id, 'approved')} data-testid={`button-approve-submission-${s.id}`}>{t('Принять и выдать награду')}</button>
                      <button className="btn btn-sm" onClick={() => setRejectS(s.id)} data-testid={`button-reject-submission-${s.id}`}>{t('Отклонить')}</button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {rejectA !== null && <RejectModal title="Отклонить заявку" minLength={0} pending={revA.isPending} error={revA.error} onClose={() => setRejectA(null)} onConfirm={(r) => reviewApp(rejectA, 'rejected', r)} />}
      {rejectS !== null && <RejectModal title="Отклонить отчёт" minLength={10} pending={revS.isPending} error={revS.error} onClose={() => setRejectS(null)} onConfirm={(r) => reviewSub(rejectS, 'rejected', r)} />}
    </Page>
  );
}
