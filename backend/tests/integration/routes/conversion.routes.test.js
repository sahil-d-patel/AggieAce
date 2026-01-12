/**
 * Integration Tests for Conversion Routes
 *
 * Tests the conversion API endpoints with supertest
 */

import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a minimal test app
let app;
let mockSyllabusQueue;

// Mock external dependencies before imports
jest.unstable_mockModule('../../../src/services/queue.service.js', () => {
  const jobs = new Map();
  let jobCounter = 0;

  return {
    syllabusQueue: {
      addJob: jest.fn((params) => {
        const jobId = `test-job-${++jobCounter}`;
        jobs.set(jobId, {
          jobId,
          status: 'queued',
          params,
          position: 0
        });
        return {
          jobId,
          status: 'queued',
          position: 0,
          queueLength: 1,
          rateLimits: { daily: { used: 0, remaining: 100 }, minute: { used: 0, remaining: 5 } }
        };
      }),
      getJobStatus: jest.fn((jobId) => {
        const job = jobs.get(jobId);
        if (!job) return null;
        return {
          jobId,
          status: job.status,
          position: 0,
          queueLength: 1,
          result: job.result || null,
          error: job.error || null,
          rateLimits: { daily: { used: 0, remaining: 100 }, minute: { used: 0, remaining: 5 } }
        };
      }),
      getQueueStats: jest.fn(() => ({
        queueLength: 0,
        totalJobs: 1,
        isProcessing: false,
        rateLimits: {
          daily: { limit: 100, used: 0, remaining: 100 },
          minute: { limit: 5, used: 0, remaining: 5 }
        }
      })),
      jobs
    },
    JobStatus: {
      QUEUED: 'queued',
      PROCESSING: 'processing',
      COMPLETED: 'completed',
      FAILED: 'failed',
      RATE_LIMITED: 'rate_limited'
    }
  };
});

jest.unstable_mockModule('../../../src/services/database.service.js', () => ({
  findCachedSyllabus: jest.fn().mockResolvedValue(null),
  saveSyllabusCache: jest.fn().mockResolvedValue({}),
  findOrCreateUser: jest.fn().mockResolvedValue({ id: 1 }),
  saveCalendarHistory: jest.fn().mockResolvedValue({})
}));

jest.unstable_mockModule('../../../src/services/conversion.service.js', () => ({
  calculateFileHash: jest.fn().mockResolvedValue('a'.repeat(64)),
  convertSyllabusToCalendar: jest.fn().mockResolvedValue({
    outputPath: '/tmp/test.ics',
    icsContent: 'BEGIN:VCALENDAR\nEND:VCALENDAR'
  })
}));

