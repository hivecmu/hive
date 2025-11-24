#!/usr/bin/env tsx
/**
 * Test script to verify workspace creation with default channel
 * Run with: npx tsx scripts/test-workspace-channel-creation.ts
 */

import { workspaceService } from '../src/domains/workspace/WorkspaceService';
import { channelService } from '../src/domains/messaging/ChannelService';
import { userService } from '../src/domains/users/UserService';
import { db } from '../src/infra/db/client';
import { logger } from '../src/shared/utils/logger';

async function testWorkspaceChannelCreation() {
  try {
    logger.info('Starting workspace channel creation test...');

    // Connect to database
    await db.connect();
    logger.info('Database connected');

    // Create a test user
    const userResult = await userService.register({
      email: `test-${Date.now()}@example.com`,
      password: 'testpass123',
      name: 'Test User',
    });

    if (!userResult.ok) {
      logger.error('Failed to create test user', { issues: userResult.issues });
      return;
    }

    const user = userResult.value.user;
    logger.info('Test user created', { userId: user.id });

    // Create a workspace
    const workspaceResult = await workspaceService.create({
      name: `Test Workspace ${Date.now()}`,
      slug: `test-workspace-${Date.now()}`,
      emoji: '🧪',
      color: '#00FF00',
      type: 'company',
      description: 'Test workspace with auto-created general channel',
      ownerId: user.id,
    });

    if (!workspaceResult.ok) {
      logger.error('Failed to create workspace', { issues: workspaceResult.issues });
      return;
    }

    const workspace = workspaceResult.value;
    logger.info('Workspace created', { 
      workspaceId: workspace.id,
      blueprintApproved: workspace.blueprintApproved 
    });

    // Check if general channel was created
    const channelsResult = await channelService.listByUserInWorkspace(
      workspace.id,
      user.id
    );

    if (!channelsResult.ok) {
      logger.error('Failed to list channels', { issues: channelsResult.issues });
      return;
    }

    const channels = channelsResult.value;
    logger.info('Channels in workspace', { 
      count: channels.length,
      channels: channels.map(c => ({ 
        id: c.id, 
        name: c.name, 
        type: c.type 
      }))
    });

    // Verify general channel exists
    const generalChannel = channels.find(c => c.name === 'general');
    if (generalChannel) {
      logger.info('✅ SUCCESS: General channel was automatically created!', {
        channelId: generalChannel.id,
        channelName: generalChannel.name,
        channelType: generalChannel.type,
      });
    } else {
      logger.error('❌ FAILURE: General channel was not created');
    }

    // Check blueprintApproved field
    if (workspace.blueprintApproved === false) {
      logger.info('✅ SUCCESS: blueprintApproved is correctly set to false for new workspace');
    } else {
      logger.error('❌ FAILURE: blueprintApproved should be false for new workspace');
    }

    // Clean up - delete the test workspace
    await workspaceService.delete(workspace.id);
    logger.info('Test workspace deleted');

  } catch (error) {
    logger.error('Test failed with error', { error });
  } finally {
    await db.disconnect();
    logger.info('Test complete');
  }
}

// Run the test
testWorkspaceChannelCreation();
