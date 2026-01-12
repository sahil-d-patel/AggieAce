/**
 * Health Check Routes
 *
 * Defines routes for health monitoring
 *
 * @module routes/health
 */

import express from 'express';
import { healthCheck } from '../controllers/health.controller.js';
import { asyncHandler } from '../middleware/error.middleware.js';

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Check API health status
 * @access  Public
 * @returns {Object} Health status information
 */
router.get('/', asyncHandler(healthCheck));

export default router;
