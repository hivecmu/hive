#!/usr/bin/env tsx
import 'dotenv/config';
import { hash } from 'bcrypt';
import { Pool } from 'pg';
import { logger } from '../src/shared/utils/logger';

/**
 * Database Seed Script
 * Creates demo users, workspace, channels, messages, and direct messages for testing
 */

const SALT_ROUNDS = 10;

interface SeedUser {
  email: string;
  password: string;
  name: string;
}

interface SeedWorkspace {
  name: string;
  slug: string;
  emoji: string;
  color: string;
  type: string;
}

const DEMO_USERS: SeedUser[] = [
  {
    email: 'alice@example.com',
    password: 'demo123',
    name: 'Alice Johnson',
  },
  {
    email: 'bob@example.com',
    password: 'demo123',
    name: 'Bob Chen',
  },
  {
    email: 'carol@example.com',
    password: 'demo123',
    name: 'Carol Martinez',
  },
];

const DEMO_WORKSPACE: SeedWorkspace = {
  name: 'Demo Team',
  slug: 'demo-team',
  emoji: '🚀',
  color: '#6366F1',
  type: 'company',
};

async function seedUsers(db: Pool) {
  logger.info('Seeding users...');
  const userIds: string[] = [];

  for (const user of DEMO_USERS) {
    try {
      // Check if user already exists
      const existing = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [user.email.toLowerCase()]
      );

      if (existing.rows.length > 0) {
        logger.info(`User ${user.email} already exists, skipping...`);
        userIds.push(existing.rows[0].id);
        continue;
      }

      // Hash password
      const passwordHash = await hash(user.password, SALT_ROUNDS);

      // Create user
      const result = await db.query(
        `INSERT INTO users (email, password_hash, name)
         VALUES ($1, $2, $3)
         RETURNING id, email, name`,
        [user.email.toLowerCase(), passwordHash, user.name]
      );

      userIds.push(result.rows[0].id);
      logger.info(`Created user: ${result.rows[0].email} (${result.rows[0].name})`);
    } catch (error) {
      logger.error(`Failed to create user ${user.email}:`, error);
      throw error;
    }
  }

  return userIds;
}

async function seedWorkspace(db: Pool, ownerUserId: string) {
  logger.info('Seeding workspace...');

  try {
    // Check if workspace already exists
    const existing = await db.query(
      'SELECT id FROM workspaces WHERE slug = $1',
      [DEMO_WORKSPACE.slug]
    );

    if (existing.rows.length > 0) {
      logger.info(`Workspace ${DEMO_WORKSPACE.name} already exists, skipping...`);
      return existing.rows[0].id;
    }

    // Create workspace
    const result = await db.query(
      `INSERT INTO workspaces (name, slug, emoji, color, type, owner_id)
       VALUES ($1, $2, $3, $4, $5::org_type, $6)
       RETURNING id, name, slug`,
      [
        DEMO_WORKSPACE.name,
        DEMO_WORKSPACE.slug,
        DEMO_WORKSPACE.emoji,
        DEMO_WORKSPACE.color,
        DEMO_WORKSPACE.type,
        ownerUserId,
      ]
    );

    logger.info(`Created workspace: ${result.rows[0].name} (${result.rows[0].slug})`);
    return result.rows[0].id;
  } catch (error) {
    logger.error('Failed to create workspace:', error);
    throw error;
  }
}

async function seedWorkspaceMembers(db: Pool, workspaceId: string, userIds: string[]) {
  logger.info('Seeding workspace members...');

  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i];
    const role = i === 0 ? 'admin' : 'member'; // First user is admin

    try {
      // Check if membership already exists
      const existing = await db.query(
        'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
        [workspaceId, userId]
      );

      if (existing.rows.length > 0) {
        logger.info(`Membership for user ${userId} already exists, skipping...`);
        continue;
      }

      // Create membership
      await db.query(
        `INSERT INTO workspace_members (workspace_id, user_id, role)
         VALUES ($1, $2, $3::member_role)`,
        [workspaceId, userId, role]
      );

      logger.info(`Added user ${userId} to workspace with role: ${role}`);
    } catch (error) {
      logger.error(`Failed to add user ${userId} to workspace:`, error);
      throw error;
    }
  }
}

