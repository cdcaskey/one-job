import fs from 'node:fs';
import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import { checkDb } from './db.js';
import { LOG_LEVEL } from './config.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerTaskRoutes } from './routes/tasks.js';

export function buildApp(distDir: string): FastifyInstance {
  const app = Fastify({ logger: { level: LOG_LEVEL }, trustProxy: true });

  app.setErrorHandler((err: FastifyError, _req, reply) => {
    if (err.validation) {
      reply.code(400).send({ error: { message: 'validation failed', details: err.validation } });
      return;
    }
    const statusCode = err.statusCode ?? 500;
    if (statusCode >= 500) app.log.error(err);
    reply.code(statusCode).send({ error: { message: err.message } });
  });

  registerHealthRoutes(app, checkDb);
  registerTaskRoutes(app);

  // Dist only exists after build; in dev Vite serves directly.
  const distExists = fs.existsSync(distDir);
  if (distExists) {
    app.register(fastifyStatic, {
      root: distDir,
      wildcard: false,
    });
  }

  app.setNotFoundHandler((req, reply) => {
    if (req.raw.url?.startsWith('/api/')) {
      reply.code(404).send({ error: { message: 'not found' } });
      return;
    }
    if (distExists) {
      reply.sendFile('index.html');
      return;
    }
    reply.code(404).send({ error: { message: 'not found' } });
  });

  return app;
}
