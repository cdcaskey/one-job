import type { ApiErrorBody, TaskQuery } from '../../shared/types.js';

export function toQueryString(query: TaskQuery): string {
  const params = new URLSearchParams();
  if (query.status !== undefined) params.set('status', query.status);
  if (query.minPriority !== undefined) params.set('minPriority', String(query.minPriority));
  if (query.maxMinutes !== undefined) params.set('maxMinutes', String(query.maxMinutes));
  if (query.search !== undefined) params.set('search', query.search);
  if (query.sort !== undefined) params.set('sort', query.sort);
  if (query.order !== undefined) params.set('order', query.order);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    // Only set Content-Type when there's actually a body — Fastify's
    // JSON body parser rejects a zero-length body sent with
    // application/json (FST_ERR_CTP_EMPTY_JSON_BODY -> 400), which is
    // exactly what accept/cancel/complete send (POST, no payload).
    headers:
      init?.body !== undefined
        ? { 'Content-Type': 'application/json', ...init.headers }
        : init?.headers,
  });

  if (res.status === 204) return undefined as T;

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const err = body as ApiErrorBody | null;
    throw new ApiError(res.status, err?.error?.message ?? res.statusText, err?.error?.details);
  }

  return body as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
