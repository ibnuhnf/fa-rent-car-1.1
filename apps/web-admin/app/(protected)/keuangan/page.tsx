import { requireAdminSession } from '../../../lib/server-api';
import { listExpenses } from '../../../lib/server-operations';
import { FinancePanel } from './FinancePanel';

export const metadata = { title: 'Keuangan & Pengeluaran' };

interface KeuanganPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function KeuanganPage({ searchParams }: KeuanganPageProps) {
  const session = await requireAdminSession();
  const isSuperadmin = session.user.role === 'SUPERADMIN';
  const raw = await searchParams;
  const page = typeof raw.page === 'string' ? Number(raw.page) : 1;

  const data = await listExpenses(isNaN(page) || page < 1 ? 1 : page, 50);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-display text-headline-lg-mobile tracking-[-0.02em] text-on-surface sm:text-headline-lg">
          Keuangan &amp; Pengeluaran Operasional
        </h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Pencatatan biaya BBM, servis, kebersihan, gaji sopir, dan biaya operasional lainnya.
        </p>
      </section>

      <FinancePanel initialData={data} superadmin={isSuperadmin} />
    </div>
  );
}
