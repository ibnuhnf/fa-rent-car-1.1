import { Badge, ButtonLink } from '@fa/ui';
import { notFound } from 'next/navigation';
import { requireAdminSession } from '../../../../lib/server-api';
import { getBookingDetail } from '../../../../lib/server-booking';
import { BookingDetailView } from './BookingDetailView';

interface BookingDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: BookingDetailPageProps) {
  const { id } = await params;
  return {
    title: `Detail Booking ${id.slice(0, 8)}`,
  };
}

export default async function BookingDetailPage({ params }: BookingDetailPageProps) {
  await requireAdminSession();
  const { id } = await params;

  let data;
  try {
    data = await getBookingDetail(id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="info">Fase 1.2</Badge>
          </div>
          <h1 className="mt-4 font-display text-headline-lg-mobile tracking-[-0.02em] text-on-surface sm:text-headline-lg">
            Detail Booking {data.booking.bookingCode}
          </h1>
          <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
            Rincian reservasi armada, snapshot invoice, status hold, data penyewa, dan audit riwayat.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink
            href={`/api/v1/admin/handovers/booking/${data.booking.id}/pdf`}
            icon="description"
            rel="noopener noreferrer"
            target="_blank"
            variant="outline"
          >
            Cetak Berita Acara
          </ButtonLink>
          <ButtonLink href="/booking" icon="arrow_back" variant="outline">
            Kembali ke Daftar
          </ButtonLink>
        </div>
      </section>

      <BookingDetailView initialData={data} />
    </div>
  );
}