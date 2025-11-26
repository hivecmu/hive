/**
 * Messaging Integration Tests
 * Tests channel and message operations
 */

import { config, getUrl, jsonHeader, authHeader } from './config';

describe('Messaging Integration Tests', () => {
  let authToken: string;
  let workspaceId: string;
  let channelId: string;
  const testEmail = `messaging-e2e-${Date.now()}@hive.test`;

  beforeAll(async () => {
    const registerResponse = await fetch(getUrl('/auth/register'), {
      method: 'POST',
      headers: jsonHeader(),
      body: JSON.stringify({
        email: testEmail,
        password: 'TestPass123!',
        name: 'Messaging Test User',
      }),
    });

    const registerBody = await registerResponse.json() as any;
    authToken = registerBody.value.token;

    const workspaceResponse = await fetch(getUrl('/v1/workspaces'), {
      method: 'POST',
      headers: authHeader(authToken),
      body: JSON.stringify({
        name: 'Messaging Test Workspace',
        slug: `messaging-ws-${Date.now()}`,
        type: 'company',
      }),
    });

    const workspaceBody = await workspaceResponse.json() as any;
    workspaceId = workspaceBody.value.id;

    const generateResponse = await fetch(getUrl('/v1/structure/generate'), {
      method: 'POST',
      headers: authHeader(authToken),
      body: JSON.stringify({
        workspaceId,
        communitySize: 'small',
        coreActivities: ['general'],
        moderationCapacity: 'light',
        channelBudget: 5,
      }),
    });

    const generateBody = await generateResponse.json() as any;
    const jobId = generateBody.value.job.jobId;

    await fetch(getUrl(`/v1/structure/proposals/${jobId}/approve`), {
      method: 'POST',
      headers: authHeader(authToken),
    });
  });

  describe('GET /v1/workspaces/:id/channels', () => {
    it('MSG-01: should list channels', async () => {
      const response = await fetch(
        getUrl(`/v1/workspaces/${workspaceId}/channels`),
        {
          method: 'GET',
          headers: authHeader(authToken),
        }
      );

      expect(response.status).toBe(200);
      const body = await response.json() as any;

      expect(body.ok).toBe(true);
      expect(Array.isArray(body.value)).toBe(true);

      if (body.value.length > 0) {
        channelId = body.value[0].id;
      }
    });
  });

  describe('GET /v1/channels/:id', () => {
    it('MSG-02: should get channel details', async () => {
      if (!channelId) {
        console.log('Skipping: No channel available');
        return;
      }

      const response = await fetch(getUrl(`/v1/channels/${channelId}`), {
        method: 'GET',
        headers: authHeader(authToken),
      });

      expect(response.status).toBe(200);
      const body = await response.json() as any;

      expect(body.ok).toBe(true);
      expect(body.value.id).toBe(channelId);
    });
  });

  describe('POST /v1/channels/:id/messages', () => {
    it('MSG-03: should send message', async () => {
      if (!channelId) {
        console.log('Skipping: No channel available');
        return;
      }

      const response = await fetch(
        getUrl(`/v1/channels/${channelId}/messages`),
        {
          method: 'POST',
          headers: authHeader(authToken),
          body: JSON.stringify({
            content: 'Hello from integration test!',
          }),
        }
      );

      expect(response.status).toBe(201);
      const body = await response.json() as any;

      expect(body.ok).toBe(true);
      expect(body.value.content).toBe('Hello from integration test!');
    });

    it('MSG-05: should reject empty message', async () => {
      if (!channelId) {
        console.log('Skipping: No channel available');
        return;
      }

      const response = await fetch(
        getUrl(`/v1/channels/${channelId}/messages`),
        {
          method: 'POST',
          headers: authHeader(authToken),
          body: JSON.stringify({
            content: '',
          }),
        }
      );

      expect(response.status).toBe(400);
    });
  });

  describe('GET /v1/channels/:id/messages', () => {
    it('MSG-04: should list messages', async () => {
      if (!channelId) {
        console.log('Skipping: No channel available');
        return;
      }

      const response = await fetch(
        getUrl(`/v1/channels/${channelId}/messages`),
        {
          method: 'GET',
          headers: authHeader(authToken),
        }
      );

      expect(response.status).toBe(200);
      const body = await response.json() as any;

      expect(body.ok).toBe(true);
      expect(Array.isArray(body.value)).toBe(true);
    });
  });
});

