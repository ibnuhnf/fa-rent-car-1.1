'use client';

import {
  ApiError,
  adminVehicleDetailSchema,
  createApiClient,
  csrfResponseSchema,
  pricingRuleSchema,
  vehiclePhotoUploadResponseSchema,
  type AdminVehicleDetail,
  type PricingRule,
  type PricingRuleCreate,
  type VehicleCreate,
  type VehiclePhotoUploadRequest,
  type VehiclePhotoUploadResponse,
  type VehicleRate,
  type VehicleUpdate,
} from '@fa/shared';

const client = createApiClient({ baseUrl: '/api/v1' });

let csrfTokenPromise: Promise<string> | undefined;

function getCsrfToken(): Promise<string> {
  if (!csrfTokenPromise) {
    csrfTokenPromise = client
      .get('/admin/auth/csrf', csrfResponseSchema)
      .then(
        ({ csrfToken }) => csrfToken,
        (error: unknown) =>  {
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

export async function createVehicle(input: VehicleCreate): Promise<AdminVehicleDetail> {
  return withCsrf((csrfToken) =>
    client.post('/admin/vehicles', input, adminVehicleDetailSchema, {
      headers: { 'X-CSRF-Token': csrfToken },
    }),
  );
}

export async function updateVehicle(
  id: string,
  input: VehicleUpdate,
): Promise<AdminVehicleDetail> {
  return withCsrf((csrfToken) =>
    client.patch(`/admin/vehicles/${id}`, input, adminVehicleDetailSchema, {
      headers: { 'X-CSRF-Token': csrfToken },
    }),
  );
}

export async function deleteVehicle(id: string): Promise<void> {
  await withCsrf((csrfToken) =>
    client.delete(`/admin/vehicles/${id}`, adminVehicleDetailSchema, {
      headers: { 'X-CSRF-Token': csrfToken },
    }),
  );
}

export async function getVehicleDetail(id: string): Promise<AdminVehicleDetail> {
  return client.get(`/admin/vehicles/${id}`, adminVehicleDetailSchema);
}

export async function stageVehiclePhotos(
  id: string,
  input: VehiclePhotoUploadRequest,
): Promise<VehiclePhotoUploadResponse> {
  return withCsrf((csrfToken) =>
    client.post(`/admin/vehicles/${id}/photos`, input, vehiclePhotoUploadResponseSchema, {
      headers: { 'X-CSRF-Token': csrfToken },
    }),
  );
}

export async function deleteVehiclePhoto(id: string, photoId: string): Promise<void> {
  await withCsrf((csrfToken) =>
    client.delete(`/admin/vehicles/${id}/photos/${photoId}`, vehiclePhotoUploadResponseSchema, {
      headers: { 'X-CSRF-Token': csrfToken },
    }),
  );
}

// Presigned PUT menuju S3 langsung, bukan lewat API client.
export async function uploadToSignedUrl(url: string, file: File): Promise<void> {
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'content-type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!response.ok) {
    throw new Error(`Unggahan ke storage gagal (${response.status}).`);
  }
}

export async function setVehicleRate(id: string, rate: VehicleRate): Promise<AdminVehicleDetail> {
  return withCsrf((csrfToken) =>
    client.put(`/admin/vehicles/${id}/rate`, rate, adminVehicleDetailSchema, {
      headers: { 'X-CSRF-Token': csrfToken },
    }),
  );
}

export async function addPricingRule(
  id: string,
  input: PricingRuleCreate,
): Promise<PricingRule> {
  return withCsrf((csrfToken) =>
    client.post(`/admin/vehicles/${id}/pricing-rules`, input, pricingRuleSchema, {
      headers: { 'X-CSRF-Token': csrfToken },
    }),
  );
}