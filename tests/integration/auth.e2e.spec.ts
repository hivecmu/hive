/**
 * Authentication Integration Tests
 * Tests the full auth flow: register, login, and token-based access
 */

import { config, getUrl, jsonHeader, authHeader } from './config';

describe('Authentication Integration Tests', () => {
  let registeredToken: string;
  const testEmail = `auth-e2e-${Date.now()}@hive.test`;
  const testPassword = 'SecureTestPass123!';
  const testName = 'Auth E2E User';

  describe('POST /auth/register', () => {
    it('AUTH-01: should register a new user', async () => {
      const response = await fetch(getUrl('/auth/register'), {
        method: 'POST',
        headers: jsonHeader(),
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          name: testName,
        }),
      });

      expect(response.status).toBe(201);
      const body = await response.json() as any;

      expect(body.ok).toBe(true);
      expect(body.value.user.email).toBe(testEmail);
      expect(body.value.user.name).toBe(testName);
      expect(body.value.token).toBeDefined();
      expect(typeof body.value.token).toBe('string');

      registeredToken = body.value.token;
    });

    it('AUTH-02: should reject duplicate email', async () => {
      const response = await fetch(getUrl('/auth/register'), {
        method: 'POST',
        headers: jsonHeader(),
        body: JSON.stringify({
          email: testEmail,
          password: 'AnotherPass456!',
          name: 'Duplicate User',
        }),
      });

      expect(response.status).toBe(400);
      const body = await response.json() as any;

      expect(body.ok).toBe(false);
      expect(body.issues[0].code).toBe('CONFLICT');
    });

    it('AUTH-03: should reject invalid email format', async () => {
      const response = await fetch(getUrl('/auth/register'), {
        method: 'POST',
        headers: jsonHeader(),
        body: JSON.stringify({
          email: 'not-an-email',
          password: 'Pass123!',
          name: 'Test',
        }),
      });

      expect(response.status).toBe(400);
      const body = await response.json() as any;

      expect(body.ok).toBe(false);
      expect(body.issues[0].code).toBe('VALIDATION_ERROR');
    });

    it('AUTH-04: should reject short password', async () => {
      const response = await fetch(getUrl('/auth/register'), {
        method: 'POST',
        headers: jsonHeader(),
        body: JSON.stringify({
          email: 'shortpass@test.com',
          password: 'short',
          name: 'Test',
        }),
      });

      expect(response.status).toBe(400);
      const body = await response.json() as any;

      expect(body.ok).toBe(false);
      expect(body.issues[0].code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /auth/login', () => {
    it('AUTH-05: should login with valid credentials', async () => {
      const response = await fetch(getUrl('/auth/login'), {
        method: 'POST',
        headers: jsonHeader(),
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json() as any;

      expect(body.ok).toBe(true);
      expect(body.value.user.email).toBe(testEmail);
      expect(body.value.token).toBeDefined();
    });

    it('AUTH-06: should reject invalid password', async () => {
      const response = await fetch(getUrl('/auth/login'), {
        method: 'POST',
        headers: jsonHeader(),
        body: JSON.stringify({
          email: testEmail,
          password: 'WrongPassword!',
        }),
      });

      expect(response.status).toBe(401);
      const body = await response.json() as any;

      expect(body.ok).toBe(false);
      expect(body.issues[0].code).toBe('UNAUTHORIZED');
    });

    it('AUTH-07: should reject non-existent user', async () => {
      const response = await fetch(getUrl('/auth/login'), {
        method: 'POST',
        headers: jsonHeader(),
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!',
        }),
      });

      expect(response.status).toBe(401);
      const body = await response.json() as any;

      expect(body.ok).toBe(false);
      expect(body.issues[0].code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /auth/me', () => {
    it('AUTH-08: should return user with valid token', async () => {
      const response = await fetch(getUrl('/auth/me'), {
        method: 'GET',
        headers: authHeader(registeredToken),
      });

      expect(response.status).toBe(200);
      const body = await response.json() as any;

      expect(body.ok).toBe(true);
      expect(body.value.email).toBe(testEmail);
      expect(body.value.name).toBe(testName);
    });

    it('AUTH-09: should reject missing token', async () => {
      const response = await fetch(getUrl('/auth/me'), {
        method: 'GET',
        headers: jsonHeader(),
      });

      expect(response.status).toBe(401);
      const body = await response.json() as any;

      expect(body.ok).toBe(false);
      expect(body.issues[0].code).toBe('UNAUTHORIZED');
    });

    it('AUTH-10: should reject invalid token', async () => {
      const response = await fetch(getUrl('/auth/me'), {
        method: 'GET',
        headers: authHeader('invalid.token.here'),
      });

      expect(response.status).toBe(401);
      const body = await response.json() as any;

      expect(body.ok).toBe(false);
      expect(body.issues[0].code).toBe('UNAUTHORIZED');
    });
  });
});

