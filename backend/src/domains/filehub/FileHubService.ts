import { db } from '@infra/db/client';
import { localEmbeddingProvider } from '@core/ai/providers/LocalEmbeddingProvider';
import { contentExtractor } from '@core/ai/providers/ContentExtractor';
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
  extractedContent: string | null;
  extractionMethod: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Search result fields
  similarity?: number;
  contentPreview?: string;
  matchReason?: string;
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
    sourceId: UUID | null,
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

      // Extract content from file if buffer provided
      let extractedContent: string | null = null;
      let extractionMethod: string | null = null;

      if (fileData.content) {
        logger.info('Extracting content from file', {
          name: fileData.name,
          mimeType: fileData.mimeType,
          size: fileData.content.length
        });

        const extractResult = await contentExtractor.extract(
          fileData.content,
          fileData.mimeType || null,
          fileData.name
        );

        if (extractResult.ok) {
          extractedContent = extractResult.value.text;
          extractionMethod = extractResult.value.method;
          logger.info('Content extracted successfully', {
            name: fileData.name,
            method: extractionMethod,
            contentLength: extractedContent.length,
            truncated: extractResult.value.truncated,
          });
        } else {
          logger.warn('Content extraction failed, continuing without content', {
            name: fileData.name,
          });
        }
      }

      const result = await db.query(
        `INSERT INTO files (
          workspace_id, source_id, external_id, name, mime_type,
          size_bytes, url, content_hash, uploaded_by, is_duplicate,
          extracted_content, extraction_method
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
          extractedContent,
          extractionMethod,
        ]
      );

      return Ok(this.rowToFile(result.rows[0]));
    } catch (error: any) {
      logger.error('Failed to add file', {
        message: error?.message,
        code: error?.code,
        detail: error?.detail,
        stack: error?.stack?.slice(0, 500),
      });
      return Err([Issues.internal('Failed to add file')]);
    }
  }

  /**
   * Tag file using local smart tagging
   */
  async tagFile(fileId: UUID): Promise<Result<FileRecord, Issue>> {
    try {
      // Get file
      const fileResult = await db.query('SELECT * FROM files WHERE file_id = $1', [fileId]);

      if (fileResult.rows.length === 0) {
        return Err([Issues.notFound('File', fileId)]);
      }

      const file = fileResult.rows[0];

      // Generate smart tags locally (no API needed)
      const tags = localEmbeddingProvider.generateTags(
        file.name,
        file.mime_type || undefined
      );

      // Update file with tags
      const updateResult = await db.query(
        `UPDATE files
         SET tags = $1, updated_at = now()
         WHERE file_id = $2
         RETURNING *`,
        [tags, fileId]
      );

      logger.info('File tagged with smart tags', {
        fileId,
        tags,
      });

      return Ok(this.rowToFile(updateResult.rows[0]));
    } catch (error) {
      logger.error('Failed to tag file', { error, fileId });
      return Err([Issues.internal('Failed to tag file')]);
    }
  }

  /**
   * Index file for search (generate embeddings using local model)
   * Now includes extracted content from PDFs, docs, and images
   */
  async indexFile(fileId: UUID): Promise<Result<void, Issue>> {
    try {
      // Get file
      const fileResult = await db.query('SELECT * FROM files WHERE file_id = $1', [fileId]);

      if (fileResult.rows.length === 0) {
        return Err([Issues.notFound('File', fileId)]);
      }

      const file = fileResult.rows[0];

      // Build text for embedding: name + tags + extracted content
      const parts: string[] = [file.name];

      if (file.tags && file.tags.length > 0) {
        parts.push(file.tags.join(' '));
      }

      // Include extracted content if available (truncate to 2000 chars for embedding)
      if (file.extracted_content) {
        parts.push(file.extracted_content.slice(0, 2000));
      }

      const text = parts.join(' ');

      logger.info('Generating embedding for file', {
        fileId,
        name: file.name,
        hasExtractedContent: !!file.extracted_content,
        extractionMethod: file.extraction_method,
        textLength: text.length,
      });

      // Generate embedding using local model
      const embeddingResult = await localEmbeddingProvider.generateEmbeddings([text]);

      if (!embeddingResult.ok) {
        logger.error('Failed to generate embedding', { fileId, issues: embeddingResult.issues });
        return Err([Issues.internal('Failed to generate embedding')]);
      }

      const embedding = embeddingResult.value.embeddings[0];

      // Store in index - using vector format for pgvector
      await db.query(
        `INSERT INTO file_index (file_id, embedding, facets)
         VALUES ($1, $2::vector, $3)
         ON CONFLICT (file_id) DO UPDATE
         SET embedding = $2::vector, facets = $3, indexed_at = now()`,
        [fileId, `[${embedding.join(',')}]`, JSON.stringify({
          tags: file.tags,
          extractionMethod: file.extraction_method,
          hasContent: !!file.extracted_content,
        })]
      );

      // Mark file as indexed
      await db.query(
        'UPDATE files SET indexed = true WHERE file_id = $1',
        [fileId]
      );

      logger.info('File indexed with local embeddings', {
        fileId,
        dimensions: embedding.length,
        model: embeddingResult.value.model,
        extractionMethod: file.extraction_method,
      });

      return Ok(undefined);
    } catch (error) {
      logger.error('Failed to index file', { error, fileId });
      return Err([Issues.internal('Failed to index file')]);
    }
  }

  /**
   * Search files with semantic search support
   */
  async search(
    workspaceId: UUID,
    query: SearchQuery
  ): Promise<Result<FileRecord[], Issue>> {
    try {
      // If semantic search is requested (query has text), use vector similarity
      if (query.query && query.query.trim().length > 0) {
        return this.semanticSearch(workspaceId, query);
      }

      // Otherwise, use regular filtering
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
   * Semantic search using embeddings
   */
  private async semanticSearch(
    workspaceId: UUID,
    query: SearchQuery
  ): Promise<Result<FileRecord[], Issue>> {
    try {
      // Generate embedding for query
      const embeddingResult = await localEmbeddingProvider.generateEmbeddings([query.query]);

      if (!embeddingResult.ok) {
        // Fall back to text search if embedding fails
        logger.warn('Embedding failed, falling back to text search');
        return this.textSearch(workspaceId, query);
      }

      const queryEmbedding = embeddingResult.value.embeddings[0];
      const params: any[] = [workspaceId, `[${queryEmbedding.join(',')}]`];
      let paramIndex = 3;

      // Build semantic search query with vector similarity
      // Clamp similarity to 0-1 range (cosine distance can be 0-2, so 1-distance can be -1 to 1)
      let sql = `
        SELECT f.*,
               GREATEST(0, LEAST(1, 1 - (fi.embedding <=> $2::vector))) as similarity
        FROM files f
        JOIN file_index fi ON f.file_id = fi.file_id
        WHERE f.workspace_id = $1
      `;

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

      sql += ` ORDER BY similarity DESC LIMIT $${paramIndex}`;
      params.push(query.limit || 50);

      const result = await db.query(sql, params);

      logger.info('Semantic search completed', {
        query: query.query,
        resultsCount: result.rows.length,
      });

      const files = result.rows.map((row) => this.rowToFile(row, true, query.query));
      return Ok(files);
    } catch (error) {
      logger.error('Semantic search failed, falling back to text search', { error });
      return this.textSearch(workspaceId, query);
    }
  }

  /**
   * Text-based search (fallback)
   */
  private async textSearch(
    workspaceId: UUID,
    query: SearchQuery
  ): Promise<Result<FileRecord[], Issue>> {
    try {
      let sql = `
        SELECT DISTINCT f.*
        FROM files f
        WHERE f.workspace_id = $1
        AND (f.name ILIKE $2 OR $2 = ANY(f.tags))
      `;
      const params: any[] = [workspaceId, `%${query.query}%`];
      let paramIndex = 3;

      // Add tag filters
      if (query.filters?.tags && query.filters.tags.length > 0) {
        sql += ` AND f.tags && $${paramIndex}`;
        params.push(query.filters.tags);
        paramIndex++;
      }

      sql += ` ORDER BY f.created_at DESC LIMIT $${paramIndex}`;
      params.push(query.limit || 50);

      const result = await db.query(sql, params);
      const files = result.rows.map((row) => this.rowToFile(row));
      return Ok(files);
    } catch (error) {
      logger.error('Text search failed', { error });
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
   * Tag and index all untagged files in a workspace
   */
  async tagAndIndexAllFiles(workspaceId: UUID): Promise<Result<{ tagged: number; indexed: number }, Issue>> {
    try {
      // Get all files that need tagging (empty tags array)
      const untaggedResult = await db.query(
        `SELECT file_id FROM files
         WHERE workspace_id = $1
         AND (tags IS NULL OR tags = '{}')`,
        [workspaceId]
      );

      let taggedCount = 0;
      let indexedCount = 0;

      logger.info('Starting bulk tagging', {
        workspaceId,
        filesToTag: untaggedResult.rows.length,
      });

      // Tag each file
      for (const row of untaggedResult.rows) {
        const tagResult = await this.tagFile(row.file_id);
        if (tagResult.ok) {
          taggedCount++;
        }
      }

      // Get all files that need indexing
      const unindexedResult = await db.query(
        `SELECT file_id FROM files
         WHERE workspace_id = $1
         AND indexed = false`,
        [workspaceId]
      );

      logger.info('Starting bulk indexing', {
        workspaceId,
        filesToIndex: unindexedResult.rows.length,
      });

      // Index each file
      for (const row of unindexedResult.rows) {
        const indexResult = await this.indexFile(row.file_id);
        if (indexResult.ok) {
          indexedCount++;
        }
      }

      logger.info('Bulk tagging and indexing complete', {
        workspaceId,
        tagged: taggedCount,
        indexed: indexedCount,
      });

      return Ok({ tagged: taggedCount, indexed: indexedCount });
    } catch (error) {
      logger.error('Bulk tagging failed', { error, workspaceId });
      return Err([Issues.internal('Failed to tag and index files')]);
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
   * @param row Database row
   * @param includeSearchFields Include similarity and content preview for search results
   * @param searchQuery The search query (used to generate match reason)
   */
  private rowToFile(row: any, includeSearchFields = false, searchQuery?: string): FileRecord {
    const record: FileRecord = {
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
      extractedContent: row.extracted_content,
      extractionMethod: row.extraction_method,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };

    // Add search-specific fields if this is a search result
    if (includeSearchFields) {
      if (row.similarity !== undefined) {
        record.similarity = parseFloat(row.similarity);
      }
      // Generate content preview from extracted content (first 150 chars)
      if (row.extracted_content) {
        record.contentPreview = row.extracted_content.slice(0, 150).trim() +
          (row.extracted_content.length > 150 ? '...' : '');
      }

      // Generate match reason explaining why this file matches the search
      if (searchQuery) {
        record.matchReason = this.generateMatchReason(row, searchQuery);
      }
    }

    return record;
  }

  /**
   * Generate a human-readable explanation for why a file matches the search query
   */
  private generateMatchReason(row: any, searchQuery: string): string {
    const query = searchQuery.toLowerCase();
    const reasons: string[] = [];

    // Check if filename matches
    const name = (row.name || '').toLowerCase();
    if (name.includes(query) || query.split(' ').some(word => name.includes(word))) {
      reasons.push('Filename matches');
    }

    // Check if any tags match
    const tags = row.tags || [];
    const matchingTags = tags.filter((tag: string) =>
      tag.toLowerCase().includes(query) || query.split(' ').some(word => tag.toLowerCase().includes(word))
    );
    if (matchingTags.length > 0) {
      reasons.push(`Tags: ${matchingTags.slice(0, 3).join(', ')}`);
    }

    // Check if content matches (semantic match via extracted content)
    if (row.extracted_content) {
      const content = row.extracted_content.toLowerCase();
      const queryWords = query.split(' ').filter(w => w.length > 2);
      const matchingWords = queryWords.filter(word => content.includes(word));
      if (matchingWords.length > 0) {
        reasons.push(`Content contains: "${matchingWords.slice(0, 3).join('", "')}"`);
      } else if (row.similarity && parseFloat(row.similarity) > 0.3) {
        reasons.push('Semantically similar content');
      }
    }

    // Default reason based on similarity
    if (reasons.length === 0) {
      const similarity = row.similarity ? parseFloat(row.similarity) : 0;
      if (similarity > 0.5) {
        reasons.push('Strong semantic match');
      } else if (similarity > 0.3) {
        reasons.push('Related content');
      } else {
        reasons.push('Partial match');
      }
    }

    return reasons.join(' • ');
  }
}

export const fileHubService = new FileHubService();
