import type { Task } from './types.js';

export interface PickCandidateResult {
  task: Task | null;
  // true when every candidate had already been skipped this session —
  // the caller should reset its skip-set, since this pick came from
  // the full recycled pool rather than the unskipped remainder.
  exhausted: boolean;
}

export function pickCandidate(
  tasks: readonly Task[],
  skipSet: ReadonlySet<string>,
  rng: () => number = Math.random,
): PickCandidateResult {
  const unskipped = tasks.filter((task) => !skipSet.has(task.id));

  if (unskipped.length > 0) {
    return { task: unskipped[Math.floor(rng() * unskipped.length)], exhausted: false };
  }

  if (tasks.length > 0) {
    return { task: tasks[Math.floor(rng() * tasks.length)], exhausted: true };
  }

  return { task: null, exhausted: false };
}
