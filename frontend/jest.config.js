/**
 * Jest Configuration for AggieAce Frontend
 *
 * Configured for Next.js with React Testing Library
 */

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Path to Next.js app
  dir: './',
});

const customJestConfig = {
  // Test environment
  testEnvironment: 'jest-environment-jsdom',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.test.jsx',
    '**/tests/**/*.spec.js',
    '**/tests/**/*.spec.jsx'
  ],

  // Module path aliases (must match next.config.js and jsconfig.json)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
    '!src/**/*.spec.{js,jsx}',
    '!src/**/layout.js', // Skip layout files
    '!src/**/loading.js', // Skip loading files
    '!src/**/error.js', // Skip error files
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 40,
      lines: 40,
      statements: 40
    }
  },

  // Test timeout
  testTimeout: 15000,

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,

  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>/'],

  // Transform ignore patterns (don't transform node_modules except specific packages)
  transformIgnorePatterns: [
    '/node_modules/',
    '^.+\\.module\\.(css|sass|scss)$'
  ]
};

module.exports = createJestConfig(customJestConfig);
