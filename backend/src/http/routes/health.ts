import { FastifyInstance } from 'fastify';
import { db } from '@infra/db/client';
import { Ok } from '@shared/types/Result';
import config from '@config/index';

/**
 * Health check routes
 */
export async function healthRoutes(fastify: FastifyInstance) {
  /**
   * GET /health
   * Basic health check
   */
  fastify.get('/health', async (_request, reply) => {
    const dbHealth = await db.healthCheck();

    const health = {
      status: dbHealth.healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: config.nodeEnv,
      services: {
        database: dbHealth.healthy ? 'ok' : 'down',
        databaseDetails: dbHealth.details,
      },
    };

    const statusCode = health.status === 'ok' ? 200 : 503;

    return reply.code(statusCode).send(Ok(health));
  });

  /**
   * GET /health/live
   * Liveness probe (for Kubernetes)
   */
  fastify.get('/health/live', async (_request, reply) => {
    return reply.code(200).send(Ok({ status: 'alive' }));
  });

  /**
   * GET /health/ready
   * Readiness probe (for Kubernetes)
   */
  fastify.get('/health/ready', async (_request, reply) => {
    const dbHealth = await db.healthCheck();

    if (!dbHealth.healthy) {
      return reply.code(503).send({
        ok: false,
        issues: [{ code: 'NOT_READY', message: 'Database not ready', severity: 'error' }],
      });
    }

    return reply.code(200).send(Ok({ status: 'ready' }));
  });
}
