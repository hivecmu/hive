/**
 * Workspace Integration Tests
 * Tests workspace CRUD operations
 */

import { config, getUrl, jsonHeader, authHeader } from './config';

describe('Workspace Integration Tests', () => {
  let authToken: string;
  let workspaceId: string;
  const testEmail = `workspace-e2e-${Date.now()}@hive.test`;

  beforeAll(async () => {
    const response = await fetch(getUrl('/auth/register'), {
      method: 'POST',
      headers: jsonHeader(),
      body: JSON.stringify({
        email: testEmail,
        password: 'TestPass123!',
        name: 'Workspace Test User',
      }),
    });

    const body = await response.json();
    authToken = body.value.token;
  });

  describe('POST /v1/workspaces', () => {
    it('WS-01: should create workspace', async () => {
      const response = await fetch(getUrl('/v1/workspaces'), {
        method: 'POST',
        headers: authHeader(authToken),
        body: JSON.stringify({
          name: 'E2E Test Workspace',
          slug: `e2e-test-ws-${Date.now()}`,
          type: 'company',
        }),
      });

      expect(response.status).toBe(201);
      const body = await response.json();

      expect(body.ok).toBe(true);
      expect(body.value.id).toBeDefined();
      expect(body.value.name).toBe('E2E Test Workspace');

      workspaceId = body.value.id;
    });

    it('WS-06: should reject unauthenticated access', async () => {
      const response = await fetch(getUrl('/v1/workspaces'), {
        method: 'POST',
        headers: jsonHeader(),
        body: JSON.stringify({
          name: 'Unauthorized Workspace',
          slug: 'unauth-ws',
          type: 'company',
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /v1/workspaces', () => {
    it('WS-02: should list workspaces', async () => {
      const response = await fetch(getUrl('/v1/workspaces'), {
        method: 'GET',
        headers: authHeader(authToken),
      });

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body.ok).toBe(true);
      expect(Array.isArray(body.value)).toBe(true);
      expect(body.value.length).toBeGreaterThan(0);
    });
  });

  describe('GET /v1/workspaces/:id', () => {
    it('WS-03: should get workspace by ID', async () => {
      const response = await fetch(getUrl(`/v1/workspaces/${workspaceId}`), {
        method: 'GET',
        headers: authHeader(authToken),
      });

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body.ok).toBe(true);
      expect(body.value.id).toBe(workspaceId);
      expect(body.value.name).toBe('E2E Test Workspace');
    });
  });

  describe('PATCH /v1/workspaces/:id', () => {
    it('WS-04: should update workspace', async () => {
      const response = await fetch(getUrl(`/v1/workspaces/${workspaceId}`), {
        method: 'PATCH',
        headers: authHeader(authToken),
        body: JSON.stringify({
          name: 'Updated E2E Workspace',
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body.ok).toBe(true);
      expect(body.value.name).toBe('Updated E2E Workspace');
    });
  });

  describe('DELETE /v1/workspaces/:id', () => {
    it('WS-05: should delete workspace', async () => {
      const createResponse = await fetch(getUrl('/v1/workspaces'), {
        method: 'POST',
        headers: authHeader(authToken),
        body: JSON.stringify({
          name: 'Workspace To Delete',
          slug: `delete-ws-${Date.now()}`,
          type: 'company',
        }),
      });

      const createBody = await createResponse.json();
      const deleteId = createBody.value.id;

      const response = await fetch(getUrl(`/v1/workspaces/${deleteId}`), {
        method: 'DELETE',
        headers: authHeader(authToken),
      });

      expect(response.status).toBe(204);
    });
  });
});

