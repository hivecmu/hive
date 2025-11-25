/**
 * Content Extractor Service
 * Extracts searchable text from various file types:
 * - PDFs: using Mistral OCR API (high accuracy ~95%)
 * - Word docs: using mammoth
 * - Images: using Mistral OCR or OpenAI Vision API
 * - Plain text: direct reading
 */

import { Result, Ok, Err, Issues } from '@shared/types/Result';
import { logger } from '@shared/utils/logger';
import { Mistral } from '@mistralai/mistralai';
import OpenAI from 'openai';

// Dynamic imports for ESM compatibility
let mammoth: any = null;

async function getMammoth() {
  if (!mammoth) {
    mammoth = await import('mammoth');
  }
  return mammoth;
}

// Mistral client (lazy initialized)
let mistralClient: Mistral | null = null;

function getMistral(): Mistral | null {
  if (!mistralClient && process.env.MISTRAL_API_KEY) {
    mistralClient = new Mistral({
      apiKey: process.env.MISTRAL_API_KEY,
    });
  }
  return mistralClient;
}

// OpenAI client (lazy initialized)
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export interface ExtractedContent {
  text: string;
  method: 'mistral-ocr' | 'mammoth' | 'openai-vision' | 'plain-text' | 'filename-only';
  truncated: boolean;
}

/**
 * Extract text content from a PDF buffer using Mistral OCR API
 * Falls back to filename-only if Mistral API key not configured
 */
async function extractFromPdf(buffer: Buffer, fileName: string): Promise<Result<ExtractedContent, any>> {
  try {
    const mistral = getMistral();

    if (!mistral) {
      logger.warn('Mistral API key not configured, using filename only for PDF');
      return Ok({
        text: `PDF document: ${fileName}`,
        method: 'filename-only',
        truncated: false,
      });
    }

    // Upload PDF to Mistral cloud and get signed URL
    logger.info('Uploading PDF to Mistral for OCR', { fileName, size: buffer.length });

    const uploadedFile = await mistral.files.upload({
      file: {
        fileName: fileName,
        content: buffer,
      },
      purpose: 'ocr' as any,
    });

    // Get signed URL for the uploaded file
    const signedUrl = await mistral.files.getSignedUrl({
      fileId: uploadedFile.id,
    });

    // Process with OCR
    const ocrResponse = await mistral.ocr.process({
      model: 'mistral-ocr-latest',
      document: {
        type: 'document_url',
        documentUrl: signedUrl.url,
      },
    });

    // Extract text from all pages
    const allText = ocrResponse.pages
      .map((page: any) => page.markdown || '')
      .join('\n\n');

    // Truncate to reasonable size for embedding (4000 chars)
    const text = allText.slice(0, 4000);
    const truncated = allText.length > 4000;

    logger.info('PDF text extracted with Mistral OCR', {
      fileName,
      pages: ocrResponse.pages.length,
      textLength: allText.length,
      truncated,
    });

    // Clean up uploaded file
    try {
      await mistral.files.delete({ fileId: uploadedFile.id });
    } catch (cleanupError) {
      logger.warn('Failed to cleanup Mistral file', { fileId: uploadedFile.id });
    }

    return Ok({
      text,
      method: 'mistral-ocr',
      truncated,
    });
  } catch (error: any) {
    logger.error('PDF extraction with Mistral OCR failed', {
      error: error?.message || error,
      fileName
    });

    // Return filename only as fallback
    return Ok({
      text: `PDF document: ${fileName}`,
      method: 'filename-only',
      truncated: false,
    });
  }
}

/**
 * Extract text content from a Word document buffer
 */
async function extractFromWord(buffer: Buffer): Promise<Result<ExtractedContent, any>> {
  try {
    const mammothLib = await getMammoth();
    const result = await mammothLib.extractRawText({ buffer });

    // Truncate to reasonable size for embedding
    const text = result.value.slice(0, 4000);
    const truncated = result.value.length > 4000;

    logger.info('Word document text extracted', {
      textLength: result.value.length,
      truncated,
    });

    return Ok({
      text,
      method: 'mammoth',
      truncated,
    });
  } catch (error) {
    logger.error('Word extraction failed', { error });
    return Err([Issues.internal('Failed to extract Word document content')]);
  }
}

/**
 * Analyze image using OpenAI Vision API
 */
async function extractFromImage(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<Result<ExtractedContent, any>> {
  try {
    const openai = getOpenAI();

    if (!openai) {
      logger.warn('OpenAI API key not configured, skipping image analysis');
      return Ok({
        text: `Image file: ${fileName}`,
        method: 'filename-only',
        truncated: false,
      });
    }

    // Convert buffer to base64
    const base64Image = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this image and provide a detailed description that would be useful for searching. Include:
1. What the image shows (objects, people, scenes)
2. Any text visible in the image
3. Colors, style, and composition
4. Context or purpose of the image if apparent

Be concise but comprehensive. This description will be used for semantic search.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl,
                detail: 'low', // Use low detail to reduce costs
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const description = response.choices[0]?.message?.content || '';

    logger.info('Image analyzed with OpenAI Vision', {
      fileName,
      descriptionLength: description.length,
    });

    return Ok({
      text: description,
      method: 'openai-vision',
      truncated: false,
    });
  } catch (error) {
    logger.error('Image analysis failed', { error, fileName });
    // Fall back to filename only
    return Ok({
      text: `Image file: ${fileName}`,
      method: 'filename-only',
      truncated: false,
    });
  }
}

/**
 * Extract text from plain text files
 */
function extractFromText(buffer: Buffer): Result<ExtractedContent, any> {
  try {
    const text = buffer.toString('utf-8').slice(0, 4000);
    const truncated = buffer.length > 4000;

    return Ok({
      text,
      method: 'plain-text',
      truncated,
    });
  } catch (error) {
    logger.error('Text extraction failed', { error });
    return Err([Issues.internal('Failed to extract text content')]);
  }
}

/**
 * Main extraction function - routes to appropriate extractor based on mime type
 */
export async function extractContent(
  buffer: Buffer,
  mimeType: string | null,
  fileName: string
): Promise<Result<ExtractedContent, any>> {
  const type = mimeType?.toLowerCase() || '';
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  // PDF
  if (type === 'application/pdf' || ext === 'pdf') {
    return extractFromPdf(buffer, fileName);
  }

  // Word documents
  if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    type === 'application/msword' ||
    ext === 'docx' ||
    ext === 'doc'
  ) {
    return extractFromWord(buffer);
  }

  // Images
  if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
    return extractFromImage(buffer, mimeType || `image/${ext}`, fileName);
  }

  // Plain text and code files
  if (
    type.startsWith('text/') ||
    ['txt', 'md', 'json', 'js', 'ts', 'py', 'html', 'css', 'xml', 'yaml', 'yml', 'csv'].includes(ext)
  ) {
    return extractFromText(buffer);
  }

  // Unknown type - return filename only
  logger.info('Unknown file type, using filename only', { mimeType, fileName });
  return Ok({
    text: `File: ${fileName}`,
    method: 'filename-only',
    truncated: false,
  });
}

export const contentExtractor = {
  extract: extractContent,
  extractFromPdf,
  extractFromWord,
  extractFromImage,
  extractFromText,
};
