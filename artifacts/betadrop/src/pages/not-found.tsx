import { Link } from 'wouter';
import { Page } from '@/components/shell';
import { useLocale } from '@/lib/i18n';

export default function NotFound() {
  const { t } = useLocale();
  return (
    <Page>
      <div className="py-16">
        <div className="num text-[13px] muted">404</div>
        <h1 className="t-h1 mt-2">{t('Такой страницы нет')}</h1>
        <p className="t-body muted mt-2">{t('Возможно, ссылка устарела или кампанию удалили.')}</p>
        <Link href="/app/explore" className="btn mt-6">{t('Открыть каталог')}</Link>
      </div>
    </Page>
  );
}
