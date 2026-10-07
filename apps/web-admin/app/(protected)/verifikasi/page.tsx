import { Card } from '@fa/ui';
import Link from 'next/link';

import { formatDateTimeWib, formatRupiah } from '@fa/shared';
import { requireAdminSession } from '../../../lib/server-api';
import { listBookings } from '../../../lib/server-booking';

export const metadata = { title: 'Verifikasi & Pembayaran' };

interface VerifikasiPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function VerifikasiPage({ searchParams }: VerifikasiPageProps) {
  await requireAdminSession();
  const raw = await searchParams;
  const page = typeof raw.page === 'string' ? Number(raw.page) : 1;
  const search = typeof raw.search === 'string' ? raw.search : undefined;

  const data = await listBookings({
    status: 'PENDING_VERIFICATION',
    page: String(isNaN(page) || page < 1 ? 1 : page),
    limit: '20',
    sort: 'hold_asc',
    ...(search ? { search } : {}),
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-headline-lg-mobile tracking-[-0.02em] text-on-surface sm:text-headline-lg">
            Verifikasi & Pembayaran
          </h1>
          <p className="mt-2 text-body-md text-on-surface-variant">
            Daftar booking yang memerlukan verifikasi dokumen KTP/SIM atau konfirmasi transfer pembayaran.
          </p>
        </div>
      </section>

      <Card padding="none">
        {data.bookings.length === 0 ? (
          <div className="p-8 text-center text-body-md text-on-surface-variant">
            Tidak ada booking yang menunggu verifikasi saat ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-sm">
              <thead className="border-b border-surface-highest bg-surface-low text-label-md text-on-surface-variant">
                <tr>
                  <th className="px-4 py-3">Kode Booking</th>
                  <th className="px-4 py-3">Penyewa</th>
                  <th className="px-4 py-3">WhatsApp</th>
                  <th className="px-4 py-3">Total Tagihan</th>
                  <th className="px-4 py-3">Batas Hold</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-highest">
                {data.bookings.map((booking) => (
                  <tr className="hover:bg-surface-low" key={booking.id}>
                    <td className="px-4 py-3 font-semibold text-secondary">
                      <Link className="hover:underline" href={`/booking/${booking.id}`}>
                        {booking.bookingCode}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-on-surface">{booking.customerName}</td>
                    <td className="px-4 py-3 text-on-surface-variant font-mono text-caption">
                      {booking.customerWhatsapp}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-on-surface">
                      {formatRupiah(booking.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-caption text-warning tabular-nums">
                      {formatDateTimeWib(booking.holdExpiresAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        className="inline-flex items-center rounded-lg bg-secondary px-3 py-1.5 text-label-md font-semibold text-surface-lowest hover:bg-secondary/90"
                        href={`/booking/${booking.id}`}
                      >
                        Periksa &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {data.pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between text-body-sm text-on-surface-variant">
          <span>
            Halaman {data.pagination.page} dari {data.pagination.totalPages} ({data.pagination.total} booking)
          </span>
          <div className="flex gap-2">
            {data.pagination.hasPreviousPage ? (
              <a
                className="rounded-lg border border-surface-highest px-3 py-1.5 hover:bg-surface-low"
                href={`/verifikasi?page=${data.pagination.page - 1}`}
              >
                &larr; Sebelumnya
              </a>
            ) : null}
            {data.pagination.hasNextPage ? (
              <a
                className="rounded-lg border border-surface-highest px-3 py-1.5 hover:bg-surface-low"
                href={`/verifikasi?page=${data.pagination.page + 1}`}
              >
                Berikutnya &rarr;
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
