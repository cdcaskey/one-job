import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen } from './test-utils';
import { App } from './App';

afterEach(() => {
  vi.unstubAllGlobals();
});

function ok(body: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
}

function installFetchMock() {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      const { pathname } = new URL(url, 'http://localhost');
      if (pathname === '/api/tasks/active') return ok(null);
      if (pathname === '/api/tasks') return ok([]);
      return ok(null);
    }),
  );
}

describe('App', () => {
  it('renders the job route by default', async () => {
    installFetchMock();

    renderWithProviders(<App />);

    expect(await screen.findByText(/you have no jobs/i)).toBeInTheDocument();
  });
});
