/**
 * Result<T, E> represents the outcome of an operation that can succeed or fail.
 *
 * Abstraction Function:
 *   AF(result) = Either a successful value of type T, or a list of issues of type E
 *
 * Representation Invariant:
 *   - Exactly one of 'value' or 'issues' is present (mutually exclusive)
 *   - If ok === true, then value is defined and issues is undefined
 *   - If ok === false, then issues is defined (non-empty array) and value is undefined
 *
 * Safety from rep exposure:
 *   - All return types are immutable value objects
 *   - No internal state is exposed
 */

export type Result<T, E = Issue> =
  | { ok: true; value: T }
  | { ok: false; issues: E[] };

export interface Issue {
  code: string;
  message: string;
  severity: 'info' | 'warn' | 'error' | 'block';
  field?: string;
  meta?: Record<string, unknown>;
}

/**
 * Create a successful Result
 */
export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/**
 * Create a failed Result with issues
 */
export function Err<E = Issue>(issues: E[]): Result<never, E> {
  if (!Array.isArray(issues) || issues.length === 0) {
    throw new Error('Err() requires a non-empty array of issues');
  }
  return { ok: false, issues };
}

/**
 * Create a failed Result from a single issue
 */
export function ErrSingle<E = Issue>(issue: E): Result<never, E> {
  return Err([issue]);
}

/**
 * Type guard to check if Result is Ok
 */
export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok === true;
}

/**
 * Type guard to check if Result is Err
 */
export function isErr<T, E>(result: Result<T, E>): result is { ok: false; issues: E[] } {
  return result.ok === false;
}

/**
 * Unwrap a Result, throwing if it's an error
 * Use with caution - prefer pattern matching
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result.value;
  }
  throw new Error(`Unwrap failed: ${JSON.stringify(result.issues)}`);
}

/**
 * Get value or default
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return isOk(result) ? result.value : defaultValue;
}

/**
 * Map over a successful Result
 */
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  if (isOk(result)) {
    return Ok(fn(result.value));
  }
  return result;
}

/**
 * FlatMap (chain) over a successful Result
 */
export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  if (isOk(result)) {
    return fn(result.value);
  }
  return result;
}

/**
 * Map over the error side
 */
export function mapErr<T, E, F>(
  result: Result<T, E>,
  fn: (issues: E[]) => F[]
): Result<T, F> {
  if (isErr(result)) {
    return Err(fn(result.issues));
  }
  return result as Result<T, F>;
}

/**
 * Combine multiple Results into one
 * Returns Ok with array of values if all are Ok
 * Returns Err with combined issues if any are Err
 */
export function combine<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];
  const allIssues: E[] = [];

  for (const result of results) {
    if (isOk(result)) {
      values.push(result.value);
    } else {
      allIssues.push(...result.issues);
    }
  }

  if (allIssues.length > 0) {
    return Err(allIssues);
  }

  return Ok(values);
}

/**
 * Helper to create standard Issue objects
 */
export const Issues = {
  validation: (message: string, field?: string): Issue => ({
    code: 'VALIDATION_ERROR',
    message,
    severity: 'error',
    field,
  }),

  notFound: (resource: string, id?: string): Issue => ({
    code: 'NOT_FOUND',
    message: `${resource}${id ? ` with id ${id}` : ''} not found`,
    severity: 'error',
  }),

  unauthorized: (message: string = 'Unauthorized'): Issue => ({
    code: 'UNAUTHORIZED',
    message,
    severity: 'error',
  }),

  forbidden: (message: string = 'Forbidden'): Issue => ({
    code: 'FORBIDDEN',
    message,
    severity: 'error',
  }),

  conflict: (message: string): Issue => ({
    code: 'CONFLICT',
    message,
    severity: 'error',
  }),

  internal: (message: string = 'Internal server error'): Issue => ({
    code: 'INTERNAL_ERROR',
    message,
    severity: 'error',
  }),

  external: (service: string, message: string): Issue => ({
    code: 'EXTERNAL_ERROR',
    message: `${service}: ${message}`,
    severity: 'error',
    meta: { service },
  }),
};
