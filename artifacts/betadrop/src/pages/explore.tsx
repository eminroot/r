import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useListCampaigns, getListCampaignsQueryKey } from '@workspace/api-client-react';
import { Page } from '@/components/shell';
import { CampaignRow, Empty, ErrorBox, PageHead, SkelRows } from '@/components/kit';
import { CATEGORIES } from '@/lib/app';

export default function Explore() {
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [cat, setCat] = useState('');
  const [method, setMethod] = useState('');
  const [hideDemo, setHideDemo] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDq(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  const params = useMemo(() => ({ ...(dq ? { search: dq } : {}), ...(cat ? { category: cat } : {}) }), [dq, cat]);
  const { data, isLoading, error, refetch, isFetching } = useListCampaigns(params, { query: { queryKey: getListCampaignsQueryKey(params) } });
  const list = (data ?? []).filter((c) => (!method || c.method === method) && (!hideDemo || !c.demo));

  return (
    <Page wide>
      <PageHead k="каталог" title="Бета-кампании" sub="Ищите по названию, компании и тегам. Демо-кампании показывают формат, но не принимают заявки." />
      <div className="flex flex-col lg:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className="inp pl-8" placeholder="Поиск: CLI, SDK, Kubernetes..." value={q} onChange={(e) => setQ(e.target.value)} data-testid="input-search" />
          {isFetching && <span className="absolute right-3 top-1/2 -translate-y-1/2 dot bg-primary live-pulse" />}
        </div>
        <select className="inp lg:w-44" value={method} onChange={(e) => setMethod(e.target.value)} data-testid="select-method">
          <option value="">Любая верификация</option>
          <option value="secret_code">secret_code</option>
          <option value="email_match">email_match</option>
          <option value="media">media</option>
        </select>
        <label className="btn select-none">
          <input type="checkbox" checked={hideDemo} onChange={(e) => setHideDemo(e.target.checked)} className="accent-[hsl(var(--primary))]" data-testid="checkbox-hide-demo" />
          Скрыть демо
        </label>
      </div>
      <div className="flex gap-px bg-border border border-border mb-6 overflow-x-auto w-fit max-w-full">
        {['', ...CATEGORIES].map((c) => (
          <button key={c || 'all'} onClick={() => setCat(c)} className={`px-3 h-8 text-[12px] mono whitespace-nowrap transition-colors ${cat === c ? 'bg-foreground text-background' : 'bg-surface text-muted-foreground hover:text-foreground'}`} data-testid={`button-category-${c || 'all'}`}>
            {c || 'Все'}
          </button>
        ))}
      </div>
      <div className="hidden md:grid grid-cols-[1fr_140px_150px_110px] gap-4 px-4 pb-2 label-k">
        <span>кампания</span><span>верификация</span><span>награда</span><span className="text-right">свободно</span>
      </div>
      {isLoading && <SkelRows n={8} />}
      {error && <ErrorBox error={error} retry={() => refetch()} />}
      {data && list.length === 0 && <Empty title="Ничего не найдено" hint="Измените запрос или сбросьте фильтры." action={<button className="btn btn-sm" onClick={() => { setQ(''); setCat(''); setMethod(''); setHideDemo(false); }}>Сбросить</button>} />}
      {list.length > 0 && (
        <div className="flex flex-col gap-px bg-border border border-border">
          {list.map((c, i) => <CampaignRow key={c.id} c={c} i={i} />)}
        </div>
      )}
      {data && <div className="meta mt-3">{list.length} из {data.length}</div>}
    </Page>
  );
}
