import type { Metadata } from 'next';

import { CustomerHeader } from '../../components/CustomerHeader';
import { VehicleCatalog } from './VehicleCatalog';

export const metadata: Metadata = {
  title: 'Katalog Armada',
  description:
    'Pilih mobil sesuai tanggal dan kebutuhan Anda. Lepas kunci atau dengan sopir, tarif transparan tanpa biaya tersembunyi.',
};

export default function MobilPage() {
  return (
    <>
      <CustomerHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <section className="mb-8">
          <h1 className="font-display text-headline-lg-mobile tracking-[-0.02em] text-on-surface sm:text-headline-lg">
            Katalog Armada
          </h1>
          <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
            Semua mobil siap jalan. Filter sesuai kebutuhan, lalu masukkan tanggal sewa untuk melihat
            estimasi tarif transparan.
          </p>
        </section>
        <VehicleCatalog />
      </main>
    </>
  );
}