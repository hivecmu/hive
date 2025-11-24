import { db } from '@infra/db/client';
import { Result, Ok, Err, Issues, Issue } from '@shared/types/Result';
import type { UUID } from '@shared/types/common';
import { channelService } from '@domains/messaging/ChannelService';

/**
 * Workspace entity
 */
export interface Workspace {
  id: UUID;
  name: string;
  slug: string;
  emoji: string;
  color: string;
  type: 'club' | 'company' | 'community' | 'educational' | 'personal';
  description: string | null;
  industry: string | null;
  memberCount: number;
  timezone: string;
  ownerId: UUID;
  settings: Record<string, any>;
  blueprintApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkspaceInput {
  name: string;
  slug: string;
  emoji?: string;
  color?: string;
  type?: Workspace['type'];
  description?: string;
  industry?: string;
  timezone?: string;
  ownerId: UUID;
}

export interface UpdateWorkspaceInput {
  name?: string;
  emoji?: string;
  color?: string;
  description?: string;
  industry?: string;
  timezone?: string;
  blueprintApproved?: boolean;
}

/**
 * Workspace Service
 * Manages workspaces (organizations) and membership
 *
 * AF: Maps database workspace rows to Workspace entities with members
 * RI:
 *   - slug is unique and URL-safe
 *   - owner is always a member with admin role
 *   - memberCount >= 1
 * Safety: Returns immutable workspace objects
 */
export class WorkspaceService {
  /**
   * Create a new workspace
   */
  async create(input: CreateWorkspaceInput): Promise<Result<Workspace, Issue>> {
    try {
      // Check if slug already exists
      const existing = await db.query(
        'SELECT id FROM workspaces WHERE slug = $1',
        [input.slug]
      );

      if (existing.rows.length > 0) {
        return Err([Issues.conflict('Workspace slug already exists')]);
      }

      // Create workspace and add owner as admin in a transaction
      const result = await db.transaction(async (client) => {
        // Insert workspace
        const workspaceResult = await client.query(
          `INSERT INTO workspaces (
            name, slug, emoji, color, type, description, industry, timezone, owner_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *`,
          [
            input.name,
            input.slug,
            input.emoji || '🏢',
            input.color || '#F5DAA7',
            input.type || 'company',
            input.description || null,
            input.industry || null,
            input.timezone || 'UTC',
            input.ownerId,
          ]
        );

        const workspace = workspaceResult.rows[0];

        // Add owner as admin member
        await client.query(
          `INSERT INTO workspace_members (workspace_id, user_id, role)
           VALUES ($1, $2, $3)`,
          [workspace.id, input.ownerId, 'admin']
        );

        // Create default "general" channel
        // Note: The database trigger will automatically add all workspace members to this channel
        await client.query(
          `INSERT INTO channels (workspace_id, name, description, type, is_private, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            workspace.id,
            'general',
            'General discussion for the workspace',
            'core',
            false,
            input.ownerId
          ]
        );

        return workspace;
      });

      return Ok(this.rowToWorkspace(result));
    } catch (error) {
      return Err([Issues.internal('Failed to create workspace')]);
    }
  }

  /**
   * Get workspace by ID
   */
  async getById(id: UUID): Promise<Result<Workspace, Issue>> {
    try {
      const result = await db.query('SELECT * FROM workspaces WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        return Err([Issues.notFound('Workspace', id)]);
      }

      return Ok(this.rowToWorkspace(result.rows[0]));
    } catch (error) {
      return Err([Issues.internal('Failed to get workspace')]);
    }
  }

  /**
   * Get workspace by slug
   */
  async getBySlug(slug: string): Promise<Result<Workspace, Issue>> {
    try {
      const result = await db.query('SELECT * FROM workspaces WHERE slug = $1', [slug]);

      if (result.rows.length === 0) {
        return Err([Issues.notFound('Workspace')]);
      }

      return Ok(this.rowToWorkspace(result.rows[0]));
    } catch (error) {
      return Err([Issues.internal('Failed to get workspace')]);
    }
  }

  /**
   * List workspaces for a user
   */
  async listForUser(userId: UUID): Promise<Result<Workspace[], Issue>> {
    try {
      const result = await db.query(
        `SELECT w.*
         FROM workspaces w
         INNER JOIN workspace_members wm ON w.id = wm.workspace_id
         WHERE wm.user_id = $1
         ORDER BY w.created_at DESC`,
        [userId]
      );

      const workspaces = result.rows.map((row) => this.rowToWorkspace(row));
      return Ok(workspaces);
    } catch (error) {
      return Err([Issues.internal('Failed to list workspaces')]);
    }
  }

  /**
   * Update workspace
   */
  async update(
    id: UUID,
    updates: UpdateWorkspaceInput
  ): Promise<Result<Workspace, Issue>> {
    try {
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        setClauses.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }
      if (updates.emoji !== undefined) {
        setClauses.push(`emoji = $${paramIndex++}`);
        values.push(updates.emoji);
      }
      if (updates.color !== undefined) {
        setClauses.push(`color = $${paramIndex++}`);
        values.push(updates.color);
      }
      if (updates.description !== undefined) {
        setClauses.push(`description = $${paramIndex++}`);
        values.push(updates.description);
      }
      if (updates.industry !== undefined) {
        setClauses.push(`industry = $${paramIndex++}`);
        values.push(updates.industry);
      }
      if (updates.timezone !== undefined) {
        setClauses.push(`timezone = $${paramIndex++}`);
        values.push(updates.timezone);
      }
      if (updates.blueprintApproved !== undefined) {
        setClauses.push(`blueprint_approved = $${paramIndex++}`);
        values.push(updates.blueprintApproved);
      }

      if (setClauses.length === 0) {
        // No updates, just return current workspace
        return this.getById(id);
      }

      setClauses.push(`updated_at = now()`);
      values.push(id);

      const result = await db.query(
        `UPDATE workspaces
         SET ${setClauses.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return Err([Issues.notFound('Workspace', id)]);
      }

      return Ok(this.rowToWorkspace(result.rows[0]));
    } catch (error) {
      return Err([Issues.internal('Failed to update workspace')]);
    }
  }

  /**
   * Delete workspace
   */
  async delete(id: UUID): Promise<Result<void, Issue>> {
    try {
      const result = await db.query('DELETE FROM workspaces WHERE id = $1', [id]);

      if (result.rowCount === 0) {
        return Err([Issues.notFound('Workspace', id)]);
      }

      return Ok(undefined);
    } catch (error) {
      return Err([Issues.internal('Failed to delete workspace')]);
    }
  }

  /**
   * Check if user is a member of workspace
   */
  async isMember(workspaceId: UUID, userId: UUID): Promise<boolean> {
    try {
      const result = await db.query(
        `SELECT 1 FROM workspace_members
         WHERE workspace_id = $1 AND user_id = $2`,
        [workspaceId, userId]
      );

      return result.rows.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user's role in workspace
   */
  async getUserRole(
    workspaceId: UUID,
    userId: UUID
  ): Promise<'admin' | 'project_manager' | 'member' | 'viewer' | null> {
    try {
      const result = await db.query(
        `SELECT role FROM workspace_members
         WHERE workspace_id = $1 AND user_id = $2`,
        [workspaceId, userId]
      );

      return result.rows.length > 0 ? result.rows[0].role : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Convert database row to Workspace entity
   */
  private rowToWorkspace(row: any): Workspace {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      emoji: row.emoji,
      color: row.color,
      type: row.type,
      description: row.description,
      industry: row.industry,
      memberCount: row.member_count,
      timezone: row.timezone,
      ownerId: row.owner_id,
      settings: row.settings || {},
      blueprintApproved: row.blueprint_approved || false,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export const workspaceService = new WorkspaceService();
