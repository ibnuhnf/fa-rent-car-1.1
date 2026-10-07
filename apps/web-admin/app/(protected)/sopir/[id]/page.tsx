import type { DriverScheduleItem } from '@fa/shared';
import { formatDateTimeWib, formatRupiah } from '@fa/shared';
import { Badge, ButtonLink, Card, EmptyState, Icon, type BadgeTone } from '@fa/ui';
import { notFound } from 'next/navigation';

import { requireAdminSession } from '../../../../lib/server-api';
import {
  getDriverRatings,
  getDriverSchedule,
  listDrivers,
} from '../../../../lib/server-operations';

export const metadata = { title: 'Detail Sopir' };

interface DriverDetailPageProps {
  params: Promise<{ id: string }>;
}

const scheduleStatusMeta: Record<string, { label: string; tone: BadgeTone }> = {
  PENDING_VERIFICATION: { label: 'Menunggu Verifikasi', tone: 'warning' },
  ACTIVE: { label: 'Aktif', tone: 'info' },
  COMPLETED: { label: 'Selesai', tone: 'success' },
  EXPIRED: { label: 'Kedaluwarsa', tone: 'danger' },
  CANCELLED: { label: 'Dibatalkan', tone: 'neutral' },
};

function ratingLabel(score: number): string {
  if (score >= 5) return 'Sangat Baik';
  if (score >= 4) return 'Baik';
  if (score >= 3) return 'Cukup';
  if (score >= 2) return 'Kurang';
  return 'Buruk';
}

