import { FastifyRequest, FastifyReply } from 'fastify';
import { verify } from 'jsonwebtoken';
import config from '@config/index';
import { Issues } from '@shared/types/Result';

/**
 * JWT payload structure
 */
export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Extend Fastify request to include user
 */
declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return reply.code(401).send({
        ok: false,
        issues: [Issues.unauthorized('No authorization header')],
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({
        ok: false,
        issues: [Issues.unauthorized('Invalid authorization header format')],
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Verify token
    const payload = verify(token, config.jwtSecret) as JWTPayload;

    // Attach user to request
    request.user = payload;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'TokenExpiredError') {
        return reply.code(401).send({
          ok: false,
          issues: [Issues.unauthorized('Token expired')],
        });
      }
      if (error.name === 'JsonWebTokenError') {
        return reply.code(401).send({
          ok: false,
          issues: [Issues.unauthorized('Invalid token')],
        });
      }
    }

    return reply.code(401).send({
      ok: false,
      issues: [Issues.unauthorized('Authentication failed')],
    });
  }
}

/**
 * Optional authentication middleware
 * Doesn't fail if no token, just doesn't set user
 */
export async function optionalAuthMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply
) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return; // No token, continue without user
  }

  try {
    const token = authHeader.substring(7);
    const payload = verify(token, config.jwtSecret) as JWTPayload;
    request.user = payload;
  } catch (error) {
    // Token is invalid but we don't fail the request
    // Just continue without user
  }
}
