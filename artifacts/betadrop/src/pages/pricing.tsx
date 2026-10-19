import { Link } from 'wouter';
import { Check } from 'lucide-react';
import { Page } from '@/components/shell';
import { PageHead } from '@/components/kit';

const PLANS = [
  { name: 'Starter', price: 0, note: 'Доступно сейчас', live: true, pts: ['1 активная кампания · до 15 тестеров', 'Secret Code и Email Match', 'Базовый таргетинг', 'Ручной просмотр отчётов', 'Обычный листинг в каталоге'] },
  { name: 'Growth', price: 59, note: 'Планируется', live: false, pts: ['До 3 кампаний · до 100 тестеров', 'Все 4 метода, включая Webhook API', 'Таргетинг по OS, стеку, гео и Trust Score', 'Экспорт CSV, Webhooks и Jira'] },
  { name: 'Scale', price: 189, note: 'Планируется', live: false, pts: ['Без лимита кампаний и тестеров', 'Все 4 метода верификации', 'Глубокий скрининг и ручной аппрув', 'GitHub Issues, Jira, Slack и API', '1 Promoted Boost в месяц'] },
];

export function PricingGrid() {
  return (
    <div className="grid md:grid-cols-3 gap-px bg-border border border-border">
      {PLANS.map((p) => (
        <div key={p.name} className="bg-surface p-6 flex flex-col" data-testid={`card-plan-${p.name.toLowerCase()}`}>
          <div className="flex items-center justify-between">
            <span className="font-semibold">{p.name}</span>
            <span className="tag" style={p.live ? { color: 'hsl(var(--live))', borderColor: 'currentColor' } : { color: 'hsl(var(--streak))', borderColor: 'currentColor' }}>{p.note}</span>
          </div>
          <div className="mt-5 flex items-baseline gap-1">
            <span className="text-4xl font-bold mono tabular-nums">${p.price}</span>
            <span className="meta">/ мес</span>
          </div>
          <ul className="mt-6 flex flex-col gap-2 flex-1">
            {p.pts.map((x) => (
              <li key={x} className="flex gap-2 text-sm"><Check className="w-4 h-4 text-live shrink-0 mt-0.5" />{x}</li>
            ))}
          </ul>
          {p.live ? (
            <Link href="/sign-up" className="btn btn-primary mt-6 w-full" data-testid="link-plan-starter">Начать бесплатно</Link>
          ) : (
            <button className="btn mt-6 w-full" disabled data-testid={`button-plan-${p.name.toLowerCase()}`}>Оплата не подключена</button>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Pricing() {
  return (
    <Page>
      <PageHead k="тарифы" title="Простые тарифы для фаундеров" sub="Starter работает уже сейчас. Платные тарифы описаны честно: платёжный провайдер ещё не подключён, поэтому оформить их нельзя." />
      <PricingGrid />
      <div className="panel mt-6 p-4 meta">Ранний доступ: медиа-отчёты и CSV сейчас доступны бесплатно. Платные тарифы и интеграции ещё не подключены.</div>
      <div className="panel mt-4 p-4 meta">Дополнения по плану развития: Promoted Listing — $29 / 7 дней; Newsletter & Discord Blast — $49; Pro Tester Pass — $4.99 / мес. Покупка пока недоступна.</div>
    </Page>
  );
}
