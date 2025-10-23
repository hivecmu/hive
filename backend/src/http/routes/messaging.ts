import { FastifyInstance } from 'fastify';
import { channelService } from '@domains/messaging/ChannelService';
import { messageService } from '@domains/messaging/MessageService';
import { workspaceService } from '@domains/workspace/WorkspaceService';
import { authMiddleware } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validation';
import { z } from 'zod';
import { Ok } from '@shared/types/Result';

const channelIdSchema = z.object({
  id: z.string().uuid(),
});

const workspaceIdSchema = z.object({
  workspaceId: z.string().uuid(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long'),
  threadId: z.string().uuid().optional(),
});

const editMessageSchema = z.object({
  content: z.string().min(1).max(5000),
});

/**
 * Messaging routes
 */
export async function messagingRoutes(fastify: FastifyInstance) {
  /**
   * GET /v1/workspaces/:workspaceId/channels
   * List channels in workspace
   */
  fastify.get(
    '/v1/workspaces/:workspaceId/channels',
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

      const result = await channelService.listByWorkspace(workspaceId);

      if (!result.ok) {
        return reply.code(500).send(result);
      }

      return reply.code(200).send(Ok(result.value));
    }
  );

  /**
   * GET /v1/channels/:id
   * Get channel by ID
   */
  fastify.get(
    '/v1/channels/:id',
    {
      preHandler: [authMiddleware, validateParams(channelIdSchema)],
    },
    async (request, reply) => {
      const { id } = request.params as any;

      const result = await channelService.getById(id);

      if (!result.ok) {
        return reply.code(404).send(result);
      }

      return reply.code(200).send(Ok(result.value));
    }
  );

  /**
   * GET /v1/channels/:id/messages
   * List messages in channel
   */
  fastify.get(
    '/v1/channels/:id/messages',
    {
      preHandler: [authMiddleware, validateParams(channelIdSchema)],
    },
    async (request, reply) => {
      const { id } = request.params as any;
      const query = request.query as any;
      const limit = parseInt(query.limit || '50');
      const before = query.before ? new Date(query.before) : undefined;

      const result = await messageService.listByChannel(id, limit, before);

      if (!result.ok) {
        return reply.code(500).send(result);
      }

      return reply.code(200).send(Ok(result.value));
    }
  );

  /**
   * POST /v1/channels/:id/messages
   * Send message to channel
   */
  fastify.post(
    '/v1/channels/:id/messages',
    {
      preHandler: [authMiddleware, validateParams(channelIdSchema), validateBody(sendMessageSchema)],
    },
    async (request, reply) => {
      const { id } = request.params as any;
      const userId = request.user!.userId;
      const { content, threadId } = request.body as any;

      const result = await messageService.send({
        channelId: id,
        userId,
        content,
        threadId,
      });

      if (!result.ok) {
        return reply.code(500).send(result);
      }

      // Broadcast to WebSocket clients
      fastify.websocketServer.emit('message', {
        channelId: id,
        message: result.value,
      });

      return reply.code(201).send(Ok(result.value));
    }
  );

  /**
   * PATCH /v1/messages/:id
   * Edit a message
   */
  fastify.patch(
    '/v1/messages/:id',
    {
      preHandler: [authMiddleware, validateParams(channelIdSchema), validateBody(editMessageSchema)],
    },
    async (request, reply) => {
      const { id } = request.params as any;
      const userId = request.user!.userId;
      const { content } = request.body as any;

      const result = await messageService.edit(id, userId, content);

      if (!result.ok) {
        const statusCode = result.issues[0].code === 'FORBIDDEN' ? 403 : 500;
        return reply.code(statusCode).send(result);
      }

      return reply.code(200).send(Ok(result.value));
    }
  );

  /**
   * DELETE /v1/messages/:id
   * Delete a message
   */
  fastify.delete(
    '/v1/messages/:id',
    {
      preHandler: [authMiddleware, validateParams(channelIdSchema)],
    },
    async (request, reply) => {
      const { id } = request.params as any;
      const userId = request.user!.userId;

      const result = await messageService.delete(id, userId);

      if (!result.ok) {
        const statusCode = result.issues[0].code === 'FORBIDDEN' ? 403 : 404;
        return reply.code(statusCode).send(result);
      }

      return reply.code(204).send();
    }
  );
}
