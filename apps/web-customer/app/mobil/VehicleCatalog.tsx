'use client';

import { formatRupiah, type PublicVehicleDto } from '@fa/shared';
import { Badge, Button, Card, Icon } from '@fa/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getPublicVehicles } from '../../lib/api';
import { addToCart } from '../../lib/cart';

export function VehicleCatalog() {
  const [vehicles, setVehicles] = useState<PublicVehicleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [category, setCategory] = useState<string>('');
  const [transmission, setTransmission] = useState<string>('');
  const [sort, setSort] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    getPublicVehicles({
      category: (category as never) || undefined,
      transmission: (transmission as never) || undefined,
      sort,
      limit: 30,
    })
      .then((res) => {
        if (active) setVehicles(res.vehicles);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Gagal memuat mobil.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [category, transmission, sort]);

  const handleQuickAdd = (v: PublicVehicleDto) => {
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    addToCart({
      vehicleId: v.id,
      vehicleName: `${v.brand} ${v.model}`,
      vehiclePlate: v.plate,
      dailyRate: v.dailyRate ?? 0,
      startDate: today.toISOString(),
      endDate: tomorrow.toISOString(),
      withDriver: false,
    });
    setToast(`${v.brand} ${v.model} ditambahkan ke keranjang.`);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="space-y-6">
      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-secondary px-4 py-3 text-body-md font-medium text-surface-lowest shadow-card-hover">
          {toast}
        </div>
      ) : null}

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-card border border-surface-highest bg-surface-lowest p-4">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <select
            className="rounded-button border border-surface-highest bg-surface-low px-3 py-2 text-body-md"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Semua Kategori</option>
            <option value="MPV">MPV (Keluarga)</option>
            <option value="SUV">SUV (Tangguh)</option>
            <option value="CITY_CAR">City Car (Ringkas)</option>
            <option value="SEDAN">Sedan (Mewah)</option>
            <option value="VAN">Van / Rombongan</option>
          </select>

          <select
            className="rounded-button border border-surface-highest bg-surface-low px-3 py-2 text-body-md"
            value={transmission}
            onChange={(e) => setTransmission(e.target.value)}
          >
            <option value="">Semua Transmisi</option>
            <option value="MANUAL">Manual</option>
            <option value="AUTOMATIC">Matic</option>
          </select>

          <select
            className="rounded-button border border-surface-highest bg-surface-low px-3 py-2 text-body-md"
            value={sort}
            onChange={(e) => setSort(e.target.value as never)}
          >
            <option value="newest">Terbaru</option>
            <option value="price_asc">Harga Termurah</option>
            <option value="price_desc">Harga Tertinggi</option>
          </select>
        </div>

        <span className="text-caption text-on-surface-variant">
          Ditemukan {vehicles.length} armada
        </span>
      </div>

      {loading ? (
        <div className="py-20 text-center text-body-md text-on-surface-variant">
          Memuat armada tersedia…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-error bg-error-container p-6 text-center text-on-error-container">
          <p className="font-semibold">Gagal memuat katalog</p>
          <p className="mt-1 text-body-md">{error}</p>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="rounded-card border border-surface-highest bg-surface-lowest p-12 text-center text-on-surface-variant">
          <p className="text-title font-semibold">Tidak ada mobil yang cocok</p>
          <p className="mt-1 text-body-md">Coba ubah kombinasi filter kategori atau transmisi.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => (
            <Card key={v.id} padding="none" className="flex flex-col overflow-hidden">
              <div className="relative aspect-16/10 w-full bg-surface-low overflow-hidden">
                {v.primaryPhotoUrl ? (
                  <img
                    src={v.primaryPhotoUrl}
                    alt={`${v.brand} ${v.model}`}
                    className="size-full object-cover transition duration-300 hover:scale-105"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-on-surface-variant">
                    <Icon name="directions_car" size="lg" />
                  </div>
                )}
                <div className="absolute top-3 right-3 flex gap-1">
                  <Badge tone={v.transmission === 'AUTOMATIC' ? 'info' : 'neutral'}>
                    {v.transmission === 'AUTOMATIC' ? 'Matic' : 'Manual'}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-title font-semibold text-on-surface">
                      {v.brand} {v.model}
                    </h3>
                    <p className="text-caption text-on-surface-variant">
                      {v.variant || `${v.year} · ${v.category}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-on-surface-variant">Mulai</span>
                    <p className="tabular-nums text-title font-bold text-secondary">
                      {v.dailyRate ? formatRupiah(v.dailyRate) : 'Hubungi WA'}
                    </p>
                    <span className="text-[10px] text-on-surface-variant">/ hari</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 border-y border-surface-highest py-3 text-caption text-on-surface-variant">
                  <div className="flex items-center gap-1.5">
                    <Icon name="group" size="sm" />
                    <span>{v.capacity} Kursi</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Icon name="luggage" size="sm" />
                    <span>{v.luggageCount} Koper</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Icon name="local_gas_station" size="sm" />
                    <span>{v.fuelType}</span>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2">
                  <Link
                    href={`/mobil/${v.id}`}
                    className="flex-1 rounded-button border border-surface-highest bg-surface-low py-2 text-center text-label-md font-semibold text-on-surface hover:bg-surface-high"
                  >
                    Detail &amp; Tarif
                  </Link>
                  <Button onClick={() => handleQuickAdd(v)} size="md" variant="secondary">
                    + Keranjang
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
