module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts',
    '**/__tests__/**/*.ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts', // Often just re-exports
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  // Setup files if needed
  setupFilesAfterEnv: [],
  
  // Module name mapping for absolute imports if used
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  // Verbose output for better test reporting
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Fail tests on console errors/warnings in test environment
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};