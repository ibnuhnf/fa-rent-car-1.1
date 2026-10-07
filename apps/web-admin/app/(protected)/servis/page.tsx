import type { VehicleListQuery } from '@fa/shared';
import { requireAdminSession } from '../../../lib/server-api';
import {
  listVehicleMaintenances,
  getVehicleDocuments,
} from '../../../lib/server-operations';
import { listVehicles } from '../../../lib/server-fleet';

import { ServisPanel, type VehicleOption } from './ServisPanel';

export const metadata = { title: 'Servis & Dokumen Kendaraan' };

interface ServisRouteProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ServisRoute({ searchParams }: ServisRouteProps) {
  const session = await requireAdminSession();
  const isSuperadmin = session.user.role === 'SUPERADMIN';
  const raw = await searchParams;
  const selectedVehicleId = typeof raw.vehicleId === 'string' ? raw.vehicleId : '';

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
  const vehiclesResponse = await listVehicles(listQuery);
  const vehiclesList: VehicleOption[] = vehiclesResponse.vehicles.map((v) => ({
    id: v.id,
    brand: v.brand,
    model: v.model,
    variant: v.variant,
    plate: v.plate,
    mileage: v.mileage,
    status: v.status,
  }));

  const targetVehicleId =
    selectedVehicleId && vehiclesList.some((v) => v.id === selectedVehicleId)
      ? selectedVehicleId
      : vehiclesList[0]?.id ?? '';

  const [maintenances, documents] = targetVehicleId
    ? await Promise.all([
        listVehicleMaintenances(targetVehicleId),
        getVehicleDocuments(targetVehicleId),
      ])
    : [{ maintenances: [] }, { documents: { PAJAK: [], STNK: [], ASURANSI: [] } }];

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-display text-headline-lg-mobile tracking-[-0.02em] text-on-surface sm:text-headline-lg">
          Servis &amp; Perawatan Armada
        </h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Pencatatan riwayat servis berkala, biaya perbaikan, odometer, dan jadwal perawatan armada.
        </p>
      </section>

      <ServisPanel
        documents={documents.documents}
        maintenances={maintenances.maintenances}
        selectedVehicleId={targetVehicleId}
        superadmin={isSuperadmin}
        vehicles={vehiclesList}
      />
    </div>
  );
}
