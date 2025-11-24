/**
 * API Client Tests
 *
 * These tests validate the HTTP client layer that communicates with the backend.
 * The API client is critical because it:
 * 1. Handles all HTTP communication with the backend
 * 2. Manages authentication tokens
 * 3. Wraps responses in a Result<T> envelope for type-safe error handling
 * 4. Handles network failures gracefully
 *
 * Why these tests matter:
 * - All backend communication goes through this client
 * - Bugs here could cause auth failures, data corruption, or silent errors
 * - The Result envelope pattern is core to the app's error handling
 * - Token management is critical for security
 */

import {
  api,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  type Result,
  type Issue,
} from './client'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

// Mock localStorage
const mockLocalStorage: { [key: string]: string } = {}
const originalLocalStorage = global.localStorage

beforeAll(() => {
  Object.defineProperty(global, 'localStorage', {
    value: {
      getItem: (key: string) => mockLocalStorage[key] || null,
      setItem: (key: string, value: string) => {
        mockLocalStorage[key] = value
      },
      removeItem: (key: string) => {
        delete mockLocalStorage[key]
      },
      clear: () => {
        Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key])
      },
      length: 0,
      key: jest.fn(),
    },
    writable: true,
  })
})

afterAll(() => {
  Object.defineProperty(global, 'localStorage', {
    value: originalLocalStorage,
    writable: true,
  })
})

beforeEach(() => {
  // Clear localStorage and mocks
  Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key])
  mockFetch.mockClear()
})

describe('API Client - Token Management', () => {
  describe('Auth Token Storage', () => {
    it('should store auth token in localStorage', () => {
      setAuthToken('test-token-123')

      expect(mockLocalStorage['hive_auth_token']).toBe('test-token-123')
    })

    it('should retrieve auth token from localStorage', () => {
      mockLocalStorage['hive_auth_token'] = 'stored-token'

      const token = getAuthToken()

      expect(token).toBe('stored-token')
    })

    it('should return null when no token exists', () => {
      const token = getAuthToken()

      expect(token).toBeNull()
    })

    it('should clear auth token from localStorage', () => {
      mockLocalStorage['hive_auth_token'] = 'token-to-clear'

      clearAuthToken()

      expect(mockLocalStorage['hive_auth_token']).toBeUndefined()
    })
  })
})

describe('API Client - HTTP Requests', () => {
  describe('Request Headers', () => {
    it('should include Content-Type header by default', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: async () => ({ ok: true, value: {} }),
      })

      await api.workspaces.list()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('should include Authorization header when token exists', async () => {
      setAuthToken('my-auth-token')
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: async () => ({ ok: true, value: [] }),
      })

      await api.workspaces.list()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer my-auth-token',
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('should not include Authorization header when no token exists', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: async () => ({ ok: true, value: [] }),
      })

      await api.workspaces.list()

      const callArgs = mockFetch.mock.calls[0][1]
      expect(callArgs?.headers).not.toHaveProperty('Authorization')
    })
  })

  describe('Result Envelope Handling', () => {
    it('should return successful Result envelope on 200 response', async () => {
      const mockData = { id: 1, name: 'Test Workspace' }
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: async () => ({ ok: true, value: mockData }),
      })

      const result = await api.workspaces.get('ws-1')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toEqual(mockData)
      }
    })

    it('should return error Result envelope on failure response', async () => {
      const mockIssues: Issue[] = [
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid workspace name',
          severity: 'error',
          field: 'name',
        },
      ]
      mockFetch.mockResolvedValueOnce({
        status: 400,
        json: async () => ({ ok: false, issues: mockIssues }),
      })

      const result = await api.workspaces.create({
        name: '',
        slug: 'test',
      })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.issues).toEqual(mockIssues)
        expect(result.issues[0].code).toBe('VALIDATION_ERROR')
      }
    })

    it('should handle 204 No Content responses', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 204,
      })

      const result = await api.workspaces.delete('ws-1')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBeUndefined()
      }
    })
  })

  describe('Network Error Handling', () => {
    it('should return error Result on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await api.workspaces.list()

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.issues).toHaveLength(1)
        expect(result.issues[0].code).toBe('NETWORK_ERROR')
        expect(result.issues[0].message).toBe('Failed to connect to server')
        expect(result.issues[0].severity).toBe('error')
      }
    })

    it('should log network errors to console', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

      await api.workspaces.list()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'API request failed:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })
  })
})

