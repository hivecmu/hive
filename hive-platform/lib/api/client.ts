/**
 * API Client for Hive Backend
 * Typed HTTP client with Result<T, Issue[]> envelope handling
 */

export interface Issue {
  code: string;
  message: string;
  severity: 'info' | 'warn' | 'error' | 'block';
  field?: string;
  meta?: Record<string, unknown>;
}

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; issues: Issue[] };

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('hive_auth_token');
}

/**
 * Set auth token in localStorage
 */
function setAuthToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('hive_auth_token', token);
}

/**
 * Clear auth token
 */
function clearAuthToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('hive_auth_token');
}

/**
 * Make authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<Result<T>> {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle 204 No Content
    if (response.status === 204) {
      return { ok: true, value: undefined as T };
    }

    const data = await response.json();

    // Backend returns Result envelope
    return data as Result<T>;
  } catch (error) {
    console.error('API request failed:', error);
    return {
      ok: false,
      issues: [
        {
          code: 'NETWORK_ERROR',
          message: 'Failed to connect to server',
          severity: 'error',
        },
      ],
    };
  }
}

/**
 * API Client
 */
export const api = {
  // Auth
  auth: {
    register: async (data: { email: string; password: string; name: string }) => {
      const result = await apiRequest<{ user: any; token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (result.ok) {
        setAuthToken(result.value.token);
      }

      return result;
    },

    login: async (data: { email: string; password: string }) => {
      const result = await apiRequest<{ user: any; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (result.ok) {
        setAuthToken(result.value.token);
      }

      return result;
    },

    logout: () => {
      clearAuthToken();
    },

    me: () => apiRequest<any>('/auth/me'),
  },

  // Workspaces
  workspaces: {
    list: () => apiRequest<any[]>('/v1/workspaces'),

    create: (data: {
      name: string;
      slug: string;
      type?: string;
      emoji?: string;
      color?: string;
    }) =>
      apiRequest<any>('/v1/workspaces', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    get: (id: string) => apiRequest<any>(`/v1/workspaces/${id}`),

    update: (id: string, data: any) =>
      apiRequest<any>(`/v1/workspaces/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      apiRequest<void>(`/v1/workspaces/${id}`, {
        method: 'DELETE',
      }),
  },

  // Channels
  channels: {
    list: (workspaceId: string) =>
      apiRequest<any[]>(`/v1/workspaces/${workspaceId}/channels`),

    get: (id: string) => apiRequest<any>(`/v1/channels/${id}`),
  },

  // Messages
  messages: {
    list: (channelId: string, params?: { limit?: number; before?: string }) => {
      const query = new URLSearchParams();
      if (params?.limit) query.set('limit', params.limit.toString());
      if (params?.before) query.set('before', params.before);

      const queryString = query.toString();
      return apiRequest<any[]>(
        `/v1/channels/${channelId}/messages${queryString ? `?${queryString}` : ''}`
      );
    },

    send: (channelId: string, data: { content: string; threadId?: string }) =>
      apiRequest<any>(`/v1/channels/${channelId}/messages`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    edit: (id: string, content: string) =>
      apiRequest<any>(`/v1/messages/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ content }),
      }),

    delete: (id: string) =>
      apiRequest<void>(`/v1/messages/${id}`, {
        method: 'DELETE',
      }),
  },

  // Structure (User Story 1)
  structure: {
    generate: (data: {
      workspaceId: string;
      communitySize: string;
      coreActivities: string[];
      moderationCapacity: string;
      channelBudget: number;
      additionalContext?: string;
    }) =>
      apiRequest<{ job: any; proposal: any }>('/v1/structure/generate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getJob: (jobId: string) =>
      apiRequest<{ job: any; proposal: any }>(`/v1/structure/jobs/${jobId}`),

    approve: (jobId: string) =>
      apiRequest<{ jobId: string; status: string; channelsCreated: number }>(
        `/v1/structure/proposals/${jobId}/approve`,
        {
          method: 'POST',
        }
      ),
  },

  // File Hub (User Story 2)
  files: {
    search: (params: { q?: string; tags?: string; mimeType?: string; limit?: number }) => {
      const query = new URLSearchParams();
      if (params.q) query.set('q', params.q);
      if (params.tags) query.set('tags', params.tags);
      if (params.mimeType) query.set('mimeType', params.mimeType);
      if (params.limit) query.set('limit', params.limit.toString());

      return apiRequest<any[]>(`/v1/files/search?${query.toString()}`);
    },

    tag: (fileId: string) =>
      apiRequest<any>(`/v1/files/${fileId}/tag`, {
        method: 'POST',
      }),

    index: (fileId: string) =>
      apiRequest<{ indexed: boolean }>(`/v1/files/${fileId}/index`, {
        method: 'POST',
      }),

    createSyncJob: (workspaceId: string) =>
      apiRequest<any>(`/v1/workspaces/${workspaceId}/files/sync`, {
        method: 'POST',
      }),
  },

  // Health
  health: () => apiRequest<any>('/health'),
};

export { setAuthToken, getAuthToken, clearAuthToken };
