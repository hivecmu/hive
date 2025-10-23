import { createApp } from '../../src/app';
import { db } from '@infra/db/client';
import { runMigrations } from '@infra/db/migrate';
import { Pool } from 'pg';
import type { FastifyInstance } from 'fastify';

/**
 * Integration tests for authentication
 * Tests the full auth flow against a real database
 */

describe('Authentication (Integration)', () => {
  let app: FastifyInstance;
  const testDbName = 'hive_test_auth';
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

    // Update to test database
    process.env.DATABASE_URL = `postgresql://postgres:postgres@localhost:5432/${testDbName}`;

    // Run migrations
    await runMigrations();

    // Clean up test user if exists
    await db.query('DELETE FROM users WHERE email = $1', ['auth-test@example.com']);

    // Create app
    app = await createApp();
  });

  afterAll(async () => {
    if (app) await app.close();
    await db.disconnect();
    await adminPool.query(`DROP DATABASE IF EXISTS ${testDbName}`);
    await adminPool.end();
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'auth-test@example.com',
          password: 'SecurePass123!',
          name: 'Auth Test User',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);

      expect(body.ok).toBe(true);
      expect(body.value.user.email).toBe('auth-test@example.com');
      expect(body.value.user.name).toBe('Auth Test User');
      expect(body.value.token).toBeDefined();
      expect(typeof body.value.token).toBe('string');
    });

    it('should reject duplicate email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'auth-test@example.com',
          password: 'AnotherPass456!',
          name: 'Duplicate User',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);

      expect(body.ok).toBe(false);
      expect(body.issues[0].code).toBe('CONFLICT');
    });

    it('should reject invalid email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'not-an-email',
          password: 'Pass123!',
          name: 'Test',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);

      expect(body.ok).toBe(false);
      expect(body.issues[0].code).toBe('VALIDATION_ERROR');
    });

    it('should reject short password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'test2@example.com',
          password: 'short',
          name: 'Test',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);

      expect(body.ok).toBe(false);
      expect(body.issues[0].code).toBe('VALIDATION_ERROR');
      expect(body.issues[0].field).toBe('password');
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'auth-test@example.com',
          password: 'SecurePass123!',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.ok).toBe(true);
      expect(body.value.user.email).toBe('auth-test@example.com');
      expect(body.value.token).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'auth-test@example.com',
          password: 'WrongPassword!',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);

      expect(body.ok).toBe(false);
      expect(body.issues[0].code).toBe('UNAUTHORIZED');
    });

    it('should reject non-existent email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'SomePassword123!',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);

      expect(body.ok).toBe(false);
      expect(body.issues[0].code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /auth/me', () => {
    let validToken: string;

    beforeAll(async () => {
      // Login to get a valid token
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'auth-test@example.com',
          password: 'SecurePass123!',
        },
      });

      const body = JSON.parse(response.body);
      validToken = body.value.token;
    });

    it('should return user with valid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.ok).toBe(true);
      expect(body.value.email).toBe('auth-test@example.com');
      expect(body.value.name).toBe('Auth Test User');
    });

    it('should reject missing token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);

      expect(body.ok).toBe(false);
      expect(body.issues[0].code).toBe('UNAUTHORIZED');
    });

    it('should reject invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: 'Bearer invalid.token.here',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);

      expect(body.ok).toBe(false);
      expect(body.issues[0].code).toBe('UNAUTHORIZED');
    });

    it('should reject malformed authorization header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: 'InvalidFormat token',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);

      expect(body.ok).toBe(false);
      expect(body.issues[0].code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /health endpoints', () => {
    it('should return ok status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.ok).toBe(true);
      expect(body.value.status).toBe('ok');
      expect(body.value.services.database).toBe('ok');
    });

    it('should respond to liveness probe', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/live',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.ok).toBe(true);
      expect(body.value.status).toBe('alive');
    });

    it('should respond to readiness probe', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/ready',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.ok).toBe(true);
      expect(body.value.status).toBe('ready');
    });
  });

  describe('404 handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/this/route/does/not/exist',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);

      expect(body.ok).toBe(false);
      expect(body.issues[0].code).toBe('NOT_FOUND');
    });
  });
});
