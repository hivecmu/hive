#!/usr/bin/env tsx
import 'dotenv/config';
import { Pool } from 'pg';
import { logger } from '../src/shared/utils/logger';

async function verify() {
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Count users
    const usersResult = await db.query('SELECT COUNT(*) as count FROM users');
    const usersCount = parseInt(usersResult.rows[0].count);

    // Count workspaces
    const workspacesResult = await db.query('SELECT COUNT(*) as count FROM workspaces');
    const workspacesCount = parseInt(workspacesResult.rows[0].count);

    // Count channels
    const channelsResult = await db.query('SELECT COUNT(*) as count FROM channels');
    const channelsCount = parseInt(channelsResult.rows[0].count);

    // Count messages
    const messagesResult = await db.query('SELECT COUNT(*) as count FROM messages');
    const messagesCount = parseInt(messagesResult.rows[0].count);

    // Count direct messages
    const dmResult = await db.query('SELECT COUNT(*) as count FROM direct_messages');
    const dmCount = parseInt(dmResult.rows[0].count);

    // Get users
    const users = await db.query('SELECT name, email FROM users ORDER BY created_at');

    // Get channels
    const channels = await db.query('SELECT name, type, description FROM channels ORDER BY created_at');

    logger.info('');
    logger.info('='.repeat(60));
    logger.info('DATABASE VERIFICATION SUMMARY');
    logger.info('='.repeat(60));
    logger.info('');
    logger.info(`Total Users: ${usersCount}`);
    logger.info(`Total Workspaces: ${workspacesCount}`);
    logger.info(`Total Channels: ${channelsCount}`);
    logger.info(`Total Messages: ${messagesCount}`);
    logger.info(`Total Direct Messages: ${dmCount}`);
    logger.info('');
    logger.info('Users:');
    users.rows.forEach(user => {
      logger.info(`  - ${user.name} (${user.email})`);
    });
    logger.info('');
    logger.info('Channels:');
    channels.rows.forEach(channel => {
      logger.info(`  - #${channel.name} (${channel.type}): ${channel.description}`);
    });
    logger.info('');
    logger.info('='.repeat(60));

    await db.end();
  } catch (error) {
    logger.error('Verification failed:', error);
    await db.end();
    process.exit(1);
  }
}

verify();
