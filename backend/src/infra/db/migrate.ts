import 'dotenv/config';
import { db } from './client';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { logger } from '@shared/utils/logger';

/**
 * Simple SQL-based migration runner
 */

interface Migration {
  id: number;
  name: string;
  filename: string;
  sql: string;
}

async function ensureMigrationsTable(): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT PRIMARY KEY,
      name TEXT NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT now() NOT NULL
    )
  `);
}

async function getAppliedMigrations(): Promise<Set<number>> {
  const result = await db.query<{ id: number }>(
    'SELECT id FROM schema_migrations ORDER BY id'
  );
  return new Set(result.rows.map((r) => r.id));
}

function loadMigrationFiles(): Migration[] {
  const migrationsDir = join(__dirname, '../../../migrations');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  return files.map((filename) => {
    const match = filename.match(/^(\d+)_(.+)\.sql$/);
    if (!match) {
      throw new Error(`Invalid migration filename: ${filename}`);
    }

    const id = parseInt(match[1], 10);
    const name = match[2];
    const sql = readFileSync(join(migrationsDir, filename), 'utf-8');

    return { id, name, filename, sql };
  });
}

export async function runMigrations(): Promise<void> {
  logger.info('Starting database migrations...');

  await db.connect();
  await ensureMigrationsTable();

  const applied = await getAppliedMigrations();
  const migrations = loadMigrationFiles();

  const pending = migrations.filter((m) => !applied.has(m.id));

  if (pending.length === 0) {
    logger.info('No pending migrations');
    return;
  }

  for (const migration of pending) {
    logger.info(`Applying migration ${migration.id}: ${migration.name}`);

    await db.transaction(async (client) => {
      // Run migration SQL
      await client.query(migration.sql);

      // Record migration
      await client.query(
        'INSERT INTO schema_migrations (id, name) VALUES ($1, $2)',
        [migration.id, migration.name]
      );
    });

    logger.info(`Migration ${migration.id} applied successfully`);
  }

  logger.info(`Applied ${pending.length} migrations`);
}

export async function rollbackMigration(): Promise<void> {
  logger.warn('Rollback not implemented - migrations are one-way');
  logger.warn('To rollback, drop the database and re-run migrations');
}

// CLI support
if (require.main === module) {
  const command = process.argv[2] || 'up';

  if (command === 'up') {
    runMigrations()
      .then(() => {
        logger.info('Migrations complete');
        process.exit(0);
      })
      .catch((error) => {
        logger.error('Migration failed', { error: error.message, stack: error.stack });
        process.exit(1);
      });
  } else if (command === 'down') {
    rollbackMigration()
      .then(() => process.exit(0))
      .catch((error) => {
        logger.error('Rollback failed', { error });
        process.exit(1);
      });
  } else {
    logger.error(`Unknown command: ${command}`);
    logger.info('Usage: npm run migrate [up|down]');
    process.exit(1);
  }
}
