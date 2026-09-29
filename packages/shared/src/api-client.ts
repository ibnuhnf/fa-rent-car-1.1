import { z } from 'zod';

import { apiErrorSchema, type ApiErrorDetail } from './schemas';

export type ApiErrorKind = 'http' | 'network' | 'malformed-response' | 'request';

export interface ApiErrorShape {
  code: string;
  message: string;
  details: ApiErrorDetail[];
  kind: ApiErrorKind;
  status?: number;
}

type ApiErrorOptions = ApiErrorShape;

export class ApiError extends Error {
  readonly code: string;
  readonly details: ApiErrorDetail[];
  readonly kind: ApiErrorKind;
  readonly status: number | undefined;

  constructor({ code, message, details, kind, status }: ApiErrorOptions) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details.map((detail) => ({ ...detail }));
    this.kind = kind;
    this.status = status;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): ApiErrorShape {
    return {
      code: this.code,
      message: this.message,
      details: this.details.map((detail) => ({ ...detail })),
      kind: this.kind,
      ...(this.status === undefined ? {} : { status: this.status }),
    };
  }

  static network(): ApiError {
    return new ApiError({
      code: 'NETWORK_ERROR',
      message: 'Unable to reach the server.',
      details: [],
      kind: 'network',
    });
  }

  static malformed(status?: number): ApiError {
    return new ApiError({
      code: 'MALFORMED_RESPONSE',
      message: 'The server returned an invalid response.',
      details: [],
      kind: 'malformed-response',
      status,
    });
  }

  static request(): ApiError {
    return new ApiError({
      code: 'REQUEST_ERROR',
      message: 'The request could not be prepared.',
      details: [],
      kind: 'request',
    });
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
}

export type ApiMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface ApiClient {
  get<TSchema extends z.ZodType>(
    path: string,
    schema: TSchema,
    init?: RequestInit,
  ): Promise<z.output<TSchema>>;
  post<TBody, TSchema extends z.ZodType>(
    path: string,
    body: TBody,
    schema: TSchema,
    init?: RequestInit,
  ): Promise<z.output<TSchema>>;
  patch<TBody, TSchema extends z.ZodType>(
    path: string,
    body: TBody,
    schema: TSchema,
    init?: RequestInit,
  ): Promise<z.output<TSchema>>;
  put<TBody, TSchema extends z.ZodType>(
    path: string,
    body: TBody,
    schema: TSchema,
    init?: RequestInit,
  ): Promise<z.output<TSchema>>;
  delete<TSchema extends z.ZodType>(
    path: string,
    schema: TSchema,
    init?: RequestInit,
  ): Promise<z.output<TSchema>>;
}

function buildUrl(baseUrl: string, path: string): string {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${normalizedBaseUrl}${normalizedPath}`;
}

function buildHeaders(init: RequestInit | undefined, hasJsonBody: boolean): Headers {
  const headers = new Headers(init?.headers);

  if (!headers.has('accept')) {
    headers.set('accept', 'application/json');
  }

  if (hasJsonBody) {
    headers.set('content-type', 'application/json');
  }

  return headers;
}

function serializeJson(body: unknown): string {
  try {
    const serialized = JSON.stringify(body);

    if (serialized === undefined) {
      throw ApiError.request();
    }

    return serialized;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw ApiError.request();
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

async function request<TSchema extends z.ZodType>(
  fetchImplementation: typeof globalThis.fetch | undefined,
  baseUrl: string,
  method: ApiMethod,
  path: string,
  schema: TSchema,
  init: RequestInit | undefined,
  serializedBody?: string,
): Promise<z.output<TSchema>> {
  if (typeof fetchImplementation !== 'function') {
    throw ApiError.network();
  }

  let response: Response;

  try {
    response = await fetchImplementation(buildUrl(baseUrl, path), {
      ...init,
      method,
      body: serializedBody,
      headers: buildHeaders(init, serializedBody !== undefined),
      credentials: 'include',
      cache: 'no-store',
    });
  } catch {
    throw ApiError.network();
  }

  const payload = await readJson(response);

  if (!response.ok) {
    const errorResponse = apiErrorSchema.safeParse(payload);

    if (errorResponse.success) {
      throw new ApiError({
        code: errorResponse.data.error.code,
        message: errorResponse.data.error.message,
        details: errorResponse.data.error.details,
        kind: 'http',
        status: response.status,
      });
    }

    throw ApiError.malformed(response.status);
  }

  const parsedResponse = schema.safeParse(payload);

  if (!parsedResponse.success) {
    throw ApiError.malformed(response.status);
  }

  return parsedResponse.data;
}

export function createApiClient({ baseUrl, fetch }: ApiClientOptions): ApiClient {
  const fetchImplementation = fetch ?? globalThis.fetch;
  const withBody = (method: ApiMethod) =>
    async <TBody, TSchema extends z.ZodType>(
      path: string,
      body: TBody,
      schema: TSchema,
      init?: RequestInit,
    ) =>
      request(
        fetchImplementation,
        baseUrl,
        method,
        path,
        schema,
        init,
        serializeJson(body ?? {}),
      );

  return {
    get(path, schema, init) {
      return request(fetchImplementation, baseUrl, 'GET', path, schema, init);
    },
    post: withBody('POST'),
    patch: withBody('PATCH'),
    put: withBody('PUT'),
    delete(path, schema, init) {
      return request(fetchImplementation, baseUrl, 'DELETE', path, schema, init, '{}');
    },
  };
}
