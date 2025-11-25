/**
 * Structure Generation Integration Tests (User Story 1)
 * Tests AI-generated workspace structure proposal flow
 */

import { config, getUrl, jsonHeader, authHeader } from './config';

describe('Structure Generation Integration Tests (User Story 1)', () => {
  let authToken: string;
  let workspaceId: string;
  let jobId: string;
  const testEmail = `structure-e2e-${Date.now()}@hive.test`;

  beforeAll(async () => {
    const registerResponse = await fetch(getUrl('/auth/register'), {
      method: 'POST',
      headers: jsonHeader(),
      body: JSON.stringify({
        email: testEmail,
        password: 'TestPass123!',
        name: 'Structure Test User',
      }),
    });

    const registerBody = await registerResponse.json();
    authToken = registerBody.value.token;

    const workspaceResponse = await fetch(getUrl('/v1/workspaces'), {
      method: 'POST',
      headers: authHeader(authToken),
      body: JSON.stringify({
        name: 'Structure Test Workspace',
        slug: `structure-ws-${Date.now()}`,
        type: 'company',
      }),
    });

    const workspaceBody = await workspaceResponse.json();
    workspaceId = workspaceBody.value.id;
  });

  describe('POST /v1/structure/generate', () => {
    it('US1-01: should generate structure proposal', async () => {
      const response = await fetch(getUrl('/v1/structure/generate'), {
        method: 'POST',
        headers: authHeader(authToken),
        body: JSON.stringify({
          workspaceId,
          communitySize: 'medium',
          coreActivities: ['engineering', 'design'],
          moderationCapacity: 'moderate',
          channelBudget: 15,
        }),
      });

      expect(response.status).toBe(201);
      const body = await response.json();

      expect(body.ok).toBe(true);
      expect(body.value.job).toBeDefined();
      expect(body.value.job.jobId).toBeDefined();
      expect(body.value.proposal).toBeDefined();

      jobId = body.value.job.jobId;
    });

    it('US1-02: should include channels in proposal', async () => {
      const response = await fetch(getUrl('/v1/structure/generate'), {
        method: 'POST',
        headers: authHeader(authToken),
        body: JSON.stringify({
          workspaceId,
          communitySize: 'small',
          coreActivities: ['product'],
          moderationCapacity: 'light',
          channelBudget: 10,
        }),
      });

      const body = await response.json();

      expect(body.value.proposal.proposal.channels).toBeDefined();
      expect(Array.isArray(body.value.proposal.proposal.channels)).toBe(true);
      expect(body.value.proposal.proposal.channels.length).toBeGreaterThan(0);
    });

    it('US1-03: should include general channel', async () => {
      const response = await fetch(getUrl('/v1/structure/generate'), {
        method: 'POST',
        headers: authHeader(authToken),
        body: JSON.stringify({
          workspaceId,
          communitySize: 'small',
          coreActivities: ['sales'],
          moderationCapacity: 'light',
          channelBudget: 8,
        }),
      });

      const body = await response.json();
      const channelNames = body.value.proposal.proposal.channels.map(
        (c: any) => c.name.toLowerCase()
      );

      expect(channelNames).toContain('general');
    });

    it('US1-06: should reject non-member access', async () => {
      const otherUserResponse = await fetch(getUrl('/auth/register'), {
        method: 'POST',
        headers: jsonHeader(),
        body: JSON.stringify({
          email: `other-${Date.now()}@test.com`,
          password: 'Pass123!',
          name: 'Other User',
        }),
      });

      const otherBody = await otherUserResponse.json();
      const otherToken = otherBody.value.token;

      const response = await fetch(getUrl('/v1/structure/generate'), {
        method: 'POST',
        headers: authHeader(otherToken),
        body: JSON.stringify({
          workspaceId,
          communitySize: 'small',
          coreActivities: ['test'],
          moderationCapacity: 'light',
          channelBudget: 5,
        }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /v1/structure/jobs/:jobId', () => {
    it('US1-04: should get job status', async () => {
      const response = await fetch(getUrl(`/v1/structure/jobs/${jobId}`), {
        method: 'GET',
        headers: authHeader(authToken),
      });

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body.ok).toBe(true);
      expect(body.value.job.jobId).toBe(jobId);
      expect(body.value.proposal).toBeDefined();
    });
  });

  describe('POST /v1/structure/proposals/:jobId/approve', () => {
    let approveJobId: string;

    beforeAll(async () => {
      const response = await fetch(getUrl('/v1/structure/generate'), {
        method: 'POST',
        headers: authHeader(authToken),
        body: JSON.stringify({
          workspaceId,
          communitySize: 'small',
          coreActivities: ['marketing'],
          moderationCapacity: 'light',
          channelBudget: 6,
        }),
      });

      const body = await response.json();
      approveJobId = body.value.job.jobId;
    });

    it('US1-05: should approve proposal and create channels', async () => {
      const response = await fetch(
        getUrl(`/v1/structure/proposals/${approveJobId}/approve`),
        {
          method: 'POST',
          headers: authHeader(authToken),
        }
      );

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body.ok).toBe(true);
      expect(body.value.status).toBe('applied');
      expect(body.value.channelsCreated).toBeGreaterThan(0);
    });
  });
});

