import {
  Result,
  Ok,
  Err,
  ErrSingle,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
  map,
  flatMap,
  mapErr,
  combine,
  Issues,
  Issue,
} from '@shared/types/Result';

describe('Result<T, Issue[]>', () => {
  describe('Ok', () => {
    it('should create a successful result', () => {
      const result = Ok(42);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(42);
      }
    });

    it('should work with complex types', () => {
      const result = Ok({ name: 'test', count: 5 });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe('test');
        expect(result.value.count).toBe(5);
      }
    });
  });

  describe('Err', () => {
    it('should create a failed result with issues', () => {
      const issues: Issue[] = [
        { code: 'TEST_ERROR', message: 'Test failed', severity: 'error' },
      ];
      const result = Err(issues);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues).toEqual(issues);
      }
    });

    it('should throw if given empty array', () => {
      expect(() => Err([])).toThrow('Err() requires a non-empty array of issues');
    });

    it('should throw if given non-array', () => {
      expect(() => Err(null as any)).toThrow();
    });
  });

  describe('ErrSingle', () => {
    it('should create a failed result from single issue', () => {
      const issue: Issue = {
        code: 'VALIDATION',
        message: 'Invalid input',
        severity: 'error',
      };
      const result = ErrSingle(issue);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues).toHaveLength(1);
        expect(result.issues[0]).toEqual(issue);
      }
    });
  });

  describe('isOk', () => {
    it('should return true for Ok results', () => {
      const result = Ok(123);
      expect(isOk(result)).toBe(true);
    });

    it('should return false for Err results', () => {
      const result = Err([Issues.internal()]);
      expect(isOk(result)).toBe(false);
    });

    it('should narrow type correctly', () => {
      const result: Result<number> = Ok(42);
      if (isOk(result)) {
        // TypeScript should know result.value is a number
        const value: number = result.value;
        expect(value).toBe(42);
      }
    });
  });

  describe('isErr', () => {
    it('should return false for Ok results', () => {
      const result = Ok(123);
      expect(isErr(result)).toBe(false);
    });

    it('should return true for Err results', () => {
      const result = Err([Issues.internal()]);
      expect(isErr(result)).toBe(true);
    });

    it('should narrow type correctly', () => {
      const result: Result<number> = Err([Issues.internal()]);
      if (isErr(result)) {
        // TypeScript should know result.issues exists
        const issues: Issue[] = result.issues;
        expect(issues).toHaveLength(1);
      }
    });
  });

  describe('unwrap', () => {
    it('should return value for Ok results', () => {
      const result = Ok(42);
      expect(unwrap(result)).toBe(42);
    });

    it('should throw for Err results', () => {
      const result = Err([Issues.internal('boom')]);
      expect(() => unwrap(result)).toThrow();
    });
  });

  describe('unwrapOr', () => {
    it('should return value for Ok results', () => {
      const result = Ok(42);
      expect(unwrapOr(result, 0)).toBe(42);
    });

    it('should return default for Err results', () => {
      const result = Err([Issues.internal()]);
      expect(unwrapOr(result, 99)).toBe(99);
    });
  });

  describe('map', () => {
    it('should transform Ok values', () => {
      const result = Ok(5);
      const mapped = map(result, (x) => x * 2);
      expect(isOk(mapped)).toBe(true);
      if (isOk(mapped)) {
        expect(mapped.value).toBe(10);
      }
    });

    it('should pass through Err unchanged', () => {
      const issue = Issues.internal('test');
      const result = Err([issue]);
      const mapped = map(result, (x: number) => x * 2);
      expect(isErr(mapped)).toBe(true);
      if (isErr(mapped)) {
        expect(mapped.issues).toEqual([issue]);
      }
    });
  });

  describe('flatMap', () => {
    it('should chain Ok results', () => {
      const result = Ok(5);
      const chained = flatMap(result, (x) => Ok(x * 2));
      expect(isOk(chained)).toBe(true);
      if (isOk(chained)) {
        expect(chained.value).toBe(10);
      }
    });

    it('should propagate Err from original', () => {
      const issue = Issues.internal('original');
      const result = Err([issue]);
      const chained = flatMap(result, (x: number) => Ok(x * 2));
      expect(isErr(chained)).toBe(true);
      if (isErr(chained)) {
        expect(chained.issues).toEqual([issue]);
      }
    });

    it('should propagate Err from callback', () => {
      const result = Ok(5);
      const issue = Issues.internal('callback');
      const chained = flatMap(result, () => Err([issue]));
      expect(isErr(chained)).toBe(true);
      if (isErr(chained)) {
        expect(chained.issues).toEqual([issue]);
      }
    });
  });

  describe('mapErr', () => {
    it('should transform Err issues', () => {
      const result = Err([Issues.internal('test')]);
      const mapped = mapErr(result, (issues) =>
        issues.map((i) => ({ ...i, severity: 'warn' as const }))
      );
      expect(isErr(mapped)).toBe(true);
      if (isErr(mapped)) {
        expect(mapped.issues[0].severity).toBe('warn');
      }
    });

    it('should pass through Ok unchanged', () => {
      const result = Ok(42);
      const mapped = mapErr(result, (issues) => issues);
      expect(isOk(mapped)).toBe(true);
      if (isOk(mapped)) {
        expect(mapped.value).toBe(42);
      }
    });
  });

  describe('combine', () => {
    it('should combine all Ok results into array', () => {
      const results = [Ok(1), Ok(2), Ok(3)];
      const combined = combine(results);
      expect(isOk(combined)).toBe(true);
      if (isOk(combined)) {
        expect(combined.value).toEqual([1, 2, 3]);
      }
    });

    it('should collect all issues if any Err', () => {
      const issue1 = Issues.validation('error 1');
      const issue2 = Issues.validation('error 2');
      const results = [Ok(1), Err([issue1]), Ok(3), Err([issue2])];
      const combined = combine(results);
      expect(isErr(combined)).toBe(true);
      if (isErr(combined)) {
        expect(combined.issues).toHaveLength(2);
        expect(combined.issues).toEqual([issue1, issue2]);
      }
    });

    it('should handle empty array', () => {
      const combined = combine([]);
      expect(isOk(combined)).toBe(true);
      if (isOk(combined)) {
        expect(combined.value).toEqual([]);
      }
    });
  });

  describe('Issues helpers', () => {
    it('should create validation issue', () => {
      const issue = Issues.validation('Invalid email', 'email');
      expect(issue.code).toBe('VALIDATION_ERROR');
      expect(issue.message).toBe('Invalid email');
      expect(issue.severity).toBe('error');
      expect(issue.field).toBe('email');
    });

    it('should create notFound issue', () => {
      const issue = Issues.notFound('User', '123');
      expect(issue.code).toBe('NOT_FOUND');
      expect(issue.message).toBe('User with id 123 not found');
      expect(issue.severity).toBe('error');
    });

    it('should create notFound without id', () => {
      const issue = Issues.notFound('User');
      expect(issue.message).toBe('User not found');
    });

    it('should create unauthorized issue', () => {
      const issue = Issues.unauthorized();
      expect(issue.code).toBe('UNAUTHORIZED');
      expect(issue.message).toBe('Unauthorized');
    });

    it('should create forbidden issue', () => {
      const issue = Issues.forbidden('No access');
      expect(issue.code).toBe('FORBIDDEN');
      expect(issue.message).toBe('No access');
    });

    it('should create conflict issue', () => {
      const issue = Issues.conflict('Email already exists');
      expect(issue.code).toBe('CONFLICT');
      expect(issue.message).toBe('Email already exists');
    });

    it('should create internal issue', () => {
      const issue = Issues.internal('Database error');
      expect(issue.code).toBe('INTERNAL_ERROR');
      expect(issue.message).toBe('Database error');
    });

    it('should create external issue', () => {
      const issue = Issues.external('OpenAI', 'Rate limit exceeded');
      expect(issue.code).toBe('EXTERNAL_ERROR');
      expect(issue.message).toBe('OpenAI: Rate limit exceeded');
      expect(issue.meta?.service).toBe('OpenAI');
    });
  });

  describe('Representation Invariant', () => {
    it('should never have both value and issues', () => {
      const okResult = Ok(42);
      const errResult = Err([Issues.internal()]);

      // Ok should have value, not issues
      if (okResult.ok) {
        expect(okResult.value).toBeDefined();
        expect((okResult as any).issues).toBeUndefined();
      }

      // Err should have issues, not value
      if (!errResult.ok) {
        expect(errResult.issues).toBeDefined();
        expect((errResult as any).value).toBeUndefined();
      }
    });
  });
});
