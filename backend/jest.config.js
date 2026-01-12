/**
 * Jest Configuration for AggieAce Backend
 *
 * Configured for ES Modules (ESM) with Node.js
 */

export default {
  // Use Node.js test environment
  testEnvironment: 'node',

  // Don't transform ES modules
  transform: {},

  // Treat .js files as ESM
  extensionsToTreatAsEsm: [],

  // Module path mapping for imports
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],

  // Files to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Longer timeout for integration tests
  testTimeout: 30000,

  // Module directories
  moduleDirectories: ['node_modules', 'src'],

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,

  // Run tests in band for integration tests (sequential)
  // Use --runInBand flag when running integration tests
};
