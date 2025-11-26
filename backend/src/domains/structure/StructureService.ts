import { db } from '@infra/db/client';
import { aiService } from '@core/ai/AIService';
import type { StructureContext, StructureProposal } from '@core/ai/prompts/structure-generation';
import { Result, Ok, Err, Issues, Issue } from '@shared/types/Result';
import type { UUID } from '@shared/types/common';
import { logger } from '@shared/utils/logger';
// These services are available for future use in structure operations
import { channelService as _channelService } from '@domains/messaging/ChannelService';
import { workspaceService as _workspaceService } from '@domains/workspace/WorkspaceService';

/**
 * Structure Job statuses
 */
export type StructureStatus = 'created' | 'proposed' | 'validated' | 'applying' | 'applied' | 'failed';

/**
 * Structure Job entity
 */
export interface StructureJob {
  jobId: UUID;
  workspaceId: UUID;
  status: StructureStatus;
  createdBy: UUID;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Intake form data
 */
export interface IntakeFormData {
  communitySize: string;
  coreActivities: string[];
  moderationCapacity: string;
  channelBudget: number;
  additionalContext?: string;
}

/**
 * Proposal with version
 */
export interface ProposalRecord {
  jobId: UUID;
  version: number;
  score: number | null;
  rationale: string | null;
  proposal: StructureProposal;
  createdAt: Date;
}

/**
 * Structure Service
 * Implements User Story 1: AI-Generated Workspace Structure
 *
 * AF: Maps intake form → AI proposal → validated blueprint → applied structure
 * RI:
 *   - Job progresses through states linearly
 *   - Proposal versions are monotonically increasing
 *   - Applied structure matches approved proposal
 * Safety: Returns immutable copies of all entities
 */
export class StructureService {
  /**
   * Create a new structure job
   */
  async createJob(
    workspaceId: UUID,
    userId: UUID,
    intakeForm: IntakeFormData
  ): Promise<Result<StructureJob, Issue>> {
    try {
      const result = await db.transaction(async (client) => {
        // Create job
        const jobResult = await client.query(
          `INSERT INTO structure_jobs (workspace_id, status, created_by)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [workspaceId, 'created', userId]
        );

        const job = jobResult.rows[0];

        // Save intake form
        await client.query(
          `INSERT INTO intake_forms (job_id, community_size, core_activities, moderation_capacity, channel_budget, additional_context)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            job.job_id,
            intakeForm.communitySize,
            intakeForm.coreActivities,
            intakeForm.moderationCapacity,
            intakeForm.channelBudget,
            intakeForm.additionalContext || null,
          ]
        );

        return job;
      });

      logger.info('Structure job created', {
        jobId: result.job_id,
        workspaceId,
      });

      return Ok(this.rowToJob(result));
    } catch (error) {
      logger.error('Failed to create structure job', { error });
      return Err([Issues.internal('Failed to create job')]);
    }
  }

