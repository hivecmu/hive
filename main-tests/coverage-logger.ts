/**
 * Coverage Logger Utility
 * Provides enhanced logging capabilities for test coverage
 */

import * as fs from 'fs';
import * as path from 'path';

export class CoverageLogger {
  private static instance: CoverageLogger;
  private logFile: string;
  private logStream: fs.WriteStream;
  private testContext: Map<string, any> = new Map();

  private constructor() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logsDir = path.join(__dirname, 'coverage-logs');

    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    this.logFile = path.join(logsDir, `test-coverage-${timestamp}.log`);
    this.logStream = fs.createWriteStream(this.logFile, { flags: 'a' });
  }

  public static getInstance(): CoverageLogger {
    if (!CoverageLogger.instance) {
      CoverageLogger.instance = new CoverageLogger();
    }
    return CoverageLogger.instance;
  }

  /**
   * Log test suite start
   */
  public logSuiteStart(suiteName: string): void {
    this.writeLog('SUITE_START', {
      suite: suiteName,
      timestamp: new Date().toISOString()
    });
    console.info(`📋 Test Suite Started: ${suiteName}`);
  }

  /**
   * Log test suite end
   */
  public logSuiteEnd(suiteName: string, passed: number, failed: number, skipped: number): void {
    this.writeLog('SUITE_END', {
      suite: suiteName,
      passed,
      failed,
      skipped,
      total: passed + failed + skipped,
      timestamp: new Date().toISOString()
    });
    console.info(`✅ Test Suite Completed: ${suiteName} (${passed}/${passed + failed} passed)`);
  }

  /**
   * Log individual test start
   */
  public logTestStart(testName: string): void {
    const startTime = Date.now();
    this.testContext.set(testName, { startTime });

    this.writeLog('TEST_START', {
      test: testName,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log individual test end
   */
  public logTestEnd(testName: string, status: 'passed' | 'failed' | 'skipped', error?: Error): void {
    const context = this.testContext.get(testName);
    const duration = context ? Date.now() - context.startTime : 0;

    this.writeLog('TEST_END', {
      test: testName,
      status,
      duration: `${duration}ms`,
      error: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString()
    });

    const statusIcon = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⏭️';
    console.info(`${statusIcon} ${testName} [${duration}ms]`);

    if (error) {
      console.error(`   Error: ${error.message}`);
    }

    this.testContext.delete(testName);
  }

  /**
   * Log coverage metrics
   */
  public logCoverageMetrics(metrics: {
    lines: number;
    branches: number;
    functions: number;
    statements: number;
  }): void {
    this.writeLog('COVERAGE_METRICS', {
      ...metrics,
      timestamp: new Date().toISOString()
    });

    console.info('📊 Coverage Metrics:');
    console.info(`   Lines: ${metrics.lines}%`);
    console.info(`   Branches: ${metrics.branches}%`);
    console.info(`   Functions: ${metrics.functions}%`);
    console.info(`   Statements: ${metrics.statements}%`);
  }

  /**
   * Log code path execution
   */
  public logCodePath(file: string, line: number, branch?: string): void {
    this.writeLog('CODE_PATH', {
      file,
      line,
      branch,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log assertion
   */
  public logAssertion(description: string, expected: any, actual: any, passed: boolean): void {
    this.writeLog('ASSERTION', {
      description,
      expected,
      actual,
      passed,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log mock usage
   */
  public logMock(mockName: string, callCount: number, args?: any[]): void {
    this.writeLog('MOCK_CALL', {
      mock: mockName,
      callCount,
      args,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log performance metrics
   */
  public logPerformance(operation: string, duration: number): void {
    this.writeLog('PERFORMANCE', {
      operation,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });

    if (duration > 1000) {
      console.warn(`⚠️  Slow operation detected: ${operation} took ${duration}ms`);
    }
  }

  /**
   * Custom log entry
   */
  public log(type: string, data: any): void {
    this.writeLog(type, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Write log entry to file
   */
  private writeLog(type: string, data: any): void {
    const logEntry = {
      type,
      ...data
    };

    this.logStream.write(JSON.stringify(logEntry) + '\n');
  }

  /**
   * Close log stream
   */
  public close(): void {
    this.logStream.end();
  }
}

/**
 * Test Coverage Decorator
 * Use this decorator to automatically track function coverage
 */
export function TrackCoverage(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  const logger = CoverageLogger.getInstance();

  descriptor.value = function (...args: any[]) {
    logger.log('FUNCTION_CALLED', {
      class: target.constructor.name,
      method: propertyKey,
      args: args.length
    });

    const startTime = Date.now();

    try {
      const result = originalMethod.apply(this, args);

      if (result instanceof Promise) {
        return result.then((res) => {
          logger.logPerformance(`${target.constructor.name}.${propertyKey}`, Date.now() - startTime);
          return res;
        }).catch((err) => {
          logger.log('FUNCTION_ERROR', {
            class: target.constructor.name,
            method: propertyKey,
            error: err.message
          });
          throw err;
        });
      }

      logger.logPerformance(`${target.constructor.name}.${propertyKey}`, Date.now() - startTime);
      return result;
    } catch (error) {
      logger.log('FUNCTION_ERROR', {
        class: target.constructor.name,
        method: propertyKey,
        error: (error as Error).message
      });
      throw error;
    }
  };

  return descriptor;
}

/**
 * Test helper to wrap test functions with coverage logging
 */
export function withCoverage(testName: string, testFn: () => void | Promise<void>) {
  const logger = CoverageLogger.getInstance();

  return async () => {
    logger.logTestStart(testName);

    try {
      await testFn();
      logger.logTestEnd(testName, 'passed');
    } catch (error) {
      logger.logTestEnd(testName, 'failed', error as Error);
      throw error;
    }
  };
}

// Export singleton instance
export const coverageLogger = CoverageLogger.getInstance();