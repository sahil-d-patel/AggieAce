/**
 * JWT Authentication Middleware
 *
 * Verifies JWT tokens from HTTP-only cookies
 *
 * @module middleware/jwt
 */

import { verifyAccessToken } from '../config/jwt.config.js';
import { findUserByGoogleId } from '../services/database.service.js';

/**
 * Middleware to authenticate requests using JWT
 */
export async function authenticateJWT(req, res, next) {
  try {
    const token = req.cookies.access_token;
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'No access token provided'
      });
    }

    // Verify and decode token
    const decoded = verifyAccessToken(token);
    
    // Fetch user from database
    const user = await findUserByGoogleId(decoded.googleId);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'User not found'
      });
    }

    // Attach user to request
    req.user = user;
    next();
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'TokenExpired',
        message: 'Access token has expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'InvalidToken',
        message: 'Invalid access token'
      });
    }

    console.error('JWT authentication error:', error);
    return res.status(500).json({ 
      error: 'InternalServerError',
      message: 'Authentication failed'
    });
  }
}

export default authenticateJWT;
