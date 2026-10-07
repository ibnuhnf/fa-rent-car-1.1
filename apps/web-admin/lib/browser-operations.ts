'use client';

import {
  ApiError,
  createApiClient,
  createDriverRequestSchema,
  createExpenseRequestSchema,
  createMaintenanceRequestSchema,
  csrfResponseSchema,
  driverDtoSchema,
  expenseDtoSchema,
  maintenanceDtoSchema,
  updateDriverRequestSchema,
  type CreateDriverRequest,
  type CreateExpenseRequest,
  type CreateMaintenanceRequest,
  type DriverDto,
  type ExpenseDto,
  type MaintenanceDto,
  type UpdateDriverRequest,
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

export async function createDriver(input: CreateDriverRequest): Promise<DriverDto> {
  createDriverRequestSchema.parse(input);
  return withCsrf((csrfToken) =>
    client.post('/admin/drivers', input, driverDtoSchema, {
      headers: { 'X-CSRF-Token': csrfToken },
    }),
  );
}

export async function updateDriver(id: string, input: UpdateDriverRequest): Promise<DriverDto> {
  updateDriverRequestSchema.parse(input);
  return withCsrf((csrfToken) =>
    client.patch(`/admin/drivers/${id}`, input, driverDtoSchema, {
      headers: { 'X-CSRF-Token': csrfToken },
    }),
  );
}

export async function createExpense(input: CreateExpenseRequest): Promise<ExpenseDto> {
  createExpenseRequestSchema.parse(input);
  return withCsrf((csrfToken) =>
    client.post('/admin/finances/expenses', input, expenseDtoSchema, {
      headers: { 'X-CSRF-Token': csrfToken },
    }),
  );
}

export async function createMaintenance(
  vehicleId: string,
  input: CreateMaintenanceRequest,
): Promise<MaintenanceDto> {
  createMaintenanceRequestSchema.parse(input);
  return withCsrf((csrfToken) =>
    client.post(`/admin/vehicles/${vehicleId}/maintenance`, input, maintenanceDtoSchema, {
      headers: { 'X-CSRF-Token': csrfToken },
    }),
  );
}
