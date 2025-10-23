import { createApp } from '../../src/app';
import { db } from '@infra/db/client';
import { runMigrations } from '@infra/db/migrate';
import { Pool } from 'pg';
import type { FastifyInstance } from 'fastify';

/**
 * Integration tests for Messaging
 */

describe('Messaging (Integration)', () => {
  let app: FastifyInstance;
  const testDbName = 'hive_test_messaging';
  let adminPool: Pool;
  let authToken: string;
  let workspaceId: string;
  let channelId: string;

  beforeAll(async () => {
    adminPool = new Pool({
      connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres',
    });

    await adminPool.query(`DROP DATABASE IF EXISTS ${testDbName}`);
    await adminPool.query(`CREATE DATABASE ${testDbName}`);

    process.env.DATABASE_URL = `postgresql://postgres:postgres@localhost:5432/${testDbName}`;

    await runMigrations();

    app = await createApp();

    // Register and create workspace
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'messaging-test@example.com',
        password: 'Pass123!',
        name: 'Messaging User',
      },
    });

    authToken = JSON.parse(registerResponse.body).value.token;

    const workspaceResponse = await app.inject({
      method: 'POST',
      url: '/v1/workspaces',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        name: 'Test Workspace',
        slug: 'test-messaging',
        type: 'company',
      },
    });

    workspaceId = JSON.parse(workspaceResponse.body).value.id;

    // Create a channel manually for testing
    const channelResult = await db.query(
      `INSERT INTO channels (workspace_id, name, description, type)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [workspaceId, 'general', 'General discussion', 'core']
    );

    channelId = channelResult.rows[0].id;
  });

  afterAll(async () => {
    if (app) await app.close();
    await db.disconnect();
    await adminPool.query(`DROP DATABASE IF EXISTS ${testDbName}`);
    await adminPool.end();
  });

  describe('GET /v1/workspaces/:workspaceId/channels', () => {
    it('should list channels in workspace', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/workspaces/${workspaceId}/channels`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.ok).toBe(true);
      expect(Array.isArray(body.value)).toBe(true);
      expect(body.value.length).toBeGreaterThan(0);
      expect(body.value[0].name).toBe('general');
    });
  });

  describe('GET /v1/channels/:id', () => {
    it('should get channel by ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/channels/${channelId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.ok).toBe(true);
      expect(body.value.id).toBe(channelId);
      expect(body.value.name).toBe('general');
    });
  });

  describe('POST /v1/channels/:id/messages', () => {
    it('should send a message', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/channels/${channelId}/messages`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          content: 'Hello, world!',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);

      expect(body.ok).toBe(true);
      expect(body.value.content).toBe('Hello, world!');
      expect(body.value.channelId).toBe(channelId);
    });

    it('should reject empty messages', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/channels/${channelId}/messages`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          content: '',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /v1/channels/:id/messages', () => {
    beforeAll(async () => {
      // Send a few messages
      for (let i = 0; i < 3; i++) {
        await app.inject({
          method: 'POST',
          url: `/v1/channels/${channelId}/messages`,
          headers: { authorization: `Bearer ${authToken}` },
          payload: {
            content: `Test message ${i}`,
          },
        });
      }
    });

    it('should list messages in channel', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/channels/${channelId}/messages`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.ok).toBe(true);
      expect(Array.isArray(body.value)).toBe(true);
      expect(body.value.length).toBeGreaterThanOrEqual(3);
    });
  });
});
