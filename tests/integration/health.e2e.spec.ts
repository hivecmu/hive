/**
 * Health Check Integration Tests
 * Tests system health endpoints
 */

import { getUrl } from './config';

describe('Health Check Integration Tests', () => {
  describe('GET /health', () => {
    it('HEALTH-01: should return full health status', async () => {
      const response = await fetch(getUrl('/health'), {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const body = await response.json() as any;

      expect(body.ok).toBe(true);
      expect(body.value.status).toBe('ok');
    });
  });

  describe('GET /health/live', () => {
    it('HEALTH-02: should return liveness probe', async () => {
      const response = await fetch(getUrl('/health/live'), {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const body = await response.json() as any;

      expect(body.ok).toBe(true);
      expect(body.value.status).toBe('alive');
    });
  });

  describe('GET /health/ready', () => {
    it('HEALTH-03: should return readiness probe', async () => {
      const response = await fetch(getUrl('/health/ready'), {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const body = await response.json() as any;

      expect(body.ok).toBe(true);
      expect(body.value.status).toBe('ready');
    });
  });
});

