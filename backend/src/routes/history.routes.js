/**
 * History Routes
 *
 * API routes for calendar history management
 *
 * @module routes/history
 */

import express from 'express';
import {
  getHistory,
  getCalendar,
  downloadCalendar,
  deleteCalendar,
  authenticateUser
} from '../controllers/history.controller.js';

const router = express.Router();

/**
 * All history routes require authentication
 */
router.use(authenticateUser);

/**
 * @route   GET /api/history
 * @desc    Get user's calendar history
 * @access  Private (requires access token)
 * @query   limit - Number of items per page (default: 50)
 * @query   offset - Number of items to skip (default: 0)
 */
router.get('/', getHistory);

/**
 * @route   GET /api/history/:id
 * @desc    Get a specific calendar by ID
 * @access  Private (requires access token)
 */
router.get('/:id', getCalendar);

/**
 * @route   GET /api/history/:id/download
 * @desc    Download ICS file for a specific calendar
 * @access  Private (requires access token)
 */
router.get('/:id/download', downloadCalendar);

/**
 * @route   DELETE /api/history/:id
 * @desc    Delete a calendar from history
 * @access  Private (requires access token)
 */
router.delete('/:id', deleteCalendar);

export default router;
