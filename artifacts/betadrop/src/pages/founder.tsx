import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Download, Pause, Pencil, Play, Plus, Trash2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
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
  type Campaign,
  type CampaignInputCategory,
  type CampaignInputMethod,
  type CampaignUpdateStatus,
  type ReviewInputDecision,
} from '@workspace/api-client-react';
import { Page } from '@/components/shell';
import { Empty, ErrorBox, Field, InlineError, Modal, PageHead, Skel, SkelRows, Stat, Status } from '@/components/kit';
import { useToast } from '@/hooks/use-toast';
import { APP_STATUS, CATEGORIES, errMsg, fmtDate, fmtDateTime, invalidateAll, METHOD_LABEL, useSignedIn } from '@/lib/app';
import { useLocale } from '@/lib/i18n';
import { severitySource } from '@/lib/locales/workspace';

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
    <Modal open onClose={onClose} title={t('Редактировать #{id}', { id: c.id })}>
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); upd.mutate({ id: c.id, data: f }, { onSuccess: () => { invalidateAll(qc); toast({ title: t('Кампания обновлена') }); onClose(); } }); }}>
        <Field label="Название"><input className="inp" maxLength={120} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} data-testid="input-edit-title" /></Field>
        <Field label="Описание" hint="мин. 20"><textarea className="inp" rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} data-testid="input-edit-description" /></Field>
        <Field label="Инструкции" hint="мин. 10"><textarea className="inp mono text-[12px]" rows={5} value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} data-testid="input-edit-instructions" /></Field>
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
    upd.mutate({ id: c.id, data: { status } }, { onSuccess: () => { invalidateAll(qc); toast({ title: t(status === 'paused' ? 'Кампания на паузе' : status === 'active' ? 'Кампания активна' : 'Кампания завершена') }); }, onError: (e) => toast({ title: t('Ошибка'), description: errMsg(e), variant: 'destructive' }) });
  const own = (list.data ?? []).filter((c) => !c.demo);

  return (
    <Page wide>
      <PageHead k="фаундер / кампании" title="Ваши кампании" sub="Пауза останавливает приём заявок. Удаление необратимо." right={<Link href="/app/founder/campaigns/new" className="btn btn-primary" data-testid="link-new-campaign"><Plus className="w-3.5 h-3.5" /> {t('Новая кампания')}</Link>} />
      <div className="grid grid-cols-3 gap-px bg-border border border-border mb-6">
        {dash.isLoading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-surface p-4"><Skel className="h-6 w-12" /></div>) : dash.data && (
          <>
            <Stat k="кампании" v={dash.data.campaigns} />
            <Stat k="заявок всего" v={dash.data.totalApplications} accent="hsl(var(--primary))" />
            <Stat k="ждут ревью" v={dash.data.pendingReviews} accent="hsl(var(--streak))" />
          </>
        )}
      </div>
      {list.isLoading && <SkelRows n={4} />}
      {list.error && <ErrorBox error={list.error} retry={() => list.refetch()} />}
      {list.data && own.length === 0 && <Empty title="Кампаний нет" hint="Создайте первую кампанию: 1–15 слотов, коды наград и скрининг." action={<Link href="/app/founder/campaigns/new" className="btn btn-primary btn-sm">{t('Создать')}</Link>} />}
      {own.length > 0 && (
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="bg-background border-b border-border text-left">
                {['кампания', 'статус', 'верификация', 'слоты', 'создана', ''].map((h) => <th key={h} className="label-k font-normal px-4 py-2">{t(h)}</th>)}
              </tr>
            </thead>
            <tbody>
              {own.map((c) => (
                <tr key={c.id} className="bg-surface border-b border-border last:border-0 row-hover" data-testid={`row-campaign-${c.id}`}>
                  <td className="px-4 py-3"><Link href={`/app/campaigns/${c.id}`} className="font-medium hover:text-primary">{c.title}</Link><div className="meta">{c.category} / {c.reward}</div></td>
                  <td className="px-4 py-3"><Status s={c.status} /></td>
                  <td className="px-4 py-3 meta">{METHOD_LABEL[c.method]}</td>
                  <td className="px-4 py-3 mono text-xs tabular-nums">{c.filledSlots}/{c.slots}</td>
                  <td className="px-4 py-3 meta">{fmtDate(c.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button className="btn btn-sm" onClick={() => setEditing(c)} data-testid={`button-edit-${c.id}`}><Pencil className="w-3 h-3" /></button>
                      {c.status === 'active' && <button className="btn btn-sm" disabled={upd.isPending} onClick={() => setStatus(c, 'paused')} data-testid={`button-pause-${c.id}`}><Pause className="w-3 h-3" /> {t('Пауза')}</button>}
                      {c.status === 'paused' && <button className="btn btn-sm" disabled={upd.isPending} onClick={() => setStatus(c, 'active')} data-testid={`button-resume-${c.id}`}><Play className="w-3 h-3" /> {t('Запустить')}</button>}
                      {c.status !== 'completed' && <button className="btn btn-sm" disabled={upd.isPending} onClick={() => setStatus(c, 'completed')} data-testid={`button-complete-${c.id}`}>{t('Завершить')}</button>}
                      <button className="btn btn-sm btn-danger" onClick={() => setDeleting(c)} data-testid={`button-delete-${c.id}`}><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <EditModal c={editing} onClose={() => setEditing(null)} />}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Удалить кампанию">
        <p className="text-sm">{t('Кампания «{title}» будет удалена вместе со связанными данными.', { title: deleting?.title ?? '' })}</p>
        <InlineError error={del.error} />
        <div className="flex gap-2 justify-end mt-4">
          <button className="btn" onClick={() => setDeleting(null)}>{t('Отмена')}</button>
          <button className="btn btn-danger" disabled={del.isPending} onClick={() => deleting && del.mutate({ id: deleting.id }, { onSuccess: () => { invalidateAll(qc); toast({ title: t('Кампания удалена') }); setDeleting(null); } })} data-testid="button-confirm-delete">{t('Удалить')}</button>
        </div>
      </Modal>
    </Page>
  );
}

export function NewCampaign() {
  const { t } = useLocale();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, nav] = useLocation();
  const create = useCreateCampaign();
  const [f, setF] = useState({
    title: '', company: '', description: '', category: 'DevTools' as CampaignInputCategory, tags: '', reward: '',
    method: 'secret_code' as CampaignInputMethod, slots: 5, instructions: '', productUrl: '', questions: [''], minTrust: 50,
    autoApprove: false, secretCode: '', rewardCodes: '',
  });
  const codes = f.rewardCodes.split('\n').map((s) => s.trim()).filter(Boolean);
  const tags = f.tags.split(',').map((s) => s.trim()).filter(Boolean);
  const qs = f.questions.map((q) => q.trim());
  const errs: Record<string, string> = {};
  if (f.title.trim().length < 3) errs.title = 'мин. 3 символа';
  if (f.company.trim().length < 2) errs.company = 'мин. 2 символа';
  if (f.description.trim().length < 20) errs.description = 'мин. 20 символов';
  if (f.reward.trim().length < 3) errs.reward = 'мин. 3 символа';
  if (f.instructions.trim().length < 10) errs.instructions = 'мин. 10 символов';
  if (!/^https?:\/\/\S+$/.test(f.productUrl.trim())) errs.productUrl = 'нужен http(s) URL';
  if (!(f.slots >= 1 && f.slots <= 15)) errs.slots = '1–15';
  if (!(f.minTrust >= 0 && f.minTrust <= 100)) errs.minTrust = '0–100';
  if (qs.some((q) => q.length < 3)) errs.questions = 'каждый вопрос мин. 3 символа';
  if (codes.length < f.slots) errs.rewardCodes = t('нужно не меньше {count} кодов, сейчас {current}', { count: f.slots, current: codes.length });
  if (codes.length > 15) errs.rewardCodes = 'максимум 15 кодов';
  if (new Set(codes).size !== codes.length) errs.rewardCodes = 'коды должны быть уникальными';
  if (f.method === 'secret_code' && f.secretCode.trim().length < 4) errs.secretCode = 'не менее 4 символов';
  if (tags.length > 8) errs.tags = 'максимум 8 тегов';
  const [touched, setTouched] = useState(false);
  const ok = Object.keys(errs).length === 0;
  const e = (k: string) => (touched && errs[k] ? t(errs[k]) : undefined);

  return (
    <Page>
      <PageHead k="фаундер / новая кампания" title="Создать кампанию" sub="Коды наград загружаются заранее: каждый одобренный отчёт получает один код." />
      <form
        className="grid lg:grid-cols-[1fr_300px] gap-6"
        onSubmit={(ev) => {
          ev.preventDefault();
          setTouched(true);
          if (!ok) return;
          create.mutate(
            { data: { title: f.title.trim(), company: f.company.trim(), description: f.description.trim(), category: f.category, tags, reward: f.reward.trim(), method: f.method, slots: f.slots, instructions: f.instructions.trim(), productUrl: f.productUrl.trim(), screeningQuestions: qs, minTrust: f.minTrust, autoApprove: f.autoApprove, ...(f.method === 'secret_code' ? { secretCode: f.secretCode.trim() } : {}), rewardCodes: codes } },
            { onSuccess: (c) => { invalidateAll(qc); toast({ title: t('Кампания опубликована') }); nav(`/app/campaigns/${c.id}`); } },
          );
        }}
      >
        <div className="flex flex-col gap-6">
          <section className="panel p-5 flex flex-col gap-4">
            <div className="label-k">{t('01 / продукт')}</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Название кампании" error={e('title')}><input className="inp" maxLength={120} value={f.title} onChange={(x) => setF({ ...f, title: x.target.value })} data-testid="input-title" /></Field>
              <Field label="Компания" error={e('company')}><input className="inp" maxLength={80} value={f.company} onChange={(x) => setF({ ...f, company: x.target.value })} data-testid="input-company" /></Field>
              <Field label="Категория"><select className="inp" value={f.category} onChange={(x) => setF({ ...f, category: x.target.value as CampaignInputCategory })} data-testid="select-category">{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
              <Field label="URL продукта" error={e('productUrl')}><input className="inp" value={f.productUrl} onChange={(x) => setF({ ...f, productUrl: x.target.value })} placeholder="https://" data-testid="input-product-url" /></Field>
            </div>
            <Field label="Теги" hint="через запятую, до 8" error={e('tags')}><input className="inp" value={f.tags} onChange={(x) => setF({ ...f, tags: x.target.value })} placeholder="cli, rust, postgres" data-testid="input-tags" /></Field>
            <Field label="Описание" error={e('description')}><textarea className="inp" rows={4} maxLength={5000} value={f.description} onChange={(x) => setF({ ...f, description: x.target.value })} data-testid="input-description" /></Field>
            <Field label="Инструкции для тестера" error={e('instructions')}><textarea className="inp mono text-[12px]" rows={6} maxLength={10000} value={f.instructions} onChange={(x) => setF({ ...f, instructions: x.target.value })} data-testid="input-instructions" /></Field>
          </section>
          <section className="panel p-5 flex flex-col gap-4">
            <div className="label-k">{t('02 / скрининг')}</div>
            {f.questions.map((q, i) => (
              <div key={i} className="flex gap-2">
                <span className="mono text-xs text-muted-foreground pt-2 w-4">{i + 1}</span>
                <input className="inp" maxLength={250} value={q} onChange={(x) => setF({ ...f, questions: f.questions.map((y, j) => (j === i ? x.target.value : y)) })} placeholder={t('Какой у вас опыт с ...?')} data-testid={`input-question-${i}`} />
                {f.questions.length > 1 && <button type="button" className="btn btn-sm h-8" onClick={() => setF({ ...f, questions: f.questions.filter((_, j) => j !== i) })}><Trash2 className="w-3 h-3" /></button>}
              </div>
            ))}
            {e('questions') && <span className="text-[11px] mono text-destructive">{e('questions')}</span>}
            {f.questions.length < 3 && <button type="button" className="btn btn-sm self-start" onClick={() => setF({ ...f, questions: [...f.questions, ''] })} data-testid="button-add-question"><Plus className="w-3 h-3" /> {t('Вопрос')}</button>}
          </section>
          <section className="panel p-5 flex flex-col gap-4">
            <div className="label-k">{t('03 / верификация и награды')}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border">
              {(['secret_code', 'email_match', 'media'] as CampaignInputMethod[]).map((m) => (
                <button type="button" key={m} onClick={() => setF({ ...f, method: m })} className={`p-3 text-left transition-colors ${f.method === m ? 'bg-accent' : 'bg-surface hover:bg-muted'}`} data-testid={`button-method-${m}`}>
                  <div className="mono text-[11px]" style={{ color: f.method === m ? 'hsl(var(--primary))' : undefined }}>{m}</div>
                  <div className="text-xs mt-1">{METHOD_LABEL[m]}</div>
                </button>
              ))}
              <div className="p-3 bg-background opacity-60 cursor-not-allowed"><div className="mono text-[11px]">webhook</div><div className="text-xs mt-1">{t('не подключено')}</div></div>
            </div>
            {f.method === 'secret_code' && <Field label="Секретный код" hint="тестер найдёт его в продукте" error={e('secretCode')}><input className="inp mono" maxLength={120} value={f.secretCode} onChange={(x) => setF({ ...f, secretCode: x.target.value })} data-testid="input-secret-code" /></Field>}
            <Field label="Награда" error={e('reward')}><input className="inp" maxLength={150} value={f.reward} onChange={(x) => setF({ ...f, reward: x.target.value })} placeholder={t('Pro-лицензия на 12 месяцев')} data-testid="input-reward" /></Field>
            <Field label="Коды наград" hint={t('по одному в строке / {count} шт.', { count: codes.length })} error={e('rewardCodes')}><textarea className="inp mono text-[12px]" rows={5} value={f.rewardCodes} onChange={(x) => setF({ ...f, rewardCodes: x.target.value })} data-testid="input-reward-codes" /></Field>
          </section>
        </div>
        <aside className="flex flex-col gap-4 lg:sticky lg:top-16 self-start">
          <div className="panel p-5 flex flex-col gap-4">
            <Field label="Слоты" hint="1–15" error={e('slots')}>
              <div className="flex items-center gap-3">
                <input type="range" min={1} max={15} value={f.slots} onChange={(x) => setF({ ...f, slots: Number(x.target.value) })} className="flex-1 accent-[hsl(var(--primary))]" data-testid="input-slots" />
                <span className="mono text-sm w-6 text-right tabular-nums">{f.slots}</span>
              </div>
            </Field>
            <Field label="Мин. trust score" hint="0–100" error={e('minTrust')}><input type="number" min={0} max={100} className="inp mono" value={f.minTrust} onChange={(x) => setF({ ...f, minTrust: Number(x.target.value) })} data-testid="input-min-trust" /></Field>
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={f.autoApprove} onChange={(x) => setF({ ...f, autoApprove: x.target.checked })} className="accent-[hsl(var(--primary))]" data-testid="checkbox-auto-approve" /> {t('Автоодобрение заявок')}</label>
          </div>
          <div className="panel p-4 flex flex-col gap-2">
            <div className="label-k">{t('проверка')}</div>
            <div className="meta">{ok ? <span className="text-live">{t('все поля валидны')}</span> : t('{count} полей требуют внимания', { count: Object.keys(errs).length })}</div>
            <InlineError error={create.error} />
            <button className="btn btn-primary w-full" disabled={create.isPending} data-testid="button-create-campaign">{t(create.isPending ? 'Публикация...' : 'Опубликовать')}</button>
          </div>
        </aside>
      </form>
    </Page>
  );
}

function ReasonModal({ title, onClose, onConfirm, pending, error, requireReason }: { title: string; onClose: () => void; onConfirm: (r: string) => void; pending: boolean; error: unknown; requireReason: boolean }) {
  const { t } = useLocale();
  const [r, setR] = useState('');
  return (
    <Modal open onClose={onClose} title={title}>
      <Field label="Причина" hint={requireReason ? 'обязательно' : 'необязательно'}><textarea className="inp" rows={4} maxLength={2000} value={r} onChange={(e) => setR(e.target.value)} data-testid="input-reason" /></Field>
      <div className="mt-3"><InlineError error={error} /></div>
      <div className="flex gap-2 justify-end mt-4">
        <button className="btn" onClick={onClose}>{t('Отмена')}</button>
        <button className="btn btn-danger" disabled={pending || (requireReason && r.trim().length < 3)} onClick={() => onConfirm(r.trim())} data-testid="button-confirm-reject">{t('Отклонить')}</button>
      </div>
    </Modal>
  );
}

function csvEscape(v: string) {
  const value = String(v ?? '');
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function FounderSubmissions() {
  const { t } = useLocale();
  const { signedIn } = useSignedIn();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<'apps' | 'reports'>('apps');
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const apps = useListApplications(FP, { query: { enabled: signedIn, queryKey: getListApplicationsQueryKey(FP), refetchInterval: 30000 } });
  const subs = useListSubmissions(FP, { query: { enabled: signedIn, queryKey: getListSubmissionsQueryKey(FP), refetchInterval: 30000 } });
  const revA = useReviewApplication();
  const revS = useReviewSubmission();
  const [rejectA, setRejectA] = useState<number | null>(null);
  const [rejectS, setRejectS] = useState<number | null>(null);
  const done = (message: string) => () => { invalidateAll(qc); toast({ title: t(message) }); setRejectA(null); setRejectS(null); };
  const errT = (e: unknown) => toast({ title: t('Ошибка'), description: errMsg(e), variant: 'destructive' });
  const reviewApp = (id: number, decision: ReviewInputDecision, reason?: string) => revA.mutate({ id, data: { decision, ...(reason ? { reason } : {}) } }, { onSuccess: done(decision === 'approved' ? 'Заявка одобрена' : 'Заявка отклонена'), onError: errT });
  const reviewSub = (id: number, decision: ReviewInputDecision, reason?: string) => revS.mutate({ id, data: { decision, ...(reason ? { reason } : {}) } }, { onSuccess: done(decision === 'approved' ? 'Отчёт одобрен, награда выдана' : 'Отчёт отклонён'), onError: errT });

  const exportCsv = () => {
    const rows = subs.data ?? [];
    const head = ['ID', 'Кампания', 'Тестер', 'Заголовок отчёта', 'Серьёзность', 'Статус', 'Причина', 'Email аккаунта в продукте', 'Ссылка на запись или скриншот', 'Дата создания', 'Содержание'].map((key) => csvEscape(t(key)));
    const body = rows.map((s) => [s.id, s.campaignTitle, s.username, s.title, t(severitySource[s.severity] ?? s.severity), APP_STATUS[s.status]?.label ?? s.status, s.reason, s.accountEmail, s.mediaUrl, fmtDateTime(s.createdAt), s.content].map((v) => csvEscape(String(v))).join(','));
    const blob = new Blob(['\uFEFF' + [head.join(','), ...body].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `betadrop-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const aList = (apps.data ?? []).filter((a) => filter === 'all' || a.status === 'pending');
  const sList = (subs.data ?? []).filter((s) => filter === 'all' || s.status === 'pending');
  const pa = (apps.data ?? []).filter((a) => a.status === 'pending').length;
  const ps = (subs.data ?? []).filter((s) => s.status === 'pending').length;

  return (
    <Page wide>
      <PageHead k="фаундер / ревью" title="Заявки и отчёты" right={<button className="btn" onClick={exportCsv} disabled={!subs.data?.length} data-testid="button-export-csv"><Download className="w-3.5 h-3.5" /> {t('Экспорт CSV')}</button>} />
      <div className="flex flex-wrap gap-3 justify-between mb-4">
        <div className="flex border border-border">
          {([['apps', 'Заявки', pa], ['reports', 'Отчёты', ps]] as const).map(([k, l, n]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 h-8 text-sm flex items-center gap-2 transition-colors ${tab === k ? 'bg-foreground text-background' : 'bg-surface hover:bg-muted'}`} data-testid={`tab-${k}`}>
              {t(l)} {n > 0 && <span className="mono text-[10px] px-1 bg-streak text-white">{n}</span>}
            </button>
          ))}
        </div>
        <div className="flex border border-border mono text-[11px]">
          {(['pending', 'all'] as const).map((k) => <button key={k} onClick={() => setFilter(k)} className={`px-3 h-8 ${filter === k ? 'bg-accent text-accent-foreground' : 'bg-surface text-muted-foreground'}`} data-testid={`filter-${k}`}>{t(k === 'pending' ? 'ожидают' : 'все')}</button>)}
        </div>
      </div>

      {tab === 'apps' && (
        <>
          {apps.isLoading && <SkelRows n={4} />}
          {apps.error && <ErrorBox error={apps.error} retry={() => apps.refetch()} />}
          {apps.data && aList.length === 0 && <Empty title={filter === 'pending' ? 'Нет заявок на рассмотрении' : 'Заявок нет'} hint="Новые заявки появятся здесь автоматически." />}
          {aList.length > 0 && (
            <div className="flex flex-col gap-px bg-border border border-border">
              {aList.map((a) => (
                <div key={a.id} className="bg-surface p-4 fade-up" data-testid={`row-founder-application-${a.id}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mono text-sm font-medium">@{a.username}</span>
                    <span className="meta">→ {a.campaignTitle}</span>
                    <Status s={a.status} />
                    <span className="meta ml-auto">{fmtDateTime(a.createdAt)}</span>
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    {a.answers.map((ans, i) => <div key={i} className="text-[13px] border-l-2 border-primary/50 pl-3 whitespace-pre-wrap">{ans}</div>)}
                  </div>
                  {a.status === 'pending' && (
                    <div className="flex gap-2 mt-4">
                      <button className="btn btn-sm btn-primary" disabled={revA.isPending} onClick={() => reviewApp(a.id, 'approved')} data-testid={`button-approve-application-${a.id}`}><CheckCircle2 className="w-3 h-3" /> {t('Одобрить')}</button>
                      <button className="btn btn-sm btn-danger" onClick={() => setRejectA(a.id)} data-testid={`button-reject-application-${a.id}`}><XCircle className="w-3 h-3" /> {t('Отклонить')}</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'reports' && (
        <>
          {subs.isLoading && <SkelRows n={4} />}
          {subs.error && <ErrorBox error={subs.error} retry={() => subs.refetch()} />}
          {subs.data && sList.length === 0 && <Empty title={filter === 'pending' ? 'Нет отчётов на проверке' : 'Отчётов нет'} hint="Отчёты присылают тестеры с одобренными заявками." />}
          {sList.length > 0 && (
            <div className="flex flex-col gap-px bg-border border border-border">
              {sList.map((s) => (
                <div key={s.id} className="bg-surface p-4 fade-up" data-testid={`row-founder-submission-${s.id}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{s.title}</span>
                    <span className="tag" style={s.severity === 'critical' || s.severity === 'high' ? { color: 'hsl(var(--destructive))', borderColor: 'currentColor' } : undefined}>{t(severitySource[s.severity] ?? s.severity)}</span>
                    <Status s={s.status} />
                    <span className="meta ml-auto">@{s.username} / {s.campaignTitle} / {fmtDateTime(s.createdAt)}</span>
                  </div>
                  <pre className="mono text-[12px] whitespace-pre-wrap mt-3 p-3 bg-background border border-border max-h-64 overflow-auto">{s.content}</pre>
                  <div className="flex flex-wrap gap-4 mt-2 meta">
                    {s.accountEmail && <span>{t('Эл. почта')}: <span className="text-foreground">{s.accountEmail}</span></span>}
                    {s.mediaUrl && <a href={s.mediaUrl} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1">{t('медиа')} <ExternalLink className="w-3 h-3" /></a>}
                    {s.status === 'pending' && s.reviewDeadline && <span className="text-streak">{t('проверить до {date}', { date: fmtDateTime(s.reviewDeadline) })}</span>}
                    {s.reason && <span>{t('причина: {reason}', { reason: s.reason })}</span>}
                  </div>
                  {s.status === 'pending' && (
                    <div className="flex gap-2 mt-4">
                      <button className="btn btn-sm btn-primary" disabled={revS.isPending} onClick={() => reviewSub(s.id, 'approved')} data-testid={`button-approve-submission-${s.id}`}><CheckCircle2 className="w-3 h-3" /> {t('Одобрить и выдать награду')}</button>
                      <button className="btn btn-sm btn-danger" onClick={() => setRejectS(s.id)} data-testid={`button-reject-submission-${s.id}`}><XCircle className="w-3 h-3" /> {t('Отклонить')}</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {rejectA !== null && <ReasonModal title="Отклонить заявку" requireReason={false} pending={revA.isPending} error={revA.error} onClose={() => setRejectA(null)} onConfirm={(r) => reviewApp(rejectA, 'rejected', r)} />}
      {rejectS !== null && <ReasonModal title="Отклонить отчёт" requireReason pending={revS.isPending} error={revS.error} onClose={() => setRejectS(null)} onConfirm={(r) => reviewSub(rejectS, 'rejected', r)} />}
    </Page>
  );
}
