'use client';

import {
  ApiError,
  apiErrorSchema,
  bookingDetailResponseSchema,
  bookingListResponseSchema,
  createApiClient,
  createBookingResponseSchema,
  csrfResponseSchema,
  extendHoldResponseSchema,
  type BookingDetailResponse,
  type BookingListResponse,
  type CreateBookingRequest,
  type CreateBookingResponse,
} from '@fa/shared';

const client = createApiClient({ baseUrl: '/api/v1' });

let csrfTokenPromise: Promise<string> | undefined;

function getCsrfToken(): Promise<string> {
  if (!csrfTokenPromise) {
    csrfTokenPromise = client
      .get('/admin/auth/csrf', csrfResponseSchema)
      .then(
        ({ csrfToken }) => csrfToken,
        (error: unknown) => {
          csrfTokenPromise = undefined;
          throw error;
        },
      );
  }
  return csrfTokenPromise;
}

async function withCsrf<T>(run: (csrfToken: string) => Promise<T>): Promise<T> {
  const csrfToken = await getCsrfToken();
  try {
    return await run(csrfToken);
  } catch (error) {
    if (error instanceof ApiError && error.status === 403 && error.code === 'CSRF_INVALID') {
      csrfTokenPromise = undefined;
      return run(await getCsrfToken());
    }
    throw error;
  }
}

/** Ubah error API jadi pesan Bahasa Indonesia untuk ditampilkan di form. */
export function describeBookingError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.kind === 'network') return 'Tidak dapat menjangkau server. Periksa koneksi Anda.';
    return error.message;
  }

  if (error instanceof Error && error.message) {
    // Server action membungkus bentuk respons API sebagai JSON string.
    try {
      const parsed = apiErrorSchema.safeParse(JSON.parse(error.message));
      if (parsed.success) return parsed.data.error.message;
    } catch {
      // Bukan JSON; lanjut ke pesan default.
    }
    return error.message;
  }

  return 'Terjadi kesalahan saat memproses booking. Silakan coba lagi.';
}

export async function createBooking(
  input: CreateBookingRequest,
): Promise<CreateBookingResponse> {
  return withCsrf((csrfToken) =>
    client.post('/admin/bookings', input, createBookingResponseSchema, {
      headers: { 'X-CSRF-Token': csrfToken },
    }),
  );
}

export async function extendHold(id: string, minutes: number) {
  return withCsrf((csrfToken) =>
    client.post(
      `/admin/bookings/${id}/extend-hold`,
      { minutes },
      extendHoldResponseSchema,
      { headers: { 'X-CSRF-Token': csrfToken } },
    ),
  );
}

export const BOOKING_STATUSES = [
  'PENDING_VERIFICATION',
  'ACTIVE',
  'COMPLETED',
  'EXPIRED',
  'CANCELLED',
] as const satisfies BookingDetailResponse['booking']['status'][];

export async function getBooking(id: string): Promise<BookingDetailResponse> {
  return client.get(`/admin/bookings/${id}`, bookingDetailResponseSchema);
}

export async function listBookings(
  query: Record<string, string | number | undefined>,
): Promise<BookingListResponse> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return client.get(`/admin/bookings?${params.toString()}`, bookingListResponseSchema);
}
