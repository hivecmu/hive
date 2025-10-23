import pino from 'pino';
import { randomUUID } from 'crypto';

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

/**
 * Creates a child logger with a correlation ID
 */
export function createLogger(correlationId?: string) {
  const id = correlationId || randomUUID();
  return logger.child({ correlationId: id });
}

/**
 * Log context for requests
 */
export interface LogContext {
  correlationId: string;
  userId?: string;
  workspaceId?: string;
  [key: string]: unknown;
}

export function withContext(context: LogContext) {
  return logger.child(context);
}
