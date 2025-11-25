/**
 * File Hub Integration Tests (User Story 2)
 * Tests AI-driven file hub: sync, search, tag, index
 */

import { config, getUrl, jsonHeader, authHeader } from './config';

describe('File Hub Integration Tests (User Story 2)', () => {
  let authToken: string;
  let workspaceId: string;
  const testEmail = `filehub-e2e-${Date.now()}@hive.test`;

  beforeAll(async () => {
    const registerResponse = await fetch(getUrl('/auth/register'), {
      method: 'POST',
      headers: jsonHeader(),
      body: JSON.stringify({
        email: testEmail,
        password: 'TestPass123!',
        name: 'FileHub Test User',
      }),
    });

    const registerBody = await registerResponse.json();
    authToken = registerBody.value.token;

    const workspaceResponse = await fetch(getUrl('/v1/workspaces'), {
      method: 'POST',
      headers: authHeader(authToken),
      body: JSON.stringify({
        name: 'FileHub Test Workspace',
        slug: `filehub-ws-${Date.now()}`,
        type: 'company',
      }),
    });

    const workspaceBody = await workspaceResponse.json();
    workspaceId = workspaceBody.value.id;
  });

  describe('POST /v1/workspaces/:id/files/sync', () => {
    it('US2-01: should create file sync job', async () => {
      const response = await fetch(
        getUrl(`/v1/workspaces/${workspaceId}/files/sync`),
        {
          method: 'POST',
          headers: authHeader(authToken),
        }
      );

      expect(response.status).toBe(201);
      const body = await response.json();

      expect(body.ok).toBe(true);
      expect(body.value.jobId).toBeDefined();
      expect(body.value.status).toBe('created');
    });
  });

  describe('GET /v1/files/search', () => {
    it('US2-02: should search files by query', async () => {
      const response = await fetch(getUrl('/v1/files/search?q=test'), {
        method: 'GET',
        headers: authHeader(authToken),
      });

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body.ok).toBe(true);
      expect(Array.isArray(body.value)).toBe(true);
    });

    it('US2-03: should search files by tags', async () => {
      const response = await fetch(getUrl('/v1/files/search?tags=engineering'), {
        method: 'GET',
        headers: authHeader(authToken),
      });

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body.ok).toBe(true);
      expect(Array.isArray(body.value)).toBe(true);
    });

    it('US2-04: should search files by mime type', async () => {
      const response = await fetch(
        getUrl('/v1/files/search?mimeType=application/pdf'),
        {
          method: 'GET',
          headers: authHeader(authToken),
        }
      );

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body.ok).toBe(true);
      expect(Array.isArray(body.value)).toBe(true);
    });
  });

  describe('File tagging and indexing', () => {
    it('US2-05: should handle tag request (may require existing file)', async () => {
      const response = await fetch(
        getUrl('/v1/files/00000000-0000-0000-0000-000000000000/tag'),
        {
          method: 'POST',
          headers: authHeader(authToken),
        }
      );

      expect([200, 404]).toContain(response.status);
    });

    it('US2-06: should handle index request (may require existing file)', async () => {
      const response = await fetch(
        getUrl('/v1/files/00000000-0000-0000-0000-000000000000/index'),
        {
          method: 'POST',
          headers: authHeader(authToken),
        }
      );

      expect([200, 404]).toContain(response.status);
    });
  });
});

