/**
 * JWT Configuration and Utilities
 *
 * Handles JWT token generation, verification, and hashing
 *
 * @module config/jwt
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET,
  accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
  refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  issuer: process.env.JWT_ISSUER || 'aggieace',
  algorithm: 'HS256'
};

// Validate JWT secret on startup
if (!JWT_CONFIG.secret || JWT_CONFIG.secret.length < 32) {
  console.error('ERROR: JWT_SECRET must be at least 32 characters long');
  process.exit(1);
}

/**
 * Generate access token (short-lived)
 */
export function generateAccessToken(payload) {
  return jwt.sign(payload, JWT_CONFIG.secret, {
    expiresIn: JWT_CONFIG.accessExpiration,
    issuer: JWT_CONFIG.issuer,
    algorithm: JWT_CONFIG.algorithm
  });
}

/**
 * Generate refresh token (long-lived)
 */
export function generateRefreshToken(payload) {
  return jwt.sign(payload, JWT_CONFIG.secret, {
    expiresIn: JWT_CONFIG.refreshExpiration,
    issuer: JWT_CONFIG.issuer,
    algorithm: JWT_CONFIG.algorithm
  });
}

/**
 * Verify access token
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_CONFIG.secret, {
    issuer: JWT_CONFIG.issuer,
    algorithms: [JWT_CONFIG.algorithm]
  });
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_CONFIG.secret, {
    issuer: JWT_CONFIG.issuer,
    algorithms: [JWT_CONFIG.algorithm]
  });
}

/**
 * Hash token for secure storage
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Get cookie options for tokens
 */
export function getCookieOptions(isProduction, maxAge) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: maxAge,
    path: '/'
  };
}

export default {
  JWT_CONFIG,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  getCookieOptions
};
