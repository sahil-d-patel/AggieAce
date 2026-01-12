/**
 * Conversion Routes
 *
 * Defines routes for syllabus to calendar conversion
 *
 * @module routes/conversion
 */

import express from 'express';
import { upload } from '../config/multer.config.js';
import { convertSyllabus, saveToDrive, serveCachedIcs, getJobStatus, getQueueStats } from '../controllers/conversion.controller.js';
import { conversionValidationRules, validate } from '../middleware/validation.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';

const router = express.Router();

/**
 * @route   POST /api/conversion
 * @desc    Convert syllabus PDF to iCalendar format
 * @access  Public
 * @body    {File} file - PDF file
 * @body    {string} className - Class name
 * @body    {string} sectionNumber - Section number
 * @body    {string} semesterStart - Semester start date (MM/DD/YYYY)
 * @body    {string} semesterEnd - Semester end date (MM/DD/YYYY)
 * @body    {string} timezone - Timezone
 * @body    {string} [googleAccessToken] - Optional Google access token for Drive upload
 */
router.post(
  '/',
  upload.single('file'),
  conversionValidationRules,
  validate,
  asyncHandler(convertSyllabus)
);

/**
 * @route   POST /api/conversion/save-to-drive
 * @desc    Manually save converted files to Google Drive
 * @access  Public (requires Google access token)
 * @body    {string} googleAccessToken - Google access token
 * @body    {string} pdfPath - Path to PDF file on server
 * @body    {string} icsPath - Path to ICS file on server
 * @body    {string} [folderName] - Optional custom folder name (defaults to "AggieAce")
 * @body    {Object} metadata - File metadata
 */
router.post(
  '/save-to-drive',
  asyncHandler(saveToDrive)
);

/**
 * @route   GET /api/conversion/cached/:hash
 * @desc    Download cached .ics file directly from database (no file system)
 * @access  Public
 * @param   {string} hash - SHA-256 hash of the original PDF
 * @query   {string} [filename] - Optional custom filename for download
 */
router.get(
  '/cached/:hash',
  asyncHandler(serveCachedIcs)
);

/**
 * @route   GET /api/conversion/status/:jobId
 * @desc    Get status of a queued/processing conversion job
 * @access  Public
 * @param   {string} jobId - Job ID returned from POST /api/conversion
 * @query   {string} [googleAccessToken] - Optional Google access token for saving to history
 */
router.get(
  '/status/:jobId',
  asyncHandler(getJobStatus)
);

/**
 * @route   GET /api/conversion/queue/stats
 * @desc    Get queue statistics and rate limit status
 * @access  Public
 */
router.get(
  '/queue/stats',
  asyncHandler(getQueueStats)
);

export default router;
