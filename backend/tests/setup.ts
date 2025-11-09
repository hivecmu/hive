/**
 * Jest setup file
 * Runs before all tests
 */

/* eslint-disable @typescript-eslint/no-var-requires */
/* global process, jest */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent'; // Silence logs during tests
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hive_test';
process.env.USE_REAL_AI = 'false'; // Use mock AI in tests by default
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key'; // Prevent config errors
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing'; // Required for config

// Global test timeout
jest.setTimeout(10000);
