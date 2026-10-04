import { requireSuperadminSession } from '../../../../lib/server-api';
import { VehicleCreateForm } from './VehicleCreateForm';

export const metadata = {
  title: 'Tambah Armada Baru',
};

export default async function NewVehiclePage() {
  await requireSuperadminSession();

  return (
    <div className="max-w-3xl space-y-6">
      <section>
        <a className="text-caption font-semibold text-secondary hover:underline" href="/armada">
          ← Kembali ke Manajemen Armada
        </a>
        <h1 className="mt-3 font-display text-headline-lg-mobile tracking-[-0.02em] text-on-surface sm:text-headline-lg">
          Tambah Armada Baru
        </h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Daftarkan unit kendaraan baru ke sistem. Plat nomor harus unik.
        </p>
      </section>

      <VehicleCreateForm />
    </div>
  );
}
