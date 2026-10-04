import { Badge, ButtonLink } from '@fa/ui';
import { requireAdminSession } from '../../../../lib/server-api';
import { listVehicles } from '../../../../lib/server-fleet';
import { ManualBookingForm } from './ManualBookingForm';

export const metadata = {
  title: 'Buat Booking Manual',
};

export default async function NewBookingPage() {
  await requireAdminSession();
  const { vehicles } = await listVehicles({ page: 1, limit: 100, sort: 'brand' });

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="info">Fase 1.2</Badge>
          </div>
          <h1 className="mt-4 font-display text-headline-lg-mobile tracking-[-0.02em] text-on-surface sm:text-headline-lg">
            Booking Manual / Walk-in
          </h1>
          <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
            Input reservasi langsung oleh staf kantor. Otomatis mengunci ketersediaan armada, menerbitkan invoice snapshot, dan memulai hold 2 jam.
          </p>
        </div>

        <ButtonLink href="/booking" icon="arrow_back" variant="outline">
          Kembali ke Daftar
        </ButtonLink>
      </section>

      <ManualBookingForm vehicles={vehicles} />
    </div>
  );
}