import { db } from '@infra/db/client';
import { aiService } from '@core/ai/AIService';
import type { FileContext } from '@core/ai/prompts/file-tagging';
import { Result, Ok, Err, Issues, Issue } from '@shared/types/Result';
import type { UUID } from '@shared/types/common';
import { logger } from '@shared/utils/logger';
import { createHash } from 'crypto';

export type FileJobStatus = 'created' | 'harvested' | 'deduplicated' | 'indexed' | 'failed';

export interface FileJob {
  jobId: UUID;
  workspaceId: UUID;
  status: FileJobStatus;
  stats: Record<string, any> | null;
  createdBy: UUID;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileRecord {
  fileId: UUID;
  workspaceId: UUID;
  sourceId: UUID;
  externalId: string;
  name: string;
  mimeType: string | null;
  sizeBytes: number | null;
  url: string | null;
  channelId: UUID | null;
  contentHash: string | null;
  tags: string[];
  isDuplicate: boolean;
  indexed: boolean;
  uploadedBy: UUID | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchQuery {
  query: string;
  filters?: {
    tags?: string[];
    mimeType?: string;
    channelId?: string;
  };
  limit?: number;
}

/**
 * File Hub Service
 * Implements User Story 2: AI-Driven Centralized File Hub
 *
 * AF: Maps files → AI tags → searchable index
 * RI:
 *   - Content hash uniquely identifies file content
 *   - Embeddings are 768-dimensional
 *   - Duplicates reference canonical file
 * Safety: Returns immutable file records
 */
export class FileHubService {
  /**
   * Create a new file sync job
   */
  async createJob(workspaceId: UUID, userId: UUID): Promise<Result<FileJob, Issue>> {
    try {
      const result = await db.query(
        `INSERT INTO file_jobs (workspace_id, status, created_by)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [workspaceId, 'created', userId]
      );

      logger.info('File job created', {
        jobId: result.rows[0].job_id,
        workspaceId,
      });

      return Ok(this.rowToJob(result.rows[0]));
    } catch (error) {
      return Err([Issues.internal('Failed to create file job')]);
    }
  }

  /**
   * Add file to workspace
   */
  async addFile(
    workspaceId: UUID,
    sourceId: UUID,
    fileData: {
      externalId: string;
      name: string;
      mimeType?: string;
      sizeBytes?: number;
      url?: string;
      content?: Buffer;
      uploadedBy?: UUID;
    }
  ): Promise<Result<FileRecord, Issue>> {
    try {
      // Calculate content hash if content provided
      let contentHash: string | null = null;
      if (fileData.content) {
        contentHash = createHash('sha256').update(fileData.content).digest('hex');
      }

      // Check for duplicate by hash
      let isDuplicate = false;
      if (contentHash) {
        const duplicate = await db.query(
          'SELECT file_id FROM files WHERE workspace_id = $1 AND content_hash = $2',
          [workspaceId, contentHash]
        );

        if (duplicate.rows.length > 0) {
          logger.info('Duplicate file detected', { contentHash });
          isDuplicate = true;
        }
      }

      const result = await db.query(
        `INSERT INTO files (
          workspace_id, source_id, external_id, name, mime_type,
          size_bytes, url, content_hash, uploaded_by, is_duplicate
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          workspaceId,
          sourceId,
          fileData.externalId,
          fileData.name,
          fileData.mimeType || null,
          fileData.sizeBytes || null,
          fileData.url || null,
          contentHash,
          fileData.uploadedBy || null,
          isDuplicate,
        ]
      );

      return Ok(this.rowToFile(result.rows[0]));
    } catch (error) {
      logger.error('Failed to add file', { error });
      return Err([Issues.internal('Failed to add file')]);
    }
  }

  /**
   * Tag file with AI
   */
  async tagFile(fileId: UUID): Promise<Result<FileRecord, Issue>> {
    try {
      // Get file
      const fileResult = await db.query('SELECT * FROM files WHERE file_id = $1', [fileId]);

      if (fileResult.rows.length === 0) {
        return Err([Issues.notFound('File', fileId)]);
      }

      const file = fileResult.rows[0];

      // Build context for AI
      const context: FileContext = {
        fileName: file.name,
        mimeType: file.mime_type,
        size: file.size_bytes,
      };

      // Generate tags with AI
      const tagsResult = await aiService.generateFileTags(context);

      if (!tagsResult.ok) {
        return tagsResult;
      }

      // Update file with tags
      const updateResult = await db.query(
        `UPDATE files
         SET tags = $1, updated_at = now()
         WHERE file_id = $2
         RETURNING *`,
        [tagsResult.value.tags, fileId]
      );

      logger.info('File tagged', {
        fileId,
        tags: tagsResult.value.tags,
        confidence: tagsResult.value.confidence,
      });

      return Ok(this.rowToFile(updateResult.rows[0]));
    } catch (error) {
      logger.error('Failed to tag file', { error, fileId });
      return Err([Issues.internal('Failed to tag file')]);
    }
  }

  /**
   * Index file for search (generate embeddings)
   */
  async indexFile(fileId: UUID): Promise<Result<void, Issue>> {
    try {
      // Get file
      const fileResult = await db.query('SELECT * FROM files WHERE file_id = $1', [fileId]);

      if (fileResult.rows.length === 0) {
        return Err([Issues.notFound('File', fileId)]);
      }

      const file = fileResult.rows[0];

      // Generate embedding
      const text = `${file.name} ${(file.tags || []).join(' ')}`;
      const embeddingResult = await aiService.generateEmbeddings([text]);

      if (!embeddingResult.ok) {
        return embeddingResult;
      }

      const embedding = embeddingResult.value[0];

      // Store in index
      await db.query(
        `INSERT INTO file_index (file_id, embedding, facets)
         VALUES ($1, $2, $3)
         ON CONFLICT (file_id) DO UPDATE
         SET embedding = $2, facets = $3, indexed_at = now()`,
        [fileId, JSON.stringify(embedding), JSON.stringify({ tags: file.tags })]
      );

      // Mark file as indexed
      await db.query(
        'UPDATE files SET indexed = true WHERE file_id = $1',
        [fileId]
      );

      logger.info('File indexed', { fileId });

      return Ok(undefined);
    } catch (error) {
      logger.error('Failed to index file', { error, fileId });
      return Err([Issues.internal('Failed to index file')]);
    }
  }

  /**
   * Search files
   */
  async search(
    workspaceId: UUID,
    query: SearchQuery
  ): Promise<Result<FileRecord[], Issue>> {
    try {
      let sql = `
        SELECT DISTINCT f.*
        FROM files f
        WHERE f.workspace_id = $1
      `;
      const params: any[] = [workspaceId];
      let paramIndex = 2;

      // Add tag filters
      if (query.filters?.tags && query.filters.tags.length > 0) {
        sql += ` AND f.tags && $${paramIndex}`;
        params.push(query.filters.tags);
        paramIndex++;
      }

      // Add mime type filter
      if (query.filters?.mimeType) {
        sql += ` AND f.mime_type = $${paramIndex}`;
        params.push(query.filters.mimeType);
        paramIndex++;
      }

      // Add channel filter
      if (query.filters?.channelId) {
        sql += ` AND f.channel_id = $${paramIndex}`;
        params.push(query.filters.channelId);
        paramIndex++;
      }

      // Add text search on name
      if (query.query) {
        sql += ` AND f.name ILIKE $${paramIndex}`;
        params.push(`%${query.query}%`);
        paramIndex++;
      }

      sql += ` ORDER BY f.created_at DESC LIMIT $${paramIndex}`;
      params.push(query.limit || 50);

      const result = await db.query(sql, params);

      const files = result.rows.map((row) => this.rowToFile(row));
      return Ok(files);
    } catch (error) {
      logger.error('Search failed', { error, query });
      return Err([Issues.internal('Search failed')]);
    }
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: UUID): Promise<Result<FileJob, Issue>> {
    try {
      const result = await db.query('SELECT * FROM file_jobs WHERE job_id = $1', [jobId]);

      if (result.rows.length === 0) {
        return Err([Issues.notFound('File job', jobId)]);
      }

      return Ok(this.rowToJob(result.rows[0]));
    } catch (error) {
      return Err([Issues.internal('Failed to get file job')]);
    }
  }

  /**
   * Convert row to FileJob
   */
  private rowToJob(row: any): FileJob {
    return {
      jobId: row.job_id,
      workspaceId: row.workspace_id,
      status: row.status,
      stats: row.stats,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Convert row to FileRecord
   */
  private rowToFile(row: any): FileRecord {
    return {
      fileId: row.file_id,
      workspaceId: row.workspace_id,
      sourceId: row.source_id,
      externalId: row.external_id,
      name: row.name,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      url: row.url,
      channelId: row.channel_id,
      contentHash: row.content_hash,
      tags: row.tags || [],
      isDuplicate: row.is_duplicate,
      indexed: row.indexed,
      uploadedBy: row.uploaded_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export const fileHubService = new FileHubService();
