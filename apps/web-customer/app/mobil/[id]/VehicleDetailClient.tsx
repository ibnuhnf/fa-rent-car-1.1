'use client';

import { formatRupiah, type PublicVehicleDetailResponse } from '@fa/shared';
import { Button, Card, Icon } from '@fa/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getPriceEstimate } from '../../../lib/api';
import { addToCart } from '../../../lib/cart';

interface VehicleDetailClientProps {
  vehicle: PublicVehicleDetailResponse;
}

export function VehicleDetailClient({ vehicle }: VehicleDetailClientProps) {
  const router = useRouter();

  // Tanggal default: besok pagi s.d. lusa pagi
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const dayAfter = new Date(today.getTime() + 48 * 60 * 60 * 1000);

  const formatInput = (d: Date) => d.toISOString().slice(0, 16);

  const [startDate, setStartDate] = useState(formatInput(tomorrow));
  const [endDate, setEndDate] = useState(formatInput(dayAfter));
  const [withDriver, setWithDriver] = useState(false);

  // Estimasi state
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<{
    days: number;
    total: number;
    vehicleAmount: number;
    driverAmount: number;
  } | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  // Active photo
  const [activePhoto, setActivePhoto] = useState<string | null>(
    vehicle.primaryPhotoUrl || vehicle.photos[0]?.objectKey || null,
  );

  useEffect(() => {
    let active = true;
    if (new Date(endDate) <= new Date(startDate)) {
      setEstimateError('Tanggal selesai harus setelah tanggal mulai.');
      setEstimate(null);
      return;
    }

    setEstimating(true);
    setEstimateError(null);

    getPriceEstimate({
      vehicleId: vehicle.id,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      withDriver,
    })
      .then((res) => {
        if (active) {
          setEstimate({
            days: res.days,
            total: res.breakdown.total,
            vehicleAmount: res.breakdown.vehicleAmount,
            driverAmount: res.breakdown.driverAmount,
          });
        }
      })
      .catch((err) => {
        if (active) setEstimateError(err instanceof Error ? err.message : 'Gagal menghitung tarif.');
      })
      .finally(() => {
        if (active) setEstimating(false);
      });

    return () => {
      active = false;
    };
  }, [vehicle.id, startDate, endDate, withDriver]);

  const handleAddToCart = () => {
    addToCart({
      vehicleId: vehicle.id,
      vehicleName: `${vehicle.brand} ${vehicle.model}`,
      vehiclePlate: vehicle.plate,
      dailyRate: vehicle.dailyRate ?? 0,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      withDriver,
      estimatedTotal: estimate?.total,
    });
    router.push('/pesan');
  };

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="text-body-sm text-on-surface-variant">
        <a href="/mobil" className="text-secondary hover:underline">
          &larr; Kembali ke Katalog
        </a>
        <span className="mx-2">/</span>
        <span>
          {vehicle.brand} {vehicle.model}
        </span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Kolom Kiri: Galeri + Spesifikasi */}
        <div className="space-y-6 lg:col-span-2">
          {/* Galeri Foto */}
          <Card padding="none" className="overflow-hidden">
            <div className="relative aspect-16/10 w-full bg-surface-low overflow-hidden">
              {activePhoto ? (
                <img
                  src={activePhoto}
                  alt={`${vehicle.brand} ${vehicle.model}`}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-on-surface-variant">
                  <Icon name="directions_car" size="lg" />
                </div>
              )}
            </div>

            {vehicle.photos.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto p-4 bg-surface-lowest">
                {vehicle.photos.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setActivePhoto(p.objectKey)}
                    className={`relative size-20 shrink-0 overflow-hidden rounded-lg border-2 ${
                      activePhoto === p.objectKey ? 'border-secondary' : 'border-transparent'
                    }`}
                  >
                    <img src={p.objectKey} alt="Foto armada" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </Card>

          {/* Spesifikasi & Fasilitas */}
          <Card padding="md">
            <h2 className="font-display text-title font-bold text-on-surface">Spesifikasi Armada</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 text-body-sm">
              <div className="rounded-lg bg-surface-low p-3">
                <dt className="text-caption text-on-surface-variant">Kategori</dt>
                <dd className="mt-1 font-semibold text-on-surface">{vehicle.category}</dd>
              </div>
              <div className="rounded-lg bg-surface-low p-3">
                <dt className="text-caption text-on-surface-variant">Transmisi</dt>
                <dd className="mt-1 font-semibold text-on-surface">{vehicle.transmission}</dd>
              </div>
              <div className="rounded-lg bg-surface-low p-3">
                <dt className="text-caption text-on-surface-variant">Bahan Bakar</dt>
                <dd className="mt-1 font-semibold text-on-surface">{vehicle.fuelType}</dd>
              </div>
              <div className="rounded-lg bg-surface-low p-3">
                <dt className="text-caption text-on-surface-variant">Kapasitas</dt>
                <dd className="mt-1 font-semibold text-on-surface">{vehicle.capacity} Orang</dd>
              </div>
            </dl>

            {vehicle.facilities.length > 0 ? (
              <div className="mt-6">
                <h3 className="text-body-md font-semibold text-on-surface">Fasilitas &amp; Fitur</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {vehicle.facilities.map((fac) => (
                    <span
                      key={fac}
                      className="inline-flex items-center gap-1 rounded-full bg-surface-low px-3 py-1 text-label-md text-on-surface"
                    >
                      <Icon name="check_circle" size="sm" className="text-secondary" />
                      {fac}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {vehicle.description ? (
              <div className="mt-6 border-t border-surface-highest pt-4 text-body-md text-on-surface-variant">
                <p>{vehicle.description}</p>
              </div>
            ) : null}
          </Card>
        </div>

        {/* Kolom Kanan: Kalkulator Tarif Realtime & Booking Box */}
        <div className="space-y-6">
          <Card padding="md" className="sticky top-24">
            <div className="border-b border-surface-highest pb-4">
              <span className="text-caption uppercase tracking-wider text-on-surface-variant">
                Tarif Sewa
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="tabular-nums text-headline-md font-bold text-secondary">
                  {vehicle.dailyRate ? formatRupiah(vehicle.dailyRate) : 'Hubungi Kami'}
                </span>
                <span className="text-caption text-on-surface-variant">/ hari</span>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-label-md font-semibold text-on-surface mb-1">
                  Mulai Sewa
                </label>
                <input
                  type="datetime-local"
                  className="w-full rounded-button border border-surface-highest bg-surface-low px-3 py-2 text-body-md"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-label-md font-semibold text-on-surface mb-1">
                  Selesai Sewa
                </label>
                <input
                  type="datetime-local"
                  className="w-full rounded-button border border-surface-highest bg-surface-low px-3 py-2 text-body-md"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <label className="flex items-center gap-2.5 rounded-lg bg-surface-low p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={withDriver}
                  onChange={(e) => setWithDriver(e.target.checked)}
                  className="size-4 text-secondary rounded"
                />
                <div className="text-body-sm">
                  <span className="font-semibold text-on-surface">Pakai Sopir Profesional</span>
                  <span className="block text-caption text-on-surface-variant">
                    +{formatRupiah(vehicle.rate?.driverPerDay ?? 150000)} / hari
                  </span>
                </div>
              </label>

              {/* Rincian Estimasi */}
              {estimateError ? (
                <div className="rounded-lg bg-error-container p-3 text-caption text-on-error-container">
                  {estimateError}
                </div>
              ) : estimate ? (
                <div className="rounded-xl border border-surface-highest bg-surface-low p-4 space-y-2 text-body-sm">
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Sewa Mobil ({estimate.days} hari)</span>
                    <span className="tabular-nums font-medium">
                      {formatRupiah(estimate.vehicleAmount)}
                    </span>
                  </div>
                  {estimate.driverAmount > 0 ? (
                    <div className="flex justify-between text-on-surface-variant">
                      <span>Jasa Sopir ({estimate.days} hari)</span>
                      <span className="tabular-nums font-medium">
                        {formatRupiah(estimate.driverAmount)}
                      </span>
                    </div>
                  ) : null}
                  <div className="border-t border-surface-highest pt-2 flex justify-between font-bold text-on-surface">
                    <span>Total Estimasi</span>
                    <span className="tabular-nums text-secondary text-title">
                      {formatRupiah(estimate.total)}
                    </span>
                  </div>
                </div>
              ) : null}

              <Button
                className="w-full mt-2"
                disabled={estimating || !!estimateError}
                onClick={handleAddToCart}
                size="lg"
                variant="secondary"
              >
                Pesan Mobil Ini &rarr;
              </Button>

              <p className="text-center text-[11px] text-on-surface-variant">
                Tanpa DP/deposit. Pembayaran 100% di muka setelah invoice terbit.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