describe('API Client - Authentication Endpoints', () => {
  describe('Register', () => {
    it('should send registration data and store token on success', async () => {
      const mockResponse = {
        ok: true,
        value: {
          user: { id: '1', email: 'test@example.com', name: 'Test User' },
          token: 'new-auth-token',
        },
      }
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponse,
      })

      const result = await api.auth.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      })

      expect(result.ok).toBe(true)
      expect(mockLocalStorage['hive_auth_token']).toBe('new-auth-token')
    })

    it('should not store token on registration failure', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 400,
        json: async () => ({
          ok: false,
          issues: [{ code: 'EMAIL_EXISTS', message: 'Email already exists', severity: 'error' }],
        }),
      })

      await api.auth.register({
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
      })

      expect(mockLocalStorage['hive_auth_token']).toBeUndefined()
    })
  })

  describe('Login', () => {
    it('should send login credentials and store token on success', async () => {
      const mockResponse = {
        ok: true,
        value: {
          user: { id: '1', email: 'test@example.com' },
          token: 'login-token-abc',
        },
      }
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponse,
      })

      const result = await api.auth.login({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(result.ok).toBe(true)
      expect(mockLocalStorage['hive_auth_token']).toBe('login-token-abc')
    })

    it('should not store token on login failure', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 401,
        json: async () => ({
          ok: false,
          issues: [{ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials', severity: 'error' }],
        }),
      })

      await api.auth.login({
        email: 'test@example.com',
        password: 'wrong-password',
      })

      expect(mockLocalStorage['hive_auth_token']).toBeUndefined()
    })
  })

  describe('Logout', () => {
    it('should clear the auth token', () => {
      mockLocalStorage['hive_auth_token'] = 'token-to-clear'

      api.auth.logout()

      expect(mockLocalStorage['hive_auth_token']).toBeUndefined()
    })
  })
})

describe('API Client - Workspace Endpoints', () => {
  beforeEach(() => {
    setAuthToken('test-token')
  })

  it('should list workspaces', async () => {
    const mockWorkspaces = [
      { id: 'ws-1', name: 'Workspace 1' },
      { id: 'ws-2', name: 'Workspace 2' },
    ]
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ ok: true, value: mockWorkspaces }),
    })

    const result = await api.workspaces.list()

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/v1/workspaces',
      expect.any(Object)
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toEqual(mockWorkspaces)
    }
  })

  it('should create a workspace with POST request', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ ok: true, value: { id: 'new-ws', name: 'New Workspace' } }),
    })

    const result = await api.workspaces.create({
      name: 'New Workspace',
      slug: 'new-workspace',
      type: 'company',
    })

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/v1/workspaces',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(String),
      })
    )

    const callArgs = mockFetch.mock.calls[0][1]
    const body = JSON.parse(callArgs?.body as string)
    expect(body).toEqual({
      name: 'New Workspace',
      slug: 'new-workspace',
      type: 'company',
    })
  })

  it('should get a specific workspace by ID', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ ok: true, value: { id: 'ws-123', name: 'My Workspace' } }),
    })

    await api.workspaces.get('ws-123')

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/v1/workspaces/ws-123',
      expect.any(Object)
    )
  })

  it('should update a workspace with PATCH request', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ ok: true, value: { id: 'ws-1', name: 'Updated Name' } }),
    })

    await api.workspaces.update('ws-1', { name: 'Updated Name' })

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/v1/workspaces/ws-1',
      expect.objectContaining({
        method: 'PATCH',
      })
    )
  })

  it('should delete a workspace with DELETE request', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 204,
    })

    const result = await api.workspaces.delete('ws-1')

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/v1/workspaces/ws-1',
      expect.objectContaining({
        method: 'DELETE',
      })
    )
    expect(result.ok).toBe(true)
  })
})

describe('API Client - Message Endpoints', () => {
  beforeEach(() => {
    setAuthToken('test-token')
  })

  it('should list messages with query parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ ok: true, value: [] }),
    })

    await api.messages.list('channel-1', { limit: 50, before: 'msg-100' })

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/v1/channels/channel-1/messages?limit=50&before=msg-100',
      expect.any(Object)
    )
  })

  it('should list messages without query parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ ok: true, value: [] }),
    })

    await api.messages.list('channel-1')

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/v1/channels/channel-1/messages',
      expect.any(Object)
    )
  })

  it('should send a message', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ ok: true, value: { id: 'msg-1', content: 'Hello' } }),
    })

    await api.messages.send('channel-1', { content: 'Hello', threadId: 'thread-1' })

    const callArgs = mockFetch.mock.calls[0][1]
    const body = JSON.parse(callArgs?.body as string)

    expect(body).toEqual({ content: 'Hello', threadId: 'thread-1' })
  })
})

describe('API Client - Structure Endpoints', () => {
  beforeEach(() => {
    setAuthToken('test-token')
  })

  it('should generate structure with wizard data', async () => {
    const wizardData = {
      workspaceId: 'ws-1',
      communitySize: 'medium',
      coreActivities: ['discussions', 'events'],
      moderationCapacity: 'high',
      channelBudget: 10,
    }

    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ ok: true, value: { job: {}, proposal: {} } }),
    })

    await api.structure.generate(wizardData)

    const callArgs = mockFetch.mock.calls[0][1]
    const body = JSON.parse(callArgs?.body as string)

    expect(body).toEqual(wizardData)
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/v1/structure/generate',
      expect.objectContaining({ method: 'POST' })
    )
  })
})
