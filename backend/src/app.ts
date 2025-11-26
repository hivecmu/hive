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
import { directMessageRoutes } from './http/routes/directMessages';
import { fileHubRoutes } from './http/routes/filehub';
import { uploadRoutes } from './http/routes/upload';
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

  // Handle empty JSON body - treat as empty object instead of error
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    if (!body || body === '') {
      done(null, {});
    } else {
      try {
        done(null, JSON.parse(body as string));
      } catch (err: any) {
        err.statusCode = 400;
        done(err, undefined);
      }
    }
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

  // Register health routes at root level (for ALB health checks)
  await app.register(healthRoutes);

  // Register API routes under /api prefix (ALB routes /api/* to backend)
  await app.register(async function apiRoutes(api) {
    await api.register(authRoutes);
    await api.register(workspaceRoutes);
    await api.register(structureRoutes);
    await api.register(messagingRoutes);
    await api.register(directMessageRoutes);
    await api.register(fileHubRoutes);
    await api.register(uploadRoutes);
  }, { prefix: '/api' });

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
