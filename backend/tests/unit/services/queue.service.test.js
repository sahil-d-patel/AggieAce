/**
 * Unit Tests for Queue Service
 *
 * Tests rate limiting, job management, and queue operations
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock the conversion service before importing queue service
jest.unstable_mockModule('../../../src/services/conversion.service.js', () => ({
  convertSyllabusToCalendar: jest.fn()
}));

describe('SyllabusQueue', () => {
  let syllabusQueue, JobStatus;
  let mockConvert;

  beforeEach(async () => {
    // Use fake timers for rate limit testing
    jest.useFakeTimers();

    // Clear module cache to get fresh instance
    jest.resetModules();

    // Import the mocked conversion service
    const conversionService = await import('../../../src/services/conversion.service.js');
    mockConvert = conversionService.convertSyllabusToCalendar;

    // Import queue service (creates new instance)
    const queueModule = await import('../../../src/services/queue.service.js');
    syllabusQueue = queueModule.syllabusQueue;
    JobStatus = queueModule.JobStatus;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  // Rate Limiting Tests

  describe('Rate Limiting', () => {
    it('should initialize with correct rate limit configuration', () => {
      const status = syllabusQueue.getRateLimitStatus();

      expect(status.daily.limit).toBe(100);
      expect(status.minute.limit).toBe(5);
      expect(status.daily.used).toBe(0);
      expect(status.minute.used).toBe(0);
    });

    it('should track daily API usage correctly', () => {
      syllabusQueue.incrementRateLimitCounters();
      syllabusQueue.incrementRateLimitCounters();
      syllabusQueue.incrementRateLimitCounters();

      const status = syllabusQueue.getRateLimitStatus();

      expect(status.daily.used).toBe(3);
      expect(status.daily.remaining).toBe(97);
    });

    it('should track per-minute API usage correctly', () => {
      syllabusQueue.incrementRateLimitCounters();
      syllabusQueue.incrementRateLimitCounters();

      const status = syllabusQueue.getRateLimitStatus();

      expect(status.minute.used).toBe(2);
      expect(status.minute.remaining).toBe(3);
    });

    it('should allow API calls when under limits', () => {
      const check = syllabusQueue.canMakeApiCall();

      expect(check.allowed).toBe(true);
      expect(check.reason).toBeUndefined();
    });

    it('should block API calls when per-minute limit is reached', () => {
      // Use up all 5 per-minute calls
      for (let i = 0; i < 5; i++) {
        syllabusQueue.incrementRateLimitCounters();
      }

      const check = syllabusQueue.canMakeApiCall();

      expect(check.allowed).toBe(false);
      expect(check.reason).toBe('minute_limit');
      expect(check.resetIn).toBeDefined();
    });

    it('should block API calls when daily limit is reached', () => {
      // Use up all 100 daily calls
      for (let i = 0; i < 100; i++) {
        syllabusQueue.incrementRateLimitCounters();
      }

      // Reset minute counter to isolate daily limit test
      syllabusQueue.rateLimitState.minuteCount = 0;

      const check = syllabusQueue.canMakeApiCall();

      expect(check.allowed).toBe(false);
      expect(check.reason).toBe('daily_limit');
    });

    it('should reset minute counter after 60 seconds', () => {
      // Use up minute limit
      for (let i = 0; i < 5; i++) {
        syllabusQueue.incrementRateLimitCounters();
      }

      expect(syllabusQueue.canMakeApiCall().allowed).toBe(false);

      // Advance time by 60 seconds
      jest.advanceTimersByTime(60000);

      // After reset, should be allowed again
      expect(syllabusQueue.rateLimitState.minuteCount).toBe(0);
    });
  });

  // Job Management Tests

  describe('Job Management', () => {
    const sampleJobParams = {
      pdfPath: '/tmp/test.pdf',
      className: 'CSCE 121',
      sectionNumber: '501',
      semesterStart: '01/16/2024',
      semesterEnd: '05/03/2024',
      timezone: 'America/Chicago'
    };

    it('should add a job to the queue and return job info', () => {
      const jobInfo = syllabusQueue.addJob(sampleJobParams);

      expect(jobInfo.jobId).toBeDefined();
      expect(typeof jobInfo.jobId).toBe('string');
      // First job immediately moves to processing when queue is empty
      expect(jobInfo.status).toBe(JobStatus.PROCESSING);
      expect(jobInfo.queueLength).toBeGreaterThanOrEqual(1);
    });

    it('should return position 0 for first job', () => {
      const jobInfo = syllabusQueue.addJob(sampleJobParams);

      expect(jobInfo.position).toBe(0);
    });

    it('should increment position for subsequent jobs', () => {
      // Prevent auto-processing by using up rate limit
      for (let i = 0; i < 5; i++) {
        syllabusQueue.incrementRateLimitCounters();
      }

      const job1 = syllabusQueue.addJob({ ...sampleJobParams, pdfPath: '/test1.pdf' });
      const job2 = syllabusQueue.addJob({ ...sampleJobParams, pdfPath: '/test2.pdf' });
      const job3 = syllabusQueue.addJob({ ...sampleJobParams, pdfPath: '/test3.pdf' });

      expect(job1.position).toBe(0);
      expect(job2.position).toBe(1);
      expect(job3.position).toBe(2);
    });

    it('should retrieve job status by ID', () => {
      const jobInfo = syllabusQueue.addJob(sampleJobParams);

      const status = syllabusQueue.getJobStatus(jobInfo.jobId);

      expect(status).not.toBeNull();
      expect(status.jobId).toBe(jobInfo.jobId);
      // First job should be in processing status
      expect(status.status).toBe(JobStatus.PROCESSING);
    });

    it('should return null for non-existent job ID', () => {
      const status = syllabusQueue.getJobStatus('non-existent-id-12345');

      expect(status).toBeNull();
    });

    it('should include rate limits in job status', () => {
      const jobInfo = syllabusQueue.addJob(sampleJobParams);

      const status = syllabusQueue.getJobStatus(jobInfo.jobId);

      expect(status.rateLimits).toBeDefined();
      expect(status.rateLimits.daily).toBeDefined();
      expect(status.rateLimits.minute).toBeDefined();
    });
  });

  // Job Cancellation Tests

  describe('Job Cancellation', () => {
    const sampleJobParams = {
      pdfPath: '/tmp/test.pdf',
      className: 'CSCE 121',
      sectionNumber: '501',
      semesterStart: '01/16/2024',
      semesterEnd: '05/03/2024',
      timezone: 'America/Chicago'
    };

    it('should cancel a queued job successfully', () => {
      // Prevent auto-processing
      for (let i = 0; i < 5; i++) {
        syllabusQueue.incrementRateLimitCounters();
      }

      const jobInfo = syllabusQueue.addJob(sampleJobParams);

      const cancelled = syllabusQueue.cancelJob(jobInfo.jobId);

      expect(cancelled).toBe(true);

      const status = syllabusQueue.getJobStatus(jobInfo.jobId);
      expect(status.status).toBe(JobStatus.FAILED);
      expect(status.error).toBeDefined();
    });

    it('should return false when cancelling non-existent job', () => {
      const cancelled = syllabusQueue.cancelJob('non-existent-id');

      expect(cancelled).toBe(false);
    });

    it('should remove cancelled job from queue', () => {
      // Prevent auto-processing
      for (let i = 0; i < 5; i++) {
        syllabusQueue.incrementRateLimitCounters();
      }

      const job1 = syllabusQueue.addJob({ ...sampleJobParams, pdfPath: '/test1.pdf' });
      const job2 = syllabusQueue.addJob({ ...sampleJobParams, pdfPath: '/test2.pdf' });

      syllabusQueue.cancelJob(job1.jobId);

      const stats = syllabusQueue.getQueueStats();
      // Job 2 should now be at position 0
      const job2Status = syllabusQueue.getJobStatus(job2.jobId);
      expect(job2Status.position).toBe(0);
    });
  });

  // Queue Statistics Tests

  describe('Queue Statistics', () => {
    it('should return accurate queue statistics', () => {
      // Prevent auto-processing
      for (let i = 0; i < 5; i++) {
        syllabusQueue.incrementRateLimitCounters();
      }

      syllabusQueue.addJob({ pdfPath: '/test1.pdf' });
      syllabusQueue.addJob({ pdfPath: '/test2.pdf' });

      const stats = syllabusQueue.getQueueStats();

      expect(stats.queueLength).toBeGreaterThanOrEqual(1);
      expect(stats.totalJobs).toBeGreaterThanOrEqual(2);
      expect(stats.isProcessing).toBe(false);
      expect(stats.rateLimits).toBeDefined();
    });

    it('should track total jobs correctly', () => {
      // Prevent auto-processing
      for (let i = 0; i < 5; i++) {
        syllabusQueue.incrementRateLimitCounters();
      }

      const initialStats = syllabusQueue.getQueueStats();
      const initialTotal = initialStats.totalJobs;

      syllabusQueue.addJob({ pdfPath: '/test1.pdf' });
      syllabusQueue.addJob({ pdfPath: '/test2.pdf' });

      const finalStats = syllabusQueue.getQueueStats();

      expect(finalStats.totalJobs).toBe(initialTotal + 2);
    });
  });

  // Job Status Enum Tests

  describe('JobStatus Enum', () => {
    it('should have all required status values', () => {
      expect(JobStatus.QUEUED).toBe('queued');
      expect(JobStatus.PROCESSING).toBe('processing');
      expect(JobStatus.COMPLETED).toBe('completed');
      expect(JobStatus.FAILED).toBe('failed');
      expect(JobStatus.RATE_LIMITED).toBe('rate_limited');
    });
  });
});
