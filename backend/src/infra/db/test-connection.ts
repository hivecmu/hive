import 'dotenv/config';
import { db } from './client';
import { logger } from '@shared/utils/logger';

async function testConnection() {
  try {
    logger.info('Testing database connection...');

    await db.connect();

    const health = await db.healthCheck();
    logger.info('Health check result', health);

    // Test a simple query
    const result = await db.query('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = $1', ['public']);
    logger.info('Tables in public schema', { count: result.rows[0].table_count });

    // List all tables
    const tables = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    logger.info('Database tables', {
      tables: tables.rows.map(r => r.table_name)
    });

    await db.disconnect();
    logger.info('✅ Database connection test successful!');
    process.exit(0);

  } catch (error) {
    logger.error('❌ Database connection test failed', { error });
    process.exit(1);
  }
}

testConnection();
