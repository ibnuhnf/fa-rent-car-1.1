'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { formatRupiah, type VehicleSummary } from '@fa/shared';
import { Badge, Button, ButtonLink, Card, EmptyState, Input, Table, type TableColumn } from '@fa/ui';

import { vehicleDetail, vehicleName, vehicleStatusMeta } from '../lib/foundation';
import { useHydrated } from '../lib/use-hydrated';

interface FleetListProps {
  vehicles: ReadonlyArray<VehicleSummary>;
  superadmin?: boolean;
}

function vehicleSearchText(vehicle: VehicleSummary): string {
  return [
    vehicleName(vehicle),
    vehicle.variant,
    vehicle.plate,
    vehicle.category,
    vehicle.transmission,
    vehicle.fuelType,
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('id-ID');
}

function VehicleStatus({ vehicle }: { vehicle: VehicleSummary }) {
  const meta = vehicleStatusMeta[vehicle.status];

  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

function DailyRate({ vehicle }: { vehicle: VehicleSummary }) {
  if (vehicle.dailyRate === null) {
    return <span className="text-body-md text-on-surface-variant">Tarif belum ditentukan</span>;
  }

  return (
    <span className="block">
      <span className="block text-caption uppercase tracking-[0.05em] text-on-surface-variant">
        {vehicle.isDemo ? 'Tarif contoh' : 'Tarif harian'}
      </span>
      <span className="mt-0.5 block tabular-nums text-body-md font-semibold text-secondary">
        {formatRupiah(vehicle.dailyRate)}
      </span>
    </span>
  );
}

function VehiclePlaceholder({ vehicle }: { vehicle: VehicleSummary }) {
  return (
    <div className="flex min-h-20 min-w-24 items-center justify-center rounded-xl bg-surface-low px-3 text-center text-caption text-on-surface-variant">
      {vehicle.isDemo ? 'Foto belum ditambahkan' : 'Foto belum tersedia'}
    </div>
  );
}

export function FleetList({ vehicles, superadmin = false }: FleetListProps) {
  const hydrated = useHydrated();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase('id-ID');
  const filteredVehicles = useMemo(
    () =>
      vehicles.filter(
        (vehicle) => !normalizedQuery || vehicleSearchText(vehicle).includes(normalizedQuery),
      ),
    [normalizedQuery, vehicles],
  );

  useEffect(() => {
    const focusFromHash = () => {
      if (window.location.hash === '#fleet-search') searchRef.current?.focus();
    };
    const frame = window.requestAnimationFrame(focusFromHash);

    function focusSearch(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase('id-ID') === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }

    window.addEventListener('keydown', focusSearch);
    window.addEventListener('hashchange', focusFromHash);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', focusSearch);
      window.removeEventListener('hashchange', focusFromHash);
    };
  }, []);

  const columns: ReadonlyArray<TableColumn<VehicleSummary>> = [
    {
      key: 'vehicle',
      header: 'Armada',
      render: (vehicle) => (
        <div className="flex min-w-[16rem] items-center gap-3">
          <VehiclePlaceholder vehicle={vehicle} />
          <span>
            <span className="block font-semibold text-on-surface">{vehicleName(vehicle)}</span>
            <span className="mt-0.5 block text-caption text-on-surface-variant">
              {vehicleDetail(vehicle)}
            </span>
          </span>
        </div>
      ),
    },
    {
      key: 'plate',
      header: 'Plat',
      render: (vehicle) => (
        <span className="font-mono text-caption font-semibold text-on-surface">
          {vehicle.plate}
        </span>
      ),
    },
    {
      key: 'specification',
      header: 'Spesifikasi',
      render: (vehicle) => (
        <span className="block text-caption text-on-surface-variant">
          {vehicle.transmission === 'AUTOMATIC' ? 'Matic' : 'Manual'} · {vehicle.capacity} kursi ·{' '}
          {vehicle.luggageCount} koper
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (vehicle) => <VehicleStatus vehicle={vehicle} />,
    },
    {
      key: 'rate',
      header: 'Tarif',
      render: (vehicle) => <DailyRate vehicle={vehicle} />,
    },
    {
      key: 'action',
      header: 'Aksi',
      render: (vehicle) => (
        <ButtonLink href={`/armada/${vehicle.id}`} size="sm" variant="outline">
          Detail
        </ButtonLink>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Input
          ref={searchRef}
          containerClassName="w-full sm:max-w-md"
          disabled={!hydrated}
          hint="Tekan Ctrl/⌘ K untuk fokus pencarian. Hasil hanya dari armada yang termuat di halaman ini."
          id="fleet-search"
          label="Cari armada"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nama, plat, kategori, transmisi"
          type="search"
          value={query}
        />
        {superadmin ? (
          <ButtonLink href="/armada/baru" icon="add" variant="secondary">
            Tambah mobil
          </ButtonLink>
        ) : (
          <Button disabled icon="add" variant="primary">
            Tambah mobil · Perlu Superadmin
          </Button>
        )}
      </div>

      <p aria-live="polite" className="text-caption text-on-surface-variant">
        {filteredVehicles.length} dari {vehicles.length} armada ditampilkan.
      </p>

      {filteredVehicles.length === 0 ? (
        <EmptyState
          description="Coba gunakan nama, plat, kategori, atau transmisi lain."
          icon="search_off"
          title="Armada tidak ditemukan"
        />
      ) : (
        <>
          <div className="grid gap-4 md:hidden">
            {filteredVehicles.map((vehicle) => (
              <Card key={vehicle.id} padding="sm">
                <div className="flex gap-4">
                  <VehiclePlaceholder vehicle={vehicle} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h2 className="text-title text-on-surface">{vehicleName(vehicle)}</h2>
                        <p className="mt-1 text-caption text-on-surface-variant">
                          {vehicleDetail(vehicle)}
                        </p>
                      </div>
                      <VehicleStatus vehicle={vehicle} />
                    </div>
                    <p className="mt-3 font-mono text-caption text-on-surface-variant">
                      {vehicle.plate}
                    </p>
                    <p className="mt-1 text-caption text-on-surface-variant">
                      {vehicle.transmission === 'AUTOMATIC' ? 'Matic' : 'Manual'} ·{' '}
                      {vehicle.capacity} kursi · {vehicle.luggageCount} koper
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <DailyRate vehicle={vehicle} />
                      <ButtonLink href={`/armada/${vehicle.id}`} size="sm" variant="outline">
                        Detail
                      </ButtonLink>
                    </div>
                  </div>
                </div>
                <p className="mt-4 border-t border-surface-highest pt-3 text-caption text-on-surface-variant">
                  {vehicle.facilities.length > 0
                    ? vehicle.facilities.join(' · ')
                    : 'Fasilitas belum dicatat'}
                </p>
              </Card>
            ))}
          </div>
          <Table
            caption="Daftar armada fondasi"
            className="hidden md:block"
            columns={columns}
            getRowKey={(vehicle) => vehicle.id}
            rows={filteredVehicles}
          />
        </>
      )}
    </div>
  );
}
