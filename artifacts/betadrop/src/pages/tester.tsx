import { useMemo, useState } from 'react';
import { Link, Redirect, useLocation, useParams } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Pencil } from 'lucide-react';
import {
  useGetDashboard,
  getGetDashboardQueryKey,
  useListApplications,
  getListApplicationsQueryKey,
  useListSubmissions,
  getListSubmissionsQueryKey,
  useListRewards,
  getListRewardsQueryKey,
  useClaimReward,
  useGetProfile,
  getGetProfileQueryKey,
  useGetPublicProfile,
  getGetPublicProfileQueryKey,
  useUpdateProfile,
  type Contribution,
  type Profile,
  type PublicProfile,
} from '@workspace/api-client-react';
import { Page } from '@/components/shell';
import { Empty, ErrorBox, Field, InlineError, PageHead, SectionHead, Skel, SkelRows, Stats, Status } from '@/components/kit';
import { useToast } from '@/hooks/use-toast';
import { errMsg, fmtDate, fmtDateTime, invalidateAll, methodLabel, severityLabel, timeLeft, useSignedIn } from '@/lib/app';
import { useLocale } from '@/lib/i18n';

const TP = { role: 'tester' as const };

export function TesterDashboard() {
  const { t } = useLocale();
  const { signedIn } = useSignedIn();
  const dash = useGetDashboard({ query: { enabled: signedIn, queryKey: getGetDashboardQueryKey(), refetchInterval: 30000 } });
  const apps = useListApplications(TP, { query: { enabled: signedIn, queryKey: getListApplicationsQueryKey(TP), refetchInterval: 30000 } });
  const subs = useListSubmissions(TP, { query: { enabled: signedIn, queryKey: getListSubmissionsQueryKey(TP), refetchInterval: 30000 } });
  const d = dash.data;
  const todo = useMemo(() => (apps.data ?? []).filter((a) => a.status === 'approved').sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? '')), [apps.data]);
  const rest = (apps.data ?? []).filter((a) => a.status !== 'approved');

  return (
    <Page wide>
      <PageHead title="Мои тесты" sub="Заявки, сроки и отчёты. Страница обновляется сама." right={<Link href="/app/explore" className="btn btn-primary">{t('Найти тест')}</Link>} />
      {dash.error && <div className="mb-6"><ErrorBox error={dash.error} retry={() => dash.refetch()} /></div>}
      <Stats loading={dash.isLoading} items={[
        { label: 'В работе', value: d?.activeTests ?? 0, testid: 'stat-active' },
        { label: 'Ждут решения', value: d?.pendingApplications ?? 0 },
        { label: 'Завершено', value: d?.completedTests ?? 0 },
        { label: 'Наград', value: d?.rewards ?? 0 },
        { label: 'Серия', value: t('{count} дн.', { count: d?.profile.streak ?? 0 }), color: 'hsl(var(--streak))', hint: d ? t('заморозок: {count} из 2', { count: d.profile.freezes }) : undefined },
      ]} />

      {todo.length > 0 && (
        <section className="mb-10">
          <SectionHead title="Нужен отчёт" count={todo.length} />
          <div className="stack">
            {todo.map((a) => (
              <Link key={a.id} href={`/app/campaigns/${a.campaignId}`} className="row-hover px-4 py-3 grid md:grid-cols-[minmax(0,1fr)_auto] gap-2 items-center" data-testid={`row-todo-${a.id}`}>
                <div className="min-w-0">
                  <div className="font-medium truncate">{a.campaignTitle}</div>
                  <div className="meta truncate">{a.reward} · {methodLabel(a.method)}</div>
                </div>
                <div className="t-small text-streak md:text-right">{t('осталось {left}, до {date}', { left: timeLeft(a.deadline) ?? '', date: fmtDateTime(a.deadline) })}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mb-10">
        <SectionHead title="Заявки" count={rest.length} />
        {apps.isLoading && <SkelRows n={3} />}
        {apps.error && <ErrorBox error={apps.error} retry={() => apps.refetch()} />}
        {apps.data && apps.data.length === 0 && <Empty title="Заявок пока нет" hint="Выберите тест в каталоге и ответьте на вопросы фаундера." action={<Link href="/app/explore" className="btn btn-sm">{t('Открыть каталог')}</Link>} />}
        {apps.data && apps.data.length > 0 && rest.length === 0 && <p className="t-small muted">{t('Все текущие заявки в работе.')}</p>}
        {rest.length > 0 && (
          <div className="border border-border overflow-x-auto">
            <table className="tbl min-w-[620px]">
              <thead><tr><th>{t('Тест')}</th><th>{t('Статус')}</th><th>{t('Награда')}</th><th className="r">{t('Подана')}</th></tr></thead>
              <tbody>
                {rest.map((a) => (
                  <tr key={a.id} data-testid={`row-application-${a.id}`}>
                    <td><Link href={`/app/campaigns/${a.campaignId}`} className="font-medium hover:underline">{a.campaignTitle}</Link></td>
                    <td><Status s={a.status} /></td>
                    <td className="muted">{a.reward}</td>
                    <td className="r meta">{fmtDate(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <SectionHead title="Отчёты" count={subs.data?.length} />
        {subs.isLoading && <SkelRows n={3} />}
        {subs.error && <ErrorBox error={subs.error} retry={() => subs.refetch()} />}
        {subs.data && subs.data.length === 0 && <Empty title="Отчётов пока нет" hint="Когда заявку одобрят, отчёт отправляется со страницы теста." />}
        {subs.data && subs.data.length > 0 && (
          <div className="border border-border overflow-x-auto">
            <table className="tbl min-w-[620px]">
              <thead><tr><th>{t('Отчёт')}</th><th>{t('Серьёзность')}</th><th>{t('Статус')}</th><th className="r">{t('Отправлен')}</th></tr></thead>
              <tbody>
                {subs.data.map((s) => (
                  <tr key={s.id} data-testid={`row-submission-${s.id}`}>
                    <td>
                      <Link href={`/app/campaigns/${s.campaignId}`} className="font-medium hover:underline">{s.title}</Link>
                      <div className="meta">{s.campaignTitle}</div>
                      {s.reason && <div className="t-small mt-1">{t('Причина отказа: {reason}', { reason: s.reason })}</div>}
                    </td>
                    <td className="muted">{severityLabel(s.severity)}</td>
                    <td><Status s={s.status} kind="report" />{s.status === 'pending' && <div className="meta mt-0.5">{t('ответ до {date}', { date: fmtDateTime(s.reviewDeadline) })}</div>}</td>
                    <td className="r meta">{fmtDateTime(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Page>
  );
}

function CopyBtn({ text, id }: { text: string; id: number }) {
  const { t } = useLocale();
  const [ok, setOk] = useState(false);
  return (
    <button
      className="btn btn-sm"
      onClick={() => navigator.clipboard?.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1400); }).catch(() => undefined)}
      data-testid={`button-copy-${id}`}
    >
      {ok ? <Check className="w-3.5 h-3.5 text-live" /> : <Copy className="w-3.5 h-3.5" />} {t(ok ? 'Скопировано' : 'Скопировать')}
    </button>
  );
}

export function Vault() {
  const { t } = useLocale();
  const { signedIn } = useSignedIn();
  const qc = useQueryClient();
  const { toast } = useToast();
  const rw = useListRewards({ query: { enabled: signedIn, queryKey: getListRewardsQueryKey(), refetchInterval: 30000 } });
  const claim = useClaimReward();
  return (
    <Page>
      <PageHead title="Награды" sub="Код появляется здесь, как только фаундер принимает отчёт. Откройте его, когда будете готовы активировать." />
      {rw.isLoading && <SkelRows n={3} h="h-16" />}
      {rw.error && <ErrorBox error={rw.error} retry={() => rw.refetch()} />}
      {rw.data && rw.data.length === 0 && <Empty title="Наград пока нет" hint="Каждый принятый отчёт приносит один код: лицензию, подписку или API-кредиты." action={<Link href="/app/explore" className="btn btn-sm">{t('Открыть каталог')}</Link>} />}
      {rw.data && rw.data.length > 0 && (
        <div className="stack">
          {rw.data.map((r) => (
            <div key={r.id} className="p-4 grid md:grid-cols-[minmax(0,1fr)_auto] gap-3 items-center" data-testid={`row-reward-${r.id}`}>
              <div className="min-w-0">
                <div className="font-medium">{r.title}</div>
                <div className="meta">{r.campaignTitle} · {fmtDate(r.createdAt)}</div>
                {r.claimed && r.code && <div className="mono text-[13px] mt-2 px-2.5 py-1.5 border border-dashed border-border bg-background break-all select-all" data-testid={`text-code-${r.id}`}>{r.code}</div>}
              </div>
              <div className="flex gap-2">
                {r.claimed && r.code ? (
                  <CopyBtn text={r.code} id={r.id} />
                ) : (
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={claim.isPending}
                    onClick={() => claim.mutate({ id: r.id }, { onSuccess: () => invalidateAll(qc), onError: (e) => toast({ title: t('Не получилось'), description: errMsg(e), variant: 'destructive' }) })}
                    data-testid={`button-claim-${r.id}`}
                  >
                    {t('Показать код')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="meta mt-4">{t('Выплаты токенами и начисление баланса через webhook появятся позже. Сейчас награды выдаются кодами.')}</p>
    </Page>
  );
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

// 52 weeks x 7 days ending with the current UTC week, same calendar the server uses for streaks.
function Heatmap({ data }: { data: Contribution[] }) {
  const { t } = useLocale();
  const { weeks, total } = useMemo(() => {
    const counts = new Map(data.map((c) => [c.date.slice(0, 10), c.count]));
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setUTCDate(start.getUTCDate() - start.getUTCDay() - 51 * 7);
    const weeks: { d: string; n: number; future: boolean }[][] = [];
    let total = 0;
    for (let w = 0; w < 52; w++) {
      const col = [];
      for (let i = 0; i < 7; i++) {
        const x = new Date(start); x.setUTCDate(start.getUTCDate() + w * 7 + i);
        const n = counts.get(isoDay(x)) ?? 0;
        total += n;
        col.push({ d: isoDay(x), n, future: x > today });
      }
      weeks.push(col);
    }
    return { weeks, total };
  }, [data]);
  const lvl = (n: number) => (n === 0 ? 'hsl(var(--muted))' : n === 1 ? 'hsl(var(--live) / 0.4)' : n <= 3 ? 'hsl(var(--live) / 0.7)' : 'hsl(var(--live))');
  const label = (d: string) => fmtDate(`${d}T12:00:00Z`, true);
  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-[3px] w-max" data-testid="grid-contributions" role="img" aria-label={t('{count} действий за год', { count: total })}>
          {weeks.map((col, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {col.map((c) => (
                <span key={c.d} title={t('{date}: {count}', { date: label(c.d), count: c.n })} className="w-[11px] h-[11px]" style={{ background: c.future ? 'transparent' : lvl(c.n) }} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-3 justify-between items-center mt-3 meta">
        <span>{t('{count} действий за год', { count: total })}</span>
        <span className="flex items-center gap-1">{t('меньше')} {[0, 1, 2, 4].map((n) => <span key={n} className="w-[11px] h-[11px]" style={{ background: lvl(n) }} />)} {t('больше')}</span>
      </div>
    </div>
  );
}

const BADGES: { id: string; label: string; goal: number; metric: 'approved' | 'video' | 'streak' }[] = [
  { id: 'FIRST_DROP', label: 'Первый принятый отчёт', goal: 1, metric: 'approved' },
  { id: 'BUG_HUNTER_L1', label: '5 принятых отчётов', goal: 5, metric: 'approved' },
  { id: 'BUG_HUNTER_L2', label: '25 принятых отчётов', goal: 25, metric: 'approved' },
  { id: 'BUG_HUNTER_L3', label: '100 принятых отчётов', goal: 100, metric: 'approved' },
  { id: 'DEEP_AUDITOR', label: '10 отчётов с записью экрана', goal: 10, metric: 'video' },
  { id: 'STREAK_30', label: '30 дней подряд', goal: 30, metric: 'streak' },
  { id: 'STREAK_100', label: '100 дней подряд', goal: 100, metric: 'streak' },
];

function Badges({ p }: { p: PublicProfile }) {
  const { t } = useLocale();
  const value = { approved: p.approvedReports, video: p.videoReports, streak: p.maxStreak };
  // BUG_HUNTER levels replace each other on the server; earlier levels count as earned too.
  const earned = (b: typeof BADGES[number]) => value[b.metric] >= b.goal;
  return (
    <ul className="stack">
      {BADGES.map((b) => {
        const ok = earned(b);
        return (
          <li key={b.id} className="px-4 py-2.5 flex items-center gap-3" data-testid={`badge-${b.id}`}>
            <span className="mono text-[12px] w-[150px] shrink-0" style={{ color: ok ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.7)' }}>[{b.id}]</span>
            <span className={`t-small flex-1 ${ok ? '' : 'muted'}`}>{t(b.label)}</span>
            <span className="num text-[12px] muted">{ok ? t('получен') : `${Math.min(value[b.metric], b.goal)} / ${b.goal}`}</span>
          </li>
        );
      })}
    </ul>
  );
}

function ProfileEditor({ p, onDone }: { p: Profile; onDone: (username: string) => void }) {
  const { t } = useLocale();
  const qc = useQueryClient();
  const { toast } = useToast();
  const upd = useUpdateProfile();
  const [f, setF] = useState({ username: p.username, bio: p.bio, stack: p.stack.join(', '), os: p.os });
  const uOk = /^[a-zA-Z0-9_-]{3,40}$/.test(f.username);
  return (
    <form
      className="panel p-5 flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const stack = f.stack.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20);
        upd.mutate({ data: { username: f.username, bio: f.bio, stack, os: f.os } }, { onSuccess: (saved) => { invalidateAll(qc); toast({ title: t('Профиль сохранён') }); onDone(saved.username); } });
      }}
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Имя пользователя" hint="a-z, 0-9, _ и -" error={uOk ? undefined : 'От 3 до 40 символов: латиница, цифры, _ и -'}>
          <input className="inp mono" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} aria-invalid={!uOk} data-testid="input-username" />
        </Field>
        <Field label="ОС и железо">
          <input className="inp" maxLength={80} value={f.os} onChange={(e) => setF({ ...f, os: e.target.value })} placeholder="macOS 14, M2 / Arch Linux" data-testid="input-os" />
        </Field>
      </div>
      <Field label="Стек" hint="через запятую">
        <input className="inp" value={f.stack} onChange={(e) => setF({ ...f, stack: e.target.value })} placeholder="Go, Rust, Kubernetes" data-testid="input-stack" />
      </Field>
      <Field label="О себе" hint={`${f.bio.length} / 1000`}>
        <textarea className="inp" rows={4} maxLength={1000} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} data-testid="input-bio" />
      </Field>
      <InlineError error={upd.error} />
      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={!uOk || upd.isPending} data-testid="button-save-profile">{t(upd.isPending ? 'Сохраняем...' : 'Сохранить')}</button>
        <button type="button" className="btn" onClick={() => onDone(p.username)}>{t('Отмена')}</button>
      </div>
    </form>
  );
}

function ProfileView({ p, own }: { p: PublicProfile; own?: Profile }) {
  const { t } = useLocale();
  const [edit, setEdit] = useState(false);
  const [, nav] = useLocation();
  const done = (username: string) => {
    setEdit(false);
    if (username !== p.username) nav(`/app/tester/profile/${username}`, { replace: true });
  };
  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col md:flex-row gap-5 md:items-end justify-between">
        <div className="min-w-0">
          <h1 className="t-h1 mono break-all" data-testid="text-username">@{p.username}</h1>
          <p className="t-body muted mt-1">{[p.os, p.createdAt && t('на BETADROP с {date}', { date: fmtDate(p.createdAt) })].filter(Boolean).join(' · ')}</p>
        </div>
        {own && !edit && <button className="btn" onClick={() => setEdit(true)} data-testid="button-edit-profile"><Pencil className="w-3.5 h-3.5" /> {t('Редактировать')}</button>}
      </header>
      {own && edit && <ProfileEditor p={own} onDone={done} />}
      <div className="-mb-2">
        <Stats items={[
          { label: 'Trust Score', value: p.trustScore, color: 'hsl(var(--primary))', testid: 'stat-trust', hint: 'из 100' },
          { label: 'XP', value: p.xp, testid: 'stat-xp' },
          { label: 'Серия', value: t('{count} дн.', { count: p.streak }), color: 'hsl(var(--streak))', testid: 'stat-streak', hint: t('лучшая: {count}', { count: p.maxStreak }) },
          { label: 'Заморозки', value: `${p.freezes} / 2`, hint: 'одна за 7 дней подряд' },
          { label: 'Принято отчётов', value: p.approvedReports },
        ]} />
      </div>
      <section>
        <SectionHead title="Активность" />
        <div className="panel p-5"><Heatmap data={p.contributions} /></div>
      </section>
      <div className="grid md:grid-cols-2 gap-10">
        <section>
          <SectionHead title="Бейджи" count={p.badges.length} />
          <Badges p={p} />
        </section>
        <section>
          <SectionHead title="О себе" />
          {p.bio ? <p className="t-body whitespace-pre-wrap">{p.bio}</p> : <p className="t-body muted">{t(own ? 'Расскажите, что вы обычно тестируете. Фаундеры видят это в заявках.' : 'Тестер пока ничего о себе не написал.')}</p>}
          {p.stack.length > 0 && <div className="flex flex-wrap gap-1.5 mt-4">{p.stack.map((s) => <span key={s} className="tag">{s}</span>)}</div>}
          {own && (
            <div className="mt-8">
              <SectionHead title="Как меняется Trust Score" />
              <ul className="t-small muted flex flex-col gap-1.5">
                <li>{t('Старт: 50.')}</li>
                <li>{t('Принятый отчёт: +2, с записью экрана: +5.')}</li>
                <li>{t('Отклонённый отчёт или пропущенный срок: -10.')}</li>
                <li>{t('Тесты с наградой дороже $50 доступны от 80.')}</li>
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { username = 'me' } = useParams<{ username: string }>();
  const { signedIn, loaded } = useSignedIn();
  const me = useGetProfile({ query: { enabled: signedIn, queryKey: getGetProfileQueryKey() } });
  const isMe = username === 'me' || (me.data && me.data.username.toLowerCase() === username.toLowerCase());
  const pub = useGetPublicProfile(username, { query: { enabled: username !== 'me', queryKey: getGetPublicProfileQueryKey(username) } });
  if (username === 'me' && loaded && !signedIn) return <Redirect to="/sign-in" />;
  if (username === 'me' && me.data) return <Redirect to={`/app/tester/profile/${me.data.username}`} replace />;
  const p = isMe ? me.data : pub.data;
  const q = isMe ? me : pub;
  return (
    <Page>
      {q.isLoading && <div className="flex flex-col gap-3"><Skel className="h-9 w-1/3" /><Skel className="h-20" /><Skel className="h-32" /></div>}
      {q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
      {p && <ProfileView p={p} own={isMe ? me.data : undefined} />}
    </Page>
  );
}
