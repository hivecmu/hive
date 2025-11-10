/**
 * Coverage Setup and Logging Configuration
 * This file sets up enhanced logging for test coverage
 */

const fs = require('fs');
const path = require('path');

// Create coverage logs directory if it doesn't exist
const coverageLogsDir = path.join(__dirname, 'coverage-logs');
if (!fs.existsSync(coverageLogsDir)) {
  fs.mkdirSync(coverageLogsDir, { recursive: true });
}

// Create a log file for this test run
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = path.join(coverageLogsDir, `coverage-${timestamp}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Override console methods to capture logs
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug
};

const logToFile = (type, args) => {
  const message = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');

  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    message,
    testFile: expect.getState()?.testPath || 'unknown',
    testName: expect.getState()?.currentTestName || 'unknown'
  };

  logStream.write(JSON.stringify(logEntry) + '\n');
};

// Enhance console methods with logging
console.log = (...args) => {
  originalConsole.log(...args);
  logToFile('LOG', args);
};

console.error = (...args) => {
  originalConsole.error(...args);
  logToFile('ERROR', args);
};

console.warn = (...args) => {
  originalConsole.warn(...args);
  logToFile('WARN', args);
};

console.info = (...args) => {
  originalConsole.info(...args);
  logToFile('INFO', args);
};

console.debug = (...args) => {
  originalConsole.debug(...args);
  logToFile('DEBUG', args);
};

// Global test hooks for coverage tracking
global.beforeAll(() => {
  console.info('=== Starting Test Coverage Run ===');
  console.info(`Coverage log file: ${logFile}`);
  console.info(`Test environment: ${process.env.NODE_ENV || 'test'}`);
});

global.afterAll(() => {
  console.info('=== Test Coverage Run Complete ===');

  // Write summary to log
  const state = expect.getState();
  if (state) {
    console.info(`Total tests: ${state.numTotalTests || 0}`);
    console.info(`Passed tests: ${state.numPassedTests || 0}`);
    console.info(`Failed tests: ${state.numFailedTests || 0}`);
  }

  // Close the log stream
  logStream.end();
});

// Track test execution
global.beforeEach(() => {
  const testName = expect.getState()?.currentTestName;
  if (testName) {
    console.info(`Starting test: ${testName}`);
  }
});

global.afterEach(() => {
  const testName = expect.getState()?.currentTestName;
  if (testName) {
    console.info(`Completed test: ${testName}`);
  }
});

// Mock implementations if needed
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// Export for use in tests
module.exports = {
  logFile,
  coverageLogsDir,
  originalConsole
};