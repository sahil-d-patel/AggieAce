#!/usr/bin/env node
/**
 * AggieAce Backend Server
 *
 * Main entry point for the Express server that handles:
 * - PDF file uploads
 * - Syllabus to calendar conversion
 * - Google Drive integration
 * - Authentication
 *
 * @author AggieAce Team
 * @version 1.0.0
 */

// Load environment variables FIRST (before any other imports that use them)
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import conversionRoutes from './src/routes/conversion.routes.js';
import authRoutes from './src/routes/auth.routes.js';
import healthRoutes from './src/routes/health.routes.js';
import historyRoutes from './src/routes/history.routes.js';

// Import middleware
import { errorHandler } from './src/middleware/error.middleware.js';
import { notFoundHandler } from './src/middleware/notFound.middleware.js';

// Import database
import { testConnection } from './src/config/db.config.js';

// Import cleanup service
import { cleanupOldFiles } from './src/services/conversion.service.js';

// Import document conversion service
import { checkLibreOfficeInstalled } from './src/services/document-conversion.service.js';

// Import database service
import { cleanupExpiredRefreshTokens } from './src/services/database.service.js';

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware Configuration

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true // Important for cookies
}));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser()); // Add cookie parser

// Static file serving for downloads
app.use('/downloads', express.static(path.join(__dirname, 'outputs')));

// API Routes

app.use('/api/health', healthRoutes);
app.use('/api/conversion', conversionRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/history', historyRoutes);

// Error Handling Middleware

app.use(notFoundHandler);
app.use(errorHandler);

// Server Initialization

app.listen(PORT, async () => {
  console.log('AggieAce Backend Server');
  console.log('Syllabus Amplified, Life Simplified');
  console.log('');
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log('');

  // Test database connection
  await testConnection();
  console.log('');

  // Check LibreOffice availability for DOCX conversion
  await checkLibreOfficeInstalled();
  console.log('');

  // Start cleanup scheduler (runs every hour, cleans files older than 1 hour)
  const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
  const CLEANUP_MAX_AGE_HOURS = 1;

  setInterval(async () => {
    console.log('Running scheduled cleanup...');
    try {
      const result = await cleanupOldFiles(CLEANUP_MAX_AGE_HOURS);
      console.log(`Cleanup complete: ${result.deletedCount} files deleted`);
    } catch (err) {
      console.error('Cleanup failed:', err.message);
    }
  }, CLEANUP_INTERVAL_MS);

  console.log(`Cleanup scheduler: every ${CLEANUP_INTERVAL_MS / 60000} min (files older than ${CLEANUP_MAX_AGE_HOURS}h)`);
  console.log('');

  // Cleanup expired refresh tokens daily
  setInterval(async () => {
    try {
      const deleted = await cleanupExpiredRefreshTokens();
      if (deleted > 0) {
        console.log(`Cleaned up ${deleted} expired refresh tokens`);
      }
    } catch (error) {
      console.error('Error cleaning up refresh tokens:', error);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours

  console.log('Available endpoints:');
  console.log('   - GET  /api/health              - Health check');
  console.log('   - POST /api/conversion          - Convert syllabus to calendar');
  console.log('   - GET  /api/conversion/status/:id - Check job status');
  console.log('   - GET  /api/conversion/queue/stats - Queue statistics');
  console.log('   - GET  /api/auth/google         - Google OAuth login');
  console.log('   - GET  /api/history             - Get calendar history');
  console.log('');
  console.log(`Queue limits: ${process.env.MAX_API_PER_DAY || 100}/day, ${process.env.MAX_API_PER_MINUTE || 5}/min`);
  console.log('');
  console.log('Server ready to accept requests!');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

export default app;
