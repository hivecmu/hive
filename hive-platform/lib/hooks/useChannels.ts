import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { toast } from 'sonner';

export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'core' | 'workstream' | 'committee' | 'dm';
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export function useChannels(workspaceId: string | null) {
  return useQuery({
    queryKey: ['channels', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const result = await api.channels.list(workspaceId);

      if (!result.ok) {
        throw new Error(result.issues[0]?.message || 'Failed to load channels');
      }

      return result.value as Channel[];
    },
    enabled: !!workspaceId,
    staleTime: 30000, // 30 seconds
  });
}

export function useChannel(channelId: string | null) {
  return useQuery({
    queryKey: ['channel', channelId],
    queryFn: async () => {
      if (!channelId) return null;

      const result = await api.channels.get(channelId);

      if (!result.ok) {
        throw new Error(result.issues[0]?.message || 'Failed to load channel');
      }

      return result.value as Channel;
    },
    enabled: !!channelId,
    staleTime: 60000, // 1 minute
  });
}
