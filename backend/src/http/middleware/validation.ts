import { FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema } from 'zod';

/**
 * Validation middleware factory
 * Creates a middleware that validates request body against a Zod schema
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      // Validate and parse body
      request.body = schema.parse(request.body);
    } catch (error) {
      // Zod errors will be caught by the global error handler
      throw error;
    }
  };
}

/**
 * Validation middleware for query parameters
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      request.query = schema.parse(request.query);
    } catch (error) {
      throw error;
    }
  };
}

/**
 * Validation middleware for route parameters
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      request.params = schema.parse(request.params);
    } catch (error) {
      throw error;
    }
  };
}
