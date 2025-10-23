import { createApp } from '../../src/app';
import { db } from '@infra/db/client';
import { runMigrations } from '@infra/db/migrate';
import { Pool } from 'pg';
import type { FastifyInstance } from 'fastify';

/**
 * Integration tests for File Hub (User Story 2)
 */

describe('File Hub (Integration)', () => {
  let app: FastifyInstance;
  const testDbName = 'hive_test_filehub';
  let adminPool: Pool;
  let authToken: string;
  let workspaceId: string;
  let sourceId: string;

  beforeAll(async () => {
    adminPool = new Pool({
      connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres',
    });

    await adminPool.query(`DROP DATABASE IF EXISTS ${testDbName}`);
    await adminPool.query(`CREATE DATABASE ${testDbName}`);

    process.env.DATABASE_URL = `postgresql://postgres:postgres@localhost:5432/${testDbName}`;
    process.env.USE_REAL_AI = 'false';

    await runMigrations();

    app = await createApp();

    // Register user
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'filehub-test@example.com',
        password: 'Pass123!',
        name: 'FileHub User',
      },
    });

    authToken = JSON.parse(registerResponse.body).value.token;

    // Create workspace
    const workspaceResponse = await app.inject({
      method: 'POST',
      url: '/v1/workspaces',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        name: 'Test Workspace',
        slug: 'test-filehub',
        type: 'company',
      },
    });

    workspaceId = JSON.parse(workspaceResponse.body).value.id;

    // Create a file source
    const sourceResult = await db.query(
      `INSERT INTO file_sources (workspace_id, name, status)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [workspaceId, 'Google Drive', 'linked']
    );

    sourceId = sourceResult.rows[0].id;
  });

  afterAll(async () => {
    if (app) await app.close();
    await db.disconnect();
    await adminPool.query(`DROP DATABASE IF EXISTS ${testDbName}`);
    await adminPool.end();
  });

  describe('POST /v1/workspaces/:workspaceId/files/sync', () => {
    it('should create file sync job', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/workspaces/${workspaceId}/files/sync`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);

      expect(body.ok).toBe(true);
      expect(body.value.jobId).toBeDefined();
      expect(body.value.workspaceId).toBe(workspaceId);
      expect(body.value.status).toBe('created');
    });
  });

  describe('File tagging and indexing', () => {
    let fileId: string;

    beforeAll(async () => {
      // Insert a test file
      const fileResult = await db.query(
        `INSERT INTO files (
          workspace_id, source_id, external_id, name, mime_type, size_bytes
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING file_id`,
        [workspaceId, sourceId, 'ext-123', 'project_plan.pdf', 'application/pdf', 1024 * 500]
      );

      fileId = fileResult.rows[0].file_id;
    });

    it('should tag file with AI', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/files/${fileId}/tag`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.ok).toBe(true);
      expect(body.value.tags).toBeDefined();
      expect(Array.isArray(body.value.tags)).toBe(true);
      expect(body.value.tags.length).toBeGreaterThan(0);
    });

    it('should index file for search', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/files/${fileId}/index`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.ok).toBe(true);
      expect(body.value.indexed).toBe(true);

      // Verify file is marked as indexed
      const fileCheck = await db.query(
        'SELECT indexed FROM files WHERE file_id = $1',
        [fileId]
      );

      expect(fileCheck.rows[0].indexed).toBe(true);
    });
  });

  describe('GET /v1/files/search', () => {
    beforeAll(async () => {
      // Add more files
      await db.query(
        `INSERT INTO files (workspace_id, source_id, external_id, name, tags, mime_type)
         VALUES
          ($1, $2, 'ext-200', 'design_mockups.fig', ARRAY['design', 'ui'], 'application/figma'),
          ($1, $2, 'ext-201', 'backend_api.pdf', ARRAY['engineering', 'api'], 'application/pdf')`,
        [workspaceId, sourceId]
      );
    });

    it('should search files by name', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/files/search?q=design',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.ok).toBe(true);
      expect(Array.isArray(body.value)).toBe(true);
      const hasDesignFile = body.value.some((f: any) => f.name.includes('design'));
      expect(hasDesignFile).toBe(true);
    });

    it('should filter by tags', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/files/search?tags=design',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.ok).toBe(true);
      expect(Array.isArray(body.value)).toBe(true);
    });
  });
});
