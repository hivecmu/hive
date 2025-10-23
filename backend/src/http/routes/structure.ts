import { FastifyInstance } from 'fastify';
import { structureService } from '@domains/structure/StructureService';
import { workspaceService } from '@domains/workspace/WorkspaceService';
import { authMiddleware } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validation';
import { z } from 'zod';
import { Ok } from '@shared/types/Result';

const intakeFormSchema = z.object({
  workspaceId: z.string().uuid(),
  communitySize: z.string(),
  coreActivities: z.array(z.string()).min(1),
  moderationCapacity: z.string(),
  channelBudget: z.number().int().min(3).max(100),
  additionalContext: z.string().optional(),
});

const jobIdSchema = z.object({
  jobId: z.string().uuid(),
});

/**
 * Structure generation routes (User Story 1)
 */
export async function structureRoutes(fastify: FastifyInstance) {
  /**
   * POST /v1/structure/generate
   * Start structure generation job
   */
  fastify.post(
    '/v1/structure/generate',
    {
      preHandler: [authMiddleware, validateBody(intakeFormSchema)],
    },
    async (request, reply) => {
      const userId = request.user!.userId;
      const input = request.body as any;

      // Check if user is member of workspace
      const isMember = await workspaceService.isMember(input.workspaceId, userId);
      if (!isMember) {
        return reply.code(403).send({
          ok: false,
          issues: [{ code: 'FORBIDDEN', message: 'Not a member of this workspace', severity: 'error' }],
        });
      }

      // Create job
      const jobResult = await structureService.createJob(
        input.workspaceId,
        userId,
        input
      );

      if (!jobResult.ok) {
        return reply.code(500).send(jobResult);
      }

      // Immediately generate proposal
      const proposalResult = await structureService.generateProposal(jobResult.value.jobId);

      if (!proposalResult.ok) {
        return reply.code(500).send(proposalResult);
      }

      return reply.code(201).send(Ok({
        job: jobResult.value,
        proposal: proposalResult.value,
      }));
    }
  );

  /**
   * GET /v1/structure/jobs/:jobId
   * Get job status and proposal
   */
  fastify.get(
    '/v1/structure/jobs/:jobId',
    {
      preHandler: [authMiddleware, validateParams(jobIdSchema)],
    },
    async (request, reply) => {
      const { jobId } = request.params as any;

      const jobResult = await structureService.getJob(jobId);

      if (!jobResult.ok) {
        return reply.code(404).send(jobResult);
      }

      // Try to get proposal
      const proposalResult = await structureService.getLatestProposal(jobId);

      return reply.code(200).send(Ok({
        job: jobResult.value,
        proposal: proposalResult.ok ? proposalResult.value : null,
      }));
    }
  );

  /**
   * POST /v1/structure/proposals/:jobId/approve
   * Approve and apply proposal
   */
  fastify.post(
    '/v1/structure/proposals/:jobId/approve',
    {
      preHandler: [authMiddleware, validateParams(jobIdSchema)],
    },
    async (request, reply) => {
      const { jobId } = request.params as any;
      const userId = request.user!.userId;

      // Get job and check permissions
      const jobResult = await structureService.getJob(jobId);
      if (!jobResult.ok) {
        return reply.code(404).send(jobResult);
      }

      const job = jobResult.value;

      // Check if user is admin of workspace
      const role = await workspaceService.getUserRole(job.workspaceId, userId);
      if (role !== 'admin') {
        return reply.code(403).send({
          ok: false,
          issues: [{ code: 'FORBIDDEN', message: 'Only admins can approve structures', severity: 'error' }],
        });
      }

      // Apply proposal
      const applyResult = await structureService.applyProposal(jobId, job.workspaceId);

      if (!applyResult.ok) {
        return reply.code(500).send(applyResult);
      }

      return reply.code(200).send(Ok({
        jobId,
        status: 'applied',
        channelsCreated: applyResult.value.created,
      }));
    }
  );
}