async function seedChannels(db: Pool, workspaceId: string, creatorUserId: string) {
  logger.info('Seeding default channels...');

  const defaultChannels = [
    {
      name: 'general',
      description: 'General discussion and announcements',
      type: 'core',
    },
    {
      name: 'random',
      description: 'Random off-topic conversations',
      type: 'core',
    },
    {
      name: 'engineering',
      description: 'Engineering team discussions',
      type: 'workstream',
    },
    {
      name: 'design',
      description: 'Design team discussions and feedback',
      type: 'workstream',
    },
    {
      name: 'marketing',
      description: 'Marketing strategy and campaigns',
      type: 'workstream',
    },
  ];

  const channelIds: string[] = [];

  for (const channel of defaultChannels) {
    try {
      // Check if channel already exists
      const existing = await db.query(
        'SELECT id FROM channels WHERE workspace_id = $1 AND name = $2',
        [workspaceId, channel.name]
      );

      if (existing.rows.length > 0) {
        logger.info(`Channel #${channel.name} already exists, skipping...`);
        channelIds.push(existing.rows[0].id);
        continue;
      }

      // Create channel
      const result = await db.query(
        `INSERT INTO channels (workspace_id, name, description, type, created_by)
         VALUES ($1, $2, $3, $4::channel_type, $5)
         RETURNING id, name`,
        [workspaceId, channel.name, channel.description, channel.type, creatorUserId]
      );

      channelIds.push(result.rows[0].id);
      logger.info(`Created channel: #${result.rows[0].name}`);
    } catch (error) {
      logger.error(`Failed to create channel ${channel.name}:`, error);
      throw error;
    }
  }

  return channelIds;
}

async function seedChannelMembers(db: Pool, channelIds: string[], userIds: string[]) {
  logger.info('Seeding channel members...');

  let totalMemberships = 0;

  for (const channelId of channelIds) {
    // Add all users to all channels (since they're all public)
    for (const userId of userIds) {
      try {
        // Check if membership already exists
        const existing = await db.query(
          'SELECT 1 FROM channel_members WHERE channel_id = $1 AND user_id = $2',
          [channelId, userId]
        );

        if (existing.rows.length > 0) {
          continue;
        }

        // Add user to channel
        await db.query(
          `INSERT INTO channel_members (channel_id, user_id)
           VALUES ($1, $2)`,
          [channelId, userId]
        );

        totalMemberships++;
      } catch (error) {
        logger.error(`Failed to add user ${userId} to channel ${channelId}:`, error);
        throw error;
      }
    }
  }

  logger.info(`Created ${totalMemberships} channel memberships`);
}

