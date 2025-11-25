"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinChannel: (channelId: string) => void;
  leaveChannel: (channelId: string) => void;
  sendMessage: (channelId: string, content: string) => void;
  emitTypingStart: (channelId: string) => void;
  emitTypingStop: (channelId: string) => void;
  onMessage: (callback: (message: any) => void) => () => void;
  onUserTyping: (callback: (data: { userId: string; channelId: string }) => void) => () => void;
  onUserStoppedTyping: (callback: (data: { userId: string; channelId: string }) => void) => () => void;
  onUserStatusChange: (callback: (data: { userId: string; status: string }) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: React.ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Get auth token from localStorage (same key as API client)
    const token = localStorage.getItem('hive_auth_token');

    if (!token) {
      console.warn('No auth token found, skipping WebSocket connection');
      return;
    }

    // Initialize socket connection - use empty string for same-origin connection
    // Path matches backend socket.io configuration for ALB routing
    const socketInstance = io('', {
      auth: {
        token,
      },
      path: '/api/socket.io',
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    // Connection event handlers
    socketInstance.on('connect', () => {
      console.log('WebSocket connected:', socketInstance.id);
      setIsConnected(true);
      toast.success('Connected to real-time messaging');
    });

    socketInstance.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      toast.error('Disconnected from real-time messaging');
    });

    socketInstance.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
      toast.error('Failed to connect to messaging server');
    });

    socketInstance.on('error', (error) => {
      console.error('WebSocket error:', error);
      toast.error('WebSocket error occurred');
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up WebSocket connection');
      socketInstance.disconnect();
    };
  }, []);

  const joinChannel = useCallback((channelId: string) => {
    if (socket && isConnected) {
      console.log('Joining channel:', channelId);
      socket.emit('join-channel', channelId);
    }
  }, [socket, isConnected]);

  const leaveChannel = useCallback((channelId: string) => {
    if (socket && isConnected) {
      console.log('Leaving channel:', channelId);
      socket.emit('leave-channel', channelId);
    }
  }, [socket, isConnected]);

  const sendMessage = useCallback((channelId: string, content: string) => {
    if (socket && isConnected) {
      socket.emit('send-message', {
        channelId,
        content,
        timestamp: new Date().toISOString(),
      });
    } else {
      toast.error('Cannot send message: not connected');
    }
  }, [socket, isConnected]);

  const emitTypingStart = useCallback((channelId: string) => {
    if (socket && isConnected) {
      socket.emit('typing-start', { channelId });
    }
  }, [socket, isConnected]);

  const emitTypingStop = useCallback((channelId: string) => {
    if (socket && isConnected) {
      socket.emit('typing-stop', { channelId });
    }
  }, [socket, isConnected]);

  const onMessage = useCallback((callback: (message: any) => void) => {
    if (!socket) return () => {};

    socket.on('message', callback);

    return () => {
      socket.off('message', callback);
    };
  }, [socket]);

  const onUserTyping = useCallback((callback: (data: { userId: string; channelId: string }) => void) => {
    if (!socket) return () => {};

    socket.on('user-typing', callback);

    return () => {
      socket.off('user-typing', callback);
    };
  }, [socket]);

  const onUserStoppedTyping = useCallback((callback: (data: { userId: string; channelId: string }) => void) => {
    if (!socket) return () => {};

    socket.on('user-stopped-typing', callback);

    return () => {
      socket.off('user-stopped-typing', callback);
    };
  }, [socket]);

  const onUserStatusChange = useCallback((callback: (data: { userId: string; status: string }) => void) => {
    if (!socket) return () => {};

    socket.on('user-status-change', callback);

    return () => {
      socket.off('user-status-change', callback);
    };
  }, [socket]);

  const value: SocketContextType = {
    socket,
    isConnected,
    joinChannel,
    leaveChannel,
    sendMessage,
    emitTypingStart,
    emitTypingStop,
    onMessage,
    onUserTyping,
    onUserStoppedTyping,
    onUserStatusChange,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
}
