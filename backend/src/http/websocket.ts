import { FastifyInstance } from 'fastify';
import { Server as SocketIOServer } from 'socket.io';
import { verify } from 'jsonwebtoken';
import config from '@config/index';
import { logger } from '@shared/utils/logger';
import type { JWTPayload } from './middleware/auth';

/**
 * WebSocket server for real-time messaging
 */

declare module 'fastify' {
  interface FastifyInstance {
    websocketServer: SocketIOServer;
  }
}

export async function setupWebSocket(fastify: FastifyInstance) {
  const io = new SocketIOServer(fastify.server, {
    cors: {
      origin: config.corsOrigin,
      credentials: true,
    },
  });

  // Authentication middleware for WebSocket
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = verify(token, config.jwtSecret) as JWTPayload;
      socket.data.user = payload;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.data.user?.userId;

    logger.info('WebSocket client connected', {
      socketId: socket.id,
      userId,
    });

    // Join workspace rooms
    socket.on('join-workspace', (workspaceId: string) => {
      socket.join(`workspace:${workspaceId}`);
      logger.debug('Joined workspace room', { userId, workspaceId });
    });

    // Join channel rooms
    socket.on('join-channel', (channelId: string) => {
      socket.join(`channel:${channelId}`);
      logger.debug('Joined channel room', { userId, channelId });
    });

    // Leave channel rooms
    socket.on('leave-channel', (channelId: string) => {
      socket.leave(`channel:${channelId}`);
      logger.debug('Left channel room', { userId, channelId });
    });

    // Typing indicators
    socket.on('typing-start', (data: { channelId: string }) => {
      socket.to(`channel:${data.channelId}`).emit('user-typing', {
        userId,
        channelId: data.channelId,
      });
    });

    socket.on('typing-stop', (data: { channelId: string }) => {
      socket.to(`channel:${data.channelId}`).emit('user-stopped-typing', {
        userId,
        channelId: data.channelId,
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      logger.info('WebSocket client disconnected', {
        socketId: socket.id,
        userId,
      });
    });
  });

  // Attach to fastify instance for route access
  fastify.decorate('websocketServer', io);

  logger.info('WebSocket server initialized');
}

/**
 * Broadcast message to channel
 */
export function broadcastMessage(io: SocketIOServer, channelId: string, message: any) {
  io.to(`channel:${channelId}`).emit('message', message);
}

/**
 * Broadcast to workspace
 */
export function broadcastToWorkspace(io: SocketIOServer, workspaceId: string, event: string, data: any) {
  io.to(`workspace:${workspaceId}`).emit(event, data);
}
