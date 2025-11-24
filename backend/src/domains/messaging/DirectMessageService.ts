import { db } from '@infra/db/client';
import { Result, Ok, Err, Issues, Issue } from '@shared/types/Result';
import type { UUID } from '@shared/types/common';

export interface DirectMessage {
  id: UUID;
  workspaceId: UUID;
  user1Id: UUID;
  user2Id: UUID;
  lastMessageAt: Date | null;
  lastMessageContent: string | null;
  unreadCount1: number;
  unreadCount2: number;
  createdAt: Date;
  updatedAt: Date;
  // Virtual fields populated from joins
  otherUser?: {
    id: UUID;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface DirectMessageConversation {
  id: UUID;
  content: string;
  senderId: UUID;
  recipientId: UUID;
  readAt: Date | null;
  editedAt: Date | null;
  createdAt: Date;
  sender?: {
    id: UUID;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface CreateDirectMessageInput {
  workspaceId: UUID;
  senderId: UUID;
  recipientId: UUID;
  content: string;
}

/**
 * Direct Message Service
 * Manages direct messages between users
 */
export class DirectMessageService {
  /**
   * Get or create a direct message thread between two users
   */
  async getOrCreateThread(
    workspaceId: UUID,
    user1Id: UUID,
    user2Id: UUID
  ): Promise<Result<DirectMessage, Issue>> {
    try {
      // Order user IDs to ensure consistency
      const [orderedUser1, orderedUser2] = [user1Id, user2Id].sort();

      // Check if thread already exists
      let result = await db.query(
        `SELECT dm.*, 
                u.id as other_user_id,
                u.name as other_user_name,
                u.email as other_user_email
         FROM direct_messages dm
         JOIN users u ON (
           CASE 
             WHEN dm.user1_id = $3 THEN dm.user2_id = u.id
             ELSE dm.user1_id = u.id
           END
         )
         WHERE dm.workspace_id = $1 
         AND ((dm.user1_id = $2 AND dm.user2_id = $3) 
              OR (dm.user1_id = $3 AND dm.user2_id = $2))`,
        [workspaceId, orderedUser1, orderedUser2, user1Id]
      );

      if (result.rows.length > 0) {
        return Ok(this.rowToDirectMessage(result.rows[0], user1Id));
      }

      // Create new thread
      result = await db.query(
        `INSERT INTO direct_messages (workspace_id, user1_id, user2_id)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [workspaceId, orderedUser1, orderedUser2]
      );

      // Get with user info
      const threadResult = await db.query(
        `SELECT dm.*, 
                u.id as other_user_id,
                u.name as other_user_name,
                u.email as other_user_email
         FROM direct_messages dm
         JOIN users u ON (
           CASE 
             WHEN dm.user1_id = $2 THEN dm.user2_id = u.id
             ELSE dm.user1_id = u.id
           END
         )
         WHERE dm.id = $1`,
        [result.rows[0].id, user1Id]
      );

      return Ok(this.rowToDirectMessage(threadResult.rows[0], user1Id));
    } catch (error) {
      return Err([Issues.internal('Failed to get or create direct message thread')]);
    }
  }

  /**
   * Send a direct message
   */
  async sendMessage(input: CreateDirectMessageInput): Promise<Result<DirectMessageConversation, Issue>> {
    try {
      return await db.transaction(async (client) => {
        // Get or create thread
        const threadResult = await this.getOrCreateThread(
          input.workspaceId,
          input.senderId,
          input.recipientId
        );

        if (!threadResult.ok) {
          return threadResult;
        }

        const thread = threadResult.value;

        // Insert message
        const messageResult = await client.query(
          `INSERT INTO dm_messages (dm_id, sender_id, recipient_id, content)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [thread.id, input.senderId, input.recipientId, input.content]
        );

        // Update thread's last message info
        const isUser1 = thread.user1Id === input.senderId;
        await client.query(
          `UPDATE direct_messages 
           SET last_message_at = NOW(),
               last_message_content = $1,
               ${isUser1 ? 'unread_count2' : 'unread_count1'} = ${isUser1 ? 'unread_count2' : 'unread_count1'} + 1,
               updated_at = NOW()
           WHERE id = $2`,
          [input.content, thread.id]
        );

        // Get message with sender info
        const fullMessageResult = await client.query(
          `SELECT m.*, 
                  u.id as sender_id,
                  u.name as sender_name,
                  u.email as sender_email
           FROM dm_messages m
           JOIN users u ON m.sender_id = u.id
           WHERE m.id = $1`,
          [messageResult.rows[0].id]
        );

        return Ok(this.rowToMessage(fullMessageResult.rows[0]));
      });
    } catch (error) {
      return Err([Issues.internal('Failed to send direct message')]);
    }
  }

  /**
   * List messages in a direct message thread
   */
  async listMessages(
    dmId: UUID,
    limit: number = 50,
    before?: Date
  ): Promise<Result<DirectMessageConversation[], Issue>> {
    try {
      const params: any[] = [dmId, limit];
      let whereClause = 'WHERE m.dm_id = $1';
      
      if (before) {
        params.push(before);
        whereClause += ` AND m.created_at < $${params.length}`;
      }

      const result = await db.query(
        `SELECT m.*, 
                u.id as sender_id,
                u.name as sender_name,
                u.email as sender_email
         FROM dm_messages m
         JOIN users u ON m.sender_id = u.id
         ${whereClause}
         ORDER BY m.created_at DESC
         LIMIT $2`,
        params
      );

      const messages = result.rows.map(row => this.rowToMessage(row));
      return Ok(messages.reverse()); // Reverse to get chronological order
    } catch (error) {
      return Err([Issues.internal('Failed to list direct messages')]);
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(dmId: UUID, userId: UUID): Promise<Result<void, Issue>> {
    try {
      await db.transaction(async (client) => {
        // Mark messages as read
        await client.query(
          `UPDATE dm_messages 
           SET read_at = NOW()
           WHERE dm_id = $1 AND recipient_id = $2 AND read_at IS NULL`,
          [dmId, userId]
        );

        // Reset unread count
        const thread = await client.query(
          'SELECT user1_id, user2_id FROM direct_messages WHERE id = $1',
          [dmId]
        );

        if (thread.rows.length > 0) {
          const isUser1 = thread.rows[0].user1_id === userId;
          await client.query(
            `UPDATE direct_messages 
             SET ${isUser1 ? 'unread_count1' : 'unread_count2'} = 0
             WHERE id = $1`,
            [dmId]
          );
        }
      });

      return Ok(undefined);
    } catch (error) {
      return Err([Issues.internal('Failed to mark messages as read')]);
    }
  }

  /**
   * List all DM threads for a user in a workspace
   */
  async listThreadsForUser(
    workspaceId: UUID,
    userId: UUID
  ): Promise<Result<DirectMessage[], Issue>> {
    try {
      const result = await db.query(
        `SELECT dm.*, 
                u.id as other_user_id,
                u.name as other_user_name,
                u.email as other_user_email
         FROM direct_messages dm
         JOIN users u ON (
           CASE 
             WHEN dm.user1_id = $2 THEN dm.user2_id = u.id
             ELSE dm.user1_id = u.id
           END
         )
         WHERE dm.workspace_id = $1 
         AND (dm.user1_id = $2 OR dm.user2_id = $2)
         ORDER BY dm.last_message_at DESC NULLS LAST`,
        [workspaceId, userId]
      );

      const threads = result.rows.map(row => this.rowToDirectMessage(row, userId));
      return Ok(threads);
    } catch (error) {
      return Err([Issues.internal('Failed to list direct message threads')]);
    }
  }

  /**
   * Convert database row to DirectMessage
   */
  private rowToDirectMessage(row: any, currentUserId: UUID): DirectMessage {
    const isUser1 = row.user1_id === currentUserId;
    
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      user1Id: row.user1_id,
      user2Id: row.user2_id,
      lastMessageAt: row.last_message_at ? new Date(row.last_message_at) : null,
      lastMessageContent: row.last_message_content,
      unreadCount1: row.unread_count1 || 0,
      unreadCount2: row.unread_count2 || 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      otherUser: row.other_user_id ? {
        id: row.other_user_id,
        name: row.other_user_name,
        email: row.other_user_email,
        avatarUrl: row.other_user_avatar_url,
      } : undefined,
    };
  }

  /**
   * Convert database row to DirectMessageConversation
   */
  private rowToMessage(row: any): DirectMessageConversation {
    return {
      id: row.id,
      content: row.content,
      senderId: row.sender_id,
      recipientId: row.recipient_id,
      readAt: row.read_at ? new Date(row.read_at) : null,
      editedAt: row.edited_at ? new Date(row.edited_at) : null,
      createdAt: new Date(row.created_at),
      sender: row.sender_name ? {
        id: row.sender_id,
        name: row.sender_name,
        email: row.sender_email,
        avatarUrl: row.sender_avatar_url,
      } : undefined,
    };
  }
}

export const directMessageService = new DirectMessageService();
