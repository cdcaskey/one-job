import { afterEach, describe, expect, it, vi } from 'vitest';
import { faker } from '@faker-js/faker';
import { renderWithProviders, screen, waitFor } from './test-utils';
import { App } from './App';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('renders whatever health status the API returns', async () => {
    // Random per run so the test can't pass just because it hardcodes
    // the happy-path 'ok'/'ok' response.
    const status = faker.helpers.arrayElement(['ok', 'error'] as const);
    const dbStatus = faker.helpers.arrayElement(['ok', 'error'] as const);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status, db: dbStatus }),
      }),
    );

    renderWithProviders(<App />);

    await waitFor(() => {
      expect(screen.getByText(`api ${status} / db ${dbStatus}`)).toBeInTheDocument();
    });
  });

  it('renders the job route by default', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'ok', db: 'ok' }),
      }),
    );

    renderWithProviders(<App />);

    expect(await screen.findByText(/job card goes here/i)).toBeInTheDocument();
  });
});
