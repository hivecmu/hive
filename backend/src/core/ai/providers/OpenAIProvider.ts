import OpenAI from 'openai';
import config from '@config/index';
import { logger } from '@shared/utils/logger';
import { Result, Ok, Err, Issues } from '@shared/types/Result';

/**
 * OpenAI Provider
 * Wrapper around OpenAI SDK with error handling and retries
 *
 * AF: Maps OpenAI API calls to Result<T, Issue[]> envelope
 * RI:
 *   - API key is valid and set
 *   - Model names exist in OpenAI's catalog
 *   - Responses conform to expected schemas
 * Safety: Never exposes API key in logs or errors
 */

export interface GenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  responseFormat?: { type: 'json_object' };
}

export interface GenerateResponse {
  content: string;
  model: string;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  finishReason: string;
}

export interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  tokens: number;
}

export class OpenAIProvider {
  private client: OpenAI;
  private readonly MAX_RETRIES = 3;

  constructor() {
    if (!config.openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    this.client = new OpenAI({
      apiKey: config.openaiApiKey,
      maxRetries: this.MAX_RETRIES,
    });

    this.checkRep();
  }

  /**
   * Generate text completion
   */
  async generate(
    prompt: string,
    options: GenerateOptions = {}
  ): Promise<Result<GenerateResponse, any>> {
    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model: options.model || config.openaiModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        response_format: options.responseFormat,
      });

      const choice = response.choices[0];
      if (!choice || !choice.message.content) {
        return Err([Issues.external('OpenAI', 'No content in response')]);
      }

      const result: GenerateResponse = {
        content: choice.message.content,
        model: response.model,
        tokens: {
          prompt: response.usage?.prompt_tokens || 0,
          completion: response.usage?.completion_tokens || 0,
          total: response.usage?.total_tokens || 0,
        },
        finishReason: choice.finish_reason,
      };

      const duration = Date.now() - startTime;
      logger.info('OpenAI generation complete', {
        model: result.model,
        tokens: result.tokens.total,
        duration,
      });

      return Ok(result);
    } catch (error) {
      return this.handleError(error, 'generate');
    }
  }

  /**
   * Generate structured JSON output
   */
  async generateJSON<T = any>(
    prompt: string,
    schema: any,
    options: GenerateOptions = {}
  ): Promise<Result<{ data: T; response: GenerateResponse }, any>> {
    try {
      // Add JSON instructions to prompt
      const jsonPrompt = `${prompt}\n\nYou must respond with valid JSON matching this schema:\n${JSON.stringify(schema, null, 2)}`;

      const result = await this.generate(jsonPrompt, {
        ...options,
        responseFormat: { type: 'json_object' },
      });

      if (!result.ok) {
        return result;
      }

      // Parse JSON
      try {
        const data = JSON.parse(result.value.content) as T;
        return Ok({ data, response: result.value });
      } catch (parseError) {
        return Err([
          Issues.external('OpenAI', 'Invalid JSON in response'),
        ]);
      }
    } catch (error) {
      return this.handleError(error, 'generateJSON');
    }
  }

  /**
   * Generate embeddings for text
   */
  async embed(
    inputs: string[],
    options: EmbeddingOptions = {}
  ): Promise<Result<EmbeddingResponse, any>> {
    const startTime = Date.now();

    try {
      const response = await this.client.embeddings.create({
        model: options.model || config.openaiEmbeddingModel,
        input: inputs,
        dimensions: options.dimensions,
      });

      const embeddings = response.data.map((item) => item.embedding);

      const result: EmbeddingResponse = {
        embeddings,
        model: response.model,
        tokens: response.usage.total_tokens,
      };

      const duration = Date.now() - startTime;
      logger.info('OpenAI embeddings generated', {
        model: result.model,
        count: embeddings.length,
        tokens: result.tokens,
        duration,
      });

      return Ok(result);
    } catch (error) {
      return this.handleError(error, 'embed');
    }
  }

  /**
   * Handle OpenAI errors and convert to Result
   */
  private handleError(error: unknown, operation: string): Result<never, any> {
    if (error instanceof OpenAI.APIError) {
      logger.error(`OpenAI ${operation} error`, {
        status: error.status,
        code: error.code,
        message: error.message,
      });

      // Classify error
      if (error.status === 429) {
        return Err([
          Issues.external('OpenAI', 'Rate limit exceeded. Please try again later.'),
        ]);
      }

      if (error.status === 401) {
        return Err([Issues.external('OpenAI', 'Invalid API key')]);
      }

      if (error.status === 400) {
        return Err([
          Issues.external('OpenAI', `Bad request: ${error.message}`),
        ]);
      }

      return Err([
        Issues.external('OpenAI', error.message || 'Unknown API error'),
      ]);
    }

    logger.error(`OpenAI ${operation} unexpected error`, { error });
    return Err([Issues.external('OpenAI', 'Unexpected error occurred')]);
  }

  /**
   * Verify representation invariant
   */
  private checkRep(): void {
    if (process.env.NODE_ENV === 'development') {
      if (!config.openaiApiKey) {
        throw new Error('RI violated: OpenAI API key not set');
      }
    }
  }
}

export const openaiProvider = new OpenAIProvider();
