import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { logger } from '@shared/utils/logger';

/**
 * Database client wrapper for PostgreSQL
 *
 * Abstraction Function:
 *   AF(pool) = A connection pool to the PostgreSQL database
 *
 * Representation Invariant:
 *   - pool is initialized and connected
 *   - pool.totalCount >= pool.idleCount >= 0
 *   - pool.totalCount <= pool.max
 *
 * Safety from rep exposure:
 *   - Never expose the underlying Pool directly
 *   - Return only QueryResult or typed data
 *   - Transactions are scoped to callbacks
 */

class DatabaseClient {
  private pool: Pool | null = null;
  private isConnected = false;

  constructor() {
    this.pool = null;
  }

  /**
   * Initialize connection pool
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      logger.warn('Database already connected');
      return;
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    this.pool = new Pool({
      connectionString: databaseUrl,
      min: parseInt(process.env.DATABASE_POOL_MIN || '2'),
      max: parseInt(process.env.DATABASE_POOL_MAX || '10'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      // Allow RDS SSL connections (self-signed Amazon CA)
      ssl: databaseUrl.includes('rds.amazonaws.com') ? {
        rejectUnauthorized: false,
      } : undefined,
    });

    // Test connection
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      this.isConnected = true;
      logger.info('Database connected successfully', {
        timestamp: result.rows[0].now,
      });
    } catch (error: any) {
      logger.error('Database connection failed', {
        message: error?.message,
        code: error?.code,
      });
      throw error;
    }

    // Listen for errors
    this.pool.on('error', (err) => {
      logger.error('Unexpected database error', { error: err });
    });

    this.checkRep();
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    if (!this.pool) {
      return;
    }

    await this.pool.end();
    this.pool = null;
    this.isConnected = false;
    logger.info('Database disconnected');
  }

  /**
   * Execute a query
   */
  async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    this.checkRep();

    if (!this.pool) {
      throw new Error('Database not connected');
    }

    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;

      logger.debug('Query executed', {
        query: text.substring(0, 100),
        duration,
        rows: result.rowCount,
      });

      return result;
    } catch (error) {
      logger.error('Query failed', {
        query: text.substring(0, 100),
        params,
        error,
      });
      throw error;
    }
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    this.checkRep();

    if (!this.pool) {
      throw new Error('Database not connected');
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get a client from the pool for manual transaction management
   */
  async getClient(): Promise<PoolClient> {
    this.checkRep();

    if (!this.pool) {
      throw new Error('Database not connected');
    }

    return this.pool.connect();
  }

  /**
   * Check health of database connection
   */
  async healthCheck(): Promise<{ healthy: boolean; details?: any }> {
    if (!this.pool) {
      return { healthy: false, details: 'Not connected' };
    }

    try {
      const result = await this.pool.query('SELECT 1 as health');
      return {
        healthy: result.rows[0].health === 1,
        details: {
          totalConnections: this.pool.totalCount,
          idleConnections: this.pool.idleCount,
          waitingConnections: this.pool.waitingCount,
        },
      };
    } catch (error) {
      return { healthy: false, details: error };
    }
  }

  /**
   * Verify representation invariant
   */
  private checkRep(): void {
    if (process.env.NODE_ENV === 'development') {
      if (this.isConnected && !this.pool) {
        throw new Error('RI violated: isConnected but pool is null');
      }
      if (this.pool && !this.isConnected) {
        throw new Error('RI violated: pool exists but not connected');
      }
    }
  }
}

// Singleton instance
export const db = new DatabaseClient();
