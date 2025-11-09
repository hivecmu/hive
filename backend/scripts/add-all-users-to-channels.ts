#!/usr/bin/env tsx
import 'dotenv/config';
import { Pool } from 'pg';

async function main() {
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Adding all workspace members to all public channels...\n');

    // Get all workspace-user-channel combinations
    const result = await db.query(`
      INSERT INTO channel_members (channel_id, user_id)
      SELECT c.id as channel_id, wm.user_id
      FROM channels c
      CROSS JOIN workspace_members wm
      WHERE c.workspace_id = wm.workspace_id
        AND c.is_private = false
      ON CONFLICT (channel_id, user_id) DO NOTHING
      RETURNING *
    `);

    console.log(`Added ${result.rowCount} channel memberships`);

    // Verify
    const memberships = await db.query(`
      SELECT
        u.name as user_name,
        c.name as channel_name,
        w.name as workspace_name
      FROM channel_members cm
      JOIN users u ON cm.user_id = u.id
      JOIN channels c ON cm.channel_id = c.id
      JOIN workspaces w ON c.workspace_id = w.id
      ORDER BY c.name, u.name
    `);

    console.log(`\nTotal channel memberships: ${memberships.rows.length}`);

    // Group by channel
    const byChannel: Record<string, string[]> = {};
    memberships.rows.forEach(m => {
      if (!byChannel[m.channel_name]) {
        byChannel[m.channel_name] = [];
      }
      byChannel[m.channel_name].push(m.user_name);
    });

    console.log('\nChannel memberships:');
    Object.entries(byChannel).forEach(([channel, members]) => {
      console.log(`  #${channel}: ${members.length} members (${members.join(', ')})`);
    });

    await db.end();
    console.log('\n✓ Done!');
  } catch (error) {
    console.error('Error:', error);
    await db.end();
    process.exit(1);
  }
}

main();
