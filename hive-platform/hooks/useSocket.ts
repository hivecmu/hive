"use client";

import { useSocketContext } from '@/contexts/SocketContext';

/**
 * Hook for accessing WebSocket functionality
 *
 * Provides convenient access to socket.io features including:
 * - Connection status
 * - Channel join/leave
 * - Message sending
 * - Typing indicators
 * - Event listeners for real-time updates
 *
 * @example
 * ```tsx
 * const { isConnected, sendMessage, onMessage } = useSocket();
 *
 * useEffect(() => {
 *   const cleanup = onMessage((message) => {
 *     console.log('New message:', message);
 *   });
 *   return cleanup;
 * }, [onMessage]);
 * ```
 */
export function useSocket() {
  const context = useSocketContext();

  return {
    socket: context.socket,
    isConnected: context.isConnected,
    joinChannel: context.joinChannel,
    leaveChannel: context.leaveChannel,
    sendMessage: context.sendMessage,
    emitTypingStart: context.emitTypingStart,
    emitTypingStop: context.emitTypingStop,
    onMessage: context.onMessage,
    onUserTyping: context.onUserTyping,
    onUserStoppedTyping: context.onUserStoppedTyping,
    onUserStatusChange: context.onUserStatusChange,
  };
}
