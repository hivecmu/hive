import { FastifyInstance } from 'fastify';
import { fileHubService } from '@domains/filehub/FileHubService';
import { workspaceService } from '@domains/workspace/WorkspaceService';
import { authMiddleware } from '../middleware/auth';
import { validateParams, validateQuery } from '../middleware/validation';
import { z } from 'zod';
import { Ok } from '@shared/types/Result';

const workspaceIdSchema = z.object({
  workspaceId: z.string().uuid(),
});

const searchSchema = z.object({
  q: z.string().optional(),
  tags: z.string().optional(), // Comma-separated
  mimeType: z.string().optional(),
  channelId: z.string().uuid().optional(),
  limit: z.string().optional(),
});

/**
 * File Hub routes (User Story 2)
 */
export async function fileHubRoutes(fastify: FastifyInstance) {
  /**
   * POST /v1/workspaces/:workspaceId/files/sync
   * Create file sync job
   */
  fastify.post(
    '/v1/workspaces/:workspaceId/files/sync',
    {
      preHandler: [authMiddleware, validateParams(workspaceIdSchema)],
    },
    async (request, reply) => {
      const { workspaceId } = request.params as any;
      const userId = request.user!.userId;

      // Check membership
      const isMember = await workspaceService.isMember(workspaceId, userId);
      if (!isMember) {
        return reply.code(403).send({
          ok: false,
          issues: [{ code: 'FORBIDDEN', message: 'Not a member', severity: 'error' }],
        });
      }

      const result = await fileHubService.createJob(workspaceId, userId);

      if (!result.ok) {
        return reply.code(500).send(result);
      }

      return reply.code(201).send(Ok(result.value));
    }
  );

  /**
   * GET /v1/files/search
   * Search files across workspace
   */
  fastify.get(
    '/v1/files/search',
    {
      preHandler: [authMiddleware, validateQuery(searchSchema)],
    },
    async (request, reply) => {
      const query = request.query as any;
      const userId = request.user!.userId;

      // Get user's workspaces
      const workspacesResult = await workspaceService.listForUser(userId);
      if (!workspacesResult.ok || workspacesResult.value.length === 0) {
        return reply.code(200).send(Ok([]));
      }

      // Search in first workspace (simplified - full version would search all)
      const workspaceId = workspacesResult.value[0].id;

      const searchQuery = {
        query: query.q || '',
        filters: {
          tags: query.tags ? query.tags.split(',') : undefined,
          mimeType: query.mimeType,
          channelId: query.channelId,
        },
        limit: query.limit ? parseInt(query.limit) : 50,
      };

      const result = await fileHubService.search(workspaceId, searchQuery);

      if (!result.ok) {
        return reply.code(500).send(result);
      }

      return reply.code(200).send(Ok(result.value));
    }
  );

  /**
   * POST /v1/files/:fileId/tag
   * Generate AI tags for a file
   */
  fastify.post(
    '/v1/files/:fileId/tag',
    {
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      const { fileId } = request.params as any;

      const result = await fileHubService.tagFile(fileId);

      if (!result.ok) {
        return reply.code(404).send(result);
      }

      return reply.code(200).send(Ok(result.value));
    }
  );

  /**
   * POST /v1/files/:fileId/index
   * Index file for search
   */
  fastify.post(
    '/v1/files/:fileId/index',
    {
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      const { fileId } = request.params as any;

      const result = await fileHubService.indexFile(fileId);

      if (!result.ok) {
        return reply.code(404).send(result);
      }

      return reply.code(200).send(Ok({ indexed: true }));
    }
  );
}
