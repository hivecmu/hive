import Fastify from 'fastify';
import cors from '@fastify/cors';
import { randomUUID } from 'crypto';
import config from './config';
import { errorHandler } from './http/middleware/error-handler';
import { authRoutes } from './http/routes/auth';
import { healthRoutes } from './http/routes/health';
import { workspaceRoutes } from './http/routes/workspaces';
import { structureRoutes } from './http/routes/structure';
import { messagingRoutes } from './http/routes/messaging';
import { fileHubRoutes } from './http/routes/filehub';
import { setupWebSocket } from './http/websocket';
import { logger } from './shared/utils/logger';

/**
 * Create and configure Fastify application
 */
export async function createApp() {
  const app = Fastify({
    logger: false, // We use Pino directly
    genReqId: () => randomUUID(), // Generate correlation ID for each request
    requestIdHeader: 'x-correlation-id',
  });

  // Register CORS
  await app.register(cors, {
    origin: config.corsOrigin,
    credentials: true,
  });

  // Add request logging
  app.addHook('onRequest', async (request, _reply) => {
    logger.info('Incoming request', {
      correlationId: request.id,
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
    });
  });

  // Add response logging
  app.addHook('onResponse', async (request, reply) => {
    logger.info('Request completed', {
      correlationId: request.id,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
    });
  });

  // Register error handler
  app.setErrorHandler(errorHandler);

  // Register routes
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(workspaceRoutes);
  await app.register(structureRoutes);
  await app.register(messagingRoutes);
  await app.register(fileHubRoutes);

  // Setup WebSocket after routes are registered
  await setupWebSocket(app);

  // 404 handler
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      ok: false,
      issues: [
        {
          code: 'NOT_FOUND',
          message: `Route ${request.method} ${request.url} not found`,
          severity: 'error',
        },
      ],
    });
  });

  return app;
}
