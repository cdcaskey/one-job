import crypto from 'node:crypto';
import { db } from '../db.js';
import type { CreateTaskInput, Task, TaskQuery, UpdateTaskInput } from '../../shared/types.js';

interface TaskRow {
  id: string;
  title: string;
  notes: string | null;
  priority: number;
  estimate_minutes: number;
  status: 'pending' | 'active' | 'done';
  created_at: number;
  updated_at: number;
  completed_at: number | null;
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    priority: row.priority as Task['priority'],
    estimateMinutes: row.estimate_minutes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

const SORT_COLUMNS = {
  created: 'created_at',
  priority: 'priority',
  estimate: 'estimate_minutes',
} as const;

export function listTasks(query: TaskQuery): Task[] {
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (query.status !== undefined) {
    clauses.push('status = ?');
    params.push(query.status);
  }
  if (query.minPriority !== undefined) {
    clauses.push('priority >= ?');
    params.push(query.minPriority);
  }
  if (query.maxMinutes !== undefined) {
    clauses.push('estimate_minutes <= ?');
    params.push(query.maxMinutes);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const column = SORT_COLUMNS[query.sort ?? 'created'];
  const direction = query.order === 'asc' ? 'ASC' : 'DESC';

  const rows = db
    .prepare(`SELECT * FROM tasks ${where} ORDER BY ${column} ${direction}, id ASC`)
    .all(...params) as TaskRow[];

  return rows.map(rowToTask);
}

export function getActiveTask(): Task | null {
  const row = db.prepare("SELECT * FROM tasks WHERE status = 'active'").get() as
    TaskRow | undefined;
  return row ? rowToTask(row) : null;
}

export function getTaskById(id: string): Task | null {
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined;
  return row ? rowToTask(row) : null;
}

export function createTask(input: CreateTaskInput): Task {
  const now = Date.now();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO tasks (id, title, notes, priority, estimate_minutes, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
  ).run(id, input.title, input.notes ?? null, input.priority, input.estimateMinutes, now, now);
  return getTaskById(id)!;
}

export type UpdateResult = { status: 'ok'; task: Task } | { status: 'not_found' };

export function updateTask(id: string, input: UpdateTaskInput): UpdateResult {
  const existing = getTaskById(id);
  if (!existing) return { status: 'not_found' };

  const sets: string[] = [];
  const params: (string | number | null)[] = [];

  if (input.title !== undefined) {
    sets.push('title = ?');
    params.push(input.title);
  }
  if (input.notes !== undefined) {
    sets.push('notes = ?');
    params.push(input.notes);
  }
  if (input.priority !== undefined) {
    sets.push('priority = ?');
    params.push(input.priority);
  }
  if (input.estimateMinutes !== undefined) {
    sets.push('estimate_minutes = ?');
    params.push(input.estimateMinutes);
  }

  if (sets.length === 0) return { status: 'ok', task: existing };

  sets.push('updated_at = ?');
  params.push(Date.now());
  params.push(id);

  db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  return { status: 'ok', task: getTaskById(id)! };
}

export type DeleteResult = 'ok' | 'not_found' | 'active';

export function deleteTask(id: string): DeleteResult {
  const existing = getTaskById(id);
  if (!existing) return 'not_found';
  if (existing.status === 'active') return 'active';
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return 'ok';
}

export type TransitionResult =
  { status: 'ok'; task: Task } | { status: 'not_found' } | { status: 'conflict' };

export function acceptTask(id: string): TransitionResult {
  if (!getTaskById(id)) return { status: 'not_found' };

  const now = Date.now();
  try {
    // The WHERE clause only guards the target row's own status — it
    // can still match a pending row while a *different* row is
    // already active, in which case tasks_one_active (the partial
    // unique index) rejects the UPDATE outright rather than letting
    // it silently touch 0 rows.
    const result = db
      .prepare(
        "UPDATE tasks SET status = 'active', updated_at = ? WHERE id = ? AND status = 'pending'",
      )
      .run(now, id);
    if (result.changes === 0) return { status: 'conflict' };
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return { status: 'conflict' };
    }
    throw err;
  }
  return { status: 'ok', task: getTaskById(id)! };
}

export function cancelTask(id: string): TransitionResult {
  if (!getTaskById(id)) return { status: 'not_found' };

  const now = Date.now();
  const result = db
    .prepare(
      "UPDATE tasks SET status = 'pending', updated_at = ? WHERE id = ? AND status = 'active'",
    )
    .run(now, id);

  if (result.changes === 0) return { status: 'conflict' };
  return { status: 'ok', task: getTaskById(id)! };
}

export function completeTask(id: string): TransitionResult {
  if (!getTaskById(id)) return { status: 'not_found' };

  const now = Date.now();
  const result = db
    .prepare(
      "UPDATE tasks SET status = 'done', completed_at = ?, updated_at = ? WHERE id = ? AND status = 'active'",
    )
    .run(now, now, id);

  if (result.changes === 0) return { status: 'conflict' };
  return { status: 'ok', task: getTaskById(id)! };
}
