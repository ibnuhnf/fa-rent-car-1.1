import type { Metadata } from 'next';

import { CustomerHeader } from '../../../components/CustomerHeader';
import { getPublicVehicleDetail } from '../../../lib/api';
import { VehicleDetailClient } from './VehicleDetailClient';

interface VehicleDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: VehicleDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const vehicle = await getPublicVehicleDetail(id);
    return {
      title: `${vehicle.brand} ${vehicle.model} (${vehicle.year})`,
      description: `Sewa mobil ${vehicle.brand} ${vehicle.model} di Cirebon. Transmisi ${vehicle.transmission}, kapasitas ${vehicle.capacity} penumpang. Pesan langsung tanpa akun.`,
    };
  } catch {
    return { title: 'Detail Mobil' };
  }
}

export default async function VehicleDetailPage({ params }: VehicleDetailPageProps) {
  const { id } = await params;
  let vehicle = null;
  let error = null;

  try {
    vehicle = await getPublicVehicleDetail(id);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Mobil tidak ditemukan.';
  }

  return (
    <>
      <CustomerHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {error || !vehicle ? (
          <div className="rounded-xl border border-error bg-error-container p-8 text-center text-on-error-container">
            <h1 className="text-title font-bold">Mobil Tidak Ditemukan</h1>
            <p className="mt-2 text-body-md">{error}</p>
            <a
              href="/mobil"
              className="mt-4 inline-block rounded-button bg-secondary px-4 py-2 text-label-md font-semibold text-surface-lowest"
            >
              &larr; Kembali ke Katalog
            </a>
          </div>
        ) : (
          <VehicleDetailClient vehicle={vehicle} />
        )}
      </main>
    </>
  );
}
