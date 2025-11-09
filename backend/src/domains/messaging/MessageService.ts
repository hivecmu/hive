import { db } from '@infra/db/client';
import { Result, Ok, Err, Issues, Issue } from '@shared/types/Result';
import type { UUID } from '@shared/types/common';

export interface Message {
  id: UUID;
  channelId: UUID;
  userId: UUID;
  content: string;
  threadId: UUID | null;
  editedAt: Date | null;
  createdAt: Date;
  user?: {
    id: UUID;
    name: string;
    email: string;
  };
}

export interface SendMessageInput {
  channelId: UUID;
  userId: UUID;
  content: string;
  threadId?: UUID;
}

/**
 * Message Service
 * Manages messages within channels
 */
export class MessageService {
  /**
   * Send a message to a channel
   */
  async send(input: SendMessageInput): Promise<Result<Message, Issue>> {
    try {
      // Insert the message
      const insertResult = await db.query(
        `INSERT INTO messages (channel_id, user_id, content, thread_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [input.channelId, input.userId, input.content, input.threadId || null]
      );

      const messageId = insertResult.rows[0].id;

      // Fetch the message with user info
      const result = await db.query(
        `SELECT
           m.*,
           u.id as user_id,
           u.name as user_name,
           u.email as user_email
         FROM messages m
         LEFT JOIN users u ON m.user_id = u.id
         WHERE m.id = $1`,
        [messageId]
      );

      return Ok(this.rowToMessage(result.rows[0]));
    } catch (error) {
      return Err([Issues.internal('Failed to send message')]);
    }
  }

  /**
   * Get message by ID
   */
  async getById(id: UUID): Promise<Result<Message, Issue>> {
    try {
      const result = await db.query('SELECT * FROM messages WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        return Err([Issues.notFound('Message', id)]);
      }

      return Ok(this.rowToMessage(result.rows[0]));
    } catch (error) {
      return Err([Issues.internal('Failed to get message')]);
    }
  }

  /**
   * List messages in a channel
   */
  async listByChannel(
    channelId: UUID,
    limit: number = 50,
    before?: Date
  ): Promise<Result<Message[], Issue>> {
    try {
      let query = `
        SELECT
          m.*,
          u.id as user_id,
          u.name as user_name,
          u.email as user_email
        FROM messages m
        LEFT JOIN users u ON m.user_id = u.id
        WHERE m.channel_id = $1 AND m.thread_id IS NULL
      `;
      const params: any[] = [channelId];

      if (before) {
        query += ` AND m.created_at < $2`;
        params.push(before);
      }

      query += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await db.query(query, params);

      const messages = result.rows.map((row) => this.rowToMessage(row));
      return Ok(messages.reverse()); // Return chronological order
    } catch (error) {
      return Err([Issues.internal('Failed to list messages')]);
    }
  }

  /**
   * List replies in a thread
   */
  async listThread(threadId: UUID): Promise<Result<Message[], Issue>> {
    try {
      const result = await db.query(
        `SELECT * FROM messages
         WHERE thread_id = $1
         ORDER BY created_at ASC`,
        [threadId]
      );

      const messages = result.rows.map((row) => this.rowToMessage(row));
      return Ok(messages);
    } catch (error) {
      return Err([Issues.internal('Failed to list thread')]);
    }
  }

  /**
   * Edit a message
   */
  async edit(
    id: UUID,
    userId: UUID,
    newContent: string
  ): Promise<Result<Message, Issue>> {
    try {
      // Check if user owns the message
      const message = await this.getById(id);
      if (!message.ok) {
        return message;
      }

      if (message.value.userId !== userId) {
        return Err([Issues.forbidden('Can only edit your own messages')]);
      }

      const result = await db.query(
        `UPDATE messages
         SET content = $1, edited_at = now()
         WHERE id = $2
         RETURNING *`,
        [newContent, id]
      );

      return Ok(this.rowToMessage(result.rows[0]));
    } catch (error) {
      return Err([Issues.internal('Failed to edit message')]);
    }
  }

  /**
   * Delete a message
   */
  async delete(id: UUID, userId: UUID): Promise<Result<void, Issue>> {
    try {
      // Check ownership
      const message = await this.getById(id);
      if (!message.ok) {
        return message;
      }

      if (message.value.userId !== userId) {
        return Err([Issues.forbidden('Can only delete your own messages')]);
      }

      await db.query('DELETE FROM messages WHERE id = $1', [id]);

      return Ok(undefined);
    } catch (error) {
      return Err([Issues.internal('Failed to delete message')]);
    }
  }

  /**
   * Convert database row to Message
   */
  private rowToMessage(row: any): Message {
    return {
      id: row.id,
      channelId: row.channel_id,
      userId: row.user_id,
      content: row.content,
      threadId: row.thread_id,
      editedAt: row.edited_at ? new Date(row.edited_at) : null,
      createdAt: new Date(row.created_at),
      user: row.user_name ? {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email,
      } : undefined,
    };
  }
}

export const messageService = new MessageService();
