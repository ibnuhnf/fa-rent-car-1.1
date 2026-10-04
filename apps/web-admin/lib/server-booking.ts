import 'server-only';

import {
  bookingDetailResponseSchema,
  bookingListQuerySchema,
  bookingListResponseSchema,
  createApiClient,
  type BookingDetailResponse,
  type BookingListResponse,
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

export async function listBookings(
  raw: Record<string, string | string[] | undefined>,
): Promise<BookingListResponse> {
  const parsed = bookingListQuerySchema.safeParse(raw);
  if (!parsed.success) throw new Error('BOOKING_QUERY_INVALID');

  const query = parsed.data;
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('limit', String(query.limit));
  params.set('sort', query.sort);
  if (query.status) params.set('status', query.status);
  if (query.search) params.set('search', query.search);
  if (query.customerId) params.set('customerId', query.customerId);
  if (query.vehicleId) params.set('vehicleId', query.vehicleId);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);

  const client = await createServerAdminClient();
  return client.get(`/admin/bookings?${params.toString()}`, bookingListResponseSchema);
}

export async function getBookingDetail(id: string): Promise<BookingDetailResponse> {
  const client = await createServerAdminClient();
  return client.get(`/admin/bookings/${id}`, bookingDetailResponseSchema);
}

export { isAuthFailure } from './server-fleet';