import { z } from 'zod';

export const prioritySchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const taskStatusSchema = z.enum(['pending', 'active', 'done']);

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(10000).nullable().optional(),
  priority: prioritySchema,
  estimateMinutes: z.number().int().positive().max(100000),
});

// .strict() so a client-sent `status` (or any other unrecognized
// field) fails validation instead of being silently stripped — PATCH
// only ever moves title/notes/priority/estimateMinutes; status
// changes go through the accept/cancel/complete transition routes.
export const updateTaskSchema = createTaskSchema.partial().strict();

export const taskSortFieldSchema = z.enum(['created', 'priority', 'estimate']);
export const sortOrderSchema = z.enum(['asc', 'desc']);

export const taskQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  minPriority: z.coerce.number().pipe(prioritySchema).optional(),
  maxMinutes: z.coerce.number().int().positive().optional(),
  sort: taskSortFieldSchema.optional(),
  order: sortOrderSchema.optional(),
});
