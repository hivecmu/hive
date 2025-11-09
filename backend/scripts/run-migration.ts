#!/usr/bin/env tsx
import 'dotenv/config';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

async function main() {
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Checking for channel_members table...');

    // Check if table exists
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'channel_members'
      );
    `);

    const tableExists = tableCheck.rows[0].exists;

    if (tableExists) {
      console.log('✓ channel_members table already exists');
    } else {
      console.log('✗ channel_members table does not exist, applying migration...');

      // Read and apply migration
      const migrationPath = join(__dirname, '../migrations/005_channel_members.sql');
      const migrationSql = readFileSync(migrationPath, 'utf-8');

      await db.query(migrationSql);

      console.log('✓ Migration applied successfully');

      // Record in schema_migrations if that table exists
      try {
        await db.query(
          'INSERT INTO schema_migrations (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
          [5, 'channel_members']
        );
        console.log('✓ Migration recorded in schema_migrations');
      } catch (err) {
        console.log('  (schema_migrations table not found, skipping record)');
      }
    }

    // Check the structure
    const columns = await db.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'channel_members'
      ORDER BY ordinal_position;
    `);

    console.log('\nChannel members table structure:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    await db.end();
    console.log('\nDone!');
  } catch (error) {
    console.error('Error:', error);
    await db.end();
    process.exit(1);
  }
}

main();
