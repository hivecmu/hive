import { Pool } from 'pg';
import { db } from '@infra/db/client';

// Mock pg module
jest.mock('pg', () => {
  const mockPool = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
    totalCount: 5,
    idleCount: 3,
    waitingCount: 0,
  };
  return {
    Pool: jest.fn(() => mockPool),
  };
});

describe('DatabaseClient', () => {
  let mockPool: any;

  beforeEach(() => {
    // Get the mock pool instance
    mockPool = new Pool();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Ensure disconnect is called
    await db.disconnect();
  });

  describe('connect', () => {
    it('should establish database connection', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [{ now: new Date() }] }),
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValue(mockClient);

      await db.connect();

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('SELECT NOW()');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should not reconnect if already connected', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [{ now: new Date() }] }),
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValue(mockClient);

      await db.connect();
      mockPool.connect.mockClear();

      await db.connect();

      expect(mockPool.connect).not.toHaveBeenCalled();
    });

    it('should throw if DATABASE_URL not set', async () => {
      const originalUrl = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      await expect(db.connect()).rejects.toThrow(
        'DATABASE_URL environment variable is not set'
      );

      process.env.DATABASE_URL = originalUrl;
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [{ now: new Date() }] }),
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValue(mockClient);
      await db.connect();
    });

    it('should execute queries', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ id: 1, name: 'test' }],
        rowCount: 1,
      });

      const result = await db.query('SELECT * FROM users WHERE id = $1', [1]);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1',
        [1]
      );
      expect(result.rows).toEqual([{ id: 1, name: 'test' }]);
      expect(result.rowCount).toBe(1);
    });

    it('should throw if not connected', async () => {
      await db.disconnect();

      await expect(db.query('SELECT 1')).rejects.toThrow('Database not connected');
    });

    it('should log query errors', async () => {
      const error = new Error('Query failed');
      mockPool.query.mockRejectedValue(error);

      await expect(db.query('INVALID SQL')).rejects.toThrow('Query failed');
    });
  });

  describe('transaction', () => {
    beforeEach(async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [{ now: new Date() }] }),
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValue(mockClient);
      await db.connect();
    });

    it('should execute transaction with commit', async () => {
      const txClient = {
        query: jest.fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({}) // user's query
          .mockResolvedValueOnce({}), // COMMIT
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValueOnce(txClient);

      const result = await db.transaction(async (client) => {
        await client.query('INSERT INTO users (name) VALUES ($1)', ['test']);
        return { success: true };
      });

      expect(txClient.query).toHaveBeenCalledWith('BEGIN');
      expect(txClient.query).toHaveBeenCalledWith('COMMIT');
      expect(txClient.release).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should rollback on error', async () => {
      const error = new Error('Insert failed');
      const txClient = {
        query: jest.fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockRejectedValueOnce(error) // user's query throws
          .mockResolvedValueOnce({}), // ROLLBACK
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValueOnce(txClient);

      await expect(
        db.transaction(async (client) => {
          await client.query('INVALID');
        })
      ).rejects.toThrow('Insert failed');

      expect(txClient.query).toHaveBeenCalledWith('BEGIN');
      expect(txClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(txClient.release).toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('should return healthy when connected', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [{ now: new Date() }] }),
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValue(mockClient);
      mockPool.query.mockResolvedValue({ rows: [{ health: 1 }] });

      await db.connect();
      const health = await db.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.details).toHaveProperty('totalConnections');
      expect(health.details).toHaveProperty('idleConnections');
    });

    it('should return unhealthy if not connected', async () => {
      const health = await db.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.details).toBe('Not connected');
    });

    it('should return unhealthy on query error', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [{ now: new Date() }] }),
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValue(mockClient);
      await db.connect();

      const error = new Error('Connection lost');
      mockPool.query.mockRejectedValue(error);

      const health = await db.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.details).toEqual(error);
    });
  });

  describe('disconnect', () => {
    it('should close pool connection', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [{ now: new Date() }] }),
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValue(mockClient);

      await db.connect();
      await db.disconnect();

      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle disconnect when not connected', async () => {
      await expect(db.disconnect()).resolves.not.toThrow();
    });
  });
});
