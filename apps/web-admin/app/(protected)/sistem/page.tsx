import { formatDateTimeWib } from '@fa/shared';
import { Badge, Card, Icon } from '@fa/ui';

import { getSystem, requireSuperadminSession } from '../../../lib/server-api';

export const metadata = {
  title: 'Status Sistem',
};

const services = [
  ['database', 'Database', 'database'],
  ['queue', 'Antrean pekerjaan', 'account_tree'],
  ['storage', 'Penyimpanan privat', 'folder_managed'],
] as const;

export default async function SystemPage() {
  await requireSuperadminSession();
  const system = await getSystem();

  return (
    <div className="space-y-6 lg:space-y-8">
      <section>
        <Badge dot tone="success">
          Superadmin
        </Badge>
        <h1 className="mt-4 font-display text-headline-lg-mobile tracking-[-0.02em] text-on-surface sm:text-headline-lg">
          Status Sistem
        </h1>
        <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
          Pemeriksaan koneksi layanan fondasi. Status ini dibatasi untuk superadmin dan diperiksa{' '}
          {formatDateTimeWib(system.checkedAt)}.
        </p>
      </section>
      <section aria-label="Kesehatan layanan" className="grid gap-4 md:grid-cols-3">
        {services.map(([key, label, icon]) => (
          <Card key={key} padding="md">
            <span className="flex size-10 items-center justify-center rounded-xl bg-success-container text-on-success-container">
              <Icon name={icon} size="md" />
            </span>
            <h2 className="mt-5 text-title text-on-surface">{label}</h2>
            <div className="mt-3">
              <Badge dot tone="success">
                {system[key] === 'connected' ? 'Terhubung' : 'Tidak tersedia'}
              </Badge>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
