import type { Metadata } from 'next';

import { CustomerHeader } from '../../components/CustomerHeader';
import { BookingCheckoutClient } from './BookingCheckoutClient';

export const metadata: Metadata = {
  title: 'Formulir Pemesanan',
  description:
    'Lengkapi data penyewa dan konfirmasi pesanan sewa mobil Anda di FA RENT CAR Cirebon. Tanpa perlu registrasi akun.',
};

export default function PesanPage() {
  return (
    <>
      <CustomerHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <section className="mb-8">
          <h1 className="font-display text-headline-lg-mobile tracking-[-0.02em] text-on-surface sm:text-headline-lg">
            Konfirmasi &amp; Data Penyewa
          </h1>
          <p className="mt-2 text-body-md text-on-surface-variant">
            Pemesanan instan tanpa akun. Data Anda dilindungi dan invoice resmi akan diterbitkan
            langsung setelah pemesanan.
          </p>
        </section>
        <BookingCheckoutClient />
      </main>
    </>
  );
}
