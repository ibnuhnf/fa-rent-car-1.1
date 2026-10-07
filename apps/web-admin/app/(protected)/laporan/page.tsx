import type { VehicleListQuery } from '@fa/shared';
import { formatRupiah } from '@fa/shared';
import { Badge, ButtonLink, Card, Icon } from '@fa/ui';

import { requireAdminSession } from '../../../lib/server-api';
import { listVehicles } from '../../../lib/server-fleet';
import { getDashboardOverview } from '../../../lib/server-operations';

export const metadata = { title: 'Laporan Operasional' };

export default async function LaporanPage() {
  await requireAdminSession();

  const listQuery: VehicleListQuery = {
    page: 1,
    limit: 100,
    sort: 'newest',
    search: '',
    category: undefined,
    transmission: undefined,
    fuelType: undefined,
    status: undefined,
  };

  const [overview, fleetData] = await Promise.all([
    getDashboardOverview(),
    listVehicles(listQuery),
  ]);

  const vehicles = fleetData.vehicles;

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header Halaman */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="info" dot>
              Operasional
            </Badge>
          </div>
          <h1 className="mt-4 font-display text-headline-lg-mobile tracking-[-0.02em] text-on-surface sm:text-headline-lg">
            Laporan Operasional &amp; Armada
          </h1>
          <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
            Ringkasan keuangan, laporan kinerja per unit kendaraan, dan ekspor data ke format CSV.
          </p>
        </div>
      </section>

      {/* Ringkasan Keuangan & Utilisasi */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card padding="md">
          <span className="text-label-md uppercase tracking-[0.06em] text-on-surface-variant">
            Pendapatan Bulan Ini
          </span>
          <p className="mt-2 tabular-nums font-display text-headline-md font-bold text-secondary">
            {formatRupiah(overview.monthlyRevenue)}
          </p>
          <span className="text-caption text-on-surface-variant">Dari booking terkonfirmasi</span>
        </Card>

        <Card padding="md">
          <span className="text-label-md uppercase tracking-[0.06em] text-on-surface-variant">
            Pengeluaran Bulan Ini
          </span>
          <p className="mt-2 tabular-nums font-display text-headline-md font-bold text-on-surface">
            {formatRupiah(overview.monthlyExpenses)}
          </p>
          <span className="text-caption text-on-surface-variant">Biaya operasional tercatat</span>
        </Card>

        <Card padding="md">
          <span className="text-label-md uppercase tracking-[0.06em] text-on-surface-variant">
            Laba Bersih Operasional
          </span>
          <p
            className={`mt-2 tabular-nums font-display text-headline-md font-bold ${
              overview.netIncome >= 0 ? 'text-success' : 'text-error'
            }`}
          >
            {formatRupiah(overview.netIncome)}
          </p>
          <span className="text-caption text-on-surface-variant">Pendapatan - Pengeluaran</span>
        </Card>

        <Card padding="md">
          <span className="text-label-md uppercase tracking-[0.06em] text-on-surface-variant">
            Ketersediaan Armada
          </span>
          <p className="mt-2 tabular-nums font-display text-headline-md font-bold text-on-surface">
            {overview.availableVehicles} / {overview.totalVehicles} Unit
          </p>
          <span className="text-caption text-on-surface-variant">
            {overview.activeBookings} unit sedang aktif disewa
          </span>
        </Card>
      </div>

      {/* Panel Unduh Berkas CSV */}
      <Card padding="md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-title text-on-surface">Unduh Laporan Data (CSV)</h2>
            <p className="mt-1 text-body-md text-on-surface-variant">
              Ekspor rekapitulasi data lengkap untuk kebutuhan analisis, pembukuan, atau arsip akuntansi.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <ButtonLink
              href="/api/v1/admin/bookings/export"
              icon="download"
              target="_blank"
              variant="secondary"
            >
              Unduh CSV Booking
            </ButtonLink>

            <ButtonLink
              href="/api/v1/admin/vehicles/export"
              icon="download"
              target="_blank"
              variant="outline"
            >
              Unduh CSV Armada
            </ButtonLink>
          </div>
        </div>
      </Card>

      {/* Laporan Kinerja Per Unit Kendaraan */}
      <Card padding="none">
        <div className="border-b border-surface-highest p-4 sm:p-6">
          <h2 className="font-display text-title text-on-surface">Laporan Kinerja per Kendaraan</h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Status ketersediaan, jarak tempuh (odometer), transmisi, dan tarif harian per unit armada.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-body-md">
            <thead className="border-b border-surface-highest bg-surface-low text-label-md uppercase tracking-[0.06em] text-on-surface-variant">
              <tr>
                <th className="px-4 py-3">Armada &amp; Nomor Plat</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Transmisi &amp; BBM</th>
                <th className="px-4 py-3">Odometer</th>
                <th className="px-4 py-3">Tarif / Hari</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-highest">
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-surface-low">
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="font-semibold text-on-surface">
                      {v.brand} {v.model} {v.variant}
                    </span>
                    <span className="block font-mono text-caption text-secondary font-semibold">
                      {v.plate} ({v.year})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    <Badge tone="neutral">{v.category}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-body-sm text-on-surface-variant">
                    {v.transmission} · {v.fuelType}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums font-mono text-on-surface">
                    {v.mileage.toLocaleString('id-ID')} km
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums font-semibold text-secondary">
                    {v.dailyRate ? formatRupiah(v.dailyRate) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={v.status === 'AVAILABLE' ? 'success' : v.status === 'RENTED' ? 'info' : 'warning'}>
                      {v.status}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <a
                        className="inline-flex items-center gap-1 text-caption text-secondary hover:underline"
                        href={`/servis?vehicleId=${v.id}`}
                      >
                        <Icon name="build" size="sm" />
                        Servis
                      </a>
                      <span className="text-on-surface-variant">·</span>
                      <a
                        className="inline-flex items-center gap-1 text-caption text-secondary hover:underline"
                        href={`/armada/${v.id}`}
                      >
                        Detail
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
