import type { Metadata } from 'next';

import { CustomerHeader } from '../../../components/CustomerHeader';
import { getPortalMe } from '../../../lib/api';
import { CustomerPortalView } from './CustomerPortalView';

interface PortalPageProps {
  params: Promise<{ token: string }>;
}

export const metadata: Metadata = {
  title: 'Portal Pelanggan',
  description: 'Pantau status pemesanan, verifikasi dokumen, dan unduh invoice resmi sewa mobil.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PortalPage({ params }: PortalPageProps) {
  const { token } = await params;
  let data = null;
  let error = null;

  try {
    data = await getPortalMe(token);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Token portal tidak valid atau kedaluwarsa.';
  }

  return (
    <>
      <CustomerHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {error || !data ? (
          <div className="rounded-xl border border-error bg-error-container p-8 text-center text-on-error-container">
            <h1 className="text-title font-bold">Akses Portal Ditolak</h1>
            <p className="mt-2 text-body-md">{error}</p>
            <a
              href="/cek-status"
              className="mt-4 inline-block rounded-button bg-secondary px-4 py-2 text-label-md font-semibold text-surface-lowest"
            >
              &larr; Coba Masukkan Token Lain
            </a>
          </div>
        ) : (
          <CustomerPortalView initialData={data} token={token} />
        )}
      </main>
    </>
  );
}
