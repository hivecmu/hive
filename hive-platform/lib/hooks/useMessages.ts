import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '@/lib/api/client';
import { toast } from 'sonner';
import { useSocket } from '@/hooks/useSocket';

export interface Message {
  id: string;
  content: string;
  channelId: string;
  userId: string;
  threadId?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export function useMessages(channelId: string | null) {
  const queryClient = useQueryClient();
  const { onMessage, isConnected } = useSocket();

  // Listen for real-time message updates
  useEffect(() => {
    if (!channelId || !isConnected) return;

    const cleanup = onMessage((newMessage: Message) => {
      // Only update if the message is for the current channel
      if (newMessage.channelId === channelId) {
        queryClient.setQueryData(['messages', channelId], (oldMessages: Message[] = []) => {
          // Check if message already exists (avoid duplicates)
          const messageExists = oldMessages.some(msg => msg.id === newMessage.id);
          if (messageExists) {
            return oldMessages;
          }
          // Add new message to the end
          return [...oldMessages, newMessage];
        });
      }
    });

    return cleanup;
  }, [channelId, isConnected, onMessage, queryClient]);

  return useQuery({
    queryKey: ['messages', channelId],
    queryFn: async () => {
      if (!channelId) return [];

      const result = await api.messages.list(channelId, { limit: 100 });

      if (!result.ok) {
        throw new Error(result.issues[0]?.message || 'Failed to load messages');
      }

      return result.value as Message[];
    },
    enabled: !!channelId,
    staleTime: 30000, // 30 seconds (we rely on WebSocket for real-time updates)
    refetchInterval: false, // Disable polling since we have WebSocket
  });
}

export function useSendMessage(channelId: string | null, threadId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      if (!channelId) {
        throw new Error('No channel selected');
      }

      const result = await api.messages.send(channelId, { content, threadId });

      if (!result.ok) {
        throw new Error(result.issues[0]?.message || 'Failed to send message');
      }

      return result.value as Message;
    },
    onSuccess: () => {
      // Invalidate and refetch messages
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
      // Also invalidate thread if this is a thread reply
      if (threadId) {
        queryClient.invalidateQueries({ queryKey: ['thread', threadId] });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useEditMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      const result = await api.messages.edit(messageId, content);

      if (!result.ok) {
        throw new Error(result.issues[0]?.message || 'Failed to edit message');
      }

      return result.value as Message;
    },
    onSuccess: (data) => {
      // Invalidate messages for the channel
      queryClient.invalidateQueries({ queryKey: ['messages', data.channelId] });
      toast.success('Message updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, channelId }: { messageId: string; channelId: string }) => {
      const result = await api.messages.delete(messageId);

      if (!result.ok) {
        throw new Error(result.issues[0]?.message || 'Failed to delete message');
      }

      return { messageId, channelId };
    },
    onSuccess: (data) => {
      // Invalidate messages for the channel
      queryClient.invalidateQueries({ queryKey: ['messages', data.channelId] });
      toast.success('Message deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
