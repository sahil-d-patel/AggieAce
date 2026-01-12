/**
 * Authentication Routes
 *
 * Defines routes for Google OAuth authentication
 *
 * @module routes/auth
 */

import express from 'express';
import {
  googleAuthInit,
  googleAuthCallback,
  getUserProfileInfo,
  refreshToken,
  logout,
  logoutAll
} from '../controllers/auth.controller.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authenticateJWT } from '../middleware/jwt.middleware.js';

const router = express.Router();

/**
 * @route   GET /api/auth/google
 * @desc    Initiate Google OAuth flow
 * @access  Public
 * @returns {Object} Authentication URL
 */
router.get('/google', asyncHandler(googleAuthInit));

/**
 * @route   GET /api/auth/google/callback
 * @desc    Handle Google OAuth callback
 * @access  Public
 * @query   {string} code - Authorization code from Google
 */
router.get('/google/callback', asyncHandler(googleAuthCallback));

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 * @header  {string} access_token - Google access token
 */
router.get('/profile', asyncHandler(getUserProfileInfo));

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public (requires valid refresh token in cookie)
 * @cookie  {string} refresh_token - JWT refresh token
 */
router.post('/refresh', asyncHandler(refreshToken));

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (revoke current refresh token)
 * @access  Public
 * @cookie  {string} refresh_token - JWT refresh token (optional)
 */
router.post('/logout', authenticateJWT, asyncHandler(logout));

/**
 * @route   POST /api/auth/logout-all
 * @desc    Logout from all devices (revoke all refresh tokens)
 * @access  Private (requires JWT authentication)
 * @cookie  {string} access_token - JWT access token
 */
router.post('/logout-all', authenticateJWT, asyncHandler(logoutAll));

export default router;
