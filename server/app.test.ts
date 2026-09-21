import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { faker } from '@faker-js/faker';
import type { FastifyInstance } from 'fastify';
import type { CreateTaskInput, Priority } from '../shared/types.js';

// DATA_DIR is read at import time by db.ts, so it must be set — to a
// throwaway dir, isolated from any real $DATA_DIR — before app.ts (and
// its transitive db.ts import) are loaded. A static top-level import
// would be hoisted above this assignment, so the modules are loaded
// dynamically instead, after the env var is in place.
let app: FastifyInstance;
let buildApp: (distDir: string) => FastifyInstance;
let dataDir: string;

function makeInput(overrides: Partial<CreateTaskInput> = {}): CreateTaskInput {
  return {
    title: faker.commerce.productName(),
    priority: faker.helpers.arrayElement<Priority>([1, 2, 3]),
    estimateMinutes: faker.number.int({ min: 5, max: 500 }),
    ...overrides,
  };
}

async function create(overrides: Partial<CreateTaskInput> = {}) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/tasks',
    payload: makeInput(overrides),
  });
  return res.json();
}

beforeAll(async () => {
  dataDir = mkdtempSync(path.join(tmpdir(), 'one-job-test-'));
  process.env.DATA_DIR = dataDir;

  const { runMigrations } = await import('./migrate.js');
  ({ buildApp } = await import('./app.js'));

  runMigrations();

  // No dist/ in this temp dir, so static file serving stays disabled.
  app = buildApp(path.join(dataDir, 'dist'));
});

afterAll(async () => {
  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

describe('GET /api/health', () => {
  it('reports ok when the db is reachable', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', db: 'ok' });
  });
});

describe('task CRUD', () => {
  it('creates, reads, updates and deletes a task', async () => {
    const input = makeInput();
    const createRes = await app.inject({ method: 'POST', url: '/api/tasks', payload: input });
    expect(createRes.statusCode).toBe(201);
    const created = createRes.json();
    expect(created.title).toBe(input.title);
    expect(created.status).toBe('pending');

    const listRes = await app.inject({ method: 'GET', url: '/api/tasks' });
    expect(listRes.statusCode).toBe(200);
    expect(listRes.json().some((t: { id: string }) => t.id === created.id)).toBe(true);

    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${created.id}`,
      payload: { title: 'Renamed' },
    });
    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.json().title).toBe('Renamed');

    const deleteRes = await app.inject({ method: 'DELETE', url: `/api/tasks/${created.id}` });
    expect(deleteRes.statusCode).toBe(204);

    const afterDelete = await app.inject({ method: 'DELETE', url: `/api/tasks/${created.id}` });
    expect(afterDelete.statusCode).toBe(404);
    expect(afterDelete.json().error.message).toBeTruthy();
  });

  it('rejects a status change through PATCH', async () => {
    const task = await create();
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${task.id}`,
      payload: { status: 'active' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects an invalid create body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      payload: { title: '', priority: 1, estimateMinutes: 10 },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.message).toBeTruthy();
  });
});

describe('accept / cancel / complete', () => {
  it('locks a task active and GET /api/tasks/active reflects it', async () => {
    const task = await create();
    const acceptRes = await app.inject({ method: 'POST', url: `/api/tasks/${task.id}/accept` });
    expect(acceptRes.statusCode).toBe(200);
    expect(acceptRes.json().status).toBe('active');

    const activeRes = await app.inject({ method: 'GET', url: '/api/tasks/active' });
    expect(activeRes.json().id).toBe(task.id);

    await app.inject({ method: 'POST', url: `/api/tasks/${task.id}/cancel` });
  });

  it('409s accepting a task while another is already active', async () => {
    const a = await create();
    const b = await create();
    await app.inject({ method: 'POST', url: `/api/tasks/${a.id}/accept` });

    const res = await app.inject({ method: 'POST', url: `/api/tasks/${b.id}/accept` });
    expect(res.statusCode).toBe(409);

    await app.inject({ method: 'POST', url: `/api/tasks/${a.id}/cancel` });
  });

  it('409s cancelling a task that is not active', async () => {
    const task = await create();
    const res = await app.inject({ method: 'POST', url: `/api/tasks/${task.id}/cancel` });
    expect(res.statusCode).toBe(409);
  });

  it('409s completing a task that is not active (still pending)', async () => {
    const task = await create();
    const res = await app.inject({ method: 'POST', url: `/api/tasks/${task.id}/complete` });
    expect(res.statusCode).toBe(409);
  });

  it('409s deleting the active task', async () => {
    const task = await create();
    await app.inject({ method: 'POST', url: `/api/tasks/${task.id}/accept` });

    const res = await app.inject({ method: 'DELETE', url: `/api/tasks/${task.id}` });
    expect(res.statusCode).toBe(409);

    await app.inject({ method: 'POST', url: `/api/tasks/${task.id}/cancel` });
  });

  it('completing an active task sets status=done and completedAt', async () => {
    const task = await create();
    await app.inject({ method: 'POST', url: `/api/tasks/${task.id}/accept` });

    const res = await app.inject({ method: 'POST', url: `/api/tasks/${task.id}/complete` });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('done');
    expect(res.json().completedAt).not.toBeNull();
  });

  it('resolves exactly one winner out of two concurrent accepts', async () => {
    const a = await create();
    const b = await create();

    const [resA, resB] = await Promise.all([
      app.inject({ method: 'POST', url: `/api/tasks/${a.id}/accept` }),
      app.inject({ method: 'POST', url: `/api/tasks/${b.id}/accept` }),
    ]);

    const codes = [resA.statusCode, resB.statusCode].sort();
    expect(codes).toEqual([200, 409]);

    const winnerId = resA.statusCode === 200 ? a.id : b.id;
    await app.inject({ method: 'POST', url: `/api/tasks/${winnerId}/cancel` });
  });
});

describe('routing', () => {
  it('returns a JSON 404 for an unknown /api/* route', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.json()).toEqual({ error: { message: 'not found' } });
  });

  it('falls through to the built index.html for a client route', async () => {
    const distDir = mkdtempSync(path.join(tmpdir(), 'one-job-dist-'));
    writeFileSync(path.join(distDir, 'index.html'), '<!doctype html><title>One Job</title>');
    const spaApp = buildApp(distDir);

    const res = await spaApp.inject({ method: 'GET', url: '/tasks' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.body).toContain('One Job');

    await spaApp.close();
    rmSync(distDir, { recursive: true, force: true });
  });
});