async function seedMessages(db: Pool, channelIds: string[], userIds: string[]) {
  logger.info('Seeding messages...');

  // Get channel names to create contextual messages
  const channels = await db.query(
    'SELECT id, name FROM channels WHERE id = ANY($1::uuid[])',
    [channelIds]
  );

  const channelMap = new Map(channels.rows.map(c => [c.name, c.id]));

  // Messages for each channel
  const messagesByChannel: Record<string, Array<{ userId: number; content: string; delayMinutes: number }>> = {
    general: [
      { userId: 0, content: 'Welcome to Demo Team! 👋 Glad to have everyone here.', delayMinutes: 0 },
      { userId: 1, content: 'Thanks Alice! Excited to be part of the team.', delayMinutes: 5 },
      { userId: 2, content: 'Hey everyone! Looking forward to working together.', delayMinutes: 10 },
      { userId: 0, content: 'Just a reminder - team standup is at 10am daily in this channel.', delayMinutes: 30 },
      { userId: 1, content: 'Got it! I\'ll be there.', delayMinutes: 32 },
      { userId: 2, content: 'Perfect timing, I was just about to ask about that.', delayMinutes: 35 },
      { userId: 0, content: 'Also, feel free to update your profile with your timezone and role.', delayMinutes: 60 },
      { userId: 1, content: 'Done! Updated mine just now.', delayMinutes: 65 },
      { userId: 0, content: 'Great! We have a few new features coming out this week. Stay tuned!', delayMinutes: 120 },
      { userId: 2, content: 'Sounds exciting! Can\'t wait to see what\'s coming.', delayMinutes: 125 },
      { userId: 1, content: 'Is there a roadmap somewhere I can check out?', delayMinutes: 130 },
      { userId: 0, content: 'Yes! Check the #engineering channel for the latest roadmap updates.', delayMinutes: 135 },
      { userId: 2, content: 'Thanks for the pointer!', delayMinutes: 140 },
      { userId: 0, content: 'Quick announcement: We\'re planning a team offsite next month. More details to come!', delayMinutes: 180 },
      { userId: 1, content: '🎉 That sounds great!', delayMinutes: 182 },
      { userId: 2, content: 'Count me in! 🙌', delayMinutes: 185 },
    ],
    random: [
      { userId: 1, content: 'Anyone catch the game last night? 🏀', delayMinutes: 0 },
      { userId: 2, content: 'Yeah! What a finish. Couldn\'t believe that last shot.', delayMinutes: 3 },
      { userId: 0, content: 'I missed it but saw the highlights. Insane!', delayMinutes: 8 },
      { userId: 1, content: 'Best game of the season for sure.', delayMinutes: 12 },
      { userId: 2, content: 'Completely random but has anyone tried that new coffee shop downtown?', delayMinutes: 45 },
      { userId: 0, content: 'The one on Main Street? Their espresso is amazing ☕', delayMinutes: 50 },
      { userId: 1, content: 'Oh I need to check that out. Love a good espresso.', delayMinutes: 55 },
      { userId: 2, content: 'Let\'s do a coffee run tomorrow morning before standup?', delayMinutes: 60 },
      { userId: 0, content: 'I\'m in!', delayMinutes: 62 },
      { userId: 1, content: 'Sounds like a plan 👍', delayMinutes: 65 },
      { userId: 2, content: 'What\'s everyone reading these days? Looking for book recommendations.', delayMinutes: 120 },
      { userId: 0, content: 'Just finished "The Pragmatic Programmer" - highly recommend!', delayMinutes: 125 },
      { userId: 1, content: 'I\'m reading "Atomic Habits" right now. Really good so far.', delayMinutes: 130 },
      { userId: 2, content: 'Both sound great, adding to my list!', delayMinutes: 135 },
    ],
    engineering: [
      { userId: 1, content: 'Hey team, I\'m working on the new API endpoints for the chat feature.', delayMinutes: 0 },
      { userId: 0, content: 'Nice! Are you following the REST conventions we discussed?', delayMinutes: 5 },
      { userId: 1, content: 'Yes, using POST for creating messages and GET for fetching. Also added pagination.', delayMinutes: 8 },
      { userId: 0, content: 'Perfect. Don\'t forget to add rate limiting too.', delayMinutes: 12 },
      { userId: 1, content: 'Good call. I\'ll add that before the PR.', delayMinutes: 15 },
      { userId: 2, content: 'Quick question: what\'s the status of the database migration for user profiles?', delayMinutes: 30 },
      { userId: 0, content: 'It\'s done and deployed to staging. Running smoothly so far.', delayMinutes: 35 },
      { userId: 2, content: 'Great! I\'ll start building the frontend for it then.', delayMinutes: 40 },
      { userId: 1, content: 'I pushed the chat API PR. Could use a review when you get a chance.', delayMinutes: 60 },
      { userId: 0, content: 'On it! Will review this afternoon.', delayMinutes: 65 },
      { userId: 2, content: 'I can also take a look from a frontend perspective.', delayMinutes: 70 },
      { userId: 1, content: 'That would be awesome, thanks!', delayMinutes: 72 },
      { userId: 0, content: 'Quick reminder: code freeze is Friday for the v2.0 release.', delayMinutes: 120 },
      { userId: 1, content: 'Noted. I\'ll make sure everything is merged by Thursday.', delayMinutes: 125 },
      { userId: 2, content: 'Same here. Just need to finish up the profile page.', delayMinutes: 130 },
      { userId: 0, content: 'You both are crushing it! 💪', delayMinutes: 135 },
      { userId: 1, content: 'The CI/CD pipeline is running a bit slow lately. Anyone else noticing this?', delayMinutes: 180 },
      { userId: 0, content: 'Yeah, I think it\'s the test suite. We should look at parallelizing some tests.', delayMinutes: 185 },
      { userId: 2, content: 'I can help with that. Let\'s schedule some time to optimize it.', delayMinutes: 190 },
    ],
    design: [
      { userId: 2, content: 'Working on mockups for the new dashboard. Would love some feedback!', delayMinutes: 0 },
      { userId: 0, content: 'Share the Figma link when ready. Always happy to review.', delayMinutes: 5 },
      { userId: 2, content: 'Here\'s the link: [Design mockups] - still WIP but getting there.', delayMinutes: 10 },
      { userId: 1, content: 'This looks great! Love the color scheme.', delayMinutes: 20 },
      { userId: 0, content: 'Agreed. The navigation feels very intuitive.', delayMinutes: 25 },
      { userId: 2, content: 'Thanks! I was going for clean and minimal.', delayMinutes: 30 },
      { userId: 1, content: 'One small thing - can we make the buttons a bit larger on mobile?', delayMinutes: 35 },
      { userId: 2, content: 'Good catch. I\'ll update that in the next iteration.', delayMinutes: 40 },
      { userId: 0, content: 'Also thinking about accessibility - let\'s make sure the contrast ratios are WCAG compliant.', delayMinutes: 60 },
      { userId: 2, content: 'Absolutely. I\'ll run it through the contrast checker.', delayMinutes: 65 },
      { userId: 2, content: 'Updated the designs with your feedback. Take another look when you can!', delayMinutes: 120 },
      { userId: 1, content: 'Perfect! The mobile buttons look much better now.', delayMinutes: 125 },
      { userId: 0, content: 'This is ready to move to development in my opinion. Great work!', delayMinutes: 130 },
      { userId: 2, content: 'Awesome! I\'ll create tickets for the implementation.', delayMinutes: 135 },
    ],
    marketing: [
      { userId: 0, content: 'Planning the Q2 marketing campaign. What should be our main focus?', delayMinutes: 0 },
      { userId: 2, content: 'I think we should highlight the new collaboration features.', delayMinutes: 5 },
      { userId: 1, content: 'Agreed. And maybe some customer success stories?', delayMinutes: 10 },
      { userId: 0, content: 'Love it. Customer stories always perform well.', delayMinutes: 15 },
      { userId: 2, content: 'I can reach out to some of our power users for testimonials.', delayMinutes: 20 },
      { userId: 1, content: 'Great idea. Let me know if you need any data on feature usage.', delayMinutes: 25 },
      { userId: 0, content: 'Also thinking we should do a webinar series. Thoughts?', delayMinutes: 60 },
      { userId: 2, content: 'That could work well. Maybe "Best Practices for Remote Teams"?', delayMinutes: 65 },
      { userId: 1, content: 'I like that angle. Very timely.', delayMinutes: 70 },
      { userId: 0, content: 'Perfect. I\'ll draft a plan and share it for feedback.', delayMinutes: 75 },
      { userId: 2, content: 'FYI - our social media engagement is up 25% this month! 📈', delayMinutes: 120 },
      { userId: 0, content: 'Wow! That\'s fantastic. What\'s driving the growth?', delayMinutes: 125 },
      { userId: 2, content: 'The video content is really resonating. Short tutorials and tips.', delayMinutes: 130 },
      { userId: 1, content: 'We should double down on that then.', delayMinutes: 135 },
      { userId: 0, content: 'Agreed. Let\'s plan more video content for next month.', delayMinutes: 140 },
    ],
  };

  let totalMessages = 0;

  for (const [channelName, messages] of Object.entries(messagesByChannel)) {
    const channelId = channelMap.get(channelName);
    if (!channelId) continue;

    logger.info(`Seeding messages for #${channelName}...`);

    for (const msg of messages) {
      try {
        const userId = userIds[msg.userId];
        const createdAt = new Date(Date.now() - (messages.length * 60000) + (msg.delayMinutes * 60000));

        await db.query(
          `INSERT INTO messages (channel_id, user_id, content, created_at)
           VALUES ($1, $2, $3, $4)`,
          [channelId, userId, msg.content, createdAt]
        );

        totalMessages++;
      } catch (error) {
        logger.error(`Failed to create message in #${channelName}:`, error);
        throw error;
      }
    }
  }

  logger.info(`Created ${totalMessages} messages across ${Object.keys(messagesByChannel).length} channels`);
}