  /**
   * Generate proposal for a job
   */
  async generateProposal(jobId: UUID): Promise<Result<ProposalRecord, Issue>> {
    try {
      // Get intake form
      const intakeResult = await db.query(
        `SELECT if.*, sj.workspace_id, w.name as workspace_name
         FROM intake_forms if
         JOIN structure_jobs sj ON if.job_id = sj.job_id
         JOIN workspaces w ON sj.workspace_id = w.id
         WHERE if.job_id = $1`,
        [jobId]
      );

      if (intakeResult.rows.length === 0) {
        return Err([Issues.notFound('Job', jobId)]);
      }

      const intake = intakeResult.rows[0];

      // Build context for AI
      const context: StructureContext = {
        communitySize: intake.community_size,
        coreActivities: intake.core_activities,
        moderationCapacity: intake.moderation_capacity,
        channelBudget: intake.channel_budget,
        additionalContext: intake.additional_context,
        workspaceName: intake.workspace_name,
      };

      // Generate with AI
      logger.info('Generating structure proposal', { jobId, workspaceName: context.workspaceName });
      const aiResult = await aiService.generateStructure(context);

      if (!aiResult.ok) {
        await this.updateJobStatus(jobId, 'failed');
        return aiResult;
      }

      const proposal = aiResult.value;

      // Ensure "general" channel always exists (AI sometimes generates "general-discussion" instead)
      const hasGeneral = proposal.channels.some(
        (c) => c.name.toLowerCase() === 'general'
      );
      if (!hasGeneral) {
        // Find if there's a "general-*" channel and rename it, or add a new one
        const generalIndex = proposal.channels.findIndex(
          (c) => c.name.toLowerCase().startsWith('general')
        );
        if (generalIndex >= 0) {
          proposal.channels[generalIndex].name = 'general';
        } else {
          // Add general channel at the beginning
          proposal.channels.unshift({
            name: 'general',
            description: 'General discussion for the workspace',
            type: 'core',
            isPrivate: false,
          });
        }
      }

      // Calculate score (simple heuristic for now)
      const score = this.calculateScore(proposal, context);

      // Save proposal
      await db.transaction(async (client) => {
        // Get next version
        const versionResult = await client.query(
          'SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM proposals WHERE job_id = $1',
          [jobId]
        );
        const version = versionResult.rows[0].next_version;

        // Insert proposal
        await client.query(
          `INSERT INTO proposals (job_id, version, score, rationale, proposal)
           VALUES ($1, $2, $3, $4, $5)`,
          [jobId, version, score, proposal.rationale, JSON.stringify(proposal)]
        );

        // Update job status
        await client.query(
          'UPDATE structure_jobs SET status = $1, updated_at = now() WHERE job_id = $2',
          ['proposed', jobId]
        );
      });

      logger.info('Proposal generated', {
        jobId,
        channelCount: proposal.channels.length,
        score,
      });

      const proposalRecord: ProposalRecord = {
        jobId,
        version: 1,
        score,
        rationale: proposal.rationale,
        proposal,
        createdAt: new Date(),
      };

      return Ok(proposalRecord);
    } catch (error) {
      logger.error('Failed to generate proposal', { error, jobId });
      await this.updateJobStatus(jobId, 'failed');
      return Err([Issues.internal('Failed to generate proposal')]);
    }
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: UUID): Promise<Result<StructureJob, Issue>> {
    try {
      const result = await db.query(
        'SELECT * FROM structure_jobs WHERE job_id = $1',
        [jobId]
      );

      if (result.rows.length === 0) {
        return Err([Issues.notFound('Job', jobId)]);
      }

      return Ok(this.rowToJob(result.rows[0]));
    } catch (error) {
      return Err([Issues.internal('Failed to get job')]);
    }
  }

  /**
   * Get latest proposal for a job
   */
  async getLatestProposal(jobId: UUID): Promise<Result<ProposalRecord, Issue>> {
    try {
      const result = await db.query(
        `SELECT * FROM proposals
         WHERE job_id = $1
         ORDER BY version DESC
         LIMIT 1`,
        [jobId]
      );

      if (result.rows.length === 0) {
        return Err([Issues.notFound('Proposal for job', jobId)]);
      }

      const row = result.rows[0];
      return Ok({
        jobId: row.job_id,
        version: row.version,
        score: row.score,
        rationale: row.rationale,
        proposal: row.proposal,
        createdAt: new Date(row.created_at),
      });
    } catch (error) {
      return Err([Issues.internal('Failed to get proposal')]);
    }
  }

