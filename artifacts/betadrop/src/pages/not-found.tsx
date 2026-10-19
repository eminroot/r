import { Link } from 'wouter';
import { Page } from '@/components/shell';
import { useLocale } from '@/lib/i18n';

export default function NotFound() {
  const { t } = useLocale();
  return (
    <Page>
      <div className="panel grid-bg py-20 flex flex-col items-center text-center gap-3">
        <div className="mono text-5xl font-semibold text-streak">404</div>
        <div className="text-sm">{t('Маршрут не найден')}</div>
        <Link href="/app/explore" className="btn btn-sm mt-2">{t('В каталог')}</Link>
      </div>
    </Page>
  );
}
