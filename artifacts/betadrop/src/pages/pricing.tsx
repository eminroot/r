import { Link } from 'wouter';
import { Page } from '@/components/shell';
import { PageHead } from '@/components/kit';
import { useAppState } from '@/lib/app';
import { useLocale } from '@/lib/i18n';

const PLANS = [
  {
    name: 'Starter', price: '$0', live: true,
    pts: ['1 активная кампания', 'До 15 мест на тест', 'Secret Code и Email Match', 'Базовый таргетинг', 'Ручной просмотр отчётов', 'Обычное место в каталоге'],
  },
  {
    name: 'Growth', price: '$59', live: false,
    pts: ['До 3 кампаний', 'До 100 мест на тест', 'Все 4 метода, включая Webhook API', 'Таргетинг по ОС, стеку, гео и Trust Score', 'Экспорт CSV, webhooks, Jira'],
  },
  {
    name: 'Scale', price: '$189', live: false,
    pts: ['Без лимита кампаний', 'Без лимита мест', 'Все 4 метода', 'Глубокий скрининг и ручной отбор', 'GitHub Issues, Jira, Slack и API', '1 продвижение в топ каталога в месяц'],
  },
];

const ADDONS = [
  ['Promoted Listing', '$29', 'Кампания закреплена в топе каталога на 7 дней.'],
  ['Newsletter & Discord Blast', '$49', 'Рассылка тестерам с подходящим профилем.'],
  ['Pro Tester Pass', '$4.99 / мес', 'Для тестеров: 2 заморозки серии в месяц, доступ к новым тестам на час раньше, бейдж [PRO_TESTER].'],
];

export function PricingGrid() {
  const { t } = useLocale();
  const { setRole } = useAppState();
  return (
    <div className="grid md:grid-cols-3 gap-px bg-border border border-border">
      {PLANS.map((p) => (
        <div key={p.name} className="bg-surface p-6 flex flex-col" data-testid={`card-plan-${p.name.toLowerCase()}`}>
          <div className="flex items-center justify-between">
            <span className="t-h3">{p.name}</span>
            {!p.live && <span className="tag">{t('скоро')}</span>}
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="num text-[32px] font-semibold leading-none">{p.price}</span>
            <span className="t-small muted">{t('в месяц')}</span>
          </div>
          <ul className="mt-6 flex-1 border-t border-border">
            {p.pts.map((x) => <li key={x} className="t-small py-2 border-b border-border">{t(x)}</li>)}
          </ul>
          {p.live ? (
            <Link href="/app/founder/campaigns/new" onClick={() => setRole('founder')} className="btn btn-primary mt-6 w-full" data-testid="link-plan-starter">{t('Начать бесплатно')}</Link>
          ) : (
            <button className="btn mt-6 w-full" disabled data-testid={`button-plan-${p.name.toLowerCase()}`}>{t('Оплата появится позже')}</button>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Pricing() {
  const { t } = useLocale();
  return (
    <Page>
      <PageHead title="Тарифы" sub="Платите за кампании, а не за пользователей. Starter бесплатный и доступен сейчас." />
      <PricingGrid />
      <div className="panel p-5 mt-6 t-body">
        <span className="font-medium">{t('Ранний доступ.')}</span>{' '}
        <span className="muted">{t('Пока платные тарифы не подключены, на Starter открыты все четыре метода проверки, webhooks и экспорт. Лимиты Starter (1 кампания, 15 мест) действуют.')}</span>
      </div>
      <h2 className="t-h2 mt-14 mb-4">{t('Дополнения')}</h2>
      <div className="border border-border overflow-x-auto">
        <table className="tbl min-w-[560px]">
          <thead><tr><th>{t('Что')}</th><th>{t('Цена')}</th><th>{t('Описание')}</th></tr></thead>
          <tbody>
            {ADDONS.map(([name, price, d]) => (
              <tr key={name}><td className="font-medium whitespace-nowrap">{name}</td><td className="num whitespace-nowrap">{t(price)}</td><td className="muted">{t(d)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="meta mt-3">{t('Дополнения пока нельзя купить. Они появятся вместе с оплатой.')}</p>
    </Page>
  );
}
