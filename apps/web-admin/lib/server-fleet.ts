import 'server-only';

import {
  adminVehicleDetailSchema,
  createApiClient,
  vehicleListResponseSchema,
  type AdminVehicleDetail,
  type VehicleListQuery,
  type VehicleListResponse,
} from '@fa/shared';
import { cookies } from 'next/headers';

import { ApiError } from '@fa/shared';

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

function buildVehicleListQuery(query: VehicleListQuery): string {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('limit', String(query.limit));
  params.set('sort', query.sort);
  if (query.search) params.set('search', query.search);
  if (query.status) params.set('status', query.status);
  if (query.category) params.set('category', query.category);
  if (query.transmission) params.set('transmission', query.transmission);
  if (query.fuelType) params.set('fuelType', query.fuelType);
  return params.toString();
}

export async function listVehicles(query: VehicleListQuery): Promise<VehicleListResponse> {
  const client = await createServerAdminClient();
  return client.get(`/admin/vehicles?${buildVehicleListQuery(query)}`, vehicleListResponseSchema);
}

export async function getVehicleDetail(id: string): Promise<AdminVehicleDetail> {
  const client = await createServerAdminClient();
  return client.get(`/admin/vehicles/${id}`, adminVehicleDetailSchema);
}

export function isAuthFailure(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}