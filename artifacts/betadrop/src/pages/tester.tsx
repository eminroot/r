import { useMemo, useState } from 'react';
import { Link, useParams } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Flame, KeyRound, Pencil, Snowflake } from 'lucide-react';
import {
  useGetDashboard,
  getGetDashboardQueryKey,
  useListApplications,
  getListApplicationsQueryKey,
  useListSubmissions,
  getListSubmissionsQueryKey,
  useGetActivity,
  getGetActivityQueryKey,
  useListRewards,
  getListRewardsQueryKey,
  useClaimReward,
  useGetProfile,
  getGetProfileQueryKey,
  useUpdateProfile,
  type Contribution,
  type Profile,
} from '@workspace/api-client-react';
import { Page } from '@/components/shell';
import { Empty, ErrorBox, Field, InlineError, PageHead, Skel, SkelRows, Stat, Status } from '@/components/kit';
import { useToast } from '@/hooks/use-toast';
import { fmtDate, fmtDateTime, invalidateAll, timeLeft, useSignedIn } from '@/lib/app';

const TP = { role: 'tester' as const };

export function TesterDashboard() {
  const { signedIn } = useSignedIn();
  const dash = useGetDashboard({ query: { enabled: signedIn, queryKey: getGetDashboardQueryKey(), refetchInterval: 30000 } });
  const apps = useListApplications(TP, { query: { enabled: signedIn, queryKey: getListApplicationsQueryKey(TP), refetchInterval: 30000 } });
  const subs = useListSubmissions(TP, { query: { enabled: signedIn, queryKey: getListSubmissionsQueryKey(TP), refetchInterval: 30000 } });
  const act = useGetActivity({ query: { enabled: signedIn, queryKey: getGetActivityQueryKey() } });
  const d = dash.data;
  const sortedApps = useMemo(() => [...(apps.data ?? [])].sort((a, b) => (a.deadline ?? 'z').localeCompare(b.deadline ?? 'z')), [apps.data]);

  return (
    <Page wide>
      <PageHead k="тестер / дашборд" title="Рабочее пространство" sub="Статусы заявок, дедлайны и отчёты. Данные обновляются каждые 30 секунд." right={<Link href="/app/explore" className="btn btn-primary">Найти кампанию</Link>} />
      {dash.error && <ErrorBox error={dash.error} retry={() => dash.refetch()} />}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-border border border-border mb-8">
        {dash.isLoading ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="bg-surface p-4"><Skel className="h-3 w-16" /><Skel className="h-6 w-10 mt-3" /></div>) : d && (
          <>
            <Stat k="активные тесты" v={d.activeTests} testid="stat-active" />
            <Stat k="на рассмотрении" v={d.pendingApplications} accent="hsl(var(--streak))" />
            <Stat k="завершено" v={d.completedTests} accent="hsl(var(--live))" />
            <Stat k="награды" v={d.rewards} accent="hsl(var(--primary))" />
            <Stat k="серия, дней" v={<span className="inline-flex items-center gap-1.5"><Flame className="w-5 h-5" />{d.profile.streak}</span>} accent="hsl(var(--streak))" />
          </>
        )}
      </div>
      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <div className="flex flex-col gap-8 min-w-0">
          <section>
            <div className="label-k mb-2">заявки</div>
            {apps.isLoading && <SkelRows n={3} />}
            {apps.error && <ErrorBox error={apps.error} retry={() => apps.refetch()} />}
            {apps.data && sortedApps.length === 0 && <Empty title="Заявок пока нет" hint="Выберите кампанию в каталоге и пройдите скрининг." action={<Link href="/app/explore" className="btn btn-sm">Каталог</Link>} />}
            {sortedApps.length > 0 && (
              <div className="flex flex-col gap-px bg-border border border-border">
                {sortedApps.map((a) => (
                  <Link key={a.id} href={`/app/campaigns/${a.campaignId}`} className="row-hover bg-surface px-4 py-3 grid md:grid-cols-[1fr_150px_120px] gap-2 items-center" data-testid={`row-application-${a.id}`}>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{a.campaignTitle}</div>
                      <div className="meta truncate">{a.reward} / {a.method}</div>
                    </div>
                    <Status s={a.status} />
                    <div className="meta md:text-right">
                      {a.deadline ? <span className={a.status === 'approved' ? 'text-streak' : ''}>{timeLeft(a.deadline)} / {fmtDate(a.deadline)}</span> : fmtDate(a.createdAt)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
          <section>
            <div className="label-k mb-2">отчёты</div>
            {subs.isLoading && <SkelRows n={3} />}
            {subs.error && <ErrorBox error={subs.error} retry={() => subs.refetch()} />}
            {subs.data && subs.data.length === 0 && <Empty title="Отчётов пока нет" hint="После одобрения заявки отправьте отчёт со страницы кампании." />}
            {subs.data && subs.data.length > 0 && (
              <div className="flex flex-col gap-px bg-border border border-border">
                {subs.data.map((s) => (
                  <div key={s.id} className="bg-surface px-4 py-3" data-testid={`row-submission-${s.id}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{s.title}</span>
                      <span className="tag">{s.severity}</span>
                      <Status s={s.status} />
                      <span className="meta ml-auto">{s.campaignTitle} / {fmtDateTime(s.createdAt)}</span>
                    </div>
                    {s.reason && <div className="meta mt-1.5">причина: {s.reason}</div>}
                    {s.status === 'pending' && s.reviewDeadline && <div className="meta mt-1">проверка до {fmtDateTime(s.reviewDeadline)}</div>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
        <aside>
          <div className="label-k mb-2">активность</div>
          <div className="panel">
            {act.isLoading && <div className="p-4 flex flex-col gap-2"><Skel className="h-3" /><Skel className="h-3" /><Skel className="h-3" /></div>}
            {act.error && <div className="p-3"><ErrorBox error={act.error} retry={() => act.refetch()} /></div>}
            {act.data && act.data.length === 0 && <div className="p-4 meta">Событий пока нет.</div>}
            {act.data?.slice(0, 20).map((e) => (
              <div key={e.id} className="px-4 py-2.5 border-b border-border last:border-0 flex gap-3">
                <span className="dot bg-live mt-1.5" />
                <div className="min-w-0">
                  <div className="mono text-[11.5px]">{e.event}</div>
                  <div className="text-xs text-muted-foreground truncate">{e.detail}</div>
                  <div className="meta">{fmtDateTime(e.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </Page>
  );
}

function CopyBtn({ text, id }: { text: string; id: number }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      className="btn btn-sm"
      onClick={() => navigator.clipboard.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1400); })}
      data-testid={`button-copy-${id}`}
    >
      {ok ? <Check className="w-3 h-3 text-live" /> : <Copy className="w-3 h-3" />} {ok ? 'Скопировано' : 'Копировать'}
    </button>
  );
}

export function Vault() {
  const { signedIn } = useSignedIn();
  const qc = useQueryClient();
  const { toast } = useToast();
  const rw = useListRewards({ query: { enabled: signedIn, queryKey: getListRewardsQueryKey(), refetchInterval: 30000 } });
  const claim = useClaimReward();
  return (
    <Page>
      <PageHead k="тестер / хранилище" title="Награды" sub="Коды лицензий и API-кредитов появляются здесь после одобрения отчёта. Код раскрывается при получении." />
      {rw.isLoading && <SkelRows n={3} h="h-16" />}
      {rw.error && <ErrorBox error={rw.error} retry={() => rw.refetch()} />}
      {rw.data && rw.data.length === 0 && <Empty title="Хранилище пустое" hint="Награды выдаются только за одобренные отчёты." action={<Link href="/app/explore" className="btn btn-sm">Каталог</Link>} />}
      {rw.data && rw.data.length > 0 && (
        <div className="flex flex-col gap-px bg-border border border-border">
          {rw.data.map((r) => (
            <div key={r.id} className="bg-surface p-4 grid md:grid-cols-[1fr_auto] gap-3 items-center" data-testid={`row-reward-${r.id}`}>
              <div className="flex gap-3 min-w-0">
                <KeyRound className={`w-4 h-4 mt-0.5 shrink-0 ${r.claimed ? 'text-live' : 'text-streak'}`} />
                <div className="min-w-0">
                  <div className="text-sm font-medium">{r.title}</div>
                  <div className="meta">{r.campaignTitle} / {fmtDate(r.createdAt)}</div>
                  {r.claimed && r.code && <div className="mono text-[13px] mt-2 px-2 py-1 border border-dashed border-border bg-background break-all fade-up" data-testid={`text-code-${r.id}`}>{r.code}</div>}
                </div>
              </div>
              <div className="flex gap-2">
                {r.claimed && r.code ? (
                  <CopyBtn text={r.code} id={r.id} />
                ) : (
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={claim.isPending}
                    onClick={() => claim.mutate({ id: r.id }, { onSuccess: () => { invalidateAll(qc); toast({ title: 'Награда получена' }); }, onError: (e) => toast({ title: 'Ошибка', description: (e as { data?: { error?: string } })?.data?.error ?? String(e), variant: 'destructive' }) })}
                    data-testid={`button-claim-${r.id}`}
                  >
                    Получить код
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}

function ContribGrid({ data }: { data: Contribution[] }) {
  const { cells, total } = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((c) => map.set(c.date.slice(0, 10), (map.get(c.date.slice(0, 10)) ?? 0) + c.count));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setDate(end.getDate() + (6 - end.getDay()));
    const start = new Date(end);
    start.setDate(start.getDate() - 52 * 7 + 1);
    const out: { d: string; n: number; future: boolean }[] = [];
    let total = 0;
    for (let i = 0; i < 364; i++) {
      const x = new Date(start);
      x.setDate(start.getDate() + i);
      const key = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
      const n = map.get(key) ?? 0;
      total += n;
      out.push({ d: key, n, future: x > today });
    }
    return { cells: out, total };
  }, [data]);
  const lvl = (n: number) => (n === 0 ? 'hsl(var(--muted))' : n === 1 ? 'hsl(var(--live) / 0.35)' : n <= 3 ? 'hsl(var(--live) / 0.6)' : 'hsl(var(--live))');
  return (
    <div>
      <div className="overflow-x-auto">
        <div className="grid grid-flow-col grid-rows-7 gap-[2px] w-max" data-testid="grid-contributions">
          {cells.map((c) => (
            <span key={c.d} title={`${c.d}: ${c.n}`} className="w-[11px] h-[11px] transition-transform hover:scale-125" style={{ background: c.future ? 'transparent' : lvl(c.n), outline: c.future ? '1px dashed hsl(var(--border))' : undefined }} />
          ))}
        </div>
      </div>
      <div className="flex justify-between items-center mt-3 meta">
        <span>{total} действий за 52 недели</span>
        <span className="flex items-center gap-1">меньше {[0, 1, 2, 4].map((n) => <span key={n} className="w-[11px] h-[11px]" style={{ background: lvl(n) }} />)} больше</span>
      </div>
    </div>
  );
}

function ProfileEditor({ p, onDone }: { p: Profile; onDone: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const upd = useUpdateProfile();
  const [f, setF] = useState({ username: p.username, bio: p.bio, stack: p.stack.join(', '), os: p.os });
  const uOk = /^[a-zA-Z0-9_-]{3,40}$/.test(f.username);
  return (
    <form
      className="panel p-5 flex flex-col gap-4 fade-up"
      onSubmit={(e) => {
        e.preventDefault();
        const stack = f.stack.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20);
        upd.mutate({ data: { username: f.username, bio: f.bio, stack, os: f.os } }, { onSuccess: () => { invalidateAll(qc); toast({ title: 'Профиль сохранён' }); onDone(); } });
      }}
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Username" hint="a-z 0-9 _ -" error={uOk ? undefined : '3–40 символов: латиница, цифры, _ и -'}>
          <input className="inp mono" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} data-testid="input-username" />
        </Field>
        <Field label="ОС / окружение">
          <input className="inp" maxLength={80} value={f.os} onChange={(e) => setF({ ...f, os: e.target.value })} placeholder="macOS 14, Arch Linux" data-testid="input-os" />
        </Field>
      </div>
      <Field label="Стек" hint="через запятую, до 20">
        <input className="inp" value={f.stack} onChange={(e) => setF({ ...f, stack: e.target.value })} placeholder="Go, Rust, Kubernetes" data-testid="input-stack" />
      </Field>
      <Field label="О себе" hint={`${f.bio.length}/1000`}>
        <textarea className="inp" rows={4} maxLength={1000} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} data-testid="input-bio" />
      </Field>
      <InlineError error={upd.error} />
      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={!uOk || upd.isPending} data-testid="button-save-profile">{upd.isPending ? 'Сохранение...' : 'Сохранить'}</button>
        <button type="button" className="btn" onClick={onDone}>Отмена</button>
      </div>
    </form>
  );
}

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { signedIn } = useSignedIn();
  const { data: p, isLoading, error, refetch } = useGetProfile({ query: { enabled: signedIn, queryKey: getGetProfileQueryKey() } });
  const [edit, setEdit] = useState(false);
  const foreign = p && username && username !== 'me' && username !== p.username;
  return (
    <Page>
      {isLoading && <div className="flex flex-col gap-3"><Skel className="h-10 w-1/3" /><Skel className="h-24" /><Skel className="h-32" /></div>}
      {error && <ErrorBox error={error} retry={() => refetch()} />}
      {p && (
        <div className="flex flex-col gap-6">
          {foreign && <div className="panel p-3 meta">Публичные профили других тестеров пока недоступны. Показан ваш профиль.</div>}
          <div className="flex flex-col md:flex-row gap-5 md:items-center justify-between border-b border-border pb-6">
            <div className="flex gap-4 items-center">
              <div className="w-14 h-14 bg-primary text-primary-foreground grid place-items-center text-2xl font-bold">{p.username[0]?.toUpperCase()}</div>
              <div>
                <div className="label-k">тестер / профиль</div>
                <h1 className="text-2xl font-semibold mono" data-testid="text-username">@{p.username}</h1>
                <div className="meta mt-0.5">{p.os || 'окружение не указано'}</div>
              </div>
            </div>
            {!edit && <button className="btn" onClick={() => setEdit(true)} data-testid="button-edit-profile"><Pencil className="w-3.5 h-3.5" /> Редактировать</button>}
          </div>
          {edit && <ProfileEditor p={p} onDone={() => setEdit(false)} />}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border">
            <Stat k="trust score" v={p.trustScore} accent="hsl(var(--primary))" testid="stat-trust" />
            <Stat k="xp" v={p.xp} testid="stat-xp" />
            <Stat k="серия" v={<span className="inline-flex items-center gap-1.5"><Flame className="w-5 h-5" />{p.streak}</span>} accent="hsl(var(--streak))" testid="stat-streak" />
            <Stat k="заморозки" v={<span className="inline-flex items-center gap-1.5"><Snowflake className="w-5 h-5" />{p.freezes}</span>} />
          </div>
          <section className="panel p-5">
            <div className="label-k mb-4">вклад / 52 недели</div>
            <ContribGrid data={p.contributions} />
          </section>
          <div className="grid md:grid-cols-2 gap-6">
            <section className="panel p-5">
              <div className="label-k mb-2">о себе</div>
              <p className="text-sm whitespace-pre-wrap">{p.bio || <span className="text-muted-foreground">Пока пусто.</span>}</p>
              <div className="label-k mt-5 mb-2">стек</div>
              <div className="flex flex-wrap gap-1.5">{p.stack.length ? p.stack.map((s) => <span key={s} className="tag">{s}</span>) : <span className="meta">не указан</span>}</div>
            </section>
            <section className="panel p-5">
              <div className="label-k mb-2">бейджи</div>
              <div className="flex flex-wrap gap-1.5">{p.badges.length ? p.badges.map((b) => <span key={b} className="tag" style={{ color: 'hsl(var(--primary))', borderColor: 'currentColor' }}>{b}</span>) : <span className="meta">Бейджи выдаются за одобренные отчёты.</span>}</div>
            </section>
          </div>
        </div>
      )}
    </Page>
  );
}
