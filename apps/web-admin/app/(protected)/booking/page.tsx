import { formatDateTimeWib, formatRupiah, type BookingListQuery, type BookingStatus } from '@fa/shared';
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Input,
  Table,
  type BadgeTone,
  type TableColumn,
} from '@fa/ui';
import { notFound } from 'next/navigation';
import { requireAdminSession } from '../../../lib/server-api';
import { listBookings } from '../../../lib/server-booking';

export const metadata = {
  title: 'Manajemen Booking',
};

const statusMeta: Record<BookingStatus, { label: string; tone: BadgeTone }> = {
  PENDING_VERIFICATION: { label: 'Menunggu Verifikasi', tone: 'warning' },
  ACTIVE: { label: 'Aktif / Disewa', tone: 'success' },
  COMPLETED: { label: 'Selesai', tone: 'neutral' },
  EXPIRED: { label: 'Kedaluwarsa', tone: 'danger' },
  CANCELLED: { label: 'Dibatalkan', tone: 'neutral' },
};

interface BookingPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BookingListPage({ searchParams }: BookingPageProps) {
  await requireAdminSession();
  const rawParams = await searchParams;

  let data;
  try {
    data = await listBookings(rawParams);
  } catch {
    notFound();
  }

  const { bookings, pagination } = data;
  const query = rawParams as Partial<BookingListQuery>;

  const columns: TableColumn<(typeof bookings)[number]>[] = [
    {
      key: 'code',
      header: 'Kode Booking',
      render: (b) => (
        <div>
          <span className="font-mono font-semibold text-secondary">{b.bookingCode}</span>
          <span className="block text-caption text-on-surface-variant">
            {formatDateTimeWib(b.createdAt)}
          </span>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Penyewa',
      render: (b) => (
        <div>
          <span className="font-medium text-on-surface">{b.customerName}</span>
          <span className="block font-mono text-caption text-on-surface-variant">
            {b.customerWhatsapp}
          </span>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Armada & Total',
      render: (b) => (
        <div>
          <span className="text-body-md text-on-surface">{b.itemCount} unit mobil</span>
          <span className="block tabular-nums font-semibold text-secondary">
            {formatRupiah(b.totalAmount)}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (b) => {
        const meta = statusMeta[b.status];
        return <Badge tone={meta.tone}>{meta.label}</Badge>;
      },
    },
    {
      key: 'hold',
      header: 'Batas Hold',
      render: (b) => {
        if (b.status !== 'PENDING_VERIFICATION') {
          return <span className="text-caption text-on-surface-variant">—</span>;
        }
        return (
          <span className="text-caption text-on-surface-variant">
            {formatDateTimeWib(b.holdExpiresAt)}
          </span>
        );
      },
    },
    {
      key: 'action',
      header: 'Aksi',
      render: (b) => (
        <ButtonLink href={`/booking/${b.id}`} size="sm" variant="outline">
          Detail
        </ButtonLink>
      ),
    },
  ];

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="info">Fase 1.2</Badge>
          </div>
          <h1 className="mt-4 font-display text-headline-lg-mobile tracking-[-0.02em] text-on-surface sm:text-headline-lg">
            Daftar Booking
          </h1>
          <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
            Kelola transaksi rental mobil, status hold 2 jam, verifikasi dokumen, dan konfirmasi pembayaran.
          </p>
        </div>

        <ButtonLink href="/booking/baru" icon="add" variant="primary">
          Booking Baru
        </ButtonLink>
      </section>

      <Card padding="sm">
        <form action="/booking" className="flex flex-wrap items-end gap-3" method="get">
          <Input
            containerClassName="w-64"
            defaultValue={typeof query.search === 'string' ? query.search : ''}
            id="filter-search"
            label="Cari Kode / Nama / WA"
            name="search"
            placeholder="FA-202609... / Nama"
          />

          <div>
            <label className="block text-label-md uppercase tracking-[0.06em] text-on-surface-variant">
              Status
            </label>
            <select
              className="mt-1.5 min-h-11 rounded-lg border border-surface-highest bg-surface-lowest px-3 text-body-md text-on-surface outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
              defaultValue={typeof query.status === 'string' ? query.status : ''}
              name="status"
            >
              <option value="">Semua Status</option>
              <option value="PENDING_VERIFICATION">Menunggu Verifikasi</option>
              <option value="ACTIVE">Aktif</option>
              <option value="COMPLETED">Selesai</option>
              <option value="EXPIRED">Kedaluwarsa</option>
              <option value="CANCELLED">Dibatalkan</option>
            </select>
          </div>

          <div>
            <label className="block text-label-md uppercase tracking-[0.06em] text-on-surface-variant">
              Urutan
            </label>
            <select
              className="mt-1.5 min-h-11 rounded-lg border border-surface-highest bg-surface-lowest px-3 text-body-md text-on-surface outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
              defaultValue={typeof query.sort === 'string' ? query.sort : 'newest'}
              name="sort"
            >
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
              <option value="hold_asc">Batas Hold Terdekat</option>
            </select>
          </div>

          <Button type="submit" variant="outline">
            Filter
          </Button>
        </form>
      </Card>

      <Table
        caption="Tabel daftar booking rental mobil"
        columns={columns}
        empty={
          <EmptyState
            action={
              <ButtonLink href="/booking/baru" icon="add" variant="primary">
                Buat Booking Manual
              </ButtonLink>
            }
            description="Belum ada data booking yang sesuai dengan kriteria filter."
            icon="event_note"
            title="Tidak ada booking ditemukan"
          />
        }
        getRowKey={(b) => b.id}
        rows={bookings}
      />

      {pagination.totalPages > 1 ? (
        <Card padding="sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-body-md text-on-surface-variant">
              Halaman {pagination.page} dari {pagination.totalPages} ({pagination.total} total transaksi)
            </p>

            <div className="flex gap-2">
              {pagination.hasPreviousPage ? (
                <ButtonLink
                  href={`/booking?page=${pagination.page - 1}&search=${query.search ?? ''}&status=${query.status ?? ''}&sort=${query.sort ?? 'newest'}`}
                  variant="outline"
                >
                  Sebelumnya
                </ButtonLink>
              ) : null}

              {pagination.hasNextPage ? (
                <ButtonLink
                  href={`/booking?page=${pagination.page + 1}&search=${query.search ?? ''}&status=${query.status ?? ''}&sort=${query.sort ?? 'newest'}`}
                  variant="outline"
                >
                  Berikutnya
                </ButtonLink>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}