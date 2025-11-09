#!/usr/bin/env tsx
import 'dotenv/config';
import { Pool } from 'pg';
import { logger } from '../src/shared/utils/logger';

async function showSampleData() {
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    logger.info('');
    logger.info('='.repeat(80));
    logger.info('SAMPLE CHANNEL MESSAGES');
    logger.info('='.repeat(80));

    // Get sample messages from each channel
    const channels = await db.query(`
      SELECT c.id, c.name, c.type
      FROM channels c
      ORDER BY c.created_at
    `);

    for (const channel of channels.rows) {
      logger.info('');
      logger.info(`Channel: #${channel.name} (${channel.type})`);
      logger.info('-'.repeat(80));

      const messages = await db.query(`
        SELECT
          m.content,
          u.name as user_name,
          m.created_at
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.channel_id = $1
        ORDER BY m.created_at
        LIMIT 5
      `, [channel.id]);

      messages.rows.forEach(msg => {
        const time = new Date(msg.created_at).toLocaleTimeString();
        logger.info(`  [${time}] ${msg.user_name}: ${msg.content}`);
      });

      const totalMessages = await db.query(
        'SELECT COUNT(*) as count FROM messages WHERE channel_id = $1',
        [channel.id]
      );
      logger.info(`  ... (${totalMessages.rows[0].count} messages total)`);
    }

    logger.info('');
    logger.info('='.repeat(80));
    logger.info('SAMPLE DIRECT MESSAGES');
    logger.info('='.repeat(80));

    const dms = await db.query(`
      SELECT
        dm.content,
        u1.name as from_name,
        u2.name as to_name,
        dm.created_at
      FROM direct_messages dm
      JOIN users u1 ON dm.from_user_id = u1.id
      JOIN users u2 ON dm.to_user_id = u2.id
      ORDER BY dm.created_at
      LIMIT 5
    `);

    dms.rows.forEach(dm => {
      const time = new Date(dm.created_at).toLocaleTimeString();
      logger.info(`  [${time}] ${dm.from_name} -> ${dm.to_name}: ${dm.content}`);
    });

    const totalDMs = await db.query('SELECT COUNT(*) as count FROM direct_messages');
    logger.info(`  ... (${totalDMs.rows[0].count} direct messages total)`);

    logger.info('');
    logger.info('='.repeat(80));

    await db.end();
  } catch (error) {
    logger.error('Failed to show sample data:', error);
    await db.end();
    process.exit(1);
  }
}

showSampleData();
