/**
 * Jest Global Test Setup
 *
 * This file runs before each test file
 */

import { jest } from '@jest/globals';

// Set test environment
process.env.NODE_ENV = 'test';

// Default test database config (can be overridden in .env.test)
process.env.DB_NAME = process.env.DB_NAME || 'aggieace_test';

// Set rate limits for testing
process.env.MAX_API_PER_DAY = '100';
process.env.MAX_API_PER_MINUTE = '5';

// Increase timeout for async operations
jest.setTimeout(30000);

// Global beforeAll - runs once before all tests in a file
beforeAll(() => {
  // Suppress console logs during tests (comment out for debugging)
  // jest.spyOn(console, 'log').mockImplementation(() => {});
  // jest.spyOn(console, 'error').mockImplementation(() => {});
});

// Global afterAll - runs once after all tests in a file
afterAll(() => {
  // Restore console
  jest.restoreAllMocks();
});

// Global beforeEach - runs before each test
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

// Global afterEach - runs after each test
afterEach(() => {
  // Any cleanup needed after each test
});
