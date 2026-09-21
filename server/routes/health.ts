import type { FastifyInstance } from 'fastify';

export function registerHealthRoutes(app: FastifyInstance, checkDb: () => boolean): void {
  app.get('/api/health', async (_req, reply) => {
    const dbOk = checkDb();
    reply.code(dbOk ? 200 : 503).send({ status: dbOk ? 'ok' : 'error', db: dbOk ? 'ok' : 'error' });
  });
}
