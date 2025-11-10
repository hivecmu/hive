# Test Coverage Logging System

## Overview

This directory contains a comprehensive test coverage logging system for the Hive Platform. The system provides detailed tracking, analysis, and reporting of code coverage metrics.

## Features

- **Real-time Coverage Tracking**: Monitors test execution and coverage in real-time
- **Detailed Logging**: Captures test execution details, assertions, and performance metrics
- **Multiple Report Formats**: HTML, LCOV, JSON, and custom markdown reports
- **Coverage Trends**: Tracks coverage changes over time
- **Performance Monitoring**: Identifies slow tests and operations
- **Enhanced Test Decorators**: TypeScript decorators for automatic coverage tracking

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Tests with Coverage

```bash
# Basic coverage run
npm run test:coverage

# Verbose output with detailed logging
npm run test:verbose

# Generate full coverage report
npm run coverage:report
```

### 3. Run the Coverage Script

```bash
./run-coverage-tests.sh
```

This script will:
- Install dependencies if needed
- Clean previous coverage data
- Run all tests with coverage
- Generate analysis reports
- Create coverage summaries

## Configuration Files

### `jest.config.coverage.js`
Main Jest configuration for coverage:
- Coverage thresholds (80% for all metrics)
- Reporter configurations
- Coverage collection patterns
- Test environment setup

### `setup-coverage.js`
Global test setup that:
- Initializes coverage logging
- Captures console output
- Tracks test execution
- Creates log streams

### `coverage-logger.ts`
TypeScript utility providing:
- Coverage logging class
- Test decorators
- Performance tracking
- Mock tracking

## Coverage Reports

### HTML Report
Interactive HTML report showing:
- File-by-file coverage
- Line-by-line coverage details
- Uncovered code highlighting

Location: `coverage/index.html`

### LCOV Report
Standard LCOV format for CI/CD integration.

Location: `coverage/lcov.info`

### JSON Report
Machine-readable coverage data.

Location: `coverage/coverage-final.json`

### Markdown Report
Human-readable summary with trends and recommendations.

Location: `COVERAGE_REPORT.md`

## Coverage Logs

All test runs generate detailed logs in the `coverage-logs/` directory:

- `coverage_run_TIMESTAMP.log` - Full test run output
- `coverage_summary_TIMESTAMP.txt` - Run summary
- `test-coverage-TIMESTAMP.log` - JSON-formatted test events

## Using Coverage Logger in Tests

### Basic Usage

```typescript
import { coverageLogger, withCoverage } from './coverage-logger';

describe('MyComponent', () => {
  beforeAll(() => {
    coverageLogger.logSuiteStart('MyComponent');
  });

  afterAll(() => {
    coverageLogger.logSuiteEnd('MyComponent', passed, failed, skipped);
  });

  it('should do something', withCoverage(
    'test description',
    async () => {
      // Your test code here
    }
  ));
});
```

### Advanced Usage with Decorators

```typescript
import { TrackCoverage } from './coverage-logger';

class MyService {
  @TrackCoverage
  async processData(input: any) {
    // Method will be automatically tracked
    return result;
  }
}
```

### Logging Custom Metrics

```typescript
// Log code path execution
coverageLogger.logCodePath('MyFile.ts', 42, 'branch-1');

// Log assertions
coverageLogger.logAssertion('should equal', expected, actual, passed);

// Log performance
coverageLogger.logPerformance('operation', duration);

// Log mock usage
coverageLogger.logMock('mockName', callCount, args);
```

## Coverage Thresholds

Default thresholds (configured in `jest.config.coverage.js`):

| Metric | Threshold |
|--------|-----------|
| Lines | 80% |
| Branches | 80% |
| Functions | 80% |
| Statements | 80% |

## CI/CD Integration

The coverage system is designed for CI/CD pipelines:

```bash
# Run in CI mode
npm run test:ci
```

This will:
- Use appropriate worker count
- Generate JUnit XML reports
- Exit with proper codes (0 for pass, 1 for fail)

## Troubleshooting

### Tests Not Running
- Ensure dependencies are installed: `npm install`
- Check TypeScript compilation: `npx tsc --noEmit`

### Coverage Not Collected
- Verify files match collection patterns in `jest.config.coverage.js`
- Check that test files are properly named (`*.test.ts` or `*.test.tsx`)

### Low Coverage
- Review `COVERAGE_REPORT.md` for uncovered lines
- Check HTML report for detailed line-by-line coverage
- Use coverage logger to identify untested code paths

## Scripts

| Script | Description |
|--------|-------------|
| `npm test` | Run tests without coverage |
| `npm run test:coverage` | Run tests with coverage |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:verbose` | Run with verbose output |
| `npm run coverage:report` | Generate full coverage report |
| `npm run coverage:analyze` | Analyze coverage data |
| `npm run coverage:clean` | Clean coverage data |
| `npm run test:ci` | Run tests in CI mode |

## Directory Structure

```
main-tests/
├── coverage/              # Coverage reports
│   ├── index.html        # HTML report
│   ├── lcov.info         # LCOV data
│   └── coverage-final.json # JSON data
├── coverage-logs/        # Test execution logs
│   ├── coverage_run_*.log
│   └── test-coverage-*.log
├── node_modules/         # Dependencies
├── *.test.ts            # Test files
├── *.test.tsx           # React test files
├── coverage-logger.ts    # Coverage utility
├── jest.config.coverage.js # Jest config
├── setup-coverage.js     # Setup script
├── analyze-coverage.js   # Analysis script
├── run-coverage-tests.sh # Runner script
└── package.json         # Dependencies

```

## Best Practices

1. **Always track coverage** for new tests using the coverage logger
2. **Monitor trends** using the coverage-trends.json file
3. **Review uncovered code** in the HTML report
4. **Fix failing thresholds** before merging
5. **Use decorators** for automatic tracking in service classes
6. **Log performance** for operations over 100ms
7. **Document test scenarios** using coverageLogger.log()

## Support

For issues or questions about the coverage system:
1. Check the latest logs in `coverage-logs/`
2. Review the HTML report at `coverage/index.html`
3. Run with verbose output: `npm run test:verbose`