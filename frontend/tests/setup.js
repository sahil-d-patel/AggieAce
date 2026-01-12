/**
 * Jest Global Test Setup for Frontend
 *
 * Configures testing environment, MSW, and global mocks
 */

import '@testing-library/jest-dom';
import { server } from './mocks/server';

// Set test environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:5000';

// MSW Server Setup

// Start MSW server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers();
});

// Clean up after all tests
afterAll(() => {
  server.close();
});

// Global Mocks

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => key in store ? store[key] : null),
    setItem: jest.fn((key, value) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index) => Object.keys(store)[index] || null),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock window.alert
window.alert = jest.fn();

// Note: window.location is handled by jsdom - we don't need to mock it
// The "navigation not implemented" warnings are expected in jsdom

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Console Suppression (optional - uncomment to reduce noise)

// Suppress console errors during tests (uncomment for cleaner output)
// const originalError = console.error;
// beforeAll(() => {
//   console.error = (...args) => {
//     if (
//       typeof args[0] === 'string' &&
//       args[0].includes('Warning: ReactDOM.render is no longer supported')
//     ) {
//       return;
//     }
//     originalError.call(console, ...args);
//   };
// });
//
// afterAll(() => {
//   console.error = originalError;
// });

// Helper Functions

/**
 * Reset localStorage mock between tests
 */
export const resetLocalStorage = () => {
  localStorageMock.clear();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
};

/**
 * Set up authenticated state in localStorage
 */
export const setupAuthenticatedUser = (user = {
  name: 'Test User',
  email: 'test@example.com',
  picture: 'https://example.com/photo.jpg'
}) => {
  localStorageMock.setItem('aggieace_access_token', 'mock_access_token');
  localStorageMock.setItem('aggieace_user_info', JSON.stringify(user));
  localStorageMock.getItem.mockImplementation((key) => {
    if (key === 'aggieace_access_token') return 'mock_access_token';
    if (key === 'aggieace_user_info') return JSON.stringify(user);
    return null;
  });
};
