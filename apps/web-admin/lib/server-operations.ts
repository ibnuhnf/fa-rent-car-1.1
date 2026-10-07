import 'server-only';

import {
  dashboardOverviewResponseSchema,
  driverListResponseSchema,
  driverRatingsResponseSchema,
  driverScheduleResponseSchema,
  expenseListResponseSchema,
  maintenanceListResponseSchema,
  vehicleDocumentsResponseSchema,
  createApiClient,
  type DashboardOverviewResponse,
  type DriverListResponse,
  type DriverRatingsResponse,
  type DriverScheduleResponse,
  type ExpenseListResponse,
  type MaintenanceListResponse,
  type VehicleDocumentsResponse,
} from '@fa/shared';
import { cookies } from 'next/headers';

const apiBaseUrl = `${(process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:4000').replace(/\/+$/, '')}/api/v1`;

async function createServerAdminClient() {
  const cookieHeader = (await cookies()).toString();
  const fetchWithSession: typeof fetch = (input, init) => {
    const headers = new Headers(init?.headers);
    if (cookieHeader) headers.set('cookie', cookieHeader);
    return fetch(input, { ...init, cache: 'no-store', headers });
  };

  return createApiClient({ baseUrl: apiBaseUrl, fetch: fetchWithSession });
}

export async function listDrivers(): Promise<DriverListResponse> {
  const client = await createServerAdminClient();
  return client.get('/admin/drivers', driverListResponseSchema);
}

export async function getDriverRatings(driverId: string): Promise<DriverRatingsResponse> {
  const client = await createServerAdminClient();
  return client.get(`/admin/drivers/${driverId}/ratings`, driverRatingsResponseSchema);
}

export async function getDriverSchedule(driverId: string): Promise<DriverScheduleResponse> {
  const client = await createServerAdminClient();
  return client.get(`/admin/drivers/${driverId}/schedule`, driverScheduleResponseSchema);
}

export async function listExpenses(page = 1, limit = 50): Promise<ExpenseListResponse> {
  const client = await createServerAdminClient();
  return client.get(`/admin/finances/expenses?page=${page}&limit=${limit}`, expenseListResponseSchema);
}

export async function getDashboardOverview(): Promise<DashboardOverviewResponse> {
  const client = await createServerAdminClient();
  return client.get('/admin/dashboard/overview', dashboardOverviewResponseSchema);
}

export async function listVehicleMaintenances(vehicleId: string): Promise<MaintenanceListResponse> {
  const client = await createServerAdminClient();
  return client.get(`/admin/vehicles/${vehicleId}/maintenance`, maintenanceListResponseSchema);
}

export async function getVehicleDocuments(vehicleId: string): Promise<VehicleDocumentsResponse> {
  const client = await createServerAdminClient();
  return client.get(`/admin/vehicles/${vehicleId}/documents`, vehicleDocumentsResponseSchema);
}
