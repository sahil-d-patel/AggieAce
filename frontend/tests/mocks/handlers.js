/**
 * MSW Request Handlers
 *
 * Mock API responses for testing
 */

import { rest } from 'msw';

const API_URL = 'http://localhost:5000/api';

// Sample Response Data

const sampleConversionResult = {
  fileName: 'CSCE_121_501.ics',
  downloadUrl: '/downloads/CSCE_121_501_abc123.ics',
  outputPath: '/outputs/CSCE_121_501_abc123.ics',
  pdfPath: '/uploads/syllabus_abc123.pdf',
  fromCache: false,
  pdfHash: 'a'.repeat(64),
  metadata: {
    className: 'CSCE 121',
    sectionNumber: '501',
    semesterStart: '01/16/2024',
    semesterEnd: '05/03/2024',
    timezone: 'America/Chicago'
  }
};

const sampleCalendarHistory = [
  {
    id: 1,
    course_name: 'CSCE 121',
    section_number: '501',
    semester_start: '2024-01-16',
    semester_end: '2024-05-03',
    timezone: 'America/Chicago',
    created_at: '2024-01-15T10:00:00Z'
  },
  {
    id: 2,
    course_name: 'MATH 151',
    section_number: '502',
    semester_start: '2024-01-16',
    semester_end: '2024-05-03',
    timezone: 'America/Chicago',
    created_at: '2024-01-14T09:00:00Z'
  }
];

const sampleQueueStats = {
  queueLength: 0,
  isProcessing: false,
  totalJobs: 5,
  rateLimits: {
    daily: { used: 10, limit: 100, remaining: 90, resetIn: 3600000 },
    minute: { used: 1, limit: 5, remaining: 4, resetIn: 30000 }
  }
};

// Request Handlers

export const handlers = [
  // Health Check
  rest.get(`${API_URL}/health`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        status: 'ok',
        message: 'AggieAce API is healthy',
        timestamp: new Date().toISOString()
      })
    );
  }),

  // Conversion Endpoints

  // Submit conversion (returns queued status)
  rest.post(`${API_URL}/conversion`, async (req, res, ctx) => {
    return res(
      ctx.status(202),
      ctx.json({
        success: true,
        message: 'Syllabus is being processed',
        status: 'queued',
        data: {
          jobId: 'test-job-123',
          position: 0,
          queueLength: 1,
          rateLimits: sampleQueueStats.rateLimits
        }
      })
    );
  }),

  // Get job status (returns completed)
  rest.get(`${API_URL}/conversion/status/:jobId`, (req, res, ctx) => {
    const { jobId } = req.params;

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Syllabus converted successfully',
        status: 'completed',
        data: {
          conversion: sampleConversionResult
        }
      })
    );
  }),

  // Get queue statistics
  rest.get(`${API_URL}/conversion/queue/stats`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: sampleQueueStats
      })
    );
  }),

  // Get cached ICS file
  rest.get(`${API_URL}/conversion/cached/:hash`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.set('Content-Type', 'text/calendar'),
      ctx.set('Content-Disposition', 'attachment; filename="calendar.ics"'),
      ctx.body('BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR')
    );
  }),

  // Save to Google Drive
  rest.post(`${API_URL}/conversion/save-to-drive`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Files saved to Google Drive successfully',
        data: {
          pdf: {
            id: 'drive_pdf_123',
            webViewLink: 'https://drive.google.com/file/d/pdf/view'
          },
          calendar: {
            id: 'drive_ics_456',
            webViewLink: 'https://drive.google.com/file/d/ics/view'
          },
          folderLink: 'https://drive.google.com/drive/folders/abc123'
        }
      })
    );
  }),

  // Authentication Endpoints

  // Get Google OAuth URL
  rest.get(`${API_URL}/auth/google`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        authUrl: 'https://accounts.google.com/o/oauth2/auth?client_id=test&redirect_uri=http://localhost:5000/api/auth/google/callback&scope=profile%20email'
      })
    );
  }),

  // Get user profile
  rest.get(`${API_URL}/auth/profile`, (req, res, ctx) => {
    const accessToken = req.headers.get('access_token');

    if (!accessToken) {
      return res(
        ctx.status(401),
        ctx.json({
          success: false,
          error: 'Unauthorized',
          message: 'Access token required'
        })
      );
    }

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          id: 'google_user_123',
          email: 'test@gmail.com',
          name: 'Test User',
          picture: 'https://lh3.googleusercontent.com/a/default'
        }
      })
    );
  }),

  // Calendar History Endpoints

  // Get calendar history
  rest.get(`${API_URL}/history`, (req, res, ctx) => {
    const accessToken = req.headers.get('access_token');

    if (!accessToken) {
      return res(
        ctx.status(401),
        ctx.json({
          success: false,
          error: 'Unauthorized'
        })
      );
    }

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          calendars: sampleCalendarHistory,
          total: sampleCalendarHistory.length,
          limit: 50,
          offset: 0
        }
      })
    );
  }),

  // Download calendar from history
  rest.get(`${API_URL}/history/:id/download`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.set('Content-Type', 'text/calendar'),
      ctx.body('BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//AggieAce//\nEND:VCALENDAR')
    );
  }),

  // Delete calendar from history
  rest.delete(`${API_URL}/history/:id`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Calendar deleted successfully'
      })
    );
  })
];

// Error Response Handlers (for testing error states)

export const errorHandlers = {
  // Conversion fails
  conversionError: rest.post(`${API_URL}/conversion`, (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({
        success: false,
        error: 'Conversion failed',
        message: 'Unable to process syllabus'
      })
    );
  }),

  // Job not found
  jobNotFound: rest.get(`${API_URL}/conversion/status/:jobId`, (req, res, ctx) => {
    return res(
      ctx.status(404),
      ctx.json({
        success: false,
        error: 'Job not found',
        message: 'Job ID not found or has expired'
      })
    );
  }),

  // Rate limited
  rateLimited: rest.post(`${API_URL}/conversion`, (req, res, ctx) => {
    return res(
      ctx.status(429),
      ctx.json({
        success: false,
        error: 'Rate limited',
        message: 'Daily API limit reached'
      })
    );
  }),

  // Validation error
  validationError: rest.post(`${API_URL}/conversion`, (req, res, ctx) => {
    return res(
      ctx.status(400),
      ctx.json({
        success: false,
        error: 'Validation error',
        errors: [
          { field: 'className', message: 'Class name is required' },
          { field: 'semesterStart', message: 'Invalid date format' }
        ]
      })
    );
  }),

  // Unauthorized
  unauthorized: rest.get(`${API_URL}/history`, (req, res, ctx) => {
    return res(
      ctx.status(401),
      ctx.json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired access token'
      })
    );
  })
};

export default handlers;
