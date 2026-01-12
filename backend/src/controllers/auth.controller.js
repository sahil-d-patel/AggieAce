/**
 * Authentication Controller
 *
 * Handles Google OAuth authentication flow
 *
 * @module controllers/auth
 */

import { getAuthUrl, createOAuth2Client } from '../config/google.config.js';
import { getUserProfile } from '../services/google-drive.service.js';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  hashToken,
  getCookieOptions
} from '../config/jwt.config.js';
import {
  saveRefreshToken,
  findRefreshToken,
  updateRefreshTokenUsage,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  findOrCreateUser
} from '../services/database.service.js';

/**
 * Initiate Google OAuth flow
 *
 * @route GET /api/auth/google
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const googleAuthInit = async (req, res) => {
  try {
    const authUrl = getAuthUrl();

    return res.status(200).json({
      success: true,
      authUrl
    });
  } catch (error) {
    console.error('Error generating auth URL:', error);

    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: 'Failed to generate authentication URL'
    });
  }
};

/**
 * Handle Google OAuth callback
 *
 * @route GET /api/auth/google/callback
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export async function googleAuthCallback(req, res) {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Missing authorization code',
        message: 'No authorization code provided'
      });
    }

    // Exchange code for Google tokens
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user profile from Google
    const userProfile = await getUserProfile(oauth2Client);

    // Find or create user in database
    const user = await findOrCreateUser({
      googleId: userProfile.id,
      email: userProfile.email,
      name: userProfile.name
    });

    // Generate JWT tokens
    const accessToken = generateAccessToken({
      googleId: user.google_id,
      email: user.email,
      name: user.name
    });

    const refreshToken = generateRefreshToken({
      googleId: user.google_id,
      email: user.email
    });

    // Hash and save refresh token to database
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await saveRefreshToken({
      userId: user.id,
      tokenHash,
      expiresAt,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    });

    // Set HTTP-only cookies
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.cookie('access_token', accessToken, getCookieOptions(isProduction, 15 * 60 * 1000)); // 15 min
    res.cookie('refresh_token', refreshToken, getCookieOptions(isProduction, 7 * 24 * 60 * 60 * 1000)); // 7 days

    // Redirect with user info only (no tokens in URL)
    const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?` +
      `user_name=${encodeURIComponent(user.name)}&` +
      `user_email=${encodeURIComponent(user.email)}&` +
      `user_picture=${encodeURIComponent(user.picture || '')}`;

    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Error in OAuth callback:', error);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/auth/error?message=${encodeURIComponent(error.message)}`);
  }
};

/**
 * Get current user profile
 *
 * @route GET /api/auth/profile
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const getUserProfileInfo = async (req, res) => {
  try {
    const { access_token } = req.headers;

    if (!access_token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No access token provided'
      });
    }

    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ access_token });

    const userProfile = await getUserProfile(oauth2Client);

    return res.status(200).json({
      success: true,
      data: userProfile
    });

  } catch (error) {
    console.error('Error getting user profile:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to get user profile',
      message: error.message
    });
  }
};

/**
 * Refresh access token using refresh token
 */
export async function refreshToken(req, res) {
  try {
    const oldRefreshToken = req.cookies.refresh_token;

    if (!oldRefreshToken) {
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(oldRefreshToken);
    const tokenHash = hashToken(oldRefreshToken);

    // Check if token exists and is valid
    const tokenRecord = await findRefreshToken(tokenHash);

    if (!tokenRecord) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken({
      googleId: decoded.googleId,
      email: decoded.email,
      name: tokenRecord.name
    });

    const newRefreshToken = generateRefreshToken({
      googleId: decoded.googleId,
      email: decoded.email
    });

    // Revoke old refresh token
    await revokeRefreshToken(tokenHash);

    // Save new refresh token
    const newTokenHash = hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await saveRefreshToken({
      userId: tokenRecord.user_id,
      tokenHash: newTokenHash,
      expiresAt,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    });

    // Set new cookies
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.cookie('access_token', newAccessToken, getCookieOptions(isProduction, 15 * 60 * 1000));
    res.cookie('refresh_token', newRefreshToken, getCookieOptions(isProduction, 7 * 24 * 60 * 60 * 1000));

    res.json({ success: true, message: 'Tokens refreshed successfully' });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ error: 'Failed to refresh token' });
  }
}

/**
 * Logout user (revoke current refresh token)
 */
export async function logout(req, res) {
  try {
    const refreshToken = req.cookies.refresh_token;

    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await revokeRefreshToken(tokenHash);
    }

    // Clear cookies
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
}

/**
 * Logout from all devices (revoke all user's refresh tokens)
 */
export async function logoutAll(req, res) {
  try {
    await revokeAllUserRefreshTokens(req.user.id);

    // Clear cookies
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    res.json({ success: true, message: 'Logged out from all devices' });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ error: 'Failed to logout from all devices' });
  }
}

export default {
  googleAuthInit,
  googleAuthCallback,
  getUserProfileInfo,
  refreshToken,
  logout,
  logoutAll
};
