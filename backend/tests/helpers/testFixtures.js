/**
 * Test Fixtures and Sample Data
 *
 * Provides reusable test data for all test files
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File Paths

export const fixturesDir = path.join(__dirname, '../fixtures');
export const samplePdfPath = path.join(fixturesDir, 'sample-syllabus.pdf');

// Valid Test Data

/**
 * Valid conversion parameters
 */
export const validConversionParams = {
  className: 'CSCE 121',
  sectionNumber: '501',
  semesterStart: '01/16/2024',
  semesterEnd: '05/03/2024',
  timezone: 'America/Chicago'
};

/**
 * All valid timezone options
 */
export const validTimezones = [
  'America/Chicago',
  'America/New_York',
  'America/Los_Angeles',
  'America/Denver',
  'America/Phoenix',
  'Pacific/Honolulu',
  'America/Anchorage'
];

/**
 * Sample ICS file content
 */
export const validIcsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AggieAce//NONSGML v1.0//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:CSCE 121 - Section 501
X-WR-TIMEZONE:America/Chicago
BEGIN:VEVENT
DTSTART;TZID=America/Chicago:20240116T090000
DTEND;TZID=America/Chicago:20240116T095000
SUMMARY:CSCE 121 - Lecture
DESCRIPTION:Introduction to Programming
LOCATION:ZACH 350
END:VEVENT
BEGIN:VEVENT
DTSTART;TZID=America/Chicago:20240118T090000
DTEND;TZID=America/Chicago:20240118T095000
SUMMARY:CSCE 121 - Lecture
DESCRIPTION:Variables and Data Types
LOCATION:ZACH 350
END:VEVENT
END:VCALENDAR`;

// Invalid Test Data

/**
 * Invalid conversion parameters for testing validation
 */
export const invalidConversionParams = {
  emptyClassName: {
    className: '',
    sectionNumber: '501',
    semesterStart: '01/16/2024',
    semesterEnd: '05/03/2024',
    timezone: 'America/Chicago'
  },
  tooLongClassName: {
    className: 'A'.repeat(101), // > 100 chars
    sectionNumber: '501',
    semesterStart: '01/16/2024',
    semesterEnd: '05/03/2024',
    timezone: 'America/Chicago'
  },
  wrongDateFormat: {
    className: 'CSCE 121',
    sectionNumber: '501',
    semesterStart: '2024-01-16', // Should be MM/DD/YYYY
    semesterEnd: '05/03/2024',
    timezone: 'America/Chicago'
  },
  invalidTimezone: {
    className: 'CSCE 121',
    sectionNumber: '501',
    semesterStart: '01/16/2024',
    semesterEnd: '05/03/2024',
    timezone: 'Invalid/Timezone'
  },
  missingSectionNumber: {
    className: 'CSCE 121',
    sectionNumber: '',
    semesterStart: '01/16/2024',
    semesterEnd: '05/03/2024',
    timezone: 'America/Chicago'
  }
};

// Data Generators

/**
 * Generate a unique user object
 */
export const generateUser = (overrides = {}) => ({
  id: Math.floor(Math.random() * 10000),
  google_id: `google_${uuidv4()}`,
  email: `test_${Date.now()}@example.com`,
  name: 'Test User',
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides
});

/**
 * Generate conversion parameters with optional overrides
 */
export const generateConversionParams = (overrides = {}) => ({
  ...validConversionParams,
  ...overrides
});

/**
 * Generate a calendar history record
 */
export const generateCalendarHistory = (userId, overrides = {}) => ({
  id: Math.floor(Math.random() * 10000),
  user_id: userId,
  course_name: 'CSCE 121',
  section_number: '501',
  semester_start: '2024-01-16',
  semester_end: '2024-05-03',
  timezone: 'America/Chicago',
  ics_file_path: `/downloads/calendar_${uuidv4()}.ics`,
  ics_file_content: validIcsContent,
  pdf_file_path: `/uploads/syllabus_${uuidv4()}.pdf`,
  created_at: new Date(),
  ...overrides
});

/**
 * Generate a syllabus cache record
 */
export const generateSyllabusCache = (overrides = {}) => ({
  id: Math.floor(Math.random() * 10000),
  sha256_hash: uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, ''), // 64 char hash
  ics_file_path: `/outputs/cached_${uuidv4()}.ics`,
  ics_file_content: validIcsContent,
  created_at: new Date(),
  ...overrides
});

/**
 * Generate ICS content with custom events
 */
export const generateIcsContent = (className, events = []) => {
  const eventStrings = events.map(event => `
BEGIN:VEVENT
DTSTART;TZID=America/Chicago:${event.start}
DTEND;TZID=America/Chicago:${event.end}
SUMMARY:${className} - ${event.title}
DESCRIPTION:${event.description || ''}
LOCATION:${event.location || ''}
END:VEVENT`).join('');

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AggieAce//NONSGML v1.0//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${className}
X-WR-TIMEZONE:America/Chicago${eventStrings}
END:VCALENDAR`;
};

/**
 * Generate a job ID
 */
export const generateJobId = () => uuidv4();

/**
 * Generate a SHA-256 hash (64 hex characters)
 */
export const generateHash = () => {
  const chars = '0123456789abcdef';
  return Array.from({ length: 64 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
};

// HTTP Request Helpers

/**
 * Create a mock multipart form data object for conversion tests
 */
export const createConversionFormData = (params = validConversionParams) => {
  return {
    className: params.className,
    sectionNumber: params.sectionNumber,
    semesterStart: params.semesterStart,
    semesterEnd: params.semesterEnd,
    timezone: params.timezone
  };
};

export default {
  fixturesDir,
  samplePdfPath,
  validConversionParams,
  validTimezones,
  validIcsContent,
  invalidConversionParams,
  generateUser,
  generateConversionParams,
  generateCalendarHistory,
  generateSyllabusCache,
  generateIcsContent,
  generateJobId,
  generateHash,
  createConversionFormData
};
