import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '../../test-utils';
import { DrawPage } from './DrawPage';
import type { Task } from '../../../shared/types.js';

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: 'id',
    title: 'Task',
    notes: null,
    priority: 1,
    estimateMinutes: 20,
    status: 'pending',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    completedAt: null,
    ...overrides,
  };
}

const taskA = makeTask({ id: 'a', title: 'Task A' });
const taskB = makeTask({ id: 'b', title: 'Task B' });

function ok(body: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
}

function installFetchMock() {
  const fetchSpy = vi.fn((url: string, init?: RequestInit) => {
    const { pathname } = new URL(url, 'http://localhost');
    const method = init?.method ?? 'GET';

    if (pathname === '/api/tasks/active') return ok(null);
    if (pathname === '/api/tasks' && method === 'GET') return ok([taskA, taskB]);
    if (/^\/api\/tasks\/[^/]+\/accept$/.test(pathname)) {
      return ok({ ...taskA, status: 'active' });
    }
    return ok(null);
  });
  vi.stubGlobal('fetch', fetchSpy);
  return fetchSpy;
}

describe('DrawPage', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('accepts the dealt card by button', async () => {
    const fetchSpy = installFetchMock();
    const user = userEvent.setup();
    renderWithProviders(<DrawPage />);

    await screen.findByText('Task A');
    await user.click(screen.getByRole('button', { name: /^accept$/i }));

    await waitFor(() => {
      expect(
        fetchSpy.mock.calls.some(
          ([url, init]: [string, RequestInit?]) =>
            url === '/api/tasks/a/accept' && init?.method === 'POST',
        ),
      ).toBe(true);
    });
  });

  it('accepts the dealt card by keyboard (ArrowRight)', async () => {
    const fetchSpy = installFetchMock();
    renderWithProviders(<DrawPage />);

    await screen.findByText('Task A');
    await waitFor(() => expect(document.activeElement?.tagName).not.toBe('BODY'));
    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
    );

    await waitFor(() => {
      expect(
        fetchSpy.mock.calls.some(
          ([url, init]: [string, RequestInit?]) =>
            url === '/api/tasks/a/accept' && init?.method === 'POST',
        ),
      ).toBe(true);
    });
  });

  it('skips the dealt card by button, dealing the next candidate', async () => {
    installFetchMock();
    const user = userEvent.setup();
    renderWithProviders(<DrawPage />);

    await screen.findByText('Task A');
    await user.click(screen.getByRole('button', { name: /^skip$/i }));

    expect(await screen.findByText('Task B')).toBeInTheDocument();
  });

  it('skips the dealt card by keyboard (ArrowLeft), dealing the next candidate', async () => {
    installFetchMock();
    renderWithProviders(<DrawPage />);

    await screen.findByText('Task A');
    await waitFor(() => expect(document.activeElement?.tagName).not.toBe('BODY'));
    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
    );

    expect(await screen.findByText('Task B')).toBeInTheDocument();
  });
});
