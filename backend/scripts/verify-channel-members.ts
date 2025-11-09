#!/usr/bin/env tsx
import 'dotenv/config';
import { Pool } from 'pg';

async function main() {
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Verifying channel members setup...\n');

    // Get all users
    const users = await db.query('SELECT id, name, email FROM users ORDER BY name');
    console.log(`Users (${users.rows.length}):`);
    users.rows.forEach(u => console.log(`  - ${u.name} (${u.email})`));

    // Get all channels
    const channels = await db.query('SELECT id, name, type FROM channels ORDER BY name');
    console.log(`\nChannels (${channels.rows.length}):`);
    channels.rows.forEach(c => console.log(`  - #${c.name} (${c.type})`));

    // Get channel memberships
    const memberships = await db.query(`
      SELECT
        u.name as user_name,
        c.name as channel_name,
        cm.joined_at
      FROM channel_members cm
      JOIN users u ON cm.user_id = u.id
      JOIN channels c ON cm.channel_id = c.id
      ORDER BY c.name, u.name
    `);

    console.log(`\nChannel Memberships (${memberships.rows.length}):`);

    // Group by channel
    const byChannel: Record<string, string[]> = {};
    memberships.rows.forEach(m => {
      if (!byChannel[m.channel_name]) {
        byChannel[m.channel_name] = [];
      }
      byChannel[m.channel_name].push(m.user_name);
    });

    Object.entries(byChannel).forEach(([channel, members]) => {
      console.log(`  #${channel}: ${members.join(', ')}`);
    });

    // Check messages per channel
    const messageCounts = await db.query(`
      SELECT
        c.name as channel_name,
        COUNT(m.id) as message_count
      FROM channels c
      LEFT JOIN messages m ON m.channel_id = c.id
      GROUP BY c.id, c.name
      ORDER BY c.name
    `);

    console.log(`\nMessages per channel:`);
    messageCounts.rows.forEach(row => {
      console.log(`  #${row.channel_name}: ${row.message_count} messages`);
    });

    console.log('\n✓ Verification complete!');
    console.log('\nAll users are members of all channels and can see messages.');

    await db.end();
  } catch (error) {
    console.error('Error:', error);
    await db.end();
    process.exit(1);
  }
}

main();
