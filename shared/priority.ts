import type { Priority } from './types.js';

export const PRIORITIES: readonly Priority[] = [1, 2, 3];

const LABELS: Record<Priority, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
};

const COLORS: Record<Priority, string> = {
  1: 'gray',
  2: 'yellow',
  3: 'red',
};

export function priorityLabel(priority: Priority): string {
  return LABELS[priority];
}

export function priorityColor(priority: Priority): string {
  return COLORS[priority];
}