describe('Conversion Routes', () => {
  let queueService;
  let databaseService;

  beforeAll(async () => {
    // Import mocked modules
    queueService = await import('../../../src/services/queue.service.js');
    databaseService = await import('../../../src/services/database.service.js');

    // Create test Express app
    const { upload } = await import('../../../src/config/multer.config.js');
    const { conversionValidationRules, validate } = await import('../../../src/middleware/validation.middleware.js');
    const { asyncHandler } = await import('../../../src/middleware/error.middleware.js');
    const controllers = await import('../../../src/controllers/conversion.controller.js');

    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Set up routes
    app.post('/api/conversion',
      upload.single('file'),
      conversionValidationRules,
      validate,
      asyncHandler(controllers.convertSyllabus)
    );

    app.get('/api/conversion/status/:jobId',
      asyncHandler(controllers.getJobStatus)
    );

    app.get('/api/conversion/queue/stats',
      asyncHandler(controllers.getQueueStats)
    );

    app.get('/api/conversion/cached/:hash',
      asyncHandler(controllers.serveCachedIcs)
    );

    // Error handler
    app.use((err, req, res, next) => {
      console.error('Test error:', err);
      res.status(500).json({ success: false, error: err.message });
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // POST /api/conversion Tests

  describe('POST /api/conversion', () => {
    const validFormData = {
      className: 'CSCE 121',
      sectionNumber: '501',
      semesterStart: '01/16/2024',
      semesterEnd: '05/03/2024',
      timezone: 'America/Chicago'
    };

    it('should return 400 when no file is uploaded', async () => {
      const response = await request(app)
        .post('/api/conversion')
        .field('className', validFormData.className)
        .field('sectionNumber', validFormData.sectionNumber)
        .field('semesterStart', validFormData.semesterStart)
        .field('semesterEnd', validFormData.semesterEnd)
        .field('timezone', validFormData.timezone);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No file uploaded');
    });

    it('should return 400 for invalid date format', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 test content');

      const response = await request(app)
        .post('/api/conversion')
        .attach('file', pdfBuffer, 'test.pdf')
        .field('className', 'CSCE 121')
        .field('sectionNumber', '501')
        .field('semesterStart', '2024-01-16')  // Wrong format
        .field('semesterEnd', '05/03/2024')
        .field('timezone', 'America/Chicago');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation error');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'semesterStart'
          })
        ])
      );
    });

    it('should return 400 for invalid timezone', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 test content');

      const response = await request(app)
        .post('/api/conversion')
        .attach('file', pdfBuffer, 'test.pdf')
        .field('className', 'CSCE 121')
        .field('sectionNumber', '501')
        .field('semesterStart', '01/16/2024')
        .field('semesterEnd', '05/03/2024')
        .field('timezone', 'Invalid/Timezone');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'timezone',
            message: expect.stringContaining('Invalid timezone')
          })
        ])
      );
    });

    it('should return 400 for empty className', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 test content');

      const response = await request(app)
        .post('/api/conversion')
        .attach('file', pdfBuffer, 'test.pdf')
        .field('className', '')
        .field('sectionNumber', '501')
        .field('semesterStart', '01/16/2024')
        .field('semesterEnd', '05/03/2024')
        .field('timezone', 'America/Chicago');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'className'
          })
        ])
      );
    });

    it('should return 202 when valid PDF is uploaded and queued', async () => {
      // Reset mock to ensure no cache hit
      databaseService.findCachedSyllabus.mockResolvedValue(null);

      const pdfBuffer = Buffer.from('%PDF-1.4 test content');

      const response = await request(app)
        .post('/api/conversion')
        .attach('file', pdfBuffer, 'syllabus.pdf')
        .field('className', validFormData.className)
        .field('sectionNumber', validFormData.sectionNumber)
        .field('semesterStart', validFormData.semesterStart)
        .field('semesterEnd', validFormData.semesterEnd)
        .field('timezone', validFormData.timezone);

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('queued');
      expect(response.body.data.jobId).toBeDefined();
    });

    it('should return 200 with cached result when cache hit', async () => {
      databaseService.findCachedSyllabus.mockResolvedValue({
        sha256_hash: 'a'.repeat(64),
        ics_file_content: 'BEGIN:VCALENDAR\nEND:VCALENDAR',
        ics_file_path: '/cached/path.ics'
      });

      const pdfBuffer = Buffer.from('%PDF-1.4 test content');

      const response = await request(app)
        .post('/api/conversion')
        .attach('file', pdfBuffer, 'syllabus.pdf')
        .field('className', validFormData.className)
        .field('sectionNumber', validFormData.sectionNumber)
        .field('semesterStart', validFormData.semesterStart)
        .field('semesterEnd', validFormData.semesterEnd)
        .field('timezone', validFormData.timezone);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('completed');
      expect(response.body.data.conversion.fromCache).toBe(true);
    });
  });

  // GET /api/conversion/status/:jobId Tests

  describe('GET /api/conversion/status/:jobId', () => {
    it('should return 404 for non-existent job ID', async () => {
      queueService.syllabusQueue.getJobStatus.mockReturnValue(null);

      const response = await request(app)
        .get('/api/conversion/status/non-existent-job-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Job not found');
    });

    it('should return job status for valid job ID', async () => {
      queueService.syllabusQueue.getJobStatus.mockReturnValue({
        jobId: 'test-job-123',
        status: 'queued',
        position: 2,
        queueLength: 3,
        rateLimits: { daily: { used: 5, remaining: 95 }, minute: { used: 1, remaining: 4 } }
      });

      const response = await request(app)
        .get('/api/conversion/status/test-job-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('queued');
      expect(response.body.data.position).toBe(2);
    });

    it('should return completed status with download URL', async () => {
      queueService.syllabusQueue.getJobStatus.mockReturnValue({
        jobId: 'test-job-123',
        status: 'completed',
        result: {
          outputFileName: 'CSCE_121_501.ics',
          downloadUrl: '/api/conversion/cached/abc123',
          outputPath: '/tmp/output.ics',
          fromCache: false,
          pdfHash: 'abc123',
          metadata: { className: 'CSCE 121', sectionNumber: '501' }
        },
        rateLimits: { daily: { used: 5, remaining: 95 }, minute: { used: 1, remaining: 4 } }
      });

      const response = await request(app)
        .get('/api/conversion/status/test-job-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('completed');
      expect(response.body.data.conversion.downloadUrl).toBeDefined();
    });

    it('should return failed status with error message', async () => {
      queueService.syllabusQueue.getJobStatus.mockReturnValue({
        jobId: 'test-job-123',
        status: 'failed',
        error: { message: 'Processing failed' },
        rateLimits: { daily: { used: 5, remaining: 95 }, minute: { used: 1, remaining: 4 } }
      });

      const response = await request(app)
        .get('/api/conversion/status/test-job-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.status).toBe('failed');
      expect(response.body.error).toBe('Processing failed');
    });
  });

  // GET /api/conversion/queue/stats Tests

  describe('GET /api/conversion/queue/stats', () => {
    it('should return queue statistics', async () => {
      queueService.syllabusQueue.getQueueStats.mockReturnValue({
        queueLength: 3,
        totalJobs: 10,
        isProcessing: true,
        rateLimits: {
          daily: { limit: 100, used: 25, remaining: 75 },
          minute: { limit: 5, used: 2, remaining: 3 }
        }
      });

      const response = await request(app)
        .get('/api/conversion/queue/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.queueLength).toBe(3);
      expect(response.body.data.totalJobs).toBe(10);
      expect(response.body.data.isProcessing).toBe(true);
      expect(response.body.data.rateLimits).toBeDefined();
    });
  });

  // GET /api/conversion/cached/:hash Tests

  describe('GET /api/conversion/cached/:hash', () => {
    it('should return 400 for invalid hash format', async () => {
      const response = await request(app)
        .get('/api/conversion/cached/short-hash');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid hash');
    });

    it('should return 404 when cache not found', async () => {
      databaseService.findCachedSyllabus.mockResolvedValue(null);

      const validHash = 'a'.repeat(64);
      const response = await request(app)
        .get(`/api/conversion/cached/${validHash}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Not found');
    });

    it('should return ICS file when cached', async () => {
      const icsContent = 'BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR';
      databaseService.findCachedSyllabus.mockResolvedValue({
        sha256_hash: 'a'.repeat(64),
        ics_file_content: icsContent,
        ics_file_path: '/cached/path.ics'
      });

      const validHash = 'a'.repeat(64);
      const response = await request(app)
        .get(`/api/conversion/cached/${validHash}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/calendar');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toBe(icsContent);
    });

    it('should use custom filename when provided', async () => {
      const icsContent = 'BEGIN:VCALENDAR\nEND:VCALENDAR';
      databaseService.findCachedSyllabus.mockResolvedValue({
        sha256_hash: 'a'.repeat(64),
        ics_file_content: icsContent,
        ics_file_path: '/cached/path.ics'
      });

      const validHash = 'a'.repeat(64);
      const response = await request(app)
        .get(`/api/conversion/cached/${validHash}?filename=my_calendar.ics`);

      expect(response.status).toBe(200);
      expect(response.headers['content-disposition']).toContain('my_calendar.ics');
    });
  });
});
