import {
  vehicleListQuerySchema,
  type VehicleListQuery,
} from '@fa/shared';
import { Badge, Button, ButtonLink, Card, Input } from '@fa/ui';
import { notFound } from 'next/navigation';

import { FleetList } from '../../../components/FleetList';
import { FleetToolbar } from '../../../components/FleetToolbar';
import { requireAdminSession } from '../../../lib/server-api';
import { listVehicles } from '../../../lib/server-fleet';

export const metadata = {
  title: 'Manajemen Armada',
};

interface FleetPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FleetPage({ searchParams }: FleetPageProps) {
  const session = await requireAdminSession();
  const parsed = vehicleListQuerySchema.safeParse(await searchParams);
  if (!parsed.success) notFound();
  const query: VehicleListQuery = parsed.data;

  const { vehicles, pagination } = await listVehicles(query);
  if (pagination.page > 1 && vehicles.length === 0) notFound();

  const superadmin = session.user.role === 'SUPERADMIN';
  const firstVehicle = vehicles.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const lastVehicle = firstVehicle > 0 ? firstVehicle + vehicles.length - 1 : 0;
  const pageUrl = (page: number) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(query.limit));
    if (query.search) params.set('search', query.search);
    if (query.status) params.set('status', query.status);
    if (query.category) params.set('category', query.category);
    if (query.transmission) params.set('transmission', query.transmission);
    if (query.fuelType) params.set('fuelType', query.fuelType);
    params.set('sort', query.sort);
    return `/armada?${params.toString()}`;
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge dot tone="info">
              Fase 1
            </Badge>
            {superadmin ? <Badge tone="success">Mode superadmin</Badge> : null}
          </div>
          <h1 className="mt-4 font-display text-headline-lg-mobile tracking-[-0.02em] text-on-surface sm:text-headline-lg">
            Manajemen Armada
          </h1>
          <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
            Kelola unit armada, tarif harian, dan status ketersediaan dari endpoint admin Fase 1.
          </p>
        </div>
      </section>

      <FleetToolbar query={query} superadmin={superadmin} />

      <FleetList superadmin={superadmin} vehicles={vehicles} />

      <Card padding="sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-body-md text-on-surface-variant">
            Armada {firstVehicle}–{lastVehicle} dari {pagination.total} unit terdaftar.
          </p>
          <form action="/armada" className="flex flex-wrap items-end gap-2" method="get">
            <input name="page" type="hidden" value="1" />
            {query.search ? <input name="search" type="hidden" value={query.search} /> : null}
            {query.status ? <input name="status" type="hidden" value={query.status} /> : null}
            {query.category ? <input name="category" type="hidden" value={query.category} /> : null}
            {query.transmission ? (
              <input name="transmission" type="hidden" value={query.transmission} />
            ) : null}
            {query.fuelType ? <input name="fuelType" type="hidden" value={query.fuelType} /> : null}
            <input name="sort" type="hidden" value={query.sort} />
            <Input
              containerClassName="w-44"
              defaultValue={pagination.limit}
              id="fleet-page-limit"
              inputMode="numeric"
              label="Armada per halaman"
              max={100}
              min={1}
              name="limit"
              required
              step={1}
              type="number"
            />
            <Button type="submit" variant="outline">
              Terapkan
            </Button>
          </form>
        </div>
        <nav
          aria-label="Paginasi armada"
          className="mt-4 flex flex-col gap-3 border-t border-surface-highest pt-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p aria-current="page" className="text-caption text-on-surface-variant">
            Halaman {pagination.page} dari {Math.max(1, pagination.totalPages)}
          </p>
          <div className="flex flex-wrap gap-2">
            {pagination.hasPreviousPage ? (
              <ButtonLink href={pageUrl(pagination.page - 1)} rel="prev" variant="outline">
                Sebelumnya
              </ButtonLink>
            ) : (
              <Button disabled variant="outline">
                Sebelumnya
              </Button>
            )}
            {pagination.hasNextPage ? (
              <ButtonLink href={pageUrl(pagination.page + 1)} rel="next" variant="outline">
                Berikutnya
              </ButtonLink>
            ) : (
              <Button disabled variant="outline">
                Berikutnya
              </Button>
            )}
          </div>
        </nav>
        {!pagination.hasNextPage && pagination.page < pagination.totalPages ? (
          <p className="mt-3 text-caption text-on-surface-variant">
            Batas penelusuran tercapai. Ringkasan jumlah tetap mencakup seluruh armada.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
