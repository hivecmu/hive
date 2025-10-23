/**
 * Jest setup file
 * Runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent'; // Silence logs during tests
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hive_test';
process.env.USE_REAL_AI = 'false'; // Use mock AI in tests by default
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key'; // Prevent config errors

// Global test timeout
jest.setTimeout(10000);
