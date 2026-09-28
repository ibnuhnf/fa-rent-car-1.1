import { paginationSchema } from '@fa/shared';
import { Badge, Button, ButtonLink, Card, Icon, Input } from '@fa/ui';
import { notFound } from 'next/navigation';

import { FleetList } from '../../../components/FleetList';
import { getFoundation } from '../../../lib/server-api';

export const metadata = {
  title: 'Manajemen Armada',
};

interface FleetPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FleetPage({ searchParams }: FleetPageProps) {
  const query = paginationSchema.safeParse(await searchParams);
  if (!query.success) notFound();

  const foundation = await getFoundation(query.data);
  const { pagination } = foundation;
  if (pagination.page > 1 && foundation.vehicles.length === 0) notFound();

  const hasDemoVehicles = foundation.vehicleCounts.demo > 0;
  const firstVehicle =
    foundation.vehicles.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const lastVehicle = firstVehicle > 0 ? firstVehicle + foundation.vehicles.length - 1 : 0;
  const pageUrl = (page: number) => `/armada?page=${page}&limit=${pagination.limit}`;

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge dot tone="info">
              Fondasi sistem
            </Badge>
            {hasDemoVehicles ? <Badge tone="warning">Data contoh</Badge> : null}
          </div>
          <h1 className="mt-4 font-display text-headline-lg-mobile tracking-[-0.02em] text-on-surface sm:text-headline-lg">
            Manajemen Armada
          </h1>
          <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
            Daftar baca-saja dari endpoint fondasi. Penambahan, perubahan, tarif, dan foto armada
            tersedia pada Fase 1.
          </p>
        </div>
      </section>

      {hasDemoVehicles ? (
        <Card className="flex items-start gap-3" padding="sm" tone="warning">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-lowest text-on-warning-container">
            <Icon name="science" size="md" />
          </span>
          <p className="text-body-md text-on-warning-container">
            Armada bertanda data contoh berasal dari seed pengembangan. Tarif contoh bukan informasi
            ketersediaan atau penawaran bisnis saat ini.
          </p>
        </Card>
      ) : null}

      <FleetList vehicles={foundation.vehicles} />

      <Card padding="sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-body-md text-on-surface-variant">
            Armada {firstVehicle}–{lastVehicle} dari {pagination.total} unit terdaftar.
          </p>
          <form action="/armada" className="flex flex-wrap items-end gap-2" method="get">
            <input name="page" type="hidden" value="1" />
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
