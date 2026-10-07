import type { DashboardOverviewResponse, FoundationResponse, VehicleStatus } from '@fa/shared';
import { formatDateTimeWib, formatRupiah } from '@fa/shared';
import { Badge, ButtonLink, Card, Icon, StatCard } from '@fa/ui';
import Link from 'next/link';

import { vehicleStatusMeta } from '../lib/foundation';

interface DashboardProps {
  foundation: FoundationResponse;
  overview: DashboardOverviewResponse;
}

const fleetStatusOrder: ReadonlyArray<VehicleStatus> = [
  'RENTED',
  'AVAILABLE',
  'HELD',
  'MAINTENANCE',
  'INACTIVE',
];

const distributionClasses: Record<VehicleStatus, string> = {
  RENTED: 'bg-secondary',
  AVAILABLE: 'bg-primary',
  HELD: 'bg-warning',
  MAINTENANCE: 'bg-error',
  INACTIVE: 'bg-surface-highest',
};

export function Dashboard({ foundation, overview }: DashboardProps) {
  const { vehicleCounts } = foundation;
  const totalVehicles = vehicleCounts.total;
  const rentedVehicles = vehicleCounts.byStatus.RENTED;
  const utilization = totalVehicles > 0 ? Math.round((rentedVehicles / totalVehicles) * 100) : null;
  const isDemoPreview = vehicleCounts.demo > 0;

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header Pusat Kendali */}
      <section className="flex flex-col gap-5 rounded-2xl bg-surface-lowest p-4 shadow-card sm:p-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge dot tone="success">
              Operasional Aktif
            </Badge>
            <span className="text-caption text-on-surface-variant">
              Diperbarui {formatDateTimeWib(foundation.checkedAt)}
            </span>
          </div>
          <h1 className="mt-4 text-headline-lg-mobile tracking-[-0.02em] text-on-surface sm:text-headline-lg">
            Pusat Kendali Operasional
          </h1>
          <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
            Ringkasan armada, pergerakan sewa hari ini, antrean verifikasi pembayaran, dan arus kas bulanan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/booking/baru" variant="secondary">
            + Booking Manual
          </ButtonLink>
          <ButtonLink href="/verifikasi" variant="outline">
            Antrean Verifikasi ({overview.pendingVerifications})
          </ButtonLink>
        </div>
      </section>

      {/* Grid Statistik Live */}
      <section
        aria-label="Ringkasan operasional live"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
      >
        <StatCard
          detail={`${overview.activeBookings} armada sedang jalan`}
          icon="car_rental"
          label="Sewa Aktif"
          value={String(overview.activeBookings)}
        />
        <StatCard
          detail="Menunggu KTP/Transfer"
          icon="verified_user"
          label="Perlu Verifikasi"
          tone={overview.pendingVerifications > 0 ? 'warning' : 'neutral'}
          value={String(overview.pendingVerifications)}
        />
        <StatCard
          detail={`Bersih: ${formatRupiah(overview.netIncome)}`}
          icon="payments"
          label="Pendapatan Bulan Ini"
          tone="success"
          value={formatRupiah(overview.monthlyRevenue)}
        />
        <StatCard
          detail={`${overview.todayCheckins} jadwal kembali`}
          icon="schedule"
          label="Serah Terima Hari Ini"
          tone="info"
          value={`${overview.todayCheckouts} Keluar`}
        />
      </section>

      {isDemoPreview ? (
        <Card
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          padding="sm"
          tone="info"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-lowest text-on-secondary-fixed-variant">
              <Icon name="science" size="md" />
            </span>
            <div>
              <p className="text-body-md font-semibold text-on-surface">Pratinjau data contoh</p>
              <p className="mt-0.5 text-caption text-on-secondary-fixed-variant">
                Sebagian armada berasal dari seed fondasi awal.
              </p>
            </div>
          </div>
          <Link
            className="text-body-md font-semibold text-on-secondary-fixed-variant underline-offset-4 hover:underline"
            href="/armada"
          >
            Lihat armada &rarr;
          </Link>
        </Card>
      ) : null}

      {/* Utilisasi Armada */}
      <section aria-labelledby="utilization-heading">
        <Card padding="md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary-fixed text-on-secondary-fixed-variant">
                <Icon name="directions_car" size="md" />
              </span>
              <div>
                <h2 className="text-title text-on-surface" id="utilization-heading">
                  Utilisasi &amp; Ketersediaan Armada
                </h2>
                <p className="mt-1 text-body-md text-on-surface-variant">
                  {overview.availableVehicles} dari {overview.totalVehicles} mobil non-demo siap disewa hari ini.
                </p>
              </div>
            </div>
            <div className="sm:text-right">
              <p className="tabular-nums text-headline-md text-on-surface">
                {utilization === null ? '0%' : `${utilization}%`}
              </p>
              <p className="text-caption text-on-surface-variant">Tingkat utilisasi armada</p>
            </div>
          </div>

          {totalVehicles > 0 ? (
            <>
              <div
                aria-label="Distribusi status armada"
                className="mt-6 flex h-2.5 overflow-hidden rounded-full bg-surface"
              >
                {fleetStatusOrder.map((status) => {
                  const count = vehicleCounts.byStatus[status];
                  if (count === 0) return null;
                  return (
                    <span
                      className={distributionClasses[status]}
                      key={status}
                      style={{ width: `${(count / totalVehicles) * 100}%` }}
                      title={`${vehicleStatusMeta[status].label}: ${count}`}
                    />
                  );
                })}
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
                {fleetStatusOrder.map((status) => {
                  const count = vehicleCounts.byStatus[status];
                  const meta = vehicleStatusMeta[status];
                  return (
                    <div className="flex items-center gap-2" key={status}>
                      <span
                        aria-hidden
                        className={`size-2.5 rounded-full ${distributionClasses[status]}`}
                      />
                      <div>
                        <dt className="text-caption uppercase tracking-[0.04em] text-on-surface-variant">
                          {meta.label}
                        </dt>
                        <dd className="mt-0.5 text-body-md font-semibold tabular-nums text-on-surface">
                          {count} unit
                        </dd>
                      </div>
                    </div>
                  );
                })}
              </dl>
            </>
          ) : null}
        </Card>
      </section>

      {/* Akses Cepat Operasional */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-surface-low text-secondary">
              <Icon name="calendar_month" size="md" />
            </span>
            <div>
              <h3 className="font-semibold text-on-surface">Kalender Armada</h3>
              <p className="text-caption text-on-surface-variant">Jadwal sewa per mobil</p>
            </div>
          </div>
          <div className="mt-4">
            <ButtonLink href="/kalender" size="sm" variant="outline" className="w-full">
              Buka Kalender &rarr;
            </ButtonLink>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-surface-low text-secondary">
              <Icon name="badge" size="md" />
            </span>
            <div>
              <h3 className="font-semibold text-on-surface">Sopir &amp; Driver</h3>
              <p className="text-caption text-on-surface-variant">Jadwal penugasan tugas</p>
            </div>
          </div>
          <div className="mt-4">
            <ButtonLink href="/sopir" size="sm" variant="outline" className="w-full">
              Kelola Sopir &rarr;
            </ButtonLink>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-surface-low text-secondary">
              <Icon name="payments" size="md" />
            </span>
            <div>
              <h3 className="font-semibold text-on-surface">Buku Kas &amp; Pengeluaran</h3>
              <p className="text-caption text-on-surface-variant">BBM, servis, uang jalan</p>
            </div>
          </div>
          <div className="mt-4">
            <ButtonLink href="/keuangan" size="sm" variant="outline" className="w-full">
              Buka Keuangan &rarr;
            </ButtonLink>
          </div>
        </Card>
      </section>
    </div>
  );
}
