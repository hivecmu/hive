/**
 * Local Embedding Provider using Transformers.js
 * Runs completely offline, no API costs
 * Uses all-MiniLM-L6-v2 model (~25MB)
 */

import { Result, Ok, Err, Issues } from '@shared/types/Result';
import { logger } from '@shared/utils/logger';

// Dynamic import for transformers.js (ESM module)
let pipeline: any = null;
let extractor: any = null;

async function getExtractor() {
  if (extractor) return extractor;

  try {
    // Dynamic import for ESM compatibility
    const { pipeline: pipelineFn } = await import('@xenova/transformers');
    pipeline = pipelineFn;

    logger.info('Loading local embedding model (first time may take a moment)...');

    // Use all-MiniLM-L6-v2 - small, fast, good quality
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true, // Use quantized model for smaller size
    });

    logger.info('Local embedding model loaded successfully');
    return extractor;
  } catch (error) {
    logger.error('Failed to load local embedding model', { error });
    throw error;
  }
}

export interface LocalEmbeddingResult {
  embeddings: number[][];
  model: string;
  dimensions: number;
}

/**
 * Generate embeddings for texts using local model
 */
export async function generateLocalEmbeddings(
  texts: string[]
): Promise<Result<LocalEmbeddingResult, any>> {
  try {
    const extractor = await getExtractor();

    const embeddings: number[][] = [];

    for (const text of texts) {
      // Truncate very long texts
      const truncatedText = text.slice(0, 512);

      // Generate embedding
      const output = await extractor(truncatedText, {
        pooling: 'mean',
        normalize: true,
      });

      // Convert to array
      const embedding = Array.from(output.data as Float32Array);
      embeddings.push(embedding);
    }

    logger.info('Local embeddings generated', {
      count: embeddings.length,
      dimensions: embeddings[0]?.length || 0,
    });

    return Ok({
      embeddings,
      model: 'all-MiniLM-L6-v2',
      dimensions: embeddings[0]?.length || 384,
    });
  } catch (error) {
    logger.error('Local embedding generation failed', { error });
    return Err([Issues.internal('Failed to generate local embeddings')]);
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Generate smart tags for a file based on its name and content
 */
export function generateSmartTags(
  fileName: string,
  mimeType?: string,
  _content?: string
): string[] {
  const tags: Set<string> = new Set();
  const name = fileName.toLowerCase();
  const ext = name.split('.').pop() || '';

  // Extension-based tags
  const extensionTags: Record<string, string[]> = {
    'pdf': ['document', 'pdf'],
    'doc': ['document', 'word'],
    'docx': ['document', 'word'],
    'xls': ['spreadsheet', 'excel'],
    'xlsx': ['spreadsheet', 'excel'],
    'ppt': ['presentation', 'powerpoint'],
    'pptx': ['presentation', 'powerpoint'],
    'jpg': ['image', 'photo'],
    'jpeg': ['image', 'photo'],
    'png': ['image', 'graphic'],
    'gif': ['image', 'animated'],
    'svg': ['image', 'vector'],
    'mp4': ['video', 'media'],
    'mov': ['video', 'media'],
    'mp3': ['audio', 'media'],
    'wav': ['audio', 'media'],
    'zip': ['archive', 'compressed'],
    'rar': ['archive', 'compressed'],
    'json': ['data', 'config', 'json'],
    'xml': ['data', 'markup'],
    'csv': ['data', 'spreadsheet'],
    'txt': ['text', 'plain'],
    'md': ['text', 'markdown', 'documentation'],
    'ts': ['code', 'typescript'],
    'tsx': ['code', 'typescript', 'react'],
    'js': ['code', 'javascript'],
    'jsx': ['code', 'javascript', 'react'],
    'py': ['code', 'python'],
    'java': ['code', 'java'],
    'go': ['code', 'golang'],
    'rs': ['code', 'rust'],
    'sql': ['code', 'database'],
    'html': ['code', 'web'],
    'css': ['code', 'styles'],
    'scss': ['code', 'styles'],
  };

  if (extensionTags[ext]) {
    extensionTags[ext].forEach(tag => tags.add(tag));
  }

  // Name pattern tags
  const patterns: [RegExp, string[]][] = [
    [/readme/i, ['documentation', 'readme']],
    [/config/i, ['config', 'settings']],
    [/package\.json/i, ['config', 'npm', 'dependencies']],
    [/tsconfig/i, ['config', 'typescript']],
    [/webpack|vite|rollup/i, ['config', 'build']],
    [/docker/i, ['config', 'docker', 'deployment']],
    [/test|spec/i, ['test', 'testing']],
    [/report/i, ['report', 'document']],
    [/invoice|receipt/i, ['finance', 'invoice']],
    [/contract|agreement/i, ['legal', 'contract']],
    [/resume|cv/i, ['hr', 'resume']],
    [/meeting|minutes/i, ['meeting', 'notes']],
    [/design|mockup|wireframe/i, ['design', 'ui']],
    [/roadmap|plan/i, ['planning', 'roadmap']],
    [/budget|expense/i, ['finance', 'budget']],
    [/screenshot|screen/i, ['screenshot', 'capture']],
    [/logo|icon|brand/i, ['branding', 'logo']],
    [/api|endpoint/i, ['api', 'integration']],
    [/schema|model/i, ['data', 'schema']],
    [/backup/i, ['backup', 'archive']],
    [/log/i, ['log', 'debug']],
    [/error|bug/i, ['debug', 'error']],
    [/security|auth/i, ['security', 'auth']],
    [/user|profile/i, ['user', 'profile']],
    [/admin/i, ['admin', 'management']],
    [/dashboard/i, ['dashboard', 'analytics']],
    [/chart|graph/i, ['chart', 'visualization']],
  ];

  for (const [pattern, patternTags] of patterns) {
    if (pattern.test(name)) {
      patternTags.forEach(tag => tags.add(tag));
    }
  }

  // MIME type tags
  if (mimeType) {
    const [type, subtype] = mimeType.split('/');
    if (type === 'image') tags.add('image');
    if (type === 'video') tags.add('video');
    if (type === 'audio') tags.add('audio');
    if (type === 'text') tags.add('text');
    if (type === 'application') {
      if (subtype === 'pdf') tags.add('pdf');
      if (subtype === 'json') tags.add('json');
    }
  }

  // Ensure at least one tag
  if (tags.size === 0) {
    tags.add('file');
    tags.add(ext || 'unknown');
  }

  // Return as array, limit to 7 tags
  return Array.from(tags).slice(0, 7);
}

export const localEmbeddingProvider = {
  generateEmbeddings: generateLocalEmbeddings,
  generateTags: generateSmartTags,
  cosineSimilarity,
};
