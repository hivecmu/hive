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
 * Clear authentication cookie reliably
 * Uses multiple methods to ensure cookie is cleared across all browsers
 */
function clearAuthCookie() {
  if (typeof document === 'undefined') return;
  // Use expires in the past - most reliable method
  document.cookie = "hive_authenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  // Also use max-age=0 as backup
  document.cookie = "hive_authenticated=; path=/; max-age=0";
}

/**
 * Clear all authentication state
 */
function clearAllAuthState() {
  clearAuthToken();
  clearAuthCookie();
  if (typeof window !== 'undefined') {
    localStorage.removeItem('hive_current_org_id');
    localStorage.removeItem('hive_auth');
  }
}

// Flag to prevent multiple 401 redirects
let isRedirectingToLogin = false;

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

    // Handle 401 Unauthorized - token expired or invalid
    // Skip 401 handling for auth endpoints (login/register don't need auth)
    if (response.status === 401 && !endpoint.startsWith('/auth/')) {
      // Prevent multiple redirects
      if (!isRedirectingToLogin) {
        isRedirectingToLogin = true;
        // Clear all auth state
        clearAllAuthState();
        // Use a small delay to ensure cookie is cleared before redirect
        setTimeout(() => {
          window.location.href = '/login';
          // Reset flag after a longer delay to allow page to load
          setTimeout(() => {
            isRedirectingToLogin = false;
          }, 1000);
        }, 50);
      }
      return {
        ok: false,
        issues: [{
          code: 'UNAUTHORIZED',
          message: 'Session expired. Please log in again.',
          severity: 'error',
        }],
      };
    }

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
      // Reset redirect flag on register attempt
      isRedirectingToLogin = false;
      
      const result = await apiRequest<{ user: any; token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (result.ok && result.value?.token) {
        // Validate token exists and looks like a JWT before storing
        const token = result.value.token;
        if (typeof token === 'string' && token.length > 0 && token.includes('.')) {
          setAuthToken(token);
          console.log('Auth token stored successfully');
        } else {
          console.error('Invalid token received from register:', token);
          return {
            ok: false,
            issues: [{
              code: 'INVALID_TOKEN',
              message: 'Invalid authentication token received',
              severity: 'error',
            }],
          };
        }
      }

      return result;
    },

    login: async (data: { email: string; password: string }) => {
      // Reset redirect flag on login attempt
      isRedirectingToLogin = false;
      
      const result = await apiRequest<{ user: any; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (result.ok && result.value?.token) {
        // Validate token exists and looks like a JWT before storing
        const token = result.value.token;
        if (typeof token === 'string' && token.length > 0 && token.includes('.')) {
          setAuthToken(token);
          console.log('Auth token stored successfully');
        } else {
          console.error('Invalid token received from login:', token);
          return {
            ok: false,
            issues: [{
              code: 'INVALID_TOKEN',
              message: 'Invalid authentication token received',
              severity: 'error',
            }],
          };
        }
      }

      return result;
    },

    logout: () => {
      // Reset redirect flag
      isRedirectingToLogin = false;
      // Clear all auth state
      clearAllAuthState();
      // Use a small delay to ensure cookie is cleared before redirect
      // This prevents the redirect loop with middleware
      setTimeout(() => {
        window.location.href = '/login';
      }, 50);
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

    joinByInviteCode: (inviteCode: string) =>
      apiRequest<any>('/v1/workspaces/join', {
        method: 'POST',
        body: JSON.stringify({ inviteCode }),
      }),
  },

  // Channels
  channels: {
    list: (workspaceId: string) =>
      apiRequest<any[]>(`/v1/workspaces/${workspaceId}/channels`),

    get: (id: string) => apiRequest<any>(`/v1/channels/${id}`),

    create: (workspaceId: string, data: { name: string; description?: string; type: string; isPrivate: boolean }) =>
      apiRequest<any>(`/v1/workspaces/${workspaceId}/channels`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
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
          body: JSON.stringify({}),
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
        body: JSON.stringify({}),
      }),

    index: (fileId: string) =>
      apiRequest<{ indexed: boolean }>(`/v1/files/${fileId}/index`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),

    createSyncJob: (workspaceId: string) =>
      apiRequest<any>(`/v1/workspaces/${workspaceId}/files/sync`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),

    tagAll: (workspaceId: string) =>
      apiRequest<{ tagged: number; indexed: number }>(`/v1/workspaces/${workspaceId}/files/tag-all`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
  },

  // Health
  health: () => apiRequest<any>('/health'),

  // Direct Messages
  directMessages: {
    list: (workspaceId: string) =>
      apiRequest<any[]>(`/v1/workspaces/${workspaceId}/dms`),

    send: (workspaceId: string, data: { recipientId: string; content: string }) =>
      apiRequest<any>(`/v1/workspaces/${workspaceId}/dms`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getMessages: (dmId: string, params?: { limit?: number; before?: string }) => {
      const query = new URLSearchParams();
      if (params?.limit) query.set('limit', params.limit.toString());
      if (params?.before) query.set('before', params.before);

      const queryString = query.toString();
      return apiRequest<any[]>(
        `/v1/dms/${dmId}/messages${queryString ? `?${queryString}` : ''}`
      );
    },

    markAsRead: (dmId: string) =>
      apiRequest<void>(`/v1/dms/read`, {
        method: 'POST',
        body: JSON.stringify({ dmId }),
      }),
  },
};

export { setAuthToken, getAuthToken, clearAuthToken, clearAuthCookie, clearAllAuthState };
