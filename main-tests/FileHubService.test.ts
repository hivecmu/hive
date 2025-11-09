import { FileHubService } from '@domains/filehub/FileHubService';
import { db } from '@infra/db/client';
import { aiService } from '@core/ai/AIService';
import { Ok, Err, Issues } from '@shared/types/Result';
import { logger } from '@shared/utils/logger';
import { createHash } from 'crypto';

/**
 * Unit tests for FileHubService
 * Tests all service methods with mocked dependencies
 */

// Mock dependencies
jest.mock('@infra/db/client');
jest.mock('@core/ai/AIService');
jest.mock('@shared/utils/logger');

describe('FileHubService', () => {
  let service: FileHubService;
  const mockDb = db as jest.Mocked<typeof db>;
  const mockAiService = aiService as jest.Mocked<typeof aiService>;

  // Test data
  const workspaceId = '550e8400-e29b-41d4-a716-446655440000';
  const userId = '550e8400-e29b-41d4-a716-446655440001';
  const fileId = '550e8400-e29b-41d4-a716-446655440002';
  const jobId = '550e8400-e29b-41d4-a716-446655440003';
  const sourceId = '550e8400-e29b-41d4-a716-446655440004';
  const channelId = '550e8400-e29b-41d4-a716-446655440005';

  beforeAll(() => {
    // Use fake timers with a fixed date
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    service = new FileHubService();
    jest.clearAllMocks();
  });

  describe('createJob', () => {
    it('should create file job with status="created"', async () => {
      const mockRow = {
        job_id: jobId,
        workspace_id: workspaceId,
        status: 'created',
        stats: null,
        created_by: userId,
        created_at: new Date('2025-01-01T00:00:00Z'),
        updated_at: new Date('2025-01-01T00:00:00Z'),
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockRow],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await service.createJob(workspaceId, userId);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.jobId).toBe(jobId);
        expect(result.value.workspaceId).toBe(workspaceId);
        expect(result.value.status).toBe('created');
        expect(result.value.createdBy).toBe(userId);
        expect(result.value.stats).toBeNull();
        expect(result.value.createdAt).toEqual(new Date('2025-01-01T00:00:00Z'));
        expect(result.value.updatedAt).toEqual(new Date('2025-01-01T00:00:00Z'));
      }

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO file_jobs'),
        [workspaceId, 'created', userId]
      );
    });

    it('should return error on DB failure', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const result = await service.createJob(workspaceId, userId);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues).toHaveLength(1);
        expect(result.issues[0].message).toBe('Failed to create file job');
        expect(result.issues[0].code).toBe('INTERNAL_ERROR');
      }
    });
  });

  describe('addFile', () => {
    it('should insert file with content hash when content provided', async () => {
      const content = Buffer.from('abc');
      const expectedHash = createHash('sha256').update(content).digest('hex');

      // Mock duplicate check - no duplicates
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      // Mock file insert
      const mockRow = {
        file_id: fileId,
        workspace_id: workspaceId,
        source_id: sourceId,
        external_id: 'ext-123',
        name: 'test.txt',
        mime_type: 'text/plain',
        size_bytes: 3,
        url: 'https://example.com/test.txt',
        channel_id: null,
        content_hash: expectedHash,
        tags: null,
        is_duplicate: false,
        indexed: false,
        uploaded_by: userId,
        created_at: new Date('2025-01-01T00:00:00Z'),
        updated_at: new Date('2025-01-01T00:00:00Z'),
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockRow],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await service.addFile(workspaceId, sourceId, {
        externalId: 'ext-123',
        name: 'test.txt',
        mimeType: 'text/plain',
        sizeBytes: 3,
        url: 'https://example.com/test.txt',
        content,
        uploadedBy: userId,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.contentHash).toBe(expectedHash);
        expect(result.value.name).toBe('test.txt');
        expect(result.value.mimeType).toBe('text/plain');
      }

      // Verify duplicate check was performed
      expect(mockDb.query).toHaveBeenNthCalledWith(
        1,
        'SELECT file_id FROM files WHERE workspace_id = $1 AND content_hash = $2',
        [workspaceId, expectedHash]
      );
    });

    it('should detect duplicate hash and log it as non-blocking', async () => {
      const content = Buffer.from('abc');
      const expectedHash = createHash('sha256').update(content).digest('hex');

      // Mock duplicate check - duplicate exists
      mockDb.query.mockResolvedValueOnce({
        rows: [{ file_id: 'existing-file-id' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Mock file insert - still inserts
      const mockRow = {
        file_id: fileId,
        workspace_id: workspaceId,
        source_id: sourceId,
        external_id: 'ext-124',
        name: 'duplicate.txt',
        mime_type: 'text/plain',
        size_bytes: 3,
        url: null,
        channel_id: null,
        content_hash: expectedHash,
        tags: null,
        is_duplicate: false,
        indexed: false,
        uploaded_by: null,
        created_at: new Date('2025-01-01T00:00:00Z'),
        updated_at: new Date('2025-01-01T00:00:00Z'),
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockRow],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await service.addFile(workspaceId, sourceId, {
        externalId: 'ext-124',
        name: 'duplicate.txt',
        content,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.fileId).toBe(fileId);
        expect(result.value.contentHash).toBe(expectedHash);
      }

      // Verify duplicate was logged
      expect(logger.info).toHaveBeenCalledWith(
        'Duplicate file detected',
        { contentHash: expectedHash }
      );
    });

    it('should insert file without content hash when no content provided', async () => {
      const mockRow = {
        file_id: fileId,
        workspace_id: workspaceId,
        source_id: sourceId,
        external_id: 'ext-125',
        name: 'no-content.txt',
        mime_type: null,
        size_bytes: null,
        url: null,
        channel_id: null,
        content_hash: null,
        tags: null,
        is_duplicate: false,
        indexed: false,
        uploaded_by: null,
        created_at: new Date('2025-01-01T00:00:00Z'),
        updated_at: new Date('2025-01-01T00:00:00Z'),
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockRow],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await service.addFile(workspaceId, sourceId, {
        externalId: 'ext-125',
        name: 'no-content.txt',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.contentHash).toBeNull();
        expect(result.value.name).toBe('no-content.txt');
      }

      // Should not perform duplicate check
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should return error on DB failure', async () => {
      const content = Buffer.from('test');

      mockDb.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await service.addFile(workspaceId, sourceId, {
        externalId: 'ext-126',
        name: 'error.txt',
        content,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues).toHaveLength(1);
        expect(result.issues[0].message).toBe('Failed to add file');
        expect(result.issues[0].code).toBe('INTERNAL_ERROR');
      }

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to add file',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });
  });

  describe('tagFile', () => {
    it('should persist AI tags when file exists and AI returns Ok', async () => {
      // Mock file lookup
      const mockFileRow = {
        file_id: fileId,
        workspace_id: workspaceId,
        source_id: sourceId,
        external_id: 'ext-200',
        name: 'document.pdf',
        mime_type: 'application/pdf',
        size_bytes: 50000,
        url: null,
        channel_id: null,
        content_hash: 'hash123',
        tags: null,
        is_duplicate: false,
        indexed: false,
        uploaded_by: userId,
        created_at: new Date('2025-01-01T00:00:00Z'),
        updated_at: new Date('2025-01-01T00:00:00Z'),
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockFileRow],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Mock AI service
      const mockTags = ['workstreams/app-redesign'];
      mockAiService.generateFileTags.mockResolvedValueOnce(
        Ok({
          tags: mockTags,
          category: 'workstreams',
          confidence: 0.9,
          summary: 'App redesign document',
        })
      );

      // Mock update query
      const mockUpdatedRow = {
        ...mockFileRow,
        tags: mockTags,
        updated_at: new Date('2025-01-01T00:00:00Z'),
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockUpdatedRow],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await service.tagFile(fileId);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.tags).toEqual(mockTags);
        expect(result.value.fileId).toBe(fileId);
      }

      expect(mockAiService.generateFileTags).toHaveBeenCalledWith({
        fileName: 'document.pdf',
        mimeType: 'application/pdf',
        size: 50000,
      });

      expect(logger.info).toHaveBeenCalledWith(
        'File tagged',
        expect.objectContaining({
          fileId,
          tags: mockTags,
          confidence: 0.9,
        })
      );
    });

    it('should return notFound error when file does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const invalidFileId = 'invalid-file-id';
      const result = await service.tagFile(invalidFileId);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues).toHaveLength(1);
        expect(result.issues[0].code).toBe('NOT_FOUND');
        expect(result.issues[0].message).toContain('File');
        expect(result.issues[0].message).toContain(invalidFileId);
      }
    });

    it('should passthrough AI error when AI service fails', async () => {
      // Mock file lookup
      const mockFileRow = {
        file_id: fileId,
        name: 'document.pdf',
        mime_type: 'application/pdf',
        size_bytes: 50000,
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockFileRow],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Mock AI service error
      const aiError = Issues.internal('AI service unavailable');
      mockAiService.generateFileTags.mockResolvedValueOnce(Err([aiError]));

      const result = await service.tagFile(fileId);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues).toHaveLength(1);
        expect(result.issues[0].message).toBe('AI service unavailable');
      }

      // Should not attempt update
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('indexFile', () => {
    it('should upsert vector and mark file as indexed', async () => {
      // Mock file lookup
      const mockFileRow = {
        file_id: fileId,
        workspace_id: workspaceId,
        name: 'indexed-doc.pdf',
        tags: ['workstreams/app-redesign', 'documents'],
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockFileRow],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Mock AI embeddings
      const mockEmbedding = Array(768).fill(0.1);
      mockAiService.generateEmbeddings.mockResolvedValueOnce(Ok([mockEmbedding]));

      // Mock index upsert
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Mock file update
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await service.indexFile(fileId);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeUndefined();
      }

      // Verify embedding generation
      expect(mockAiService.generateEmbeddings).toHaveBeenCalledWith([
        'indexed-doc.pdf workstreams/app-redesign documents',
      ]);

      // Verify index upsert
      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO file_index'),
        [
          fileId,
          JSON.stringify(mockEmbedding),
          JSON.stringify({ tags: mockFileRow.tags }),
        ]
      );

      // Verify file marked as indexed
      expect(mockDb.query).toHaveBeenNthCalledWith(
        3,
        'UPDATE files SET indexed = true WHERE file_id = $1',
        [fileId]
      );

      expect(logger.info).toHaveBeenCalledWith('File indexed', { fileId });
    });

    it('should return notFound error when file does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const invalidFileId = 'invalid-file-id';
      const result = await service.indexFile(invalidFileId);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues).toHaveLength(1);
        expect(result.issues[0].code).toBe('NOT_FOUND');
        expect(result.issues[0].message).toContain('File');
        expect(result.issues[0].message).toContain(invalidFileId);
      }
    });

    it('should passthrough AI error when embeddings fail', async () => {
      // Mock file lookup
      const mockFileRow = {
        file_id: fileId,
        name: 'doc.pdf',
        tags: [],
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockFileRow],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Mock AI embeddings error
      const aiError = Issues.internal('Embeddings service down');
      mockAiService.generateEmbeddings.mockResolvedValueOnce(Err([aiError]));

      const result = await service.indexFile(fileId);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues).toHaveLength(1);
        expect(result.issues[0].message).toBe('Embeddings service down');
      }

      // Should not attempt index insert or file update
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('search', () => {
    it('should apply filters and limit correctly', async () => {
      const mockRows = [
        {
          file_id: fileId,
          workspace_id: workspaceId,
          source_id: sourceId,
          external_id: 'ext-300',
          name: 'search-result-1.pdf',
          mime_type: 'application/pdf',
          size_bytes: 1000,
          url: null,
          channel_id: channelId,
          content_hash: 'hash1',
          tags: ['workstreams/app-redesign'],
          is_duplicate: false,
          indexed: true,
          uploaded_by: userId,
          created_at: new Date('2025-01-01T00:00:00Z'),
          updated_at: new Date('2025-01-01T00:00:00Z'),
        },
        {
          file_id: '550e8400-e29b-41d4-a716-446655440006',
          workspace_id: workspaceId,
          source_id: sourceId,
          external_id: 'ext-301',
          name: 'search-result-2.pdf',
          mime_type: 'application/pdf',
          size_bytes: 2000,
          url: null,
          channel_id: channelId,
          content_hash: 'hash2',
          tags: ['workstreams/app-redesign'],
          is_duplicate: false,
          indexed: true,
          uploaded_by: userId,
          created_at: new Date('2025-01-01T00:00:00Z'),
          updated_at: new Date('2025-01-01T00:00:00Z'),
        },
      ];

      mockDb.query.mockResolvedValueOnce({
        rows: mockRows,
        command: 'SELECT',
        rowCount: 2,
        oid: 0,
        fields: [],
      });

      const result = await service.search(workspaceId, {
        query: 'search',
        filters: {
          tags: ['workstreams/app-redesign'],
          mimeType: 'application/pdf',
          channelId,
        },
        limit: 10,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].name).toBe('search-result-1.pdf');
        expect(result.value[1].name).toBe('search-result-2.pdf');
      }

      // Verify query parameters
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE f.workspace_id = $1'),
        expect.arrayContaining([
          workspaceId,
          ['workstreams/app-redesign'],
          'application/pdf',
          channelId,
          '%search%',
          10,
        ])
      );
    });

    it('should return empty array when no matches found', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const result = await service.search(workspaceId, {
        query: 'nonexistent',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });

    it('should return error on DB failure', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Database query failed'));

      const result = await service.search(workspaceId, {
        query: 'test',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues).toHaveLength(1);
        expect(result.issues[0].message).toBe('Search failed');
        expect(result.issues[0].code).toBe('INTERNAL_ERROR');
      }

      expect(logger.error).toHaveBeenCalledWith(
        'Search failed',
        expect.objectContaining({
          error: expect.any(Error),
          query: expect.objectContaining({ query: 'test' }),
        })
      );
    });

    it('should use default limit of 50 when not specified', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      await service.search(workspaceId, { query: 'test' });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([50])
      );
    });
  });

  describe('getJob', () => {
    it('should return job when it exists', async () => {
      const mockRow = {
        job_id: jobId,
        workspace_id: workspaceId,
        status: 'harvested',
        stats: { filesProcessed: 10 },
        created_by: userId,
        created_at: new Date('2025-01-01T00:00:00Z'),
        updated_at: new Date('2025-01-01T00:00:00Z'),
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockRow],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await service.getJob(jobId);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.jobId).toBe(jobId);
        expect(result.value.status).toBe('harvested');
        expect(result.value.stats).toEqual({ filesProcessed: 10 });
      }

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM file_jobs WHERE job_id = $1',
        [jobId]
      );
    });

    it('should return notFound error when job does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const missingJobId = 'missing-job-id';
      const result = await service.getJob(missingJobId);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues).toHaveLength(1);
        expect(result.issues[0].code).toBe('NOT_FOUND');
        expect(result.issues[0].message).toContain('File job');
        expect(result.issues[0].message).toContain(missingJobId);
      }
    });
  });

  describe('rowToJob', () => {
    it('should map DB row to FileJob with snake_case converted to camelCase', () => {
      const mockRow = {
        job_id: jobId,
        workspace_id: workspaceId,
        status: 'indexed',
        stats: { totalFiles: 100, indexed: 95 },
        created_by: userId,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T01:00:00Z',
      };

      // Access private method via any cast
      const result = (service as any).rowToJob(mockRow);

      expect(result.jobId).toBe(jobId);
      expect(result.workspaceId).toBe(workspaceId);
      expect(result.status).toBe('indexed');
      expect(result.stats).toEqual({ totalFiles: 100, indexed: 95 });
      expect(result.createdBy).toBe(userId);
      expect(result.createdAt).toEqual(new Date('2025-01-01T00:00:00Z'));
      expect(result.updatedAt).toEqual(new Date('2025-01-01T01:00:00Z'));
    });

    it('should handle null stats', () => {
      const mockRow = {
        job_id: jobId,
        workspace_id: workspaceId,
        status: 'created',
        stats: null,
        created_by: userId,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      const result = (service as any).rowToJob(mockRow);

      expect(result.stats).toBeNull();
    });
  });

  describe('rowToFile', () => {
    it('should map DB row to FileRecord with default empty tags array', () => {
      const mockRow = {
        file_id: fileId,
        workspace_id: workspaceId,
        source_id: sourceId,
        external_id: 'ext-400',
        name: 'test-file.pdf',
        mime_type: 'application/pdf',
        size_bytes: 5000,
        url: 'https://example.com/file.pdf',
        channel_id: channelId,
        content_hash: 'abcd1234',
        tags: null,
        is_duplicate: false,
        indexed: true,
        uploaded_by: userId,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T02:00:00Z',
      };

      const result = (service as any).rowToFile(mockRow);

      expect(result.fileId).toBe(fileId);
      expect(result.workspaceId).toBe(workspaceId);
      expect(result.sourceId).toBe(sourceId);
      expect(result.externalId).toBe('ext-400');
      expect(result.name).toBe('test-file.pdf');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.sizeBytes).toBe(5000);
      expect(result.url).toBe('https://example.com/file.pdf');
      expect(result.channelId).toBe(channelId);
      expect(result.contentHash).toBe('abcd1234');
      expect(result.tags).toEqual([]); // null becomes []
      expect(result.isDuplicate).toBe(false);
      expect(result.indexed).toBe(true);
      expect(result.uploadedBy).toBe(userId);
      expect(result.createdAt).toEqual(new Date('2025-01-01T00:00:00Z'));
      expect(result.updatedAt).toEqual(new Date('2025-01-01T02:00:00Z'));
    });

    it('should preserve tags array when present', () => {
      const mockRow = {
        file_id: fileId,
        workspace_id: workspaceId,
        source_id: sourceId,
        external_id: 'ext-401',
        name: 'tagged-file.pdf',
        mime_type: 'application/pdf',
        size_bytes: 1000,
        url: null,
        channel_id: null,
        content_hash: null,
        tags: ['workstreams/design', 'documents/specs'],
        is_duplicate: false,
        indexed: false,
        uploaded_by: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      const result = (service as any).rowToFile(mockRow);

      expect(result.tags).toEqual(['workstreams/design', 'documents/specs']);
    });
  });
});
