/**
 * Browser Storage Utilities
 *
 * Handles localStorage operations for user authentication
 *
 * @module lib/storage
 */

const STORAGE_KEYS = {
  USER_INFO: 'aggieace_user_info',
};

/**
 * Save user information
 *
 * @param {Object} userInfo - User information
 */
export const saveUserInfo = (userInfo) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));
  }
};

/**
 * Get user information
 *
 * @returns {Object|null} User information
 */
export const getUserInfo = () => {
  if (typeof window !== 'undefined') {
    const userInfo = localStorage.getItem(STORAGE_KEYS.USER_INFO);
    return userInfo ? JSON.parse(userInfo) : null;
  }
  return null;
};

/**
 * Clear all authentication data
 */
export const clearAuthData = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.USER_INFO);
  }
};

/**
 * Check if user is authenticated
 *
 * @returns {boolean} Authentication status
 */
export const isAuthenticated = () => {
  return getUserInfo() !== null;
};

/**
 * Get access token from stored user info
 *
 * @returns {string|null} Access token
 */
export const getAccessToken = () => {
  const userInfo = getUserInfo();
  return userInfo?.accessToken || null;
};

export default {
  saveUserInfo,
  getUserInfo,
  clearAuthData,
  isAuthenticated,
  getAccessToken,
};
