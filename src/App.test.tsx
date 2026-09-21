import { afterEach, describe, expect, it, vi } from 'vitest';
import { faker } from '@faker-js/faker';
import { renderWithProviders, screen, waitFor } from './test-utils';
import { App } from './App';

afterEach(() => {
  vi.unstubAllGlobals();
});

function ok(body: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
}

function installFetchMock(health: { status: 'ok' | 'error'; db: 'ok' | 'error' }) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      const { pathname } = new URL(url, 'http://localhost');
      if (pathname === '/api/health') return ok(health);
      if (pathname === '/api/tasks/active') return ok(null);
      if (pathname === '/api/tasks') return ok([]);
      return ok(null);
    }),
  );
}

describe('App', () => {
  it('renders whatever health status the API returns', async () => {
    // Random per run so the test can't pass just because it hardcodes
    // the happy-path 'ok'/'ok' response.
    const status = faker.helpers.arrayElement(['ok', 'error'] as const);
    const dbStatus = faker.helpers.arrayElement(['ok', 'error'] as const);
    installFetchMock({ status, db: dbStatus });

    renderWithProviders(<App />);

    await waitFor(() => {
      expect(screen.getByText(`api ${status} / db ${dbStatus}`)).toBeInTheDocument();
    });
  });

  it('renders the job route by default', async () => {
    installFetchMock({ status: 'ok', db: 'ok' });

    renderWithProviders(<App />);

    expect(await screen.findByText(/you have no jobs/i)).toBeInTheDocument();
  });
});
