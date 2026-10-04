'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import type { VehicleListQuery, VehicleStatus } from '@fa/shared';
import { Button, ButtonLink, Card, Input, Segmented } from '@fa/ui';

export interface FleetToolbarProps {
  query: VehicleListQuery;
  superadmin: boolean;
}

type StatusFilter = VehicleStatus | 'all';
type SortFilter = VehicleListQuery['sort'];

const STATUS_OPTIONS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Semua' },
  { value: 'AVAILABLE', label: 'Siap sewa' },
  { value: 'HELD', label: 'Ditahan' },
  { value: 'MAINTENANCE', label: 'Perawatan' },
  { value: 'INACTIVE', label: 'Nonaktif' },
  { value: 'RENTED', label: 'Disewa' },
];

const SORT_OPTIONS: ReadonlyArray<{ value: SortFilter; label: string }> = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'brand', label: 'Nama' },
  { value: 'rate_asc', label: 'Termurah' },
  { value: 'rate_desc', label: 'Termahal' },
  { value: 'year_desc', label: 'Termuda' },
];

function buildHref(next: Partial<VehicleListQuery>): string {
  const params = new URLSearchParams();
  params.set('page', String(next.page ?? 1));
  params.set('limit', String(next.limit ?? 20));
  params.set('sort', next.sort ?? 'newest');
  if (next.search) params.set('search', next.search);
  if (next.status) params.set('status', next.status);
  if (next.category) params.set('category', next.category);
  if (next.transmission) params.set('transmission', next.transmission);
  if (next.fuelType) params.set('fuelType', next.fuelType);
  return `/armada?${params.toString()}`;
}

export function FleetToolbar({ query, superadmin }: FleetToolbarProps) {
  const router = useRouter();
  const [search, setSearch] = useState(query.search ?? '');
  const statusValue: StatusFilter = query.status ?? 'all';

  function push(next: Partial<VehicleListQuery>) {
    router.push(buildHref({ ...query, page: 1, ...next }));
  }

  function submitSearch() {
    const trimmed = search.trim();
    push({ search: trimmed || undefined });
  }

  return (
    <Card padding="sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-1 items-end gap-2">
            <Input
              containerClassName="flex-1 sm:max-w-sm"
              id="fleet-toolbar-search"
              label="Cari armada"
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  submitSearch();
                }
              }}
              placeholder="Nama, plat, kategori"
              type="search"
              value={search}
            />
            <Button onClick={submitSearch} variant="outline">
              Cari
            </Button>
          </div>
          {superadmin ? (
            <ButtonLink href="/armada/baru" icon="add" variant="secondary">
              Tambah mobil
            </ButtonLink>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Segmented
            ariaLabel="Filter status armada"
            onChange={(value) =>
              push({ status: value === 'all' ? undefined : (value as VehicleStatus) })
            }
            options={STATUS_OPTIONS}
            value={statusValue}
          />
          <Segmented
            ariaLabel="Urutkan armada"
            onChange={(value) => push({ sort: value as SortFilter })}
            options={SORT_OPTIONS}
            value={query.sort}
          />
        </div>
      </div>
    </Card>
  );
}