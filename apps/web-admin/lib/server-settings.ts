import 'server-only';

import {
  auditLogListQuerySchema,
  auditLogListResponseSchema,
  businessSettingsSchema,
  createApiClient,
  staffListResponseSchema,
  type AuditLogListResponse,
  type BusinessSettings,
  type StaffListResponse,
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

export async function getBusinessSettings(): Promise<BusinessSettings> {
  const client = await createServerAdminClient();
  return client.get('/admin/settings/business', businessSettingsSchema);
}

export async function listStaff(): Promise<StaffListResponse> {
  const client = await createServerAdminClient();
  return client.get('/admin/staff', staffListResponseSchema);
}

export async function listAuditLogs(
  raw: Record<string, string | string[] | undefined>,
): Promise<AuditLogListResponse> {
  const parsed = auditLogListQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : { page: 1, limit: 20 };
  const params = new URLSearchParams({ page: String(query.page), limit: String(query.limit) });
  if (query.action) params.set('action', query.action);

  const client = await createServerAdminClient();
  return client.get(`/admin/audit-logs?${params.toString()}`, auditLogListResponseSchema);
}
