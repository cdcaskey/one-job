import { beforeAll, describe, expect, it } from 'vitest';
import { faker } from '@faker-js/faker';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { CreateTaskInput, Priority } from '../../shared/types.js';
import type * as TasksRepo from './tasks.js';

// DATA_DIR is read at import time by db.ts, so it must be set — to
// ':memory:', a real isolated SQLite instance with no file on disk —
// before migrate.js/db.js/tasks.js (and their transitive imports) are
// loaded. A static top-level import would be hoisted above this
// assignment, so the modules are loaded dynamically instead, same
// hoisting trap as server/app.test.ts.
let repo: typeof TasksRepo;
let db: DatabaseType;

beforeAll(async () => {
  process.env.DATA_DIR = ':memory:';

  const { runMigrations } = await import('../migrate.js');
  const dbModule = await import('../db.js');
  db = dbModule.db;
  repo = await import('./tasks.js');

  runMigrations();
});

function makeInput(overrides: Partial<CreateTaskInput> = {}): CreateTaskInput {
  return {
    title: faker.commerce.productName(),
    notes: faker.lorem.sentence(),
    priority: faker.helpers.arrayElement<Priority>([1, 2, 3]),
    estimateMinutes: faker.number.int({ min: 5, max: 500 }),
    ...overrides,
  };
}

describe('createTask / getTaskById', () => {
  it('round-trips a created task', () => {
    const input = makeInput();
    const created = repo.createTask(input);

    expect(created.title).toBe(input.title);
    expect(created.notes).toBe(input.notes);
    expect(created.priority).toBe(input.priority);
    expect(created.estimateMinutes).toBe(input.estimateMinutes);
    expect(created.status).toBe('pending');
    expect(created.completedAt).toBeNull();

    expect(repo.getTaskById(created.id)).toEqual(created);
  });

  it('returns null for an unknown id', () => {
    expect(repo.getTaskById(faker.string.uuid())).toBeNull();
  });
});

describe('listTasks', () => {
  it('filters by status, minPriority and maxMinutes', () => {
    const low = repo.createTask(makeInput({ priority: 1, estimateMinutes: 10 }));
    const high = repo.createTask(makeInput({ priority: 3, estimateMinutes: 400 }));

    const byPriority = repo.listTasks({ minPriority: 3 });
    expect(byPriority.some((t) => t.id === high.id)).toBe(true);
    expect(byPriority.some((t) => t.id === low.id)).toBe(false);

    const byMinutes = repo.listTasks({ maxMinutes: 15 });
    expect(byMinutes.some((t) => t.id === low.id)).toBe(true);
    expect(byMinutes.some((t) => t.id === high.id)).toBe(false);

    const byStatus = repo.listTasks({ status: 'pending' });
    expect(byStatus.every((t) => t.status === 'pending')).toBe(true);
  });

  it('filters by a title substring, case-insensitively, escaping LIKE wildcards', () => {
    const unique = faker.string.alphanumeric(12);
    const match = repo.createTask(makeInput({ title: `Fix the ${unique} bug` }));
    const other = repo.createTask(makeInput({ title: faker.commerce.productName() }));

    const results = repo.listTasks({ search: unique.toUpperCase() });
    expect(results.some((t) => t.id === match.id)).toBe(true);
    expect(results.some((t) => t.id === other.id)).toBe(false);

    expect(repo.listTasks({ search: '%_' }).length).toBe(0);
  });

  it('sorts by estimate ascending', () => {
    const a = repo.createTask(makeInput({ estimateMinutes: 5 }));
    const b = repo.createTask(makeInput({ estimateMinutes: 999 }));

    const sorted = repo.listTasks({ sort: 'estimate', order: 'asc' });
    const indexA = sorted.findIndex((t) => t.id === a.id);
    const indexB = sorted.findIndex((t) => t.id === b.id);
    expect(indexA).toBeLessThan(indexB);
  });
});

describe('getActiveTask', () => {
  it('returns null when nothing is active, and the active task once accepted', () => {
    const task = repo.createTask(makeInput());
    expect(repo.getActiveTask()?.id).not.toBe(task.id);

    repo.acceptTask(task.id);
    expect(repo.getActiveTask()?.id).toBe(task.id);

    repo.cancelTask(task.id);
  });
});

