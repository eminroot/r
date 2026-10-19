import { Page } from '@/components/shell';
import { PageHead } from '@/components/kit';
import { PricingPlans } from '@/pages/landing';
import { useLocale } from '@/lib/i18n';
import { Tag } from 'lucide-react';

const ADDONS = [
  ['Promoted Listing', '$29', 'Кампания закреплена в топе каталога на 7 дней.'],
  ['Newsletter & Discord Blast', '$49', 'Рассылка тестерам с подходящим профилем.'],
  ['Pro Tester Pass', '$4.99 / мес', 'Для тестеров: 2 заморозки серии в месяц, доступ к новым тестам на час раньше, бейдж [PRO_TESTER].'],
];

export default function Pricing() {
  const { t } = useLocale();
  return (
    <Page>
      <PageHead eyebrow="Тарифы" icon={Tag} title="Платите за кампании, а не за пользователей" sub="Starter бесплатный и доступен сейчас. Оплата платных тарифов появится позже." />
      <PricingPlans />
      <div className="soft p-6 mt-4 t-body">
        <span className="font-medium">{t('Ранний доступ.')}</span>{' '}
        <span className="muted">{t('Пока платные тарифы не подключены, на Starter открыты все четыре метода проверки, webhooks и экспорт. Лимиты Starter (1 кампания, 15 мест) действуют.')}</span>
      </div>
      <h2 className="t-h2 mt-14 mb-4">{t('Дополнения')}</h2>
      <div className="tbl-card">
        <table className="tbl min-w-[560px]">
          <thead><tr><th>{t('Что')}</th><th>{t('Цена')}</th><th>{t('Описание')}</th></tr></thead>
          <tbody>
            {ADDONS.map(([name, price, d]) => (
              <tr key={name}><td className="strong whitespace-nowrap">{name}</td><td className="num whitespace-nowrap">{t(price)}</td><td>{t(d)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="meta mt-3">{t('Дополнения пока нельзя купить. Они появятся вместе с оплатой.')}</p>
    </Page>
  );
}
