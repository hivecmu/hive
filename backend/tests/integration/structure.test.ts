import { createApp } from '../../src/app';
import { db } from '@infra/db/client';
import { runMigrations } from '@infra/db/migrate';
import { Pool } from 'pg';
import type { FastifyInstance } from 'fastify';

/**
 * Integration tests for Structure Generation (User Story 1)
 */

describe('Structure Generation (Integration)', () => {
  let app: FastifyInstance;
  const testDbName = 'hive_test_structure';
  let adminPool: Pool;
  let authToken: string;
  let workspaceId: string;

  beforeAll(async () => {
    // Create test database
    adminPool = new Pool({
      connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres',
    });

    await adminPool.query(`DROP DATABASE IF EXISTS ${testDbName}`);
    await adminPool.query(`CREATE DATABASE ${testDbName}`);

    process.env.DATABASE_URL = `postgresql://postgres:postgres@localhost:5432/${testDbName}`;
    process.env.USE_REAL_AI = 'false'; // Use mock AI

    // Run migrations
    await runMigrations();

    // Create app
    app = await createApp();

    // Register a user
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'structure-test@example.com',
        password: 'TestPass123!',
        name: 'Structure Test User',
      },
    });

    const registerBody = JSON.parse(registerResponse.body);
    authToken = registerBody.value.token;

    // Create a workspace
    const workspaceResponse = await app.inject({
      method: 'POST',
      url: '/v1/workspaces',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        name: 'Test Workspace',
        slug: 'test-workspace',
        type: 'company',
      },
    });

    const workspaceBody = JSON.parse(workspaceResponse.body);
    workspaceId = workspaceBody.value.id;
  });

  afterAll(async () => {
    if (app) await app.close();
    await db.disconnect();
    await adminPool.query(`DROP DATABASE IF EXISTS ${testDbName}`);
    await adminPool.end();
  });

  describe('POST /v1/structure/generate', () => {
    it('should create job and generate proposal', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/structure/generate',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          workspaceId,
          communitySize: 'medium',
          coreActivities: ['engineering', 'design'],
          moderationCapacity: 'moderate',
          channelBudget: 15,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);

      expect(body.ok).toBe(true);
      expect(body.value.job).toBeDefined();
      expect(body.value.job.jobId).toBeDefined();
      expect(body.value.job.status).toMatch(/created|proposed/); // Status may vary by timing

      expect(body.value.proposal).toBeDefined();
      expect(body.value.proposal.proposal.channels).toBeDefined();
      expect(Array.isArray(body.value.proposal.proposal.channels)).toBe(true);
      expect(body.value.proposal.proposal.channels.length).toBeGreaterThan(0);

      // Verify channels include core ones
      const channelNames = body.value.proposal.proposal.channels.map((c: any) => c.name);
      expect(channelNames).toContain('general');
    });

    it('should reject if not workspace member', async () => {
      // Register another user
      const otherUserResponse = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'other@example.com',
          password: 'Pass123!',
          name: 'Other User',
        },
      });

      const otherToken = JSON.parse(otherUserResponse.body).value.token;

      const response = await app.inject({
        method: 'POST',
        url: '/v1/structure/generate',
        headers: {
          authorization: `Bearer ${otherToken}`,
        },
        payload: {
          workspaceId,
          communitySize: 'small',
          coreActivities: ['test'],
          moderationCapacity: 'light',
          channelBudget: 5,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /v1/structure/jobs/:jobId', () => {
    let jobId: string;

    beforeAll(async () => {
      // Create a job first
      const response = await app.inject({
        method: 'POST',
        url: '/v1/structure/generate',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          workspaceId,
          communitySize: 'small',
          coreActivities: ['product'],
          moderationCapacity: 'light',
          channelBudget: 10,
        },
      });

      const body = JSON.parse(response.body);
      jobId = body.value.job.jobId;
    });

    it('should return job with proposal', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/structure/jobs/${jobId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.ok).toBe(true);
      expect(body.value.job.jobId).toBe(jobId);
      expect(body.value.proposal).toBeDefined();
    });
  });

  describe('POST /v1/structure/proposals/:jobId/approve', () => {
    let jobId: string;

    beforeAll(async () => {
      // Create a job
      const response = await app.inject({
        method: 'POST',
        url: '/v1/structure/generate',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          workspaceId,
          communitySize: 'small',
          coreActivities: ['sales'],
          moderationCapacity: 'light',
          channelBudget: 8,
        },
      });

      const body = JSON.parse(response.body);
      jobId = body.value.job.jobId;
    });

    it('should apply proposal and create channels', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/structure/proposals/${jobId}/approve`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.ok).toBe(true);
      expect(body.value.status).toBe('applied');
      expect(body.value.channelsCreated).toBeGreaterThan(0);

      // Verify channels were actually created
      const channelsResult = await db.query(
        'SELECT COUNT(*) as count FROM channels WHERE workspace_id = $1',
        [workspaceId]
      );

      expect(parseInt(channelsResult.rows[0].count)).toBeGreaterThan(0);
    });
  });
});
