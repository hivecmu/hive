import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { logger } from '@shared/utils/logger';
import { Issues, Issue } from '@shared/types/Result';

/**
 * Global error handler for Fastify
 */
export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const correlationId = request.id;

  // Log the error
  logger.error('Request error', {
    correlationId,
    error: error.message,
    stack: error.stack,
    statusCode: error.statusCode,
    url: request.url,
    method: request.method,
  });

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const issues: Issue[] = error.errors.map((err) => ({
      code: 'VALIDATION_ERROR',
      message: err.message,
      severity: 'error' as const,
      field: err.path.join('.'),
      meta: { zodError: err },
    }));

    return reply.code(400).send({
      ok: false,
      issues,
    });
  }

  // Handle known HTTP errors
  if (error.statusCode) {
    const issue = mapStatusCodeToIssue(error.statusCode, error.message);
    return reply.code(error.statusCode).send({
      ok: false,
      issues: [issue],
    });
  }

  // Handle unknown errors
  const issue = Issues.internal(
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : error.message
  );

  return reply.code(500).send({
    ok: false,
    issues: [issue],
  });
}

function mapStatusCodeToIssue(statusCode: number, message: string): Issue {
  switch (statusCode) {
    case 400:
      return Issues.validation(message);
    case 401:
      return Issues.unauthorized(message);
    case 403:
      return Issues.forbidden(message);
    case 404:
      return Issues.notFound('Resource');
    case 409:
      return Issues.conflict(message);
    default:
      return Issues.internal(message);
  }
}