  /**
   * Apply approved proposal (create actual channels)
   */
  async applyProposal(jobId: UUID, workspaceId: UUID, userId: UUID): Promise<Result<{ created: number }, Issue>> {
    try {
      // Get latest proposal
      const proposalResult = await this.getLatestProposal(jobId);
      if (!proposalResult.ok) {
        return proposalResult;
      }

      const proposal = proposalResult.value.proposal;

      // Update status to applying
      await this.updateJobStatus(jobId, 'applying');

      let createdCount = 0;

      // Create channels
      await db.transaction(async (client) => {
        for (const channel of proposal.channels) {
          // Check if channel already exists
          const existing = await client.query(
            'SELECT id FROM channels WHERE workspace_id = $1 AND name = $2',
            [workspaceId, channel.name]
          );

          if (existing.rows.length === 0) {
            const channelResult = await client.query(
              `INSERT INTO channels (workspace_id, name, description, type, is_private, created_by)
               VALUES ($1, $2, $3, $4, $5, $6)
               RETURNING id`,
              [workspaceId, channel.name, channel.description, channel.type, channel.isPrivate, userId]
            );
            
            // Explicitly add the user as a member of this channel
            // This is a failsafe in case the trigger doesn't work or for private channels
            const channelId = channelResult.rows[0].id;
            await client.query(
              `INSERT INTO channel_members (channel_id, user_id)
               VALUES ($1, $2)
               ON CONFLICT (channel_id, user_id) DO NOTHING`,
              [channelId, userId]
            );
            
            createdCount++;
          }
        }

        // Create committees
        for (const committee of proposal.committees) {
          const existing = await client.query(
            'SELECT id FROM committees WHERE workspace_id = $1 AND name = $2',
            [workspaceId, committee.name]
          );

          if (existing.rows.length === 0) {
            await client.query(
              `INSERT INTO committees (workspace_id, name, description)
               VALUES ($1, $2, $3)`,
              [workspaceId, committee.name, committee.description]
            );
          }
        }

        // Save blueprint
        await client.query(
          `INSERT INTO blueprints (job_id, blueprint, applied_at)
           VALUES ($1, $2, now())
           ON CONFLICT (job_id) DO UPDATE SET blueprint = $2, applied_at = now()`,
          [jobId, JSON.stringify(proposal)]
        );

        // Update job status
        await client.query(
          'UPDATE structure_jobs SET status = $1, updated_at = now() WHERE job_id = $2',
          ['applied', jobId]
        );

        // Update workspace to mark blueprint as approved (within transaction)
        await client.query(
          'UPDATE workspaces SET blueprint_approved = true, updated_at = now() WHERE id = $1',
          [workspaceId]
        );
      });

      logger.info('Proposal applied', {
        jobId,
        channelsCreated: createdCount,
        committeesCreated: proposal.committees.length,
      });

      return Ok({ created: createdCount });
    } catch (error) {
      logger.error('Failed to apply proposal', { error, jobId });
      await this.updateJobStatus(jobId, 'failed');
      return Err([Issues.internal('Failed to apply proposal')]);
    }
  }

  /**
   * Update job status
   */
  private async updateJobStatus(jobId: UUID, status: StructureStatus): Promise<void> {
    try {
      await db.query(
        'UPDATE structure_jobs SET status = $1, updated_at = now() WHERE job_id = $2',
        [status, jobId]
      );
    } catch (error) {
      logger.error('Failed to update job status', { error, jobId, status });
    }
  }

  /**
   * Calculate quality score for proposal
   * Simple heuristic - can be improved
   */
  private calculateScore(proposal: StructureProposal, context: StructureContext): number {
    let score = 0.5; // Base score

    // Check if within budget
    if (proposal.channels.length <= context.channelBudget) {
      score += 0.2;
    }

    // Check if includes core channels
    const channelNames = proposal.channels.map((c) => c.name);
    if (channelNames.includes('general')) score += 0.1;
    if (channelNames.includes('announcements')) score += 0.1;

    // Bonus for having rationale
    if (proposal.rationale && proposal.rationale.length > 50) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Convert database row to StructureJob
   */
  private rowToJob(row: any): StructureJob {
    return {
      jobId: row.job_id,
      workspaceId: row.workspace_id,
      status: row.status,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export const structureService = new StructureService();
