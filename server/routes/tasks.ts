import type { FastifyInstance } from 'fastify';
import { createTaskSchema, taskQuerySchema, updateTaskSchema } from '../../shared/validation.js';
import * as repo from '../repo/tasks.js';

function notFound(reply: { code: (c: number) => { send: (b: unknown) => void } }): void {
  reply.code(404).send({ error: { message: 'task not found' } });
}

export function registerTaskRoutes(app: FastifyInstance): void {
  app.get('/api/tasks', async (req, reply) => {
    const parsed = taskQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      reply.code(400).send({ error: { message: 'invalid query', details: parsed.error.issues } });
      return;
    }
    return repo.listTasks(parsed.data);
  });

  app.get('/api/tasks/active', async () => {
    return repo.getActiveTask();
  });

  app.post('/api/tasks', async (req, reply) => {
    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400).send({ error: { message: 'invalid body', details: parsed.error.issues } });
      return;
    }
    reply.code(201).send(repo.createTask(parsed.data));
  });

  app.patch<{ Params: { id: string } }>('/api/tasks/:id', async (req, reply) => {
    const parsed = updateTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400).send({ error: { message: 'invalid body', details: parsed.error.issues } });
      return;
    }
    const result = repo.updateTask(req.params.id, parsed.data);
    if (result.status === 'not_found') return notFound(reply);
    reply.send(result.task);
  });

  app.delete<{ Params: { id: string } }>('/api/tasks/:id', async (req, reply) => {
    const result = repo.deleteTask(req.params.id);
    if (result === 'not_found') return notFound(reply);
    if (result === 'active') {
      reply.code(409).send({ error: { message: 'cannot delete the active task' } });
      return;
    }
    reply.code(204).send();
  });

  app.post<{ Params: { id: string } }>('/api/tasks/:id/accept', async (req, reply) => {
    const result = repo.acceptTask(req.params.id);
    if (result.status === 'not_found') return notFound(reply);
    if (result.status === 'conflict') {
      reply.code(409).send({
        error: { message: 'another task is already active, or this task is not pending' },
      });
      return;
    }
    reply.send(result.task);
  });

  app.post<{ Params: { id: string } }>('/api/tasks/:id/cancel', async (req, reply) => {
    const result = repo.cancelTask(req.params.id);
    if (result.status === 'not_found') return notFound(reply);
    if (result.status === 'conflict') {
      reply.code(409).send({ error: { message: 'task is not active' } });
      return;
    }
    reply.send(result.task);
  });

  app.post<{ Params: { id: string } }>('/api/tasks/:id/complete', async (req, reply) => {
    const result = repo.completeTask(req.params.id);
    if (result.status === 'not_found') return notFound(reply);
    if (result.status === 'conflict') {
      reply.code(409).send({ error: { message: 'task is not active' } });
      return;
    }
    reply.send(result.task);
  });
}
