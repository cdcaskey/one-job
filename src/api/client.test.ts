import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './client.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

// Fastify's JSON body parser rejects a zero-length body sent with
// Content-Type: application/json (FST_ERR_CTP_EMPTY_JSON_BODY -> 400).
// accept/cancel/complete/delete send no body, so the header must not
// be set for them — this broke real accept requests in production
// while the RTL tests (mocked fetch, no real body parsing) stayed green.
describe('apiClient', () => {
  it('omits Content-Type on a bodyless POST', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) });
    vi.stubGlobal('fetch', fetchSpy);

    await apiClient.post('/tasks/x/accept');

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)?.['Content-Type']).toBeUndefined();
  });

  it('omits Content-Type on a bodyless DELETE', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 204, json: () => Promise.resolve(null) });
    vi.stubGlobal('fetch', fetchSpy);

    await apiClient.delete('/tasks/x');

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)?.['Content-Type']).toBeUndefined();
  });

  it('sends Content-Type: application/json when a body is present', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 201, json: () => Promise.resolve({}) });
    vi.stubGlobal('fetch', fetchSpy);

    await apiClient.post('/tasks', { title: 'Wash the car' });

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)?.['Content-Type']).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ title: 'Wash the car' }));
  });
});
