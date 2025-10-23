/**
 * WebSocket client for real-time messaging
 */

import { io, Socket } from 'socket.io-client';
import { getAuthToken } from './client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

let socket: Socket | null = null;

/**
 * Connect to WebSocket server
 */
export function connectWebSocket(): Socket {
  if (socket?.connected) {
    return socket;
  }

  const token = getAuthToken();

  socket = io(WS_URL, {
    auth: {
      token,
    },
    autoConnect: true,
  });

  socket.on('connect', () => {
    console.log('WebSocket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('WebSocket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error.message);
  });

  return socket;
}

/**
 * Disconnect from WebSocket
 */
export function disconnectWebSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Get current socket instance
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Join a workspace room
 */
export function joinWorkspace(workspaceId: string) {
  socket?.emit('join-workspace', workspaceId);
}

/**
 * Join a channel room
 */
export function joinChannel(channelId: string) {
  socket?.emit('join-channel', channelId);
}

/**
 * Leave a channel room
 */
export function leaveChannel(channelId: string) {
  socket?.emit('leave-channel', channelId);
}

/**
 * Send typing indicator
 */
export function sendTypingStart(channelId: string) {
  socket?.emit('typing-start', { channelId });
}

/**
 * Stop typing indicator
 */
export function sendTypingStop(channelId: string) {
  socket?.emit('typing-stop', { channelId });
}

/**
 * Listen for new messages
 */
export function onMessage(callback: (data: any) => void) {
  socket?.on('message', callback);
}

/**
 * Listen for typing indicators
 */
export function onUserTyping(callback: (data: { userId: string; channelId: string }) => void) {
  socket?.on('user-typing', callback);
}

/**
 * Stop listening for typing
 */
export function offUserTyping(callback?: (data: any) => void) {
  socket?.off('user-typing', callback);
}

/**
 * Remove message listener
 */
export function offMessage(callback?: (data: any) => void) {
  socket?.off('message', callback);
}
