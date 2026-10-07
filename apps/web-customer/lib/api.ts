import {
  priceEstimateRequestSchema,
  priceEstimateResponseSchema,
  publicCreateBookingRequestSchema,
  publicCreateBookingResponseSchema,
  publicVehicleDetailResponseSchema,
  publicVehicleListResponseSchema,
  validatePromoRequestSchema,
  validatePromoResponseSchema,
  portalMeResponseSchema,
  portalDocumentStagingRequestSchema,
  portalDocumentStagingResponseSchema,
  portalDocumentConfirmRequestSchema,
  portalDocumentConfirmResponseSchema,
  portalRequestChangeSchema,
  portalRequestChangeResponseSchema,
  type PriceEstimateRequest,
  type PriceEstimateResponse,
  type PublicCreateBookingRequest,
  type PublicCreateBookingResponse,
  type PublicVehicleDetailResponse,
  type PublicVehicleListQuery,
  type PublicVehicleListResponse,
  type ValidatePromoRequest,
  type ValidatePromoResponse,
  type PortalMeResponse,
  type PortalDocumentStagingRequest,
  type PortalDocumentStagingResponse,
  type PortalDocumentConfirmRequest,
  type PortalDocumentConfirmResponse,
  type PortalRequestChange,
  type PortalRequestChangeResponse,
} from '@fa/shared';

const API_BASE = typeof window === 'undefined'
  ? (process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:4000').replace(/\/+$/, '') + '/api/v1'
  : '/api/v1';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    let message = 'Terjadi kesalahan sistem.';
    try {
      const err = await res.json();
      if (err?.error?.message) message = err.error.message;
      else if (err?.message) message = err.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res.json();
}

export async function getPublicVehicles(
  query: Partial<PublicVehicleListQuery> = {},
): Promise<PublicVehicleListResponse> {
  const p = new URLSearchParams();
  if (query.page) p.set('page', String(query.page));
  if (query.limit) p.set('limit', String(query.limit));
  if (query.sort) p.set('sort', query.sort);
  if (query.category) p.set('category', query.category);
  if (query.transmission) p.set('transmission', query.transmission);
  if (query.minCapacity) p.set('minCapacity', String(query.minCapacity));
  if (query.maxPrice) p.set('maxPrice', String(query.maxPrice));

  const json = await request(`/public/vehicles?${p.toString()}`);
  return publicVehicleListResponseSchema.parse(json);
}

export async function getPublicVehicleDetail(id: string): Promise<PublicVehicleDetailResponse> {
  const json = await request(`/public/vehicles/${id}`);
  return publicVehicleDetailResponseSchema.parse(json);
}

export async function getPriceEstimate(
  input: PriceEstimateRequest,
): Promise<PriceEstimateResponse> {
  const valid = priceEstimateRequestSchema.parse(input);
  const json = await request('/public/price-estimate', {
    method: 'POST',
    body: JSON.stringify(valid),
  });
  return priceEstimateResponseSchema.parse(json);
}

export async function validatePromoCode(
  input: ValidatePromoRequest,
): Promise<ValidatePromoResponse> {
  const valid = validatePromoRequestSchema.parse(input);
  const json = await request('/public/bookings/validate-promo', {
    method: 'POST',
    body: JSON.stringify(valid),
  });
  return validatePromoResponseSchema.parse(json);
}

export async function submitGuestBooking(
  input: PublicCreateBookingRequest,
): Promise<PublicCreateBookingResponse> {
  const valid = publicCreateBookingRequestSchema.parse(input);
  const json = await request('/public/bookings', {
    method: 'POST',
    body: JSON.stringify(valid),
  });
  return publicCreateBookingResponseSchema.parse(json);
}

// --- Portal Client ---

export async function getPortalMe(token: string): Promise<PortalMeResponse> {
  const json = await request('/portal/me', {
    headers: { 'X-Portal-Token': token },
  });
  return portalMeResponseSchema.parse(json);
}

export async function stagePortalDocument(
  token: string,
  input: PortalDocumentStagingRequest,
): Promise<PortalDocumentStagingResponse> {
  const valid = portalDocumentStagingRequestSchema.parse(input);
  const json = await request('/portal/documents/staging', {
    method: 'POST',
    headers: { 'X-Portal-Token': token },
    body: JSON.stringify(valid),
  });
  return portalDocumentStagingResponseSchema.parse(json);
}

export async function confirmPortalDocument(
  token: string,
  input: PortalDocumentConfirmRequest,
): Promise<PortalDocumentConfirmResponse> {
  const valid = portalDocumentConfirmRequestSchema.parse(input);
  const json = await request('/portal/documents/confirm', {
    method: 'POST',
    headers: { 'X-Portal-Token': token },
    body: JSON.stringify(valid),
  });
  return portalDocumentConfirmResponseSchema.parse(json);
}

export async function requestPortalChange(
  token: string,
  input: PortalRequestChange,
): Promise<PortalRequestChangeResponse> {
  const valid = portalRequestChangeSchema.parse(input);
  const json = await request('/portal/requests', {
    method: 'POST',
    headers: { 'X-Portal-Token': token },
    body: JSON.stringify(valid),
  });
  return portalRequestChangeResponseSchema.parse(json);
}
