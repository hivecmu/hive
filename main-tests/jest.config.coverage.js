/** @type {import('jest').Config} */
module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: './coverage',
  coverageReporters: [
    'json',
    'lcov',
    'text',
    'text-summary',
    'html',
    'cobertura'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Files to collect coverage from
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/*.test.{ts,tsx}',
    '!**/*.spec.{ts,tsx}',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/*.d.ts',
    '!**/dist/**',
    '!**/build/**'
  ],

  // Test match patterns
  testMatch: [
    '**/*.test.ts',
    '**/*.test.tsx'
  ],

  // Transform files
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },

  // Module name mapper for aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../hive-platform/$1',
    '^@backend/(.*)$': '<rootDir>/../backend/src/$1'
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/setup-coverage.js'],

  // Verbose output for detailed logging
  verbose: true,

  // Coverage path ignore patterns
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/.next/',
    '/dist/',
    '/build/'
  ],

  // Test timeout
  testTimeout: 30000,

  // Bail on first test failure
  bail: false,

  // Display individual test results
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './coverage',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }],
    ['jest-html-reporters', {
      publicPath: './coverage/html-report',
      filename: 'test-report.html',
      openReport: false,
      pageTitle: 'Hive Platform Test Coverage Report',
      logoImgPath: '',
      hideIcon: false,
      expand: false,
      customInfos: [
        {
          title: 'Test Environment',
          value: 'Hive Platform - Main Tests'
        },
        {
          title: 'Coverage Date',
          value: new Date().toISOString()
        }
      ]
    }]
  ]
};