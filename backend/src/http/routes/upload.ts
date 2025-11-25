import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { Ok, Err, Issues } from '@shared/types/Result';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { fileHubService } from '@domains/filehub/FileHubService';
import { workspaceService } from '@domains/workspace/WorkspaceService';
// Config import removed - using env vars directly for S3

interface MultipartFile {
  filename: string;
  mimetype: string;
  toBuffer(): Promise<Buffer>;
}

// S3 client will be configured inside the route handlers
let s3Client: S3Client | null = null;

function getS3Client() {
  if (!s3Client) {
    const isMinIO = process.env.S3_ENDPOINT?.includes('localhost') || process.env.S3_ENDPOINT?.includes('9000');

    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      // Only use custom endpoint for MinIO (local development)
      ...(isMinIO ? {
        endpoint: process.env.S3_ENDPOINT,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
          secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
        },
        forcePathStyle: true,
      } : {}),
      // AWS S3 uses IAM credentials from environment/task role automatically
    });
  }
  return s3Client;
}

/**
 * File upload routes
 */
export async function uploadRoutes(fastify: FastifyInstance) {
  // Configure multipart support
  fastify.register(require('@fastify/multipart'), {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
      files: 1, // Max 1 file per request
    },
  });

  /**
   * POST /v1/upload/message
   * Upload a file attachment for a message
   */
  fastify.post(
    '/v1/upload/message',
    {
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      try {
        const userId = request.user!.userId;
        const data = await (request as any).file() as MultipartFile | undefined;

        if (!data) {
          return reply.code(400).send(
            Err([Issues.validation('No file provided')])
          );
        }

        // Get workspace ID from headers or query
        const query = request.query as { workspaceId?: string };
        const workspaceId = (request.headers['x-workspace-id'] ||
                           query.workspaceId) as string;

        if (!workspaceId) {
          return reply.code(400).send(
            Err([Issues.validation('Workspace ID required')])
          );
        }

        // Verify user is member of workspace
        const isMember = await workspaceService.isMember(workspaceId, userId);
        if (!isMember) {
          return reply.code(403).send(
            Err([Issues.forbidden('Not a member of this workspace')])
          );
        }

        // Read file buffer
        const buffer = await data.toBuffer();
        
        // Generate unique file name
        const fileExt = data.filename.split('.').pop() || 'bin';
        const fileName = `${uuidv4()}.${fileExt}`;
        const s3Key = `workspaces/${workspaceId}/attachments/${fileName}`;

        // Upload to S3
        const bucket = process.env.S3_BUCKET || 'hive-platform-files-243179454026';
        await getS3Client().send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: s3Key,
            Body: buffer,
            ContentType: data.mimetype,
            Metadata: {
              'original-name': data.filename,
              'uploaded-by': userId,
              'workspace-id': workspaceId,
            },
          })
        );

        // Generate public URL (reuse bucket variable from above)
        const isMinIO = process.env.S3_ENDPOINT?.includes('localhost') || process.env.S3_ENDPOINT?.includes('9000');
        const fileUrl = isMinIO
          ? `${process.env.S3_ENDPOINT}/${bucket}/${s3Key}`
          : `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;

        // Save file record to database
        const fileResult = await fileHubService.addFile(
          workspaceId,
          null, // No file source for direct uploads
          {
            externalId: fileName,
            name: data.filename,
            mimeType: data.mimetype,
            sizeBytes: buffer.length,
            url: fileUrl,
            content: buffer,
            uploadedBy: userId,
          }
        );

        if (!fileResult.ok) {
          return reply.code(500).send(fileResult);
        }

        return reply.code(200).send(
          Ok({
            id: fileResult.value.fileId,
            name: data.filename,
            url: fileUrl,
            mimeType: data.mimetype,
            size: buffer.length,
          })
        );
      } catch (error) {
        console.error('Upload error:', error);
        return reply.code(500).send(
          Err([Issues.internal('Failed to upload file')])
        );
      }
    }
  );

  /**
   * POST /v1/upload/avatar
   * Upload user avatar
   */
  fastify.post(
    '/v1/upload/avatar',
    {
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      try {
        const userId = request.user!.userId;
        const data = await (request as any).file() as MultipartFile | undefined;

        if (!data) {
          return reply.code(400).send(
            Err([Issues.validation('No file provided')])
          );
        }

        // Validate image type
        if (!data.mimetype.startsWith('image/')) {
          return reply.code(400).send(
            Err([Issues.validation('File must be an image')])
          );
        }

        // Read file buffer
        const buffer = await data.toBuffer();
        
        // Generate unique file name
        const fileExt = data.filename.split('.').pop() || 'jpg';
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const s3Key = `avatars/${fileName}`;

        // Upload to S3
        const bucket = process.env.S3_BUCKET || 'hive-platform-files-243179454026';
        await getS3Client().send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: s3Key,
            Body: buffer,
            ContentType: data.mimetype,
            Metadata: {
              'user-id': userId,
            },
          })
        );

        // Generate public URL
        const isMinIO = process.env.S3_ENDPOINT?.includes('localhost') || process.env.S3_ENDPOINT?.includes('9000');
        const avatarUrl = isMinIO
          ? `${process.env.S3_ENDPOINT}/${bucket}/${s3Key}`
          : `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;

        // TODO: Update user avatar URL in database
        // await userService.updateAvatar(userId, avatarUrl);

        return reply.code(200).send(
          Ok({
            url: avatarUrl,
          })
        );
      } catch (error) {
        console.error('Avatar upload error:', error);
        return reply.code(500).send(
          Err([Issues.internal('Failed to upload avatar')])
        );
      }
    }
  );
}
