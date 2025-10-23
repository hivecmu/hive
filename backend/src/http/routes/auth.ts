import { FastifyInstance } from 'fastify';
import { userService } from '@domains/users/UserService';
import { validateBody } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { registerSchema, loginSchema } from '../schemas/auth';
import { Ok } from '@shared/types/Result';

/**
 * Authentication routes
 */
export async function authRoutes(fastify: FastifyInstance) {
  /**
   * POST /auth/register
   * Register a new user
   */
  fastify.post(
    '/auth/register',
    {
      preHandler: [validateBody(registerSchema)],
    },
    async (request, reply) => {
      const result = await userService.register(request.body as any);

      if (!result.ok) {
        return reply.code(400).send(result);
      }

      return reply.code(201).send(Ok(result.value));
    }
  );

  /**
   * POST /auth/login
   * Login with email and password
   */
  fastify.post(
    '/auth/login',
    {
      preHandler: [validateBody(loginSchema)],
    },
    async (request, reply) => {
      const result = await userService.login(request.body as any);

      if (!result.ok) {
        return reply.code(401).send(result);
      }

      return reply.code(200).send(Ok(result.value));
    }
  );

  /**
   * GET /auth/me
   * Get current authenticated user
   */
  fastify.get(
    '/auth/me',
    {
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      // User is guaranteed to exist because authMiddleware passed
      const userId = request.user!.userId;

      const result = await userService.getById(userId);

      if (!result.ok) {
        return reply.code(404).send(result);
      }

      return reply.code(200).send(Ok(result.value));
    }
  );
}
