import { openaiProvider } from './providers/OpenAIProvider';
import { schemaEnforcer } from './SchemaEnforcer';
import { buildStructurePrompt, structureSchema, StructureContext, StructureProposal } from './prompts/structure-generation';
import { buildFileTaggingPrompt, fileTagsSchema, FileContext, FileTagsProposal } from './prompts/file-tagging';
import { Result, Ok, Err, Issues } from '@shared/types/Result';
import { logger } from '@shared/utils/logger';
import config from '@config/index';

/**
 * AI Service
 * High-level facade for AI operations
 *
 * AF: Maps domain contexts to AI-generated structured outputs
 * RI:
 *   - Provider is initialized
 *   - Schemas are valid JSON Schema
 *   - Responses are validated before returning
 * Safety: Never exposes raw provider responses or API keys
 */

export class AIService {
  /**
   * Generate workspace structure from intake form
   * User Story 1
   */
  async generateStructure(
    context: StructureContext
  ): Promise<Result<StructureProposal, any>> {
    if (!config.useRealAI) {
      logger.info('Using mock AI (USE_REAL_AI=false)');
      return this.mockStructureGeneration(context);
    }

    try {
      const prompt = buildStructurePrompt(context);

      logger.info('Generating workspace structure', {
        workspaceName: context.workspaceName,
        channelBudget: context.channelBudget,
      });

      // Generate with JSON mode
      const result = await openaiProvider.generateJSON<StructureProposal>(
        prompt,
        structureSchema,
        {
          temperature: 0.7,
          maxTokens: 2000,
        }
      );

      if (!result.ok) {
        return result;
      }

      // Validate against schema
      const validated = schemaEnforcer.validate<StructureProposal>(
        result.value.data,
        structureSchema,
        'structure-proposal'
      );

      if (!validated.ok) {
        logger.warn('Structure proposal failed validation', {
          issues: validated.issues,
        });
        return validated;
      }

      logger.info('Structure generated successfully', {
        channelCount: validated.value.channels.length,
        committeeCount: validated.value.committees.length,
        complexity: validated.value.estimatedComplexity,
        tokens: result.value.response.tokens.total,
      });

      return Ok(validated.value);
    } catch (error) {
      logger.error('Structure generation failed', { error });
      return Err([Issues.internal('Failed to generate structure')]);
    }
  }

  /**
   * Generate tags for a file
   * User Story 2
   */
  async generateFileTags(
    context: FileContext
  ): Promise<Result<FileTagsProposal, any>> {
    if (!config.useRealAI) {
      logger.info('Using mock AI (USE_REAL_AI=false)');
      return this.mockFileTagging(context);
    }

    try {
      const prompt = buildFileTaggingPrompt(context);

      logger.info('Generating file tags', {
        fileName: context.fileName,
      });

      // Generate with JSON mode
      const result = await openaiProvider.generateJSON<FileTagsProposal>(
        prompt,
        fileTagsSchema,
        {
          temperature: 0.5, // Lower temperature for more consistent tagging
          maxTokens: 500,
        }
      );

      if (!result.ok) {
        return result;
      }

      // Validate against schema
      const validated = schemaEnforcer.validate<FileTagsProposal>(
        result.value.data,
        fileTagsSchema,
        'file-tags'
      );

      if (!validated.ok) {
        logger.warn('File tags failed validation', {
          issues: validated.issues,
        });
        return validated;
      }

      logger.info('File tags generated', {
        fileName: context.fileName,
        tagCount: validated.value.tags.length,
        confidence: validated.value.confidence,
        tokens: result.value.response.tokens.total,
      });

      return Ok(validated.value);
    } catch (error) {
      logger.error('File tagging failed', { error });
      return Err([Issues.internal('Failed to generate file tags')]);
    }
  }

  /**
   * Generate embeddings for text
   */
  async generateEmbeddings(
    texts: string[]
  ): Promise<Result<number[][], any>> {
    if (!config.useRealAI) {
      logger.info('Using mock AI for embeddings (USE_REAL_AI=false)');
      return this.mockEmbeddings(texts);
    }

    try {
      logger.info('Generating embeddings', { count: texts.length });

      const result = await openaiProvider.embed(texts);

      if (!result.ok) {
        return result;
      }

      logger.info('Embeddings generated', {
        count: result.value.embeddings.length,
        dimensions: result.value.embeddings[0]?.length,
        tokens: result.value.tokens,
      });

      return Ok(result.value.embeddings);
    } catch (error) {
      logger.error('Embedding generation failed', { error });
      return Err([Issues.internal('Failed to generate embeddings')]);
    }
  }

  /**
   * Mock structure generation (for testing without OpenAI)
   */
  private mockStructureGeneration(
    _context: StructureContext
  ): Result<StructureProposal, any> {
    const proposal: StructureProposal = {
      channels: [
        {
          name: 'general',
          description: 'General discussion and announcements',
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
          description: 'Off-topic conversations',
          type: 'core',
          isPrivate: false,
        },
      ],
      committees: [],
      rationale: 'Mock structure for testing',
      estimatedComplexity: 'simple',
    };

    return Ok(proposal);
  }

  /**
   * Mock file tagging (for testing without OpenAI)
   */
  private mockFileTagging(context: FileContext): Result<FileTagsProposal, any> {
    const proposal: FileTagsProposal = {
      tags: ['document', 'general', 'mock'],
      category: 'general',
      confidence: 0.5,
      summary: `Mock tags for ${context.fileName}`,
    };

    return Ok(proposal);
  }

  /**
   * Mock embeddings (for testing without OpenAI)
   */
  private mockEmbeddings(texts: string[]): Result<number[][], any> {
    // Return random 768-dimensional vectors (matching OpenAI ada-002)
    const embeddings = texts.map(() => {
      return Array.from({ length: 768 }, () => Math.random() * 2 - 1);
    });

    return Ok(embeddings);
  }
}

export const aiService = new AIService();
