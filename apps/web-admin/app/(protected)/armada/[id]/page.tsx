import { notFound } from 'next/navigation';

import { requireAdminSession } from '../../../../lib/server-api';
import { getVehicleDetail } from '../../../../lib/server-fleet';
import { VehicleDetailView } from './VehicleDetailView';

export const metadata = {
  title: 'Detail Armada',
};

interface VehicleDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function VehicleDetailPage({ params }: VehicleDetailPageProps) {
  const session = await requireAdminSession();
  const { id } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const vehicle = await getVehicleDetail(id).catch(() => null);
  if (!vehicle) notFound();

  return (
    <VehicleDetailView
      initialVehicle={vehicle}
      superadmin={session.user.role === 'SUPERADMIN'}
    />
  );
}