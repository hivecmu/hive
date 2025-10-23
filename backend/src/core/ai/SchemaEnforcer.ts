import Ajv, { ValidateFunction } from 'ajv';
import { Result, Ok, Err, Issues, Issue } from '@shared/types/Result';
import { logger } from '@shared/utils/logger';

/**
 * Schema Enforcer
 * Validates JSON data against JSON Schema
 *
 * AF: Maps (data, schema) to validation result
 * RI:
 *   - Schema is valid JSON Schema
 *   - Validator is compiled successfully
 * Safety: Returns immutable validation results
 */

const ajv = new Ajv({
  allErrors: true,
  strict: false, // Allow some flexibility
});

export class SchemaEnforcer {
  private validators: Map<string, ValidateFunction> = new Map();

  /**
   * Validate data against a JSON schema
   */
  validate<T = any>(
    data: unknown,
    schema: any,
    schemaId: string = 'anonymous'
  ): Result<T, Issue> {
    try {
      // Get or compile validator
      let validator = this.validators.get(schemaId);

      if (!validator) {
        validator = ajv.compile(schema);
        this.validators.set(schemaId, validator);
      }

      // Validate
      const valid = validator(data);

      if (!valid) {
        const issues: Issue[] = (validator.errors || []).map((error) => ({
          code: 'SCHEMA_VALIDATION_ERROR',
          message: `${error.instancePath || 'root'}: ${error.message}`,
          severity: 'error',
          field: error.instancePath,
          meta: {
            keyword: error.keyword,
            params: error.params,
          },
        }));

        logger.debug('Schema validation failed', {
          schemaId,
          errors: validator.errors,
        });

        return Err(issues);
      }

      return Ok(data as T);
    } catch (error) {
      logger.error('Schema validation error', { error, schemaId });
      return Err([Issues.internal('Schema validation failed')]);
    }
  }

  /**
   * Attempt to repair invalid JSON by retrying with a repair prompt
   * This is a placeholder - full implementation would use the AI provider
   */
  async attemptRepair<T>(
    data: unknown,
    schema: any,
    _originalPrompt: string,
    _maxAttempts: number = 2
  ): Promise<Result<T, Issue>> {
    // For now, just validate
    // In full implementation, this would:
    // 1. Take the validation errors
    // 2. Create a repair prompt: "The JSON is invalid: <errors>. Please fix it."
    // 3. Call AI again with the repair prompt
    // 4. Validate the repaired JSON
    // 5. Repeat up to maxAttempts

    return this.validate<T>(data, schema);
  }

  /**
   * Clear cached validators (useful for testing)
   */
  clearCache(): void {
    this.validators.clear();
  }
}

export const schemaEnforcer = new SchemaEnforcer();
