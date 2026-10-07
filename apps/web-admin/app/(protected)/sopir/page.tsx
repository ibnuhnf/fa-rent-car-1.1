import { requireAdminSession } from '../../../lib/server-api';
import { listDrivers } from '../../../lib/server-operations';
import { DriverPanel } from './DriverPanel';

export const metadata = { title: 'Manajemen Sopir' };

export default async function SopirPage() {
  const session = await requireAdminSession();
  const isSuperadmin = session.user.role === 'SUPERADMIN';
  const data = await listDrivers();

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-display text-headline-lg-mobile tracking-[-0.02em] text-on-surface sm:text-headline-lg">
          Manajemen Sopir
        </h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Daftar sopir profesional, status ketersediaan tugas, nomor SIM, dan tarif harian.
        </p>
      </section>

      <DriverPanel initialDrivers={data.drivers} superadmin={isSuperadmin} />
    </div>
  );
}
