/**
 * Database Mock Utilities
 *
 * Provides mock functions and data for database testing
 */

import { jest } from '@jest/globals';

// Mock query function
export const mockQuery = jest.fn();

// Mock pool client
export const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

/**
 * Create a mock database pool
 */
export const createMockPool = () => ({
  query: mockQuery,
  connect: jest.fn().mockResolvedValue(mockClient),
  end: jest.fn().mockResolvedValue(undefined)
});

/**
 * Mock database configuration module
 */
export const mockDbConfig = {
  query: mockQuery,
  testConnection: jest.fn().mockResolvedValue(true),
  getClient: jest.fn().mockResolvedValue(mockClient)
};

/**
 * Reset all database mocks
 */
export const resetDbMocks = () => {
  mockQuery.mockReset();
  mockClient.query.mockReset();
  mockClient.release.mockReset();
};

// Sample Data Fixtures

/**
 * Sample user record
 */
export const mockUserRecord = {
  id: 1,
  google_id: 'google_test_123',
  email: 'test@example.com',
  name: 'Test User',
  created_at: new Date('2024-01-01T00:00:00Z'),
  updated_at: new Date('2024-01-01T00:00:00Z')
};

/**
 * Sample calendar history record
 */
export const mockCalendarHistory = {
  id: 1,
  user_id: 1,
  course_name: 'CSCE 121',
  section_number: '501',
  semester_start: '2024-01-16',
  semester_end: '2024-05-03',
  timezone: 'America/Chicago',
  ics_file_path: '/downloads/CSCE_121_501.ics',
  ics_file_content: `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AggieAce//NONSGML v1.0//EN
BEGIN:VEVENT
DTSTART:20240116T090000
DTEND:20240116T100000
SUMMARY:CSCE 121 - Lecture
END:VEVENT
END:VCALENDAR`,
  pdf_file_path: '/uploads/syllabus.pdf',
  created_at: new Date('2024-01-01T00:00:00Z')
};

/**
 * Sample syllabus cache record
 */
export const mockSyllabusCache = {
  id: 1,
  sha256_hash: 'a'.repeat(64),
  ics_file_path: '/outputs/cached.ics',
  ics_file_content: `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AggieAce//NONSGML v1.0//EN
BEGIN:VEVENT
DTSTART:20240116T090000
DTEND:20240116T100000
SUMMARY:Cached Event
END:VEVENT
END:VCALENDAR`,
  created_at: new Date('2024-01-01T00:00:00Z')
};

/**
 * Setup mock to return a specific user
 */
export const setupMockUserQuery = (user = mockUserRecord) => {
  mockQuery.mockResolvedValueOnce({ rows: [user] });
};

/**
 * Setup mock to return empty results (user not found)
 */
export const setupMockUserNotFound = () => {
  mockQuery.mockResolvedValueOnce({ rows: [] });
};

/**
 * Setup mock for calendar history query
 */
export const setupMockCalendarHistoryQuery = (calendars = [mockCalendarHistory]) => {
  mockQuery.mockResolvedValueOnce({ rows: calendars });
};

/**
 * Setup mock for cache lookup
 */
export const setupMockCacheLookup = (cached = mockSyllabusCache) => {
  mockQuery.mockResolvedValueOnce({ rows: cached ? [cached] : [] });
};

export default {
  mockQuery,
  mockClient,
  createMockPool,
  mockDbConfig,
  resetDbMocks,
  mockUserRecord,
  mockCalendarHistory,
  mockSyllabusCache,
  setupMockUserQuery,
  setupMockUserNotFound,
  setupMockCalendarHistoryQuery,
  setupMockCacheLookup
};
