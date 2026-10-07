import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CustomerHeader } from '../../components/CustomerHeader';
import { BookingSuccessClient } from './BookingSuccessClient';

export const metadata: Metadata = {
  title: 'Pemesanan Berhasil',
  description: 'Pemesanan sewa mobil Anda berhasil dicatat. Silakan lakukan pembayaran dan unggah dokumen di portal.',
};

export default function SuksesPage() {
  return (
    <>
      <CustomerHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Suspense fallback={<div className="py-20 text-center text-body-md">Memuat konfirmasi pemesanan…</div>}>
          <BookingSuccessClient />
        </Suspense>
      </main>
    </>
  );
}
