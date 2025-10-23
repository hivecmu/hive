import { FastifyInstance } from 'fastify';
import { workspaceService } from '@domains/workspace/WorkspaceService';
import { authMiddleware } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validation';
import { createWorkspaceSchema, updateWorkspaceSchema, workspaceIdSchema } from '../schemas/workspace';
import { Ok } from '@shared/types/Result';

/**
 * Workspace routes
 */
export async function workspaceRoutes(fastify: FastifyInstance) {
  /**
   * GET /v1/workspaces
   * List all workspaces for current user
   */
  fastify.get(
    '/v1/workspaces',
    {
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      const userId = request.user!.userId;
      const result = await workspaceService.listForUser(userId);

      if (!result.ok) {
        return reply.code(500).send(result);
      }

      return reply.code(200).send(Ok(result.value));
    }
  );

  /**
   * POST /v1/workspaces
   * Create a new workspace
   */
  fastify.post(
    '/v1/workspaces',
    {
      preHandler: [authMiddleware, validateBody(createWorkspaceSchema)],
    },
    async (request, reply) => {
      const userId = request.user!.userId;
      const input = request.body as any;

      const result = await workspaceService.create({
        ...input,
        ownerId: userId,
      });

      if (!result.ok) {
        const statusCode = result.issues[0].code === 'CONFLICT' ? 409 : 500;
        return reply.code(statusCode).send(result);
      }

      return reply.code(201).send(Ok(result.value));
    }
  );

  /**
   * GET /v1/workspaces/:id
   * Get workspace by ID
   */
  fastify.get(
    '/v1/workspaces/:id',
    {
      preHandler: [authMiddleware, validateParams(workspaceIdSchema)],
    },
    async (request, reply) => {
      const { id } = request.params as any;
      const userId = request.user!.userId;

      // Check if user is a member
      const isMember = await workspaceService.isMember(id, userId);
      if (!isMember) {
        return reply.code(403).send({
          ok: false,
          issues: [{ code: 'FORBIDDEN', message: 'Not a member of this workspace', severity: 'error' }],
        });
      }

      const result = await workspaceService.getById(id);

      if (!result.ok) {
        return reply.code(404).send(result);
      }

      return reply.code(200).send(Ok(result.value));
    }
  );

  /**
   * PATCH /v1/workspaces/:id
   * Update workspace
   */
  fastify.patch(
    '/v1/workspaces/:id',
    {
      preHandler: [authMiddleware, validateParams(workspaceIdSchema), validateBody(updateWorkspaceSchema)],
    },
    async (request, reply) => {
      const { id } = request.params as any;
      const userId = request.user!.userId;
      const updates = request.body as any;

      // Check if user is admin
      const role = await workspaceService.getUserRole(id, userId);
      if (role !== 'admin') {
        return reply.code(403).send({
          ok: false,
          issues: [{ code: 'FORBIDDEN', message: 'Only admins can update workspace', severity: 'error' }],
        });
      }

      const result = await workspaceService.update(id, updates);

      if (!result.ok) {
        return reply.code(404).send(result);
      }

      return reply.code(200).send(Ok(result.value));
    }
  );

  /**
   * DELETE /v1/workspaces/:id
   * Delete workspace
   */
  fastify.delete(
    '/v1/workspaces/:id',
    {
      preHandler: [authMiddleware, validateParams(workspaceIdSchema)],
    },
    async (request, reply) => {
      const { id } = request.params as any;
      const userId = request.user!.userId;

      // Check if user is owner
      const workspace = await workspaceService.getById(id);
      if (!workspace.ok) {
        return reply.code(404).send(workspace);
      }

      if (workspace.value.ownerId !== userId) {
        return reply.code(403).send({
          ok: false,
          issues: [{ code: 'FORBIDDEN', message: 'Only owner can delete workspace', severity: 'error' }],
        });
      }

      const result = await workspaceService.delete(id);

      if (!result.ok) {
        return reply.code(404).send(result);
      }

      return reply.code(204).send();
    }
  );
}
