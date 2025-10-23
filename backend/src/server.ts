import { createApp } from './app';
import { db } from './infra/db/client';
import config from './config';
import { logger } from './shared/utils/logger';

/**
 * Start the HTTP server
 */
async function start() {
  try {
    // Connect to database
    logger.info('Connecting to database...');
    await db.connect();
    logger.info('Database connected');

    // Create Fastify app
    const app = await createApp();

    // Start listening
    await app.listen({
      port: config.port,
      host: '0.0.0.0', // Listen on all interfaces
    });

    logger.info(`Server listening on port ${config.port}`, {
      port: config.port,
      environment: config.nodeEnv,
      corsOrigin: config.corsOrigin,
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      try {
        await app.close();
        logger.info('HTTP server closed');

        await db.disconnect();
        logger.info('Database disconnected');

        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  start();
}

export { start };
