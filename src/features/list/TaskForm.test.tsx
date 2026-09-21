import { afterEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../test-utils';
import { TaskForm } from './TaskForm';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TaskForm', () => {
  it('blocks submission and marks the title invalid when it is empty', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<TaskForm opened onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /^create$/i }));

    expect(onClose).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/title/i)).toHaveAttribute('aria-invalid', 'true');
  });

  it('submits a valid task and closes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            id: '1',
            title: 'Wash the car',
            notes: null,
            priority: 2,
            estimateMinutes: 30,
            status: 'pending',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            completedAt: null,
          }),
      }),
    );

    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<TaskForm opened onClose={onClose} />);

    await user.type(screen.getByLabelText(/title/i), 'Wash the car');
    await user.click(screen.getByRole('button', { name: /^create$/i }));

    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
