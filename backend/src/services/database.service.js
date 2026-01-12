/**
 * Database Service
 *
 * Handles all database operations for users and calendar history
 *
 * @module services/database
 */

import { query } from '../config/db.config.js';

/**
 * User Database Operations
 */

/**
 * Find or create user by Google ID
 *
 * @param {Object} userData - User data from Google
 * @param {string} userData.googleId - Google user ID
 * @param {string} userData.email - User email
 * @param {string} userData.name - User name
 * @returns {Promise<Object>} User record
 */
export const findOrCreateUser = async ({ googleId, email, name }) => {
  try {
    // Try to find existing user
    const findQuery = 'SELECT * FROM users WHERE google_id = $1';
    const findResult = await query(findQuery, [googleId]);

    if (findResult.rows.length > 0) {
      // Update existing user
      const updateQuery = `
        UPDATE users
        SET email = $1, name = $2, updated_at = CURRENT_TIMESTAMP
        WHERE google_id = $3
        RETURNING *
      `;
      const updateResult = await query(updateQuery, [email, name, googleId]);
      return updateResult.rows[0];
    }

    // Create new user
    const insertQuery = `
      INSERT INTO users (google_id, email, name)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const insertResult = await query(insertQuery, [googleId, email, name]);
    return insertResult.rows[0];
  } catch (error) {
    console.error('Error in findOrCreateUser:', error);
    throw error;
  }
};

/**
 * Find user by Google ID
 *
 * @param {string} googleId - Google user ID
 * @returns {Promise<Object|null>} User record or null
 */
export const findUserByGoogleId = async (googleId) => {
  try {
    const sql = 'SELECT * FROM users WHERE google_id = $1';
    const result = await query(sql, [googleId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error in findUserByGoogleId:', error);
    throw error;
  }
};

/**
 * Calendar History Database Operations
 */

/**
 * Save calendar to user's history
 *
 * @param {Object} calendarData - Calendar data
 * @param {number} calendarData.userId - User ID
 * @param {string} calendarData.courseName - Course name
 * @param {string} calendarData.sectionNumber - Section number
 * @param {string} calendarData.semesterStart - Semester start date (YYYY-MM-DD)
 * @param {string} calendarData.semesterEnd - Semester end date (YYYY-MM-DD)
 * @param {string} calendarData.timezone - Timezone
 * @param {string} calendarData.icsFilePath - Path to ICS file
 * @param {string} calendarData.icsFileContent - ICS file content
 * @param {string} [calendarData.pdfFilePath] - Path to PDF file (optional)
 * @returns {Promise<Object>} Saved calendar record
 */
export const saveCalendarHistory = async ({
  userId,
  courseName,
  sectionNumber,
  semesterStart,
  semesterEnd,
  timezone,
  icsFilePath,
  icsFileContent,
  pdfFilePath
}) => {
  try {
    const sql = `
      INSERT INTO calendar_history (
        user_id,
        course_name,
        section_number,
        semester_start,
        semester_end,
        timezone,
        ics_file_path,
        ics_file_content,
        pdf_file_path
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      userId,
      courseName,
      sectionNumber,
      semesterStart,
      semesterEnd,
      timezone,
      icsFilePath,
      icsFileContent,
      pdfFilePath || null
    ];

    const result = await query(sql, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error in saveCalendarHistory:', error);
    throw error;
  }
};

/**
 * Get user's calendar history
 *
 * @param {number} userId - User ID
 * @param {Object} options - Query options
 * @param {number} [options.limit] - Maximum number of records to return
 * @param {number} [options.offset] - Number of records to skip
 * @returns {Promise<Array>} Array of calendar records
 */
export const getUserCalendarHistory = async (userId, options = {}) => {
  try {
    const { limit = 50, offset = 0 } = options;

    const sql = `
      SELECT
        id,
        course_name,
        section_number,
        semester_start,
        semester_end,
        timezone,
        ics_file_path,
        created_at
      FROM calendar_history
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await query(sql, [userId, limit, offset]);
    return result.rows;
  } catch (error) {
    console.error('Error in getUserCalendarHistory:', error);
    throw error;
  }
};

/**
 * Get a specific calendar record by ID
 *
 * @param {number} calendarId - Calendar ID
 * @param {number} userId - User ID (for authorization)
 * @returns {Promise<Object|null>} Calendar record or null
 */
export const getCalendarById = async (calendarId, userId) => {
  try {
    const sql = `
      SELECT *
      FROM calendar_history
      WHERE id = $1 AND user_id = $2
    `;

    const result = await query(sql, [calendarId, userId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error in getCalendarById:', error);
    throw error;
  }
};

/**
 * Delete a calendar from history
 *
 * @param {number} calendarId - Calendar ID
 * @param {number} userId - User ID (for authorization)
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export const deleteCalendarHistory = async (calendarId, userId) => {
  try {
    const sql = `
      DELETE FROM calendar_history
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;

    const result = await query(sql, [calendarId, userId]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error in deleteCalendarHistory:', error);
    throw error;
  }
};

/**
 * Get total count of user's calendars
 *
 * @param {number} userId - User ID
 * @returns {Promise<number>} Total count
 */
export const getUserCalendarCount = async (userId) => {
  try {
    const sql = 'SELECT COUNT(*) as count FROM calendar_history WHERE user_id = $1';
    const result = await query(sql, [userId]);
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    console.error('Error in getUserCalendarCount:', error);
    throw error;
  }
};

/**
 * Syllabus Cache Database Operations
 */

/**
 * Find cached syllabus by SHA-256 hash
 *
 * @param {string} sha256Hash - SHA-256 hash of the syllabus PDF
 * @returns {Promise<Object|null>} Cached record with ics_file_path and ics_file_content, or null
 */
export const findCachedSyllabus = async (sha256Hash) => {
  try {
    const sql = 'SELECT * FROM syllabus_cache WHERE sha256_hash = $1';
    const result = await query(sql, [sha256Hash]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error in findCachedSyllabus:', error);
    throw error;
  }
};

/**
 * Save syllabus to cache
 *
 * @param {Object} cacheData - Cache data
 * @param {string} cacheData.sha256Hash - SHA-256 hash of the syllabus PDF
 * @param {string} cacheData.icsFilePath - Path to the generated ICS file
 * @param {string} cacheData.icsFileContent - Content of the ICS file
 * @returns {Promise<Object>} Saved cache record
 */
export const saveSyllabusCache = async ({ sha256Hash, icsFilePath, icsFileContent }) => {
  try {
    const sql = `
      INSERT INTO syllabus_cache (sha256_hash, ics_file_path, ics_file_content)
      VALUES ($1, $2, $3)
      ON CONFLICT (sha256_hash) DO UPDATE SET
        ics_file_path = EXCLUDED.ics_file_path,
        ics_file_content = EXCLUDED.ics_file_content
      RETURNING *
    `;

    const result = await query(sql, [sha256Hash, icsFilePath, icsFileContent]);
    return result.rows[0];
  } catch (error) {
    console.error('Error in saveSyllabusCache:', error);
    throw error;
  }
};

/**
 * Refresh Token Database Operations
 */

/**
 * Save a refresh token to the database
 * @param {Object} tokenData - Refresh token data
 * @param {number} tokenData.userId - User ID
 * @param {string} tokenData.tokenHash - SHA-256 hash of the token
 * @param {Date} tokenData.expiresAt - Expiration date
 * @param {string} [tokenData.userAgent] - User agent string
 * @param {string} [tokenData.ipAddress] - IP address
 * @returns {Promise<Object>} Saved refresh token record
 */
export const saveRefreshToken = async ({ userId, tokenHash, expiresAt, userAgent, ipAddress }) => {
  try {
    const sql = `
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await query(sql, [userId, tokenHash, expiresAt, userAgent || null, ipAddress || null]);
    return result.rows[0];
  } catch (error) {
    console.error('Error in saveRefreshToken:', error);
    throw error;
  }
};

/**
 * Find a refresh token by hash
 * @param {string} tokenHash - SHA-256 hash of the token
 * @returns {Promise<Object|null>} Refresh token record or null
 */
export const findRefreshToken = async (tokenHash) => {
  try {
    const sql = `
      SELECT rt.*, u.google_id, u.email, u.name 
      FROM refresh_tokens rt
      JOIN users u ON rt.user_id = u.id
      WHERE rt.token_hash = $1 AND rt.is_revoked = FALSE AND rt.expires_at > NOW()
    `;
    const result = await query(sql, [tokenHash]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error in findRefreshToken:', error);
    throw error;
  }
};

/**
 * Update last used timestamp for a refresh token
 * @param {string} tokenHash - SHA-256 hash of the token
 * @returns {Promise<boolean>} True if updated
 */
export const updateRefreshTokenUsage = async (tokenHash) => {
  try {
    const sql = `
      UPDATE refresh_tokens
      SET last_used_at = CURRENT_TIMESTAMP
      WHERE token_hash = $1
      RETURNING id
    `;
    const result = await query(sql, [tokenHash]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error in updateRefreshTokenUsage:', error);
    throw error;
  }
};

/**
 * Revoke a refresh token
 * @param {string} tokenHash - SHA-256 hash of the token
 * @returns {Promise<boolean>} True if revoked
 */
export const revokeRefreshToken = async (tokenHash) => {
  try {
    const sql = `
      UPDATE refresh_tokens
      SET is_revoked = true
      WHERE token_hash = $1
      RETURNING id
    `;
    const result = await query(sql, [tokenHash]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error in revokeRefreshToken:', error);
    throw error;
  }
};

/**
 * Revoke all refresh tokens for a user
 * @param {number} userId - User ID
 * @returns {Promise<number>} Number of tokens revoked
 */
export const revokeAllUserRefreshTokens = async (userId) => {
  try {
    const sql = `
      UPDATE refresh_tokens
      SET is_revoked = true
      WHERE user_id = $1 AND is_revoked = false
      RETURNING id
    `;
    const result = await query(sql, [userId]);
    return result.rows.length;
  } catch (error) {
    console.error('Error in revokeAllUserRefreshTokens:', error);
    throw error;
  }
};

/**
 * Clean up expired refresh tokens
 * @returns {Promise<number>} Number of tokens deleted
 */
export const cleanupExpiredRefreshTokens = async () => {
  try {
    const sql = `
      DELETE FROM refresh_tokens
      WHERE expires_at < NOW() OR is_revoked = true
      RETURNING id
    `;
    const result = await query(sql);
    return result.rows.length;
  } catch (error) {
    console.error('Error in cleanupExpiredRefreshTokens:', error);
    throw error;
  }
};

export default {
  findOrCreateUser,
  findUserByGoogleId,
  saveCalendarHistory,
  getUserCalendarHistory,
  getCalendarById,
  deleteCalendarHistory,
  getUserCalendarCount,
  findCachedSyllabus,
  saveSyllabusCache,
  saveRefreshToken,
  findRefreshToken,
  updateRefreshTokenUsage,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  cleanupExpiredRefreshTokens
};
