import { Link } from 'wouter';
import { Page } from '@/components/shell';

export default function NotFound() {
  return (
    <Page>
      <div className="panel grid-bg py-20 flex flex-col items-center text-center gap-3">
        <div className="mono text-5xl font-semibold text-streak">404</div>
        <div className="text-sm">Маршрут не найден</div>
        <Link href="/app/explore" className="btn btn-sm mt-2">В каталог</Link>
      </div>
    </Page>
  );
}
