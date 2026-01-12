/**
 * History Controller
 *
 * Handles HTTP requests for calendar history
 *
 * @module controllers/history
 */

import {
  getUserCalendarHistory,
  getCalendarById,
  deleteCalendarHistory,
  getUserCalendarCount,
  findUserByGoogleId,
  findOrCreateUser
} from '../services/database.service.js';
import axios from 'axios';
import { verifyAccessToken } from '../config/jwt.config.js';

/**
 * Get authenticated user info from Google
 *
 * @param {string} accessToken - Google access token
 * @returns {Promise<Object>} User info from Google
 */
const getGoogleUserInfo = async (accessToken) => {
  try {
    const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error('Invalid access token');
  }
};

/**
 * Middleware to authenticate user and get user ID
 */
export const authenticateUser = async (req, res, next) => {
  // Try JWT authentication first (from HTTP-only cookie)
  const jwtToken = req.cookies.access_token;
  
  if (jwtToken) {
    try {
      const decoded = verifyAccessToken(jwtToken);
      const user = await findUserByGoogleId(decoded.googleId);
      
      if (user) {
        req.user = user;
        return next();
      }
    } catch (err) {
      // JWT failed, fall through to Google token
      console.log('JWT auth failed, trying Google token fallback');
    }
  }

  // Fallback to Google OAuth token (backward compatibility)
  const googleToken = req.headers.access_token || 
                      req.headers.authorization?.replace('Bearer ', '');

  if (!googleToken) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'No authentication token provided'
    });
  }

  try {
    const googleUser = await getGoogleUserInfo(googleToken);
    const user = await findOrCreateUser({
      googleId: googleUser.id,
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture
    });

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid authentication token'
    });
  }
};

/**
 * Get user's calendar history
 *
 * @route GET /api/history
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const getHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    // Get history and total count
    const [history, totalCount] = await Promise.all([
      getUserCalendarHistory(userId, { limit, offset }),
      getUserCalendarCount(userId)
    ]);

    return res.status(200).json({
      success: true,
      data: {
        calendars: history,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount
        }
      }
    });
  } catch (error) {
    console.error('Error getting calendar history:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get calendar history',
      message: error.message
    });
  }
};

/**
 * Get a specific calendar by ID
 *
 * @route GET /api/history/:id
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const getCalendar = async (req, res) => {
  try {
    const calendarId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(calendarId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid calendar ID',
        message: 'Calendar ID must be a number'
      });
    }

    const calendar = await getCalendarById(calendarId, userId);

    if (!calendar) {
      return res.status(404).json({
        success: false,
        error: 'Calendar not found',
        message: 'Calendar not found or you do not have permission to access it'
      });
    }

    return res.status(200).json({
      success: true,
      data: calendar
    });
  } catch (error) {
    console.error('Error getting calendar:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get calendar',
      message: error.message
    });
  }
};

/**
 * Download ICS file for a specific calendar
 *
 * @route GET /api/history/:id/download
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const downloadCalendar = async (req, res) => {
  try {
    const calendarId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(calendarId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid calendar ID',
        message: 'Calendar ID must be a number'
      });
    }

    const calendar = await getCalendarById(calendarId, userId);

    if (!calendar) {
      return res.status(404).json({
        success: false,
        error: 'Calendar not found',
        message: 'Calendar not found or you do not have permission to access it'
      });
    }

    // Set headers for file download
    const filename = `${calendar.course_name.replace(/[^a-z0-9]/gi, '_')}_${calendar.section_number}.ics`;
    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Send ICS file content
    return res.status(200).send(calendar.ics_file_content);
  } catch (error) {
    console.error('Error downloading calendar:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to download calendar',
      message: error.message
    });
  }
};

/**
 * Delete a calendar from history
 *
 * @route DELETE /api/history/:id
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const deleteCalendar = async (req, res) => {
  try {
    const calendarId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(calendarId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid calendar ID',
        message: 'Calendar ID must be a number'
      });
    }

    const deleted = await deleteCalendarHistory(calendarId, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Calendar not found',
        message: 'Calendar not found or you do not have permission to delete it'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Calendar deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting calendar:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete calendar',
      message: error.message
    });
  }
};

export default {
  getHistory,
  getCalendar,
  downloadCalendar,
  deleteCalendar,
  authenticateUser
};
