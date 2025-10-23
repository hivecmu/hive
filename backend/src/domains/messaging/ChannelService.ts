import { db } from '@infra/db/client';
import { Result, Ok, Err, Issues, Issue } from '@shared/types/Result';
import type { UUID } from '@shared/types/common';

export interface Channel {
  id: UUID;
  workspaceId: UUID;
  name: string;
  description: string | null;
  type: 'core' | 'workstream' | 'committee';
  committeeId: UUID | null;
  isPrivate: boolean;
  createdBy: UUID | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateChannelInput {
  workspaceId: UUID;
  name: string;
  description?: string;
  type?: Channel['type'];
  isPrivate?: boolean;
  createdBy: UUID;
}

/**
 * Channel Service
 * Manages channels within workspaces
 */
export class ChannelService {
  /**
   * Create a new channel
   */
  async create(input: CreateChannelInput): Promise<Result<Channel, Issue>> {
    try {
      // Check if channel name already exists in workspace
      const existing = await db.query(
        'SELECT id FROM channels WHERE workspace_id = $1 AND name = $2',
        [input.workspaceId, input.name]
      );

      if (existing.rows.length > 0) {
        return Err([Issues.conflict('Channel name already exists in this workspace')]);
      }

      const result = await db.query(
        `INSERT INTO channels (workspace_id, name, description, type, is_private, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          input.workspaceId,
          input.name,
          input.description || null,
          input.type || 'core',
          input.isPrivate || false,
          input.createdBy,
        ]
      );

      return Ok(this.rowToChannel(result.rows[0]));
    } catch (error) {
      return Err([Issues.internal('Failed to create channel')]);
    }
  }

  /**
   * Get channel by ID
   */
  async getById(id: UUID): Promise<Result<Channel, Issue>> {
    try {
      const result = await db.query('SELECT * FROM channels WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        return Err([Issues.notFound('Channel', id)]);
      }

      return Ok(this.rowToChannel(result.rows[0]));
    } catch (error) {
      return Err([Issues.internal('Failed to get channel')]);
    }
  }

  /**
   * List channels in a workspace
   */
  async listByWorkspace(workspaceId: UUID): Promise<Result<Channel[], Issue>> {
    try {
      const result = await db.query(
        `SELECT * FROM channels
         WHERE workspace_id = $1
         ORDER BY created_at ASC`,
        [workspaceId]
      );

      const channels = result.rows.map((row) => this.rowToChannel(row));
      return Ok(channels);
    } catch (error) {
      return Err([Issues.internal('Failed to list channels')]);
    }
  }

  /**
   * Update channel
   */
  async update(
    id: UUID,
    updates: { name?: string; description?: string }
  ): Promise<Result<Channel, Issue>> {
    try {
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        setClauses.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }
      if (updates.description !== undefined) {
        setClauses.push(`description = $${paramIndex++}`);
        values.push(updates.description);
      }

      if (setClauses.length === 0) {
        return this.getById(id);
      }

      setClauses.push(`updated_at = now()`);
      values.push(id);

      const result = await db.query(
        `UPDATE channels
         SET ${setClauses.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return Err([Issues.notFound('Channel', id)]);
      }

      return Ok(this.rowToChannel(result.rows[0]));
    } catch (error) {
      return Err([Issues.internal('Failed to update channel')]);
    }
  }

  /**
   * Delete channel
   */
  async delete(id: UUID): Promise<Result<void, Issue>> {
    try {
      const result = await db.query('DELETE FROM channels WHERE id = $1', [id]);

      if (result.rowCount === 0) {
        return Err([Issues.notFound('Channel', id)]);
      }

      return Ok(undefined);
    } catch (error) {
      return Err([Issues.internal('Failed to delete channel')]);
    }
  }

  /**
   * Convert database row to Channel
   */
  private rowToChannel(row: any): Channel {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      name: row.name,
      description: row.description,
      type: row.type,
      committeeId: row.committee_id,
      isPrivate: row.is_private,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export const channelService = new ChannelService();