async function seedDirectMessages(db: Pool, workspaceId: string, userIds: string[]) {
  logger.info('Seeding direct messages...');

  const directMessages = [
    {
      fromUserId: 0, // Alice
      toUserId: 1,   // Bob
      content: 'Hey Bob, do you have a minute to discuss the API design?',
      delayMinutes: 0,
    },
    {
      fromUserId: 1,
      toUserId: 0,
      content: 'Sure! I\'m free now. What\'s up?',
      delayMinutes: 2,
    },
    {
      fromUserId: 0,
      toUserId: 1,
      content: 'I was thinking about the authentication flow. Should we use JWT or sessions?',
      delayMinutes: 5,
    },
    {
      fromUserId: 1,
      toUserId: 0,
      content: 'I\'d go with JWT for better scalability. We can use refresh tokens for security.',
      delayMinutes: 8,
    },
    {
      fromUserId: 0,
      toUserId: 1,
      content: 'Good call. That makes sense. I\'ll update the spec.',
      delayMinutes: 10,
    },
    {
      fromUserId: 2, // Carol
      toUserId: 0,   // Alice
      content: 'Hi Alice! Can you review my design mockups when you get a chance?',
      delayMinutes: 30,
    },
    {
      fromUserId: 0,
      toUserId: 2,
      content: 'Of course! Send me the link and I\'ll take a look this afternoon.',
      delayMinutes: 35,
    },
    {
      fromUserId: 2,
      toUserId: 0,
      content: 'Thanks! Here\'s the Figma link: [mockups]. No rush!',
      delayMinutes: 40,
    },
    {
      fromUserId: 1,
      toUserId: 2,
      content: 'Hey Carol, quick question about the button colors in the design system.',
      delayMinutes: 60,
    },
    {
      fromUserId: 2,
      toUserId: 1,
      content: 'Sure, what\'s the question?',
      delayMinutes: 62,
    },
    {
      fromUserId: 1,
      toUserId: 2,
      content: 'Should primary buttons use the brand blue or the darker shade?',
      delayMinutes: 65,
    },
    {
      fromUserId: 2,
      toUserId: 1,
      content: 'Use the brand blue (#6366F1). The darker shade is for hover states.',
      delayMinutes: 68,
    },
    {
      fromUserId: 1,
      toUserId: 2,
      content: 'Perfect, thanks for clarifying!',
      delayMinutes: 70,
    },
  ];

  for (const dm of directMessages) {
    try {
      const fromUserId = userIds[dm.fromUserId];
      const toUserId = userIds[dm.toUserId];
      const createdAt = new Date(Date.now() - (directMessages.length * 60000) + (dm.delayMinutes * 60000));

      await db.query(
        `INSERT INTO direct_messages (workspace_id, from_user_id, to_user_id, content, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [workspaceId, fromUserId, toUserId, dm.content, createdAt]
      );
    } catch (error) {
      logger.error('Failed to create direct message:', error);
      throw error;
    }
  }

  logger.info(`Created ${directMessages.length} direct messages`);
}

async function main() {
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    logger.info('Starting database seed...');

    // Seed users
    const userIds = await seedUsers(db);

    if (userIds.length === 0) {
      logger.error('No users created, aborting seed');
      process.exit(1);
    }

    // Seed workspace (owned by first user)
    const workspaceId = await seedWorkspace(db, userIds[0]);

    // Seed workspace members
    await seedWorkspaceMembers(db, workspaceId, userIds);

    // Seed channels and get channel IDs
    const channelIds = await seedChannels(db, workspaceId, userIds[0]);

    // Seed channel members (add users to channels)
    await seedChannelMembers(db, channelIds, userIds);

    // Seed messages in channels
    await seedMessages(db, channelIds, userIds);

    // Seed direct messages
    await seedDirectMessages(db, workspaceId, userIds);

    // Update workspace member count
    await db.query(
      'UPDATE workspaces SET member_count = $1 WHERE id = $2',
      [userIds.length, workspaceId]
    );

    logger.info('');
    logger.info('='.repeat(60));
    logger.info('Database seed completed successfully!');
    logger.info('='.repeat(60));
    logger.info('');
    logger.info('Demo credentials:');
    logger.info('  Email: alice@example.com   | Password: demo123 | Name: Alice Johnson');
    logger.info('  Email: bob@example.com     | Password: demo123 | Name: Bob Chen');
    logger.info('  Email: carol@example.com   | Password: demo123 | Name: Carol Martinez');
    logger.info('');
    logger.info('Workspace: Demo Team (demo-team)');
    logger.info('');
    logger.info('Channels created:');
    logger.info('  #general (core) - 16 messages');
    logger.info('  #random (core) - 14 messages');
    logger.info('  #engineering (workstream) - 19 messages');
    logger.info('  #design (workstream) - 14 messages');
    logger.info('  #marketing (workstream) - 15 messages');
    logger.info('');
    logger.info('Direct messages: 13 messages');
    logger.info('');
    logger.info('You can now login at: http://localhost:3000/login');
    logger.info('='.repeat(60));
    logger.info('');

    await db.end();
    process.exit(0);
  } catch (error) {
    logger.error('Seed failed:', error);
    await db.end();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { main as seed };
