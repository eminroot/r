import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useListCampaigns, getListCampaignsQueryKey } from '@workspace/api-client-react';
import { Page } from '@/components/shell';
import { CAMPAIGN_COLUMNS, CampaignRow, Empty, ErrorBox, PageHead, SkelRows } from '@/components/kit';
import { CATEGORIES, METHODS, methodLabel } from '@/lib/app';
import { useLocale } from '@/lib/i18n';

export default function Explore() {
  const { t } = useLocale();
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [cat, setCat] = useState('');
  const [method, setMethod] = useState('');
  const [openOnly, setOpenOnly] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setDq(q.trim()), 250);
    return () => clearTimeout(id);
  }, [q]);
  const params = useMemo(() => ({ ...(dq ? { search: dq } : {}), ...(cat ? { category: cat } : {}) }), [dq, cat]);
  const { data, isLoading, error, refetch } = useListCampaigns(params, { query: { queryKey: getListCampaignsQueryKey(params) } });
  const list = (data ?? []).filter((c) => (!method || c.method === method) && (!openOnly || (!c.demo && c.status === 'active' && c.filledSlots < c.slots)));
  const reset = () => { setQ(''); setCat(''); setMethod(''); setOpenOnly(false); };

  return (
    <Page wide>
      <PageHead title="Каталог тестов" sub="Выберите продукт, ответьте на пару вопросов фаундера и получите доступ. Демо-кампании показывают формат и не принимают заявки." />
      <div className="flex flex-col lg:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 muted" />
          <input className="inp pl-9" type="search" aria-label={t('Поиск')} placeholder={t('Название, компания или описание')} value={q} onChange={(e) => setQ(e.target.value)} data-testid="input-search" />
        </div>
        <select className="inp lg:w-52" aria-label={t('Способ проверки')} value={method} onChange={(e) => setMethod(e.target.value)} data-testid="select-method">
          <option value="">{t('Любой способ проверки')}</option>
          {METHODS.map((m) => <option key={m} value={m}>{methodLabel(m)}</option>)}
        </select>
        <label className="btn select-none !cursor-pointer">
          <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} className="accent-[hsl(var(--primary))]" data-testid="checkbox-open-only" />
          {t('Только с местами')}
        </label>
      </div>
      <div className="seg seg-on-card mb-6 !bg-[var(--card)] border border-[var(--ink-07)]" role="tablist">
        {['', ...CATEGORIES].map((c) => (
          <button key={c || 'all'} role="tab" aria-selected={cat === c} data-active={cat === c} onClick={() => setCat(c)} data-testid={`button-category-${c || 'all'}`}>
            {c ? t(c) : t('Все')}
          </button>
        ))}
      </div>
      {isLoading && <SkelRows n={8} />}
      {error && <ErrorBox error={error} retry={() => refetch()} />}
      {data && list.length === 0 && <Empty title="Ничего не нашлось" hint="Попробуйте другой запрос или сбросьте фильтры." action={<button className="btn btn-sm" onClick={reset}>{t('Сбросить фильтры')}</button>} />}
      {list.length > 0 && (
        <div className="panel overflow-hidden">
          <div className={`hidden md:grid ${CAMPAIGN_COLUMNS} gap-x-6 px-5 py-3 text-[12.5px] muted border-b border-[var(--ink-07)]`}>
            <span>{t('Продукт')}</span><span>{t('Проверка')}</span><span>{t('Награда')}</span><span>{t('Места')}</span>
          </div>
          <div className="divide-y divide-[var(--ink-07)]">{list.map((c) => <CampaignRow key={c.id} c={c} />)}</div>
        </div>
      )}
      {data && list.length > 0 && <div className="meta mt-3">{t('Показано {count} из {total}', { count: list.length, total: data.length })}</div>}
    </Page>
  );
}
