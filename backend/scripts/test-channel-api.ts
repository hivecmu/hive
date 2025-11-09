#!/usr/bin/env tsx
import 'dotenv/config';
import { Pool } from 'pg';

/**
 * Simulates the API logic to verify channels are properly filtered by user membership
 */
async function main() {
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Testing channel API logic...\n');

    // Get test user
    const userResult = await db.query(
      'SELECT id, name, email FROM users WHERE email = $1',
      ['alice@example.com']
    );

    if (userResult.rows.length === 0) {
      console.error('Test user not found');
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`Testing with user: ${user.name} (${user.email})`);
    console.log(`User ID: ${user.id}\n`);

    // Get workspace
    const workspaceResult = await db.query(
      'SELECT id, name, slug FROM workspaces WHERE slug = $1',
      ['demo-team']
    );

    if (workspaceResult.rows.length === 0) {
      console.error('Test workspace not found');
      process.exit(1);
    }

    const workspace = workspaceResult.rows[0];
    console.log(`Workspace: ${workspace.name} (${workspace.slug})`);
    console.log(`Workspace ID: ${workspace.id}\n`);

    // Check if user is workspace member
    const memberCheck = await db.query(
      'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspace.id, user.id]
    );

    if (memberCheck.rows.length === 0) {
      console.log('❌ User is NOT a workspace member');
      process.exit(1);
    }

    console.log(`✓ User is a workspace member (role: ${memberCheck.rows[0].role})\n`);

    // Simulate the API call: GET /v1/workspaces/:workspaceId/channels
    // This uses the new listByUserInWorkspace method
    const channelsResult = await db.query(
      `SELECT c.*
       FROM channels c
       INNER JOIN channel_members cm ON c.id = cm.channel_id
       WHERE c.workspace_id = $1 AND cm.user_id = $2
       ORDER BY c.created_at ASC`,
      [workspace.id, user.id]
    );

    console.log(`Channels visible to ${user.name}:`);
    console.log(`Found ${channelsResult.rows.length} channels\n`);

    if (channelsResult.rows.length === 0) {
      console.log('❌ No channels found! User cannot see any channels.');
      console.log('\nPossible issues:');
      console.log('1. User is not a member of any channels');
      console.log('2. channel_members table is not populated');
      process.exit(1);
    }

    channelsResult.rows.forEach((channel, idx) => {
      console.log(`${idx + 1}. #${channel.name}`);
      console.log(`   Type: ${channel.type}`);
      console.log(`   Private: ${channel.is_private}`);
      console.log(`   Description: ${channel.description || 'N/A'}`);
      console.log('');
    });

    // Check message counts
    console.log('Messages per channel:');
    for (const channel of channelsResult.rows) {
      const messageCount = await db.query(
        'SELECT COUNT(*) as count FROM messages WHERE channel_id = $1',
        [channel.id]
      );
      console.log(`  #${channel.name}: ${messageCount.rows[0].count} messages`);
    }

    console.log('\n✓ API test successful!');
    console.log('✓ Users will be able to see channels in the UI');

    await db.end();
  } catch (error) {
    console.error('Error:', error);
    await db.end();
    process.exit(1);
  }
}

main();
