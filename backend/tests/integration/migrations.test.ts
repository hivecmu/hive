import { db } from '@infra/db/client';
import { Pool } from 'pg';
import { runMigrations } from '@infra/db/migrate';

/**
 * Integration test for database migrations
 * Tests against a real PostgreSQL database
 */

describe('Database Migrations (Integration)', () => {
  const testDbName = 'hive_test_migrations';
  let adminPool: Pool;

  beforeAll(async () => {
    // Connect to postgres database to create test database
    adminPool = new Pool({
      connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres',
    });

    // Drop and recreate test database
    try {
      await adminPool.query(`DROP DATABASE IF EXISTS ${testDbName}`);
      await adminPool.query(`CREATE DATABASE ${testDbName}`);
    } catch (error) {
      console.error('Failed to create test database:', error);
      throw error;
    }

    // Update connection string for test database
    process.env.DATABASE_URL = `postgresql://postgres:postgres@localhost:5432/${testDbName}`;

    // Run migrations on test database
    await runMigrations();
  });

  afterAll(async () => {
    await db.disconnect();
    await adminPool.query(`DROP DATABASE IF EXISTS ${testDbName}`);
    await adminPool.end();
  });

  describe('Migration 001: initial_schema', () => {
    beforeAll(async () => {
      await db.connect();
    });

    it('should have pgvector extension installed', async () => {
      const result = await db.query(`
        SELECT extname FROM pg_extension WHERE extname = 'vector'
      `);
      expect(result.rows.length).toBe(1);
    });

    it('should have uuid-ossp extension installed', async () => {
      const result = await db.query(`
        SELECT extname FROM pg_extension WHERE extname = 'uuid-ossp'
      `);
      expect(result.rows.length).toBe(1);
    });

    it('should create users table with correct columns', async () => {
      const result = await db.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `);

      const columns = result.rows.map((r) => r.column_name);
      expect(columns).toContain('id');
      expect(columns).toContain('email');
      expect(columns).toContain('password_hash');
      expect(columns).toContain('name');
      expect(columns).toContain('created_at');
      expect(columns).toContain('updated_at');
    });

    it('should create workspaces table', async () => {
      const result = await db.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'workspaces'
      `);

      const columns = result.rows.map((r) => r.column_name);
      expect(columns).toContain('id');
      expect(columns).toContain('name');
      expect(columns).toContain('slug');
      expect(columns).toContain('owner_id');
      expect(columns).toContain('type');
    });

    it('should create channels table', async () => {
      const result = await db.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'channels'
      `);

      const columns = result.rows.map((r) => r.column_name);
      expect(columns).toContain('id');
      expect(columns).toContain('workspace_id');
      expect(columns).toContain('name');
      expect(columns).toContain('type');
    });

    it('should create messages table', async () => {
      const result = await db.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'messages'
      `);

      const columns = result.rows.map((r) => r.column_name);
      expect(columns).toContain('id');
      expect(columns).toContain('channel_id');
      expect(columns).toContain('user_id');
      expect(columns).toContain('content');
      expect(columns).toContain('thread_id');
    });
  });

  describe('Migration 002: structure_domain', () => {
    it('should create structure_jobs table', async () => {
      const result = await db.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'structure_jobs'
      `);

      const columns = result.rows.map((r) => r.column_name);
      expect(columns).toContain('job_id');
      expect(columns).toContain('workspace_id');
      expect(columns).toContain('status');
    });

    it('should create intake_forms table', async () => {
      const result = await db.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'intake_forms'
      `);

      const columns = result.rows.map((r) => r.column_name);
      expect(columns).toContain('job_id');
      expect(columns).toContain('community_size');
      expect(columns).toContain('core_activities');
    });

    it('should create proposals table', async () => {
      const result = await db.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'proposals'
      `);

      const columns = result.rows.map((r) => r.column_name);
      expect(columns).toContain('job_id');
      expect(columns).toContain('version');
      expect(columns).toContain('proposal');
    });
  });

  describe('Migration 003: filehub_domain', () => {
    it('should create file_jobs table', async () => {
      const result = await db.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'file_jobs'
      `);

      const columns = result.rows.map((r) => r.column_name);
      expect(columns).toContain('job_id');
      expect(columns).toContain('workspace_id');
      expect(columns).toContain('status');
    });

    it('should create files table', async () => {
      const result = await db.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'files'
      `);

      const columns = result.rows.map((r) => r.column_name);
      expect(columns).toContain('file_id');
      expect(columns).toContain('workspace_id');
      expect(columns).toContain('name');
      expect(columns).toContain('content_hash');
      expect(columns).toContain('tags');
    });

    it('should create file_index table with vector column', async () => {
      const result = await db.query(`
        SELECT column_name, udt_name FROM information_schema.columns
        WHERE table_name = 'file_index' AND column_name = 'embedding'
      `);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].udt_name).toBe('vector');
    });
  });

  describe('Migration 004: orchestrator_and_policy', () => {
    it('should create workflow_ledger table', async () => {
      const result = await db.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'workflow_ledger'
      `);

      const columns = result.rows.map((r) => r.column_name);
      expect(columns).toContain('workflow_id');
      expect(columns).toContain('type');
      expect(columns).toContain('status');
    });

    it('should create idempotency_keys table', async () => {
      const result = await db.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'idempotency_keys'
      `);

      const columns = result.rows.map((r) => r.column_name);
      expect(columns).toContain('scope');
      expect(columns).toContain('key');
      expect(columns).toContain('response');
    });

    it('should create policies table', async () => {
      const result = await db.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'policies'
      `);

      const columns = result.rows.map((r) => r.column_name);
      expect(columns).toContain('workspace_id');
      expect(columns).toContain('version');
    });

    it('should create policy_rules table', async () => {
      const result = await db.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'policy_rules'
      `);

      const columns = result.rows.map((r) => r.column_name);
      expect(columns).toContain('workspace_id');
      expect(columns).toContain('version');
      expect(columns).toContain('rule_id');
      expect(columns).toContain('kind');
      expect(columns).toContain('severity');
    });
  });

  describe('Indexes', () => {
    it('should have created essential indexes', async () => {
      const result = await db.query(`
        SELECT indexname FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY indexname
      `);

      const indexes = result.rows.map((r) => r.indexname);

      // Check for some key indexes
      expect(indexes).toContain('idx_workspace_members_user');
      expect(indexes).toContain('idx_channels_workspace');
      expect(indexes).toContain('idx_messages_channel');
      expect(indexes).toContain('idx_files_workspace');
    });
  });

  describe('Foreign Keys', () => {
    it('should have foreign key from workspaces to users', async () => {
      const result = await db.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'workspaces'
          AND constraint_type = 'FOREIGN KEY'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should have foreign key from channels to workspaces', async () => {
      const result = await db.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'channels'
          AND constraint_type = 'FOREIGN KEY'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('CRUD Operations', () => {
    it('should insert and query a user', async () => {
      const insertResult = await db.query(`
        INSERT INTO users (email, password_hash, name)
        VALUES ($1, $2, $3)
        RETURNING id, email, name
      `, ['test@example.com', 'hash123', 'Test User']);

      expect(insertResult.rows[0].email).toBe('test@example.com');

      const selectResult = await db.query(`
        SELECT * FROM users WHERE email = $1
      `, ['test@example.com']);

      expect(selectResult.rows[0].name).toBe('Test User');
    });

    it('should enforce unique constraint on email', async () => {
      await expect(
        db.query(`
          INSERT INTO users (email, password_hash, name)
          VALUES ($1, $2, $3)
        `, ['test@example.com', 'hash', 'Duplicate'])
      ).rejects.toThrow();
    });
  });
});
