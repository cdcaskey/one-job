import { describe, expect, it } from 'vitest';
import { faker } from '@faker-js/faker';
import { pickCandidate } from './draw.js';
import type { Priority, Task, TaskStatus } from './types.js';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: faker.string.uuid(),
    title: faker.commerce.productName(),
    notes: null,
    priority: faker.helpers.arrayElement<Priority>([1, 2, 3]),
    estimateMinutes: faker.number.int({ min: 5, max: 500 }),
    status: 'pending' as TaskStatus,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    completedAt: null,
    ...overrides,
  };
}

describe('pickCandidate', () => {
  it('returns null with no tasks', () => {
    const result = pickCandidate([], new Set(), () => 0);
    expect(result).toEqual({ task: null, exhausted: false });
  });

  it('never returns a task in the skip set', () => {
    const tasks = faker.helpers.multiple(() => makeTask(), { count: 10 });
    const skipCount = faker.number.int({ min: 1, max: 8 });
    const skipSet = new Set(faker.helpers.arrayElements(tasks, skipCount).map((t) => t.id));

    for (let i = 0; i < 50; i++) {
      const result = pickCandidate(tasks, skipSet, Math.random);
      expect(result.exhausted).toBe(false);
      expect(result.task).not.toBeNull();
      expect(skipSet.has(result.task!.id)).toBe(false);
    }
  });

  it('respects the candidate list passed in — never invents a task', () => {
    const tasks = faker.helpers.multiple(() => makeTask(), { count: 5 });
    const result = pickCandidate(tasks, new Set(), () => 0.999999);
    expect(tasks.some((t) => t.id === result.task!.id)).toBe(true);
  });

  it('uses the injected rng deterministically', () => {
    const tasks = faker.helpers.multiple(() => makeTask(), { count: 4 });
    const result = pickCandidate(tasks, new Set(), () => 0);
    expect(result).toEqual({ task: tasks[0], exhausted: false });
  });

  it('signals exhaustion and recycles when every task is skipped', () => {
    const tasks = faker.helpers.multiple(() => makeTask(), { count: 3 });
    const skipSet = new Set(tasks.map((t) => t.id));

    const result = pickCandidate(tasks, skipSet, () => 0);

    expect(result.exhausted).toBe(true);
    expect(result.task).not.toBeNull();
    expect(tasks.some((t) => t.id === result.task!.id)).toBe(true);
  });
});
