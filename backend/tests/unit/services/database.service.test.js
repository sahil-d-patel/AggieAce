/**
 * Unit Tests for Database Service
 *
 * Tests database operations with mocked database queries
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock the database config before importing the service
jest.unstable_mockModule('../../../src/config/db.config.js', () => ({
  query: jest.fn()
}));

describe('Database Service', () => {
  let databaseService;
  let mockQuery;

  beforeEach(async () => {
    // Reset modules to get fresh mocks
    jest.resetModules();

    // Import the mocked query function
    const dbConfig = await import('../../../src/config/db.config.js');
    mockQuery = dbConfig.query;

    // Import the database service
    databaseService = await import('../../../src/services/database.service.js');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // User Operations Tests

  describe('findOrCreateUser', () => {
    const userData = {
      googleId: 'google-123',
      email: 'test@example.com',
      name: 'Test User'
    };

    it('should create a new user when user does not exist', async () => {
      const newUser = {
        id: 1,
        google_id: userData.googleId,
        email: userData.email,
        name: userData.name,
        created_at: new Date(),
        updated_at: new Date()
      };

      // First query returns no existing user
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Second query creates and returns new user
      mockQuery.mockResolvedValueOnce({ rows: [newUser] });

      const result = await databaseService.findOrCreateUser(userData);

      expect(result).toEqual(newUser);
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery.mock.calls[0][0]).toContain('SELECT * FROM users');
      expect(mockQuery.mock.calls[1][0]).toContain('INSERT INTO users');
    });

    it('should update and return existing user', async () => {
      const existingUser = {
        id: 1,
        google_id: userData.googleId,
        email: 'old@example.com',
        name: 'Old Name'
      };

      const updatedUser = {
        ...existingUser,
        email: userData.email,
        name: userData.name,
        updated_at: new Date()
      };

      // First query returns existing user
      mockQuery.mockResolvedValueOnce({ rows: [existingUser] });
      // Second query updates and returns user
      mockQuery.mockResolvedValueOnce({ rows: [updatedUser] });

      const result = await databaseService.findOrCreateUser(userData);

      expect(result.email).toBe(userData.email);
      expect(result.name).toBe(userData.name);
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery.mock.calls[1][0]).toContain('UPDATE users');
    });

    it('should throw error on database failure', async () => {
      const dbError = new Error('Database connection failed');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(databaseService.findOrCreateUser(userData))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('findUserByGoogleId', () => {
    it('should return user when found', async () => {
      const user = {
        id: 1,
        google_id: 'google-123',
        email: 'test@example.com',
        name: 'Test User'
      };

      mockQuery.mockResolvedValueOnce({ rows: [user] });

      const result = await databaseService.findUserByGoogleId('google-123');

      expect(result).toEqual(user);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM users'),
        ['google-123']
      );
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await databaseService.findUserByGoogleId('non-existent');

      expect(result).toBeNull();
    });
  });

  // Calendar History Operations Tests

  describe('saveCalendarHistory', () => {
    const calendarData = {
      userId: 1,
      courseName: 'CSCE 121',
      sectionNumber: '501',
      semesterStart: '2024-01-16',
      semesterEnd: '2024-05-03',
      timezone: 'America/Chicago',
      icsFilePath: '/path/to/file.ics',
      icsFileContent: 'BEGIN:VCALENDAR...'
    };

    it('should save calendar history and return record', async () => {
      const savedRecord = {
        id: 1,
        ...calendarData,
        created_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [savedRecord] });

      const result = await databaseService.saveCalendarHistory(calendarData);

      expect(result).toEqual(savedRecord);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO calendar_history'),
        expect.arrayContaining([
          calendarData.userId,
          calendarData.courseName,
          calendarData.sectionNumber
        ])
      );
    });

    it('should handle optional pdfFilePath', async () => {
      const dataWithPdf = {
        ...calendarData,
        pdfFilePath: '/path/to/syllabus.pdf'
      };

      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, ...dataWithPdf }] });

      await databaseService.saveCalendarHistory(dataWithPdf);

      const queryArgs = mockQuery.mock.calls[0][1];
      expect(queryArgs).toContain('/path/to/syllabus.pdf');
    });

    it('should pass null for missing pdfFilePath', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await databaseService.saveCalendarHistory(calendarData);

      const queryArgs = mockQuery.mock.calls[0][1];
      expect(queryArgs[queryArgs.length - 1]).toBeNull();
    });
  });

  describe('getUserCalendarHistory', () => {
    it('should return calendar history with default pagination', async () => {
      const calendars = [
        { id: 1, course_name: 'CSCE 121', section_number: '501' },
        { id: 2, course_name: 'CSCE 221', section_number: '502' }
      ];

      mockQuery.mockResolvedValueOnce({ rows: calendars });

      const result = await databaseService.getUserCalendarHistory(1);

      expect(result).toEqual(calendars);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [1, 50, 0]  // userId, default limit, default offset
      );
    });

    it('should apply custom pagination options', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await databaseService.getUserCalendarHistory(1, { limit: 10, offset: 20 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [1, 10, 20]
      );
    });

    it('should order by created_at DESC', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await databaseService.getUserCalendarHistory(1);

      expect(mockQuery.mock.calls[0][0]).toContain('ORDER BY created_at DESC');
    });
  });

  describe('getCalendarById', () => {
    it('should return calendar when found and authorized', async () => {
      const calendar = {
        id: 5,
        user_id: 1,
        course_name: 'CSCE 121'
      };

      mockQuery.mockResolvedValueOnce({ rows: [calendar] });

      const result = await databaseService.getCalendarById(5, 1);

      expect(result).toEqual(calendar);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1 AND user_id = $2'),
        [5, 1]
      );
    });

    it('should return null when not found or unauthorized', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await databaseService.getCalendarById(999, 1);

      expect(result).toBeNull();
    });
  });

  describe('deleteCalendarHistory', () => {
    it('should return true when calendar deleted', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 5 }] });

      const result = await databaseService.deleteCalendarHistory(5, 1);

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM calendar_history'),
        [5, 1]
      );
    });

    it('should return false when calendar not found or unauthorized', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await databaseService.deleteCalendarHistory(999, 1);

      expect(result).toBe(false);
    });
  });

  describe('getUserCalendarCount', () => {
    it('should return count as integer', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '15' }] });

      const result = await databaseService.getUserCalendarCount(1);

      expect(result).toBe(15);
      expect(typeof result).toBe('number');
    });

    it('should return 0 for users with no calendars', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const result = await databaseService.getUserCalendarCount(1);

      expect(result).toBe(0);
    });
  });

  // Syllabus Cache Operations Tests

  describe('findCachedSyllabus', () => {
    const mockHash = 'abc123def456789';

    it('should return cached syllabus when found', async () => {
      const cached = {
        id: 1,
        sha256_hash: mockHash,
        ics_file_path: '/path/to/cached.ics',
        ics_file_content: 'BEGIN:VCALENDAR...'
      };

      mockQuery.mockResolvedValueOnce({ rows: [cached] });

      const result = await databaseService.findCachedSyllabus(mockHash);

      expect(result).toEqual(cached);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM syllabus_cache'),
        [mockHash]
      );
    });

    it('should return null when cache miss', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await databaseService.findCachedSyllabus('non-existent-hash');

      expect(result).toBeNull();
    });
  });

  describe('saveSyllabusCache', () => {
    const cacheData = {
      sha256Hash: 'abc123def456789',
      icsFilePath: '/path/to/file.ics',
      icsFileContent: 'BEGIN:VCALENDAR...'
    };

    it('should save new cache entry', async () => {
      const savedRecord = {
        id: 1,
        sha256_hash: cacheData.sha256Hash,
        ics_file_path: cacheData.icsFilePath,
        ics_file_content: cacheData.icsFileContent
      };

      mockQuery.mockResolvedValueOnce({ rows: [savedRecord] });

      const result = await databaseService.saveSyllabusCache(cacheData);

      expect(result).toEqual(savedRecord);
    });

    it('should use upsert to handle duplicates', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await databaseService.saveSyllabusCache(cacheData);

      const queryString = mockQuery.mock.calls[0][0];
      expect(queryString).toContain('ON CONFLICT');
      expect(queryString).toContain('DO UPDATE SET');
    });

    it('should update existing cache on conflict', async () => {
      const updatedRecord = {
        id: 1,
        sha256_hash: cacheData.sha256Hash,
        ics_file_path: '/new/path.ics',
        ics_file_content: 'UPDATED CONTENT'
      };

      mockQuery.mockResolvedValueOnce({ rows: [updatedRecord] });

      const result = await databaseService.saveSyllabusCache({
        ...cacheData,
        icsFilePath: '/new/path.ics',
        icsFileContent: 'UPDATED CONTENT'
      });

      expect(result.ics_file_path).toBe('/new/path.ics');
    });
  });

  // Error Handling Tests

  describe('Error Handling', () => {
    it('should propagate database errors from findUserByGoogleId', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection timeout'));

      await expect(databaseService.findUserByGoogleId('google-123'))
        .rejects.toThrow('Connection timeout');
    });

    it('should propagate database errors from saveCalendarHistory', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Constraint violation'));

      await expect(databaseService.saveCalendarHistory({
        userId: 1,
        courseName: 'Test',
        sectionNumber: '001',
        semesterStart: '2024-01-01',
        semesterEnd: '2024-05-01',
        timezone: 'America/Chicago',
        icsFilePath: '/test.ics',
        icsFileContent: 'content'
      })).rejects.toThrow('Constraint violation');
    });

    it('should propagate database errors from findCachedSyllabus', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Table not found'));

      await expect(databaseService.findCachedSyllabus('hash'))
        .rejects.toThrow('Table not found');
    });
  });
});
