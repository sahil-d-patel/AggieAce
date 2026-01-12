/**
 * Queue Service
 *
 * Manages a FIFO queue for syllabus processing with rate limiting.
 * Only one syllabus is processed at a time.
 *
 * @module services/queue
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { convertSyllabusToCalendar } from './conversion.service.js';

// Configuration from environment variables
const MAX_API_PER_DAY = parseInt(process.env.MAX_API_PER_DAY) || 100;
const MAX_API_PER_MINUTE = parseInt(process.env.MAX_API_PER_MINUTE) || 5;

/**
 * Job status enum
 */
export const JobStatus = {
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  RATE_LIMITED: 'rate_limited'
};

/**
 * Queue class for managing syllabus processing jobs
 */
class SyllabusQueue extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.jobs = new Map(); // jobId -> job data
    this.isProcessing = false;
    this.rateLimitState = {
      dailyCount: 0,
      minuteCount: 0,
      dailyResetTime: this.getNextDayReset(),
      minuteResetTime: this.getNextMinuteReset()
    };

    // Start rate limit reset timers
    this.startRateLimitResetTimers();
  }

  /**
   * Get the next day reset timestamp (midnight)
   */
  getNextDayReset() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }

  /**
   * Get the next minute reset timestamp
   */
  getNextMinuteReset() {
    return Date.now() + 60000;
  }

  /**
   * Start timers to reset rate limits
   */
  startRateLimitResetTimers() {
    // Reset minute counter every minute
    setInterval(() => {
      this.rateLimitState.minuteCount = 0;
      this.rateLimitState.minuteResetTime = this.getNextMinuteReset();
      console.log('Queue: Minute rate limit reset');

      // Try to process next job if rate limit was blocking
      this.processNext();
    }, 60000);

    // Reset daily counter at midnight
    const msUntilMidnight = this.rateLimitState.dailyResetTime - Date.now();
    setTimeout(() => {
      this.rateLimitState.dailyCount = 0;
      this.rateLimitState.dailyResetTime = this.getNextDayReset();
      console.log('Queue: Daily rate limit reset');

      // Set up recurring daily reset
      setInterval(() => {
        this.rateLimitState.dailyCount = 0;
        this.rateLimitState.dailyResetTime = this.getNextDayReset();
        console.log('Queue: Daily rate limit reset');
        this.processNext();
      }, 24 * 60 * 60 * 1000);

      this.processNext();
    }, msUntilMidnight);
  }

  /**
   * Check if we can make an API call based on rate limits
   */
  canMakeApiCall() {
    // Check daily limit
    if (this.rateLimitState.dailyCount >= MAX_API_PER_DAY) {
      return {
        allowed: false,
        reason: 'daily_limit',
        resetIn: this.rateLimitState.dailyResetTime - Date.now()
      };
    }

    // Check per-minute limit
    if (this.rateLimitState.minuteCount >= MAX_API_PER_MINUTE) {
      return {
        allowed: false,
        reason: 'minute_limit',
        resetIn: this.rateLimitState.minuteResetTime - Date.now()
      };
    }

    return { allowed: true };
  }

  /**
   * Increment rate limit counters
   */
  incrementRateLimitCounters() {
    this.rateLimitState.dailyCount++;
    this.rateLimitState.minuteCount++;
  }

  /**
   * Add a job to the queue
   *
   * @param {Object} params - Job parameters
   * @param {string} params.pdfPath - Path to the uploaded PDF file
   * @param {string} params.className - Name of the class
   * @param {string} params.sectionNumber - Section number
   * @param {string} params.semesterStart - Semester start date
   * @param {string} params.semesterEnd - Semester end date
   * @param {string} params.timezone - Timezone for the calendar
   * @param {Object} params.requestData - Additional request data (for history saving)
   * @returns {Object} Job info with ID and queue position
   */
  addJob(params) {
    const jobId = uuidv4();
    const job = {
      id: jobId,
      params,
      status: JobStatus.QUEUED,
      createdAt: Date.now(),
      result: null,
      error: null
    };

    this.jobs.set(jobId, job);
    this.queue.push(jobId);

    const position = this.queue.indexOf(jobId);
    console.log(`Queue: Job ${jobId} added at position ${position + 1}`);

    // Try to process immediately if nothing is processing
    this.processNext();

    return {
      jobId,
      status: job.status,
      position: position,
      queueLength: this.queue.length,
      rateLimits: this.getRateLimitStatus()
    };
  }

  /**
   * Get job status
   *
   * @param {string} jobId - Job ID
   * @returns {Object|null} Job status or null if not found
   */
  getJobStatus(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) {
      return null;
    }

    const position = this.queue.indexOf(jobId);
    const jobsAhead = position >= 0 ? position : 0;

    return {
      jobId: job.id,
      status: job.status,
      position: jobsAhead,
      queueLength: this.queue.length,
      createdAt: job.createdAt,
      result: job.result,
      error: job.error,
      rateLimits: this.getRateLimitStatus()
    };
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus() {
    return {
      daily: {
        used: this.rateLimitState.dailyCount,
        limit: MAX_API_PER_DAY,
        remaining: MAX_API_PER_DAY - this.rateLimitState.dailyCount,
        resetIn: this.rateLimitState.dailyResetTime - Date.now()
      },
      minute: {
        used: this.rateLimitState.minuteCount,
        limit: MAX_API_PER_MINUTE,
        remaining: MAX_API_PER_MINUTE - this.rateLimitState.minuteCount,
        resetIn: this.rateLimitState.minuteResetTime - Date.now()
      }
    };
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      totalJobs: this.jobs.size,
      rateLimits: this.getRateLimitStatus()
    };
  }

  /**
   * Process the next job in the queue
   */
  async processNext() {
    // Don't start if already processing
    if (this.isProcessing) {
      return;
    }

    // Check if there are jobs to process
    if (this.queue.length === 0) {
      return;
    }

    // Check rate limits
    const rateLimitCheck = this.canMakeApiCall();
    if (!rateLimitCheck.allowed) {
      console.log(`Queue: Rate limited (${rateLimitCheck.reason}), waiting...`);
      return;
    }

    // Get next job
    const jobId = this.queue[0];
    const job = this.jobs.get(jobId);

    if (!job) {
      this.queue.shift();
      this.processNext();
      return;
    }

    // Start processing
    this.isProcessing = true;
    job.status = JobStatus.PROCESSING;
    console.log(`Queue: Processing job ${jobId}`);

    try {
      // Increment rate limit counters before making the API call
      this.incrementRateLimitCounters();

      // Process the syllabus
      const result = await convertSyllabusToCalendar(job.params);

      job.status = JobStatus.COMPLETED;
      job.result = result;
      job.completedAt = Date.now();

      console.log(`Queue: Job ${jobId} completed`);
      this.emit('jobCompleted', { jobId, result });

    } catch (error) {
      job.status = JobStatus.FAILED;
      job.error = {
        message: error.message || 'Conversion failed',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
      job.completedAt = Date.now();

      console.error(`Queue: Job ${jobId} failed:`, error.message);
      this.emit('jobFailed', { jobId, error: job.error });
    }

    // Remove from queue
    this.queue.shift();
    this.isProcessing = false;

    // Clean up old completed/failed jobs after 1 hour
    this.scheduleJobCleanup(jobId);

    // Process next job
    this.processNext();
  }

  /**
   * Schedule cleanup of a completed job
   *
   * @param {string} jobId - Job ID to clean up
   */
  scheduleJobCleanup(jobId) {
    setTimeout(() => {
      const job = this.jobs.get(jobId);
      if (job && (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED)) {
        this.jobs.delete(jobId);
        console.log(`Queue: Cleaned up job ${jobId}`);
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Cancel a queued job
   *
   * @param {string} jobId - Job ID to cancel
   * @returns {boolean} True if cancelled, false if not found or already processing
   */
  cancelJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    // Can only cancel queued jobs
    if (job.status !== JobStatus.QUEUED) {
      return false;
    }

    // Remove from queue
    const index = this.queue.indexOf(jobId);
    if (index > -1) {
      this.queue.splice(index, 1);
    }

    // Update job status
    job.status = JobStatus.FAILED;
    job.error = { message: 'Job cancelled by user' };
    job.completedAt = Date.now();

    this.scheduleJobCleanup(jobId);

    console.log(`Queue: Job ${jobId} cancelled`);
    return true;
  }
}

// Export singleton instance
export const syllabusQueue = new SyllabusQueue();

export default {
  syllabusQueue,
  JobStatus
};
