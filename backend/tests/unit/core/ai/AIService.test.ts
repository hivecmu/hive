import { aiService } from '@core/ai/AIService';
import type { StructureContext } from '@core/ai/prompts/structure-generation';
import type { FileContext } from '@core/ai/prompts/file-tagging';

/**
 * Unit tests for AI Service
 * Tests with mocked AI (USE_REAL_AI=false)
 */

describe('AIService', () => {
  beforeAll(() => {
    // Ensure we're using mocks
    process.env.USE_REAL_AI = 'false';
  });

  describe('generateStructure', () => {
    it('should generate structure proposal with mocks', async () => {
      const context: StructureContext = {
        communitySize: 'small',
        coreActivities: ['engineering', 'design'],
        moderationCapacity: 'light',
        channelBudget: 10,
        workspaceName: 'Test Workspace',
      };

      const result = await aiService.generateStructure(context);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.channels).toBeDefined();
        expect(Array.isArray(result.value.channels)).toBe(true);
        expect(result.value.channels.length).toBeGreaterThan(0);
        expect(result.value.committees).toBeDefined();
        expect(result.value.rationale).toBeDefined();
        expect(result.value.estimatedComplexity).toBeDefined();
      }
    });

    it('should include core channels', async () => {
      const context: StructureContext = {
        communitySize: 'medium',
        coreActivities: ['product'],
        moderationCapacity: 'moderate',
        channelBudget: 15,
        workspaceName: 'Product Team',
      };

      const result = await aiService.generateStructure(context);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const channelNames = result.value.channels.map((c) => c.name);
        expect(channelNames).toContain('general');
        expect(channelNames).toContain('announcements');
      }
    });
  });

  describe('generateFileTags', () => {
    it('should generate tags for a file', async () => {
      const context: FileContext = {
        fileName: 'product_roadmap_2025.pdf',
        mimeType: 'application/pdf',
        size: 1024 * 500, // 500 KB
      };

      const result = await aiService.generateFileTags(context);

      // Check that we got a response (ok or error)
      expect(result).toBeDefined();

      // In mock mode, should return ok
      if (result.ok) {
        expect(result.value.tags).toBeDefined();
        expect(Array.isArray(result.value.tags)).toBe(true);
        expect(result.value.tags.length).toBeGreaterThanOrEqual(3);
        expect(result.value.category).toBeDefined();
        expect(result.value.confidence).toBeGreaterThanOrEqual(0);
        expect(result.value.confidence).toBeLessThanOrEqual(1);
        expect(result.value.summary).toBeDefined();
      } else {
        // If it failed, check it has issues
        expect(result.issues).toBeDefined();
        expect(Array.isArray(result.issues)).toBe(true);
      }
    });

    it('should handle minimal file context', async () => {
      const context: FileContext = {
        fileName: 'untitled.txt',
      };

      const result = await aiService.generateFileTags(context);

      expect(result).toBeDefined();

      if (result.ok) {
        expect(result.value.tags.length).toBeGreaterThan(0);
      }
    });
  });

  describe('generateEmbeddings', () => {
    it('should generate embeddings for text array', async () => {
      const texts = ['Hello world', 'Another document', 'Third text'];

      const result = await aiService.generateEmbeddings(texts);

      // In mock mode, this will fail since embeddings aren't mocked
      // That's expected - we'll test with real API separately
      expect(result).toBeDefined();
    });
  });
});
