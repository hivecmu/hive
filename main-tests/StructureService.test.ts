import { StructureService } from '@domains/structure/StructureService';
import type { IntakeFormData, StructureJob } from '@domains/structure/StructureService';
import type { StructureProposal, StructureContext } from '@core/ai/prompts/structure-generation';
import { Ok, Err, Issues } from '@shared/types/Result';
import type { UUID } from '@shared/types/common';
import type { PoolClient } from 'pg';

/**
 * Unit tests for StructureService
 * Tests all public methods and verifies behavior through mocking
 */

// Mock dependencies
jest.mock('@infra/db/client');
jest.mock('@core/ai/AIService');
jest.mock('@shared/utils/logger');

import { db } from '@infra/db/client';
import { aiService } from '@core/ai/AIService';

describe('StructureService', () => {
  let service: StructureService;
  let mockDb: jest.Mocked<typeof db>;
  let mockAiService: jest.Mocked<typeof aiService>;

  // Test fixtures
  const FIXED_DATE = new Date('2025-01-01T00:00:00Z');
  const TEST_WORKSPACE_ID = 'ws-123' as UUID;
  const TEST_USER_ID = 'user-456' as UUID;
  const TEST_JOB_ID = 'job-789' as UUID;

  const validIntake: IntakeFormData = {
    communitySize: 'small',
    coreActivities: ['engineering', 'design'],
    moderationCapacity: 'light',
    channelBudget: 10,
    additionalContext: 'A collaborative tech workspace',
  };

  const mockProposal: StructureProposal = {
    channels: [
      {
        name: 'general',
        description: 'General discussion',
        type: 'core',
        isPrivate: false,
      },
      {
        name: 'announcements',
        description: 'Important announcements',
        type: 'core',
        isPrivate: false,
      },
      {
        name: 'random',
        description: 'Random conversations',
        type: 'core',
        isPrivate: false,
      },
    ],
    committees: [
      {
        name: 'Tech Committee',
        description: 'Technical governance',
        purpose: 'Oversee technical decisions',
      },
    ],
    rationale: 'This is a deterministic test rationale with sufficient length to meet scoring criteria',
    estimatedComplexity: 'simple',
  };

  beforeAll(() => {
    // Use Jest fake timers
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_DATE);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    // Reset service
    service = new StructureService();

    // Get typed mocks
    mockDb = db as jest.Mocked<typeof db>;
    mockAiService = aiService as jest.Mocked<typeof aiService>;

    // Clear all mocks
    jest.clearAllMocks();

    // Setup default mock implementations
    setupDefaultMocks();
  });

  function setupDefaultMocks() {
    // Mock database query to return success by default
    mockDb.query = jest.fn().mockResolvedValue({ rows: [] });

    // Mock database transaction
    mockDb.transaction = jest.fn().mockImplementation(async (callback) => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
      };
      return callback(mockClient);
    });

    // Mock AI service with deterministic response
    mockAiService.generateStructure = jest.fn().mockResolvedValue(Ok(mockProposal));
  }

  describe('createJob', () => {
    it('should persist job and intake form', async () => {
      // Setup: Mock successful job creation
      const mockJobRow = {
        job_id: TEST_JOB_ID,
        workspace_id: TEST_WORKSPACE_ID,
        status: 'created',
        created_by: TEST_USER_ID,
        created_at: FIXED_DATE.toISOString(),
        updated_at: FIXED_DATE.toISOString(),
      };

      mockDb.transaction = jest.fn().mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [mockJobRow] }) // INSERT job
            .mockResolvedValueOnce({ rows: [] }), // INSERT intake
        };
        return callback(mockClient);
      });

      // Execute
      const result = await service.createJob(TEST_WORKSPACE_ID, TEST_USER_ID, validIntake);

      // Verify
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.jobId).toBe(TEST_JOB_ID);
        expect(result.value.workspaceId).toBe(TEST_WORKSPACE_ID);
        expect(result.value.status).toBe('created');
        expect(result.value.createdBy).toBe(TEST_USER_ID);
        expect(result.value.createdAt).toEqual(FIXED_DATE);
        expect(result.value.updatedAt).toEqual(FIXED_DATE);
      }

      // Verify transaction was called
      expect(mockDb.transaction).toHaveBeenCalledTimes(1);

      // Verify intake form was persisted
      const transaction = mockDb.transaction.mock.calls[0][0];
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [mockJobRow] })
          .mockResolvedValueOnce({ rows: [] }),
      } as unknown as PoolClient;
      await transaction(mockClient);

      expect(mockClient.query).toHaveBeenCalledTimes(2);

      // Check job insert
      expect(mockClient.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('INSERT INTO structure_jobs'),
        [TEST_WORKSPACE_ID, 'created', TEST_USER_ID]
      );

      // Check intake insert
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO intake_forms'),
        [
          TEST_JOB_ID,
          validIntake.communitySize,
          validIntake.coreActivities,
          validIntake.moderationCapacity,
          validIntake.channelBudget,
          validIntake.additionalContext,
        ]
      );
    });

    it('should handle database failure', async () => {
      // Setup: Force transaction error
      mockDb.transaction = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      // Execute
      const result = await service.createJob(TEST_WORKSPACE_ID, TEST_USER_ID, validIntake);

      // Verify
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues).toHaveLength(1);
        expect(result.issues[0]).toEqual(Issues.internal('Failed to create job'));
      }
    });
  });

  describe('generateProposal', () => {
    const mockIntakeRow = {
      job_id: TEST_JOB_ID,
      workspace_id: TEST_WORKSPACE_ID,
      workspace_name: 'Test Workspace',
      community_size: 'small',
      core_activities: ['engineering', 'design'],
      moderation_capacity: 'light',
      channel_budget: 10,
      additional_context: 'Test context',
    };

    it('should save v1 proposal and set status to proposed', async () => {
      // Setup: Mock intake query and transaction
      mockDb.query = jest.fn().mockResolvedValueOnce({
        rows: [mockIntakeRow],
      });

      mockDb.transaction = jest.fn().mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [{ next_version: 1 }] }) // version query
            .mockResolvedValueOnce({ rows: [] }) // insert proposal
            .mockResolvedValueOnce({ rows: [] }), // update status
        };
        return callback(mockClient);
      });

      // Execute
      const result = await service.generateProposal(TEST_JOB_ID);

      // Verify
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.jobId).toBe(TEST_JOB_ID);
        expect(result.value.version).toBe(1);
        expect(result.value.score).toBeGreaterThanOrEqual(0);
        expect(result.value.score).toBeLessThanOrEqual(1);
        expect(result.value.proposal).toEqual(mockProposal);
        expect(result.value.rationale).toBe(mockProposal.rationale);
      }

      // Verify AI was called with correct context
      expect(mockAiService.generateStructure).toHaveBeenCalledWith({
        communitySize: mockIntakeRow.community_size,
        coreActivities: mockIntakeRow.core_activities,
        moderationCapacity: mockIntakeRow.moderation_capacity,
        channelBudget: mockIntakeRow.channel_budget,
        additionalContext: mockIntakeRow.additional_context,
        workspaceName: mockIntakeRow.workspace_name,
      });

      // Verify status was updated to 'proposed'
      const transaction = mockDb.transaction.mock.calls[0][0];
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ next_version: 1 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] }),
      } as unknown as PoolClient;
      await transaction(mockClient);

      expect(mockClient.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('UPDATE structure_jobs SET status'),
        ['proposed', TEST_JOB_ID]
      );
    });

    it('should return not found error for missing job', async () => {
      // Setup: Mock empty result
      mockDb.query = jest.fn().mockResolvedValueOnce({ rows: [] });

      // Execute
      const result = await service.generateProposal(TEST_JOB_ID);

      // Verify
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues).toHaveLength(1);
        expect(result.issues[0]).toEqual(Issues.notFound('Job', TEST_JOB_ID));
      }
    });

    it('should mark job as failed when AI returns error', async () => {
      // Setup: Mock intake query
      mockDb.query = jest.fn()
        .mockResolvedValueOnce({ rows: [mockIntakeRow] }) // intake query
        .mockResolvedValueOnce({ rows: [] }); // status update

      // Mock AI error
      const aiError = Err([Issues.external('AI', 'Model unavailable')]);
      mockAiService.generateStructure = jest.fn().mockResolvedValue(aiError);

      // Execute
      const result = await service.generateProposal(TEST_JOB_ID);

      // Verify error is passed through
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues).toContainEqual(Issues.external('AI', 'Model unavailable'));
      }

      // Verify status was updated to 'failed'
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE structure_jobs SET status'),
        ['failed', TEST_JOB_ID]
      );
    });
  });

  describe('getJob', () => {
    it('should return job for existing jobId', async () => {
      // Setup
      const mockJobRow = {
        job_id: TEST_JOB_ID,
        workspace_id: TEST_WORKSPACE_ID,
        status: 'created',
        created_by: TEST_USER_ID,
        created_at: FIXED_DATE.toISOString(),
        updated_at: FIXED_DATE.toISOString(),
      };

      mockDb.query = jest.fn().mockResolvedValueOnce({ rows: [mockJobRow] });

      // Execute
      const result = await service.getJob(TEST_JOB_ID);

      // Verify
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.jobId).toBe(TEST_JOB_ID);
        expect(result.value.workspaceId).toBe(TEST_WORKSPACE_ID);
        expect(result.value.status).toBe('created');
        expect(result.value.createdBy).toBe(TEST_USER_ID);
        expect(result.value.createdAt).toEqual(FIXED_DATE);
        expect(result.value.updatedAt).toEqual(FIXED_DATE);
      }
    });

    it('should return not found for missing jobId', async () => {
      // Setup
      mockDb.query = jest.fn().mockResolvedValueOnce({ rows: [] });

      // Execute
      const result = await service.getJob(TEST_JOB_ID);

      // Verify
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues).toHaveLength(1);
        expect(result.issues[0]).toEqual(Issues.notFound('Job', TEST_JOB_ID));
      }
    });
  });

  describe('getLatestProposal', () => {
    it('should return highest version proposal', async () => {
      // Setup: Mock database to return v3 (highest)
      const mockProposalRow = {
        job_id: TEST_JOB_ID,
        version: 3,
        score: 0.85,
        rationale: 'Version 3 rationale',
        proposal: mockProposal,
        created_at: FIXED_DATE.toISOString(),
      };

      mockDb.query = jest.fn().mockResolvedValueOnce({ rows: [mockProposalRow] });

      // Execute
      const result = await service.getLatestProposal(TEST_JOB_ID);

      // Verify
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.jobId).toBe(TEST_JOB_ID);
        expect(result.value.version).toBe(3);
        expect(result.value.score).toBe(0.85);
        expect(result.value.rationale).toBe('Version 3 rationale');
        expect(result.value.proposal).toEqual(mockProposal);
        expect(result.value.createdAt).toEqual(FIXED_DATE);
      }

      // Verify query uses ORDER BY version DESC LIMIT 1
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY version DESC'),
        [TEST_JOB_ID]
      );
    });

    it('should return not found when no proposals exist', async () => {
      // Setup
      mockDb.query = jest.fn().mockResolvedValueOnce({ rows: [] });

      // Execute
      const result = await service.getLatestProposal(TEST_JOB_ID);

      // Verify
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues).toHaveLength(1);
        expect(result.issues[0]).toEqual(Issues.notFound('Proposal for job', TEST_JOB_ID));
      }
    });
  });

  describe('applyProposal', () => {
    it('should create channels, committees, and blueprint with status applied', async () => {
      // Setup: Mock getLatestProposal to return a proposal
      const mockProposalRow = {
        job_id: TEST_JOB_ID,
        version: 1,
        score: 0.9,
        rationale: 'Test rationale',
        proposal: mockProposal,
        created_at: FIXED_DATE.toISOString(),
      };

      mockDb.query = jest.fn().mockResolvedValueOnce({
        rows: [mockProposalRow],
      });

      // Mock transaction for applying
      let channelInsertCount = 0;
      let committeeInsertCount = 0;
      let blueprintInsertCount = 0;
      let statusUpdateCount = 0;

      mockDb.transaction = jest.fn().mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn().mockImplementation(async (sql: string) => {
            if (sql.includes('SELECT id FROM channels')) {
              return { rows: [] }; // No existing channels
            }
            if (sql.includes('INSERT INTO channels')) {
              channelInsertCount++;
              return { rows: [] };
            }
            if (sql.includes('SELECT id FROM committees')) {
              return { rows: [] }; // No existing committees
            }
            if (sql.includes('INSERT INTO committees')) {
              committeeInsertCount++;
              return { rows: [] };
            }
            if (sql.includes('INSERT INTO blueprints')) {
              blueprintInsertCount++;
              return { rows: [] };
            }
            if (sql.includes('UPDATE structure_jobs SET status')) {
              statusUpdateCount++;
              return { rows: [] };
            }
            return { rows: [] };
          }),
        };
        return callback(mockClient);
      });

      // Mock updateJobStatus for initial 'applying' status
      mockDb.query = jest.fn()
        .mockResolvedValueOnce({ rows: [mockProposalRow] }) // getLatestProposal
        .mockResolvedValueOnce({ rows: [] }); // updateJobStatus to 'applying'

      // Execute
      const result = await service.applyProposal(TEST_JOB_ID, TEST_WORKSPACE_ID, TEST_USER_ID);

      // Verify
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.created).toBe(3); // 3 channels created
      }

      // Verify all resources were created
      expect(channelInsertCount).toBe(3); // 3 channels
      expect(committeeInsertCount).toBe(1); // 1 committee
      expect(blueprintInsertCount).toBe(1); // 1 blueprint
      expect(statusUpdateCount).toBe(1); // Status updated to 'applied'
    });

    it('should be idempotent with existing channels', async () => {
      // Setup: Mock proposal
      const mockProposalRow = {
        job_id: TEST_JOB_ID,
        version: 1,
        score: 0.9,
        rationale: 'Test rationale',
        proposal: mockProposal,
        created_at: FIXED_DATE.toISOString(),
      };

      mockDb.query = jest.fn()
        .mockResolvedValueOnce({ rows: [mockProposalRow] }) // getLatestProposal
        .mockResolvedValueOnce({ rows: [] }); // updateJobStatus

      let channelInsertCount = 0;

      mockDb.transaction = jest.fn().mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn().mockImplementation(async (sql: string, params?: any[]) => {
            if (sql.includes('SELECT id FROM channels')) {
              // Simulate 2 channels already exist
              if (params && params[1] === 'general') {
                return { rows: [{ id: 'ch-1' }] };
              }
              if (params && params[1] === 'announcements') {
                return { rows: [{ id: 'ch-2' }] };
              }
              return { rows: [] };
            }
            if (sql.includes('INSERT INTO channels')) {
              channelInsertCount++;
              return { rows: [] };
            }
            if (sql.includes('SELECT id FROM committees')) {
              return { rows: [] };
            }
            if (sql.includes('INSERT INTO committees')) {
              return { rows: [] };
            }
            if (sql.includes('INSERT INTO blueprints')) {
              return { rows: [] };
            }
            if (sql.includes('UPDATE structure_jobs SET status')) {
              return { rows: [] };
            }
            return { rows: [] };
          }),
        };
        return callback(mockClient);
      });

      // Execute
      const result = await service.applyProposal(TEST_JOB_ID, TEST_WORKSPACE_ID, TEST_USER_ID);

      // Verify
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.created).toBe(1); // Only 1 new channel created (random)
      }

      expect(channelInsertCount).toBe(1); // Only 'random' was inserted
    });

    it('should fail when proposal is missing', async () => {
      // Setup: Mock getLatestProposal to return error
      mockDb.query = jest.fn()
        .mockResolvedValueOnce({ rows: [] }) // No proposal found
        .mockResolvedValueOnce({ rows: [] }); // Status update to 'failed'

      // Execute
      const result = await service.applyProposal(TEST_JOB_ID, TEST_WORKSPACE_ID, TEST_USER_ID);

      // Verify
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues[0]).toEqual(Issues.notFound('Proposal for job', TEST_JOB_ID));
      }

      // Verify status was NOT updated (because applyProposal only updates on catch)
      // The error is passed through from getLatestProposal
    });
  });

  describe('updateJobStatus', () => {
    it('should update job status', async () => {
      // Setup
      mockDb.query = jest.fn().mockResolvedValueOnce({ rows: [] });

      // Execute - we need to test this private method through a public method
      // We'll use generateProposal with AI error which calls updateJobStatus
      const mockIntakeRow = {
        job_id: TEST_JOB_ID,
        workspace_id: TEST_WORKSPACE_ID,
        workspace_name: 'Test Workspace',
        community_size: 'small',
        core_activities: ['engineering'],
        moderation_capacity: 'light',
        channel_budget: 10,
        additional_context: null,
      };

      mockDb.query = jest.fn()
        .mockResolvedValueOnce({ rows: [mockIntakeRow] }) // Get intake
        .mockResolvedValueOnce({ rows: [] }); // Update status

      mockAiService.generateStructure = jest.fn().mockResolvedValue(
        Err([Issues.external('AI', 'Error')])
      );

      await service.generateProposal(TEST_JOB_ID);

      // Verify
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE structure_jobs SET status'),
        ['failed', TEST_JOB_ID]
      );
    });
  });

  describe('calculateScore', () => {
    it('should score proposal within budget with core channels highly', () => {
      // Setup: Proposal within budget with general and announcements
      const proposal: StructureProposal = {
        channels: [
          { name: 'general', description: 'General', type: 'core', isPrivate: false },
          { name: 'announcements', description: 'Announcements', type: 'core', isPrivate: false },
          { name: 'random', description: 'Random', type: 'core', isPrivate: false },
        ],
        committees: [],
        rationale: 'This rationale is long enough to meet the 50 character minimum requirement for bonus points',
        estimatedComplexity: 'simple',
      };

      const context: StructureContext = {
        communitySize: 'small',
        coreActivities: ['engineering'],
        moderationCapacity: 'light',
        channelBudget: 10,
        workspaceName: 'Test',
      };

      // Execute - access private method via reflection
      const score = (service as any).calculateScore(proposal, context);

      // Verify
      expect(score).toBeGreaterThan(0.5); // Base score
      expect(score).toBeLessThanOrEqual(1.0);

      // Score should be: 0.5 (base) + 0.2 (budget) + 0.1 (general) + 0.1 (announcements) + 0.1 (rationale) = 1.0
      expect(score).toBeCloseTo(1.0);
    });

    it('should reduce score when over budget', () => {
      // Setup: Proposal over budget
      const proposal: StructureProposal = {
        channels: [
          { name: 'general', description: 'General', type: 'core', isPrivate: false },
          { name: 'announcements', description: 'Announcements', type: 'core', isPrivate: false },
          { name: 'ch1', description: 'Channel 1', type: 'workstream', isPrivate: false },
          { name: 'ch2', description: 'Channel 2', type: 'workstream', isPrivate: false },
          { name: 'ch3', description: 'Channel 3', type: 'workstream', isPrivate: false },
          { name: 'ch4', description: 'Channel 4', type: 'workstream', isPrivate: false },
        ],
        committees: [],
        rationale: 'Short',
        estimatedComplexity: 'simple',
      };

      const context: StructureContext = {
        communitySize: 'small',
        coreActivities: ['engineering'],
        moderationCapacity: 'light',
        channelBudget: 5, // Budget is 5, but we have 6 channels
        workspaceName: 'Test',
      };

      // Execute
      const score = (service as any).calculateScore(proposal, context);

      // Verify - should not get budget bonus (0.2)
      // Score should be: 0.5 (base) + 0.1 (general) + 0.1 (announcements) = 0.7
      expect(score).toBe(0.7);
      expect(score).toBeLessThan(1.0);
    });
  });

  describe('rowToJob', () => {
    it('should map snake_case DB row to camelCase StructureJob', () => {
      // Setup
      const dbRow = {
        job_id: TEST_JOB_ID,
        workspace_id: TEST_WORKSPACE_ID,
        status: 'created',
        created_by: TEST_USER_ID,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      };

      // Execute - access private method via reflection
      const job: StructureJob = (service as any).rowToJob(dbRow);

      // Verify
      expect(job.jobId).toBe(TEST_JOB_ID);
      expect(job.workspaceId).toBe(TEST_WORKSPACE_ID);
      expect(job.status).toBe('created');
      expect(job.createdBy).toBe(TEST_USER_ID);
      expect(job.createdAt).toBeInstanceOf(Date);
      expect(job.updatedAt).toBeInstanceOf(Date);
      expect(job.createdAt.toISOString()).toBe('2025-01-01T00:00:00.000Z');
      expect(job.updatedAt.toISOString()).toBe('2025-01-01T00:00:00.000Z');
    });
  });
});
