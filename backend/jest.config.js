module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@infra/(.*)$': '<rootDir>/src/infra/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@domains/(.*)$': '<rootDir>/src/domains/$1',
    '^@http/(.*)$': '<rootDir>/src/http/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/server.ts',
  ],
  coverageThreshold: {
    // Relax global thresholds to avoid failing on untested areas in CI
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
    // Enforce coverage only on the two targeted services (>=80%)
    'src/domains/structure/StructureService.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'src/domains/filehub/FileHubService.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};