describe('updateTask', () => {
  it('applies a partial update and bumps updatedAt', async () => {
    const task = repo.createTask(makeInput());
    await new Promise((r) => setTimeout(r, 2));

    const result = repo.updateTask(task.id, { title: 'Renamed' });
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.task.title).toBe('Renamed');
      expect(result.task.priority).toBe(task.priority);
      expect(result.task.updatedAt).toBeGreaterThan(task.updatedAt);
    }
  });

  it('returns not_found for an unknown id', () => {
    expect(repo.updateTask(faker.string.uuid(), { title: 'x' }).status).toBe('not_found');
  });
});

describe('deleteTask', () => {
  it('deletes a pending task', () => {
    const task = repo.createTask(makeInput());
    expect(repo.deleteTask(task.id)).toBe('ok');
    expect(repo.getTaskById(task.id)).toBeNull();
  });

  it('refuses to delete the active task', () => {
    const task = repo.createTask(makeInput());
    repo.acceptTask(task.id);
    expect(repo.deleteTask(task.id)).toBe('active');
    expect(repo.getTaskById(task.id)).not.toBeNull();
    repo.cancelTask(task.id);
  });

  it('returns not_found for an unknown id', () => {
    expect(repo.deleteTask(faker.string.uuid())).toBe('not_found');
  });
});

describe('accept / cancel / complete transitions', () => {
  it('accepts a pending task', () => {
    const task = repo.createTask(makeInput());
    const result = repo.acceptTask(task.id);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.task.status).toBe('active');
    repo.cancelTask(task.id);
  });

  it('conflicts accepting while another task is already active', () => {
    const a = repo.createTask(makeInput());
    const b = repo.createTask(makeInput());
    expect(repo.acceptTask(a.id).status).toBe('ok');
    expect(repo.acceptTask(b.id).status).toBe('conflict');
    repo.cancelTask(a.id);
  });

  it('conflicts accepting a task that is not pending', () => {
    const task = repo.createTask(makeInput());
    repo.acceptTask(task.id);
    expect(repo.acceptTask(task.id).status).toBe('conflict');
    repo.cancelTask(task.id);
  });

  it('returns not_found accepting an unknown id', () => {
    expect(repo.acceptTask(faker.string.uuid()).status).toBe('not_found');
  });

  it('cancels an active task back to pending, unchanged', () => {
    const task = repo.createTask(makeInput());
    repo.acceptTask(task.id);
    const result = repo.cancelTask(task.id);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.task.status).toBe('pending');
      expect(result.task.title).toBe(task.title);
    }
  });

  it('conflicts cancelling a task that is not active', () => {
    const task = repo.createTask(makeInput());
    expect(repo.cancelTask(task.id).status).toBe('conflict');
  });

  it('completes an active task and sets completedAt', () => {
    const task = repo.createTask(makeInput());
    repo.acceptTask(task.id);
    const result = repo.completeTask(task.id);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.task.status).toBe('done');
      expect(result.task.completedAt).not.toBeNull();
    }
  });

  it('conflicts completing a task that is not active', () => {
    const task = repo.createTask(makeInput());
    expect(repo.completeTask(task.id).status).toBe('conflict');
  });
});

describe('tasks_one_active partial unique index', () => {
  it('throws SQLITE_CONSTRAINT_UNIQUE inserting a second active row', () => {
    const now = Date.now();
    db.prepare(
      `INSERT INTO tasks (id, title, priority, estimate_minutes, status, created_at, updated_at)
       VALUES (?, ?, 1, 10, 'active', ?, ?)`,
    ).run(faker.string.uuid(), 'first active', now, now);

    let error: unknown;
    try {
      db.prepare(
        `INSERT INTO tasks (id, title, priority, estimate_minutes, status, created_at, updated_at)
         VALUES (?, ?, 1, 10, 'active', ?, ?)`,
      ).run(faker.string.uuid(), 'second active', now, now);
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(Error);
    expect((error as { code?: string }).code).toBe('SQLITE_CONSTRAINT_UNIQUE');
  });
});
