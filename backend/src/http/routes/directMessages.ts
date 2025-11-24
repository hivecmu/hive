import { FastifyInstance } from 'fastify';
import { directMessageService } from '@domains/messaging/DirectMessageService';
import { workspaceService } from '@domains/workspace/WorkspaceService';
import { authMiddleware } from '../middleware/auth';
import { validateParams, validateBody } from '../middleware/validation';
import { z } from 'zod';
import { Ok } from '@shared/types/Result';

const workspaceIdSchema = z.object({
  workspaceId: z.string().uuid(),
});

const dmIdSchema = z.object({
  dmId: z.string().uuid(),
});

const sendDMSchema = z.object({
  recipientId: z.string().uuid(),
  content: z.string().min(1).max(5000),
});

const markAsReadSchema = z.object({
  dmId: z.string().uuid(),
});

/**
 * Direct Message routes
 */
export async function directMessageRoutes(fastify: FastifyInstance) {
  /**
   * GET /v1/workspaces/:workspaceId/dms
   * List all DM threads for current user
   */
  fastify.get(
    '/v1/workspaces/:workspaceId/dms',
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

      const result = await directMessageService.listThreadsForUser(workspaceId, userId);

      if (!result.ok) {
        return reply.code(500).send(result);
      }

      return reply.code(200).send(Ok(result.value));
    }
  );

  /**
   * POST /v1/workspaces/:workspaceId/dms
   * Start or continue a DM conversation
   */
  fastify.post(
    '/v1/workspaces/:workspaceId/dms',
    {
      preHandler: [authMiddleware, validateParams(workspaceIdSchema), validateBody(sendDMSchema)],
    },
    async (request, reply) => {
      const { workspaceId } = request.params as any;
      const userId = request.user!.userId;
      const { recipientId, content } = request.body as any;

      // Check membership
      const isMember = await workspaceService.isMember(workspaceId, userId);
      if (!isMember) {
        return reply.code(403).send({
          ok: false,
          issues: [{ code: 'FORBIDDEN', message: 'Not a member', severity: 'error' }],
        });
      }

      // Check if recipient is also a member
      const recipientIsMember = await workspaceService.isMember(workspaceId, recipientId);
      if (!recipientIsMember) {
        return reply.code(400).send({
          ok: false,
          issues: [{ code: 'INVALID_RECIPIENT', message: 'Recipient is not a member of this workspace', severity: 'error' }],
        });
      }

      const result = await directMessageService.sendMessage({
        workspaceId,
        senderId: userId,
        recipientId,
        content,
      });

      if (!result.ok) {
        return reply.code(500).send(result);
      }

      return reply.code(201).send(Ok(result.value));
    }
  );

  /**
   * GET /v1/dms/:dmId/messages
   * List messages in a DM thread
   */
  fastify.get(
    '/v1/dms/:dmId/messages',
    {
      preHandler: [authMiddleware, validateParams(dmIdSchema)],
    },
    async (request, reply) => {
      const { dmId } = request.params as any;
      const query = request.query as any;
      const limit = parseInt(query.limit || '50');
      const before = query.before ? new Date(query.before) : undefined;

      // TODO: Check if user is part of this DM thread

      const result = await directMessageService.listMessages(dmId, limit, before);

      if (!result.ok) {
        return reply.code(500).send(result);
      }

      return reply.code(200).send(Ok(result.value));
    }
  );

  /**
   * POST /v1/dms/read
   * Mark DM messages as read
   */
  fastify.post(
    '/v1/dms/read',
    {
      preHandler: [authMiddleware, validateBody(markAsReadSchema)],
    },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { dmId } = request.body as any;

      const result = await directMessageService.markAsRead(dmId, userId);

      if (!result.ok) {
        return reply.code(500).send(result);
      }

      return reply.code(204).send();
    }
  );
}