export default async function DriverDetailPage({ params }: DriverDetailPageProps) {
  await requireAdminSession();
  const { id } = await params;

  const [drivers, ratings, schedule] = await Promise.all([
    listDrivers(),
    getDriverRatings(id),
    getDriverSchedule(id),
  ]);

  const driver = drivers.drivers.find((candidate) => candidate.id === id);
  if (!driver) notFound();

  const averageScore =
    ratings.ratings.length > 0
      ? ratings.ratings.reduce((sum, rating) => sum + rating.score, 0) / ratings.ratings.length
      : 0;

  const activeJobs = schedule.schedule.filter(
    (item: DriverScheduleItem) => item.bookingStatus === 'ACTIVE',
  ).length;

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={driver.isActive ? 'success' : 'neutral'} dot>
              {driver.isActive ? 'Tersedia' : 'Nonaktif'}
            </Badge>
          </div>
          <h1 className="mt-4 font-display text-headline-lg-mobile tracking-[-0.02em] text-on-surface sm:text-headline-lg">
            {driver.name}
          </h1>
          <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
            Detail sopir: tarif harian, jadwal tugas aktif, dan penilaian customer.
          </p>
        </div>

        <ButtonLink href="/sopir" icon="arrow_back" variant="outline">
          Kembali ke Daftar Sopir
        </ButtonLink>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card padding="md">
          <span className="text-label-md uppercase tracking-[0.06em] text-on-surface-variant">
            Tarif Harian
          </span>
          <p className="mt-2 tabular-nums font-display text-headline-md font-bold text-secondary">
            {formatRupiah(driver.dailyRate)}
          </p>
        </Card>
        <Card padding="md">
          <span className="text-label-md uppercase tracking-[0.06em] text-on-surface-variant">
            Rating Rata-rata
          </span>
          <p className="mt-2 font-display text-headline-md font-bold text-on-surface">
            {ratings.ratings.length > 0
              ? `${averageScore.toFixed(1)} / 5.0`
              : 'Belum dinilai'}
          </p>
          <span className="text-caption text-on-surface-variant">
            {ratings.ratings.length} ulasan customer
          </span>
        </Card>
        <Card padding="md">
          <span className="text-label-md uppercase tracking-[0.06em] text-on-surface-variant">
            Tugas Aktif
          </span>
          <p className="mt-2 font-display text-headline-md font-bold text-on-surface">
            {activeJobs}
          </p>
          <span className="text-caption text-on-surface-variant">
            Dari {schedule.schedule.length} penugasan tercatat
          </span>
        </Card>
        <Card padding="md">
          <span className="text-label-md uppercase tracking-[0.06em] text-on-surface-variant">
            Kontak
          </span>
          <p className="mt-2 font-mono text-body-md text-on-surface">{driver.phone}</p>
          <p className="mt-1 font-mono text-caption text-on-surface-variant">
            SIM A: {driver.simNumber}
          </p>
        </Card>
      </div>

      {driver.notes ? (
        <Card padding="md">
          <span className="text-label-md uppercase tracking-[0.06em] text-on-surface-variant">
            Catatan Sopir
          </span>
          <p className="mt-2 text-body-md text-on-surface">{driver.notes}</p>
        </Card>
      ) : null}

      <Card padding="md">
        <h2 className="font-display text-title text-on-surface">Jadwal &amp; Riwayat Tugas</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Daftar penugasan sopir pada item booking, terbaru lebih dulu.
        </p>
        {schedule.schedule.length === 0 ? (
          <EmptyState
            className="mt-4"
            description="Sopir ini belum ditugaskan pada item booking mana pun."
            icon="calendar_month"
            title="Belum ada jadwal tugas"
          />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-body-md">
              <thead className="border-b border-surface-highest text-label-md uppercase tracking-[0.06em] text-on-surface-variant">
                <tr>
                  <th className="px-4 py-3">Periode</th>
                  <th className="px-4 py-3">Armada</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Kode Booking</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-highest">
                {schedule.schedule.map((item: DriverScheduleItem) => {
                  const meta = scheduleStatusMeta[item.bookingStatus] ?? {
                    label: item.bookingStatus,
                    tone: 'neutral' as BadgeTone,
                  };
                  return (
                    <tr key={item.id} className="hover:bg-surface-low">
                      <td className="whitespace-nowrap px-4 py-3 text-on-surface-variant">
                        {formatDateTimeWib(item.startDate)}
                        <span className="block text-caption">
                          s.d. {formatDateTimeWib(item.endDate)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="font-medium text-on-surface">{item.vehicleName}</span>
                        <span className="block font-mono text-caption text-on-surface-variant">
                          {item.plate}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-on-surface">{item.customerName}</span>
                        <span className="block font-mono text-caption text-on-surface-variant">
                          {item.customerWhatsapp}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-caption">
                        <a
                          className="text-secondary hover:underline"
                          href={`/booking/${item.bookingId}`}
                        >
                          {item.bookingCode}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card padding="md">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-title text-on-surface">Penilaian Customer</h2>
            <p className="mt-1 text-body-md text-on-surface-variant">
              Rating bintang dan ulasan setelah perjalanan selesai.
            </p>
          </div>
          {ratings.ratings.length > 0 ? (
            <span className="flex items-center gap-2 rounded-full bg-secondary-fixed px-3 py-1.5 text-label-md font-semibold text-on-secondary-fixed-variant">
              <Icon filled name="star" size="sm" />
              {averageScore.toFixed(1)} / 5.0 · {ratings.ratings.length} ulasan
            </span>
          ) : null}
        </div>

        {ratings.ratings.length === 0 ? (
          <EmptyState
            className="mt-4"
            description="Belum ada rating yang diberikan customer untuk sopir ini."
            icon="reviews"
            title="Belum ada penilaian"
          />
        ) : (
          <ul className="mt-4 space-y-3">
            {ratings.ratings.map((rating) => (
              <li
                className="flex flex-col gap-2 rounded-xl bg-surface-low p-4 sm:flex-row sm:items-start sm:justify-between"
                key={rating.id}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span aria-label={`Skor ${rating.score} dari 5`} className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Icon
                          filled={star <= rating.score}
                          key={star}
                          name="star"
                          size="sm"
                          className={star <= rating.score ? 'text-warning' : 'text-outline'}
                        />
                      ))}
                    </span>
                    <span className="text-caption text-on-surface-variant">
                      {ratingLabel(rating.score)}
                    </span>
                  </div>
                  {rating.feedback ? (
                    <p className="mt-1 text-body-md text-on-surface">{rating.feedback}</p>
                  ) : null}
                </div>
                <span className="shrink-0 text-caption text-on-surface-variant">
                  {formatDateTimeWib(rating.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
