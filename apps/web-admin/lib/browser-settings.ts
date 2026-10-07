'use client';

import {
  ApiError,
  businessSettingsSchema,
  createApiClient,
  csrfResponseSchema,
  staffListResponseSchema,
  staffUserSchema,
  type BusinessSettings,
  type CreateStaffRequest,
  type StaffListResponse,
  type StaffUser,
  type UpdateBusinessSettings,
  type UpdateStaffRequest,
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

export async function updateBusinessSettings(
  input: UpdateBusinessSettings,
): Promise<BusinessSettings> {
  return withCsrf((csrfToken) =>
    client.put('/admin/settings/business', input, businessSettingsSchema, {
      headers: { 'X-CSRF-Token': csrfToken },
    }),
  );
}

export async function listStaff(): Promise<StaffListResponse> {
  return client.get('/admin/staff', staffListResponseSchema);
}

export async function createStaff(input: CreateStaffRequest): Promise<StaffUser> {
  return withCsrf((csrfToken) =>
    client.post('/admin/staff', input, staffUserSchema, {
      headers: { 'X-CSRF-Token': csrfToken },
    }),
  );
}

export async function updateStaff(id: string, input: UpdateStaffRequest): Promise<StaffUser> {
  return withCsrf((csrfToken) =>
    client.patch(`/admin/staff/${id}`, input, staffUserSchema, {
      headers: { 'X-CSRF-Token': csrfToken },
    }),
  );
}

export async function disableStaff(id: string): Promise<void> {
  await withCsrf(async (csrfToken) => {
    await client.delete(
      `/admin/staff/${id}`,
      staffUserSchema.partial(),
      { headers: { 'X-CSRF-Token': csrfToken } },
    );
  });
}
