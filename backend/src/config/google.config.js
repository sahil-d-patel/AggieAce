/**
 * Google OAuth and Drive API Configuration
 *
 * Handles Google Cloud Platform API configuration including:
 * - OAuth 2.0 client setup
 * - Drive API scopes
 * - Credential management
 *
 * @module config/google
 */

import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

/**
 * OAuth 2.0 scopes required for the application
 */
export const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
];

/**
 * Create and configure OAuth2 client
 *
 * @returns {OAuth2Client} Configured OAuth2 client
 */
export const createOAuth2Client = () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  return oauth2Client;
};

/**
 * Generate authentication URL for Google OAuth
 *
 * @returns {string} Authentication URL
 */
export const getAuthUrl = () => {
  const oauth2Client = createOAuth2Client();

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent' // 'consent' is great for testing!
  });

  return authUrl;
};

/**
 * Get OAuth2 client with credentials
 *
 * @param {Object} tokens - OAuth tokens
 * @returns {OAuth2Client} Authenticated OAuth2 client
 */
export const getAuthenticatedClient = (tokens) => {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
};

export default {
  createOAuth2Client,
  getAuthUrl,
  getAuthenticatedClient,
  SCOPES
};