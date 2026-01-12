/**
 * API Client Library
 *
 * Handles all communication with the backend API
 *
 * @module lib/api
 */

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Create axios instance with default configuration
 */
const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 150000, // 2.5 minutes for AI processing
  withCredentials: true // Important for sending cookies
});

// Response interceptor for automatic token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If token expired and we haven't retried yet
    if (
      error.response?.status === 401 &&
      error.response?.data?.error === 'TokenExpired' &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        // Request new tokens
        await apiClient.post('/auth/refresh');
        
        // Retry original request with new token (automatically sent in cookie)
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, user needs to re-authenticate
        console.error('Token refresh failed:', refreshError);
        
        // Clear user data and redirect to home
        if (typeof window !== 'undefined') {
          localStorage.removeItem('user_info');
          window.location.href = '/';
        }
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Check API health
 *
 * @returns {Promise<Object>} Health status
 */
export const checkHealth = async () => {
  try {
    const response = await apiClient.get('/health');
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
};

/**
 * Convert syllabus PDF to calendar
 * Now supports queued processing with status polling
 *
 * @param {Object} params - Conversion parameters
 * @param {File} params.file - PDF file
 * @param {string} params.className - Class name
 * @param {string} params.sectionNumber - Section number
 * @param {string} params.semesterStart - Semester start date
 * @param {string} params.semesterEnd - Semester end date
 * @param {string} params.timezone - Timezone
 * @param {string} [params.googleAccessToken] - Optional Google access token
 * @param {Function} [params.onUploadProgress] - Upload progress callback
 * @param {Function} [params.onQueueUpdate] - Queue status update callback
 * @returns {Promise<Object>} Conversion result
 */
export const convertSyllabus = async ({
  file,
  className,
  sectionNumber,
  semesterStart,
  semesterEnd,
  timezone,
  googleAccessToken,
  onUploadProgress,
  onQueueUpdate
}) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('className', className);
    formData.append('sectionNumber', sectionNumber);
    formData.append('semesterStart', semesterStart);
    formData.append('semesterEnd', semesterEnd);
    formData.append('timezone', timezone);

    if (googleAccessToken) {
      formData.append('googleAccessToken', googleAccessToken);
    }

    const response = await apiClient.post('/conversion', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onUploadProgress ? (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onUploadProgress(percentCompleted);
      } : undefined,
    });

    const data = response.data;

    // If it's a cache hit or immediately completed, return the result
    if (data.status === 'completed') {
      return data;
    }

    // If queued, poll for status until complete
    if (data.status === 'queued' && data.data?.jobId) {
      return await pollJobStatus(data.data.jobId, googleAccessToken, onQueueUpdate);
    }

    return data;
  } catch (error) {
    console.error('Conversion failed:', error);
    throw error.response?.data || error;
  }
};

/**
 * Poll job status until completion
 *
 * @param {string} jobId - Job ID to poll
 * @param {string} googleAccessToken - Optional Google access token
 * @param {Function} onQueueUpdate - Queue status update callback
 * @returns {Promise<Object>} Final conversion result
 */
const pollJobStatus = async (jobId, googleAccessToken, onQueueUpdate) => {
  const POLL_INTERVAL = 2000; // 2 seconds
  const MAX_POLLS = 180; // 6 minutes max (180 * 2 seconds)

  let polls = 0;

  while (polls < MAX_POLLS) {
    try {
      const status = await getJobStatus(jobId, googleAccessToken);

      // Notify about queue updates
      if (onQueueUpdate) {
        onQueueUpdate(status);
      }

      // Check if completed
      if (status.status === 'completed') {
        return status;
      }

      // Check if failed
      if (status.status === 'failed') {
        throw { message: status.error || 'Conversion failed', ...status };
      }

      // Still processing, wait and poll again
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
      polls++;
    } catch (error) {
      // If it's a structured error from the server, rethrow it
      if (error.status === 'failed') {
        throw error;
      }
      console.error('Error polling job status:', error);
      throw error;
    }
  }

  throw { message: 'Conversion timed out. Please try again.' };
};

/**
 * Get job status
 *
 * @param {string} jobId - Job ID
 * @param {string} googleAccessToken - Optional Google access token
 * @returns {Promise<Object>} Job status
 */
export const getJobStatus = async (jobId, googleAccessToken) => {
  try {
    const params = googleAccessToken ? { googleAccessToken } : {};
    const response = await apiClient.get(`/conversion/status/${jobId}`, { params });
    return response.data;
  } catch (error) {
    console.error('Failed to get job status:', error);
    throw error.response?.data || error;
  }
};

/**
 * Get queue statistics
 *
 * @returns {Promise<Object>} Queue statistics
 */
export const getQueueStats = async () => {
  try {
    const response = await apiClient.get('/conversion/queue/stats');
    return response.data;
  } catch (error) {
    console.error('Failed to get queue stats:', error);
    throw error;
  }
};

/**
 * Get Google OAuth URL
 *
 * @returns {Promise<string>} Google OAuth URL
 */
export const getGoogleAuthUrl = async () => {
  try {
    const response = await apiClient.get('/auth/google');
    return response.data.authUrl;
  } catch (error) {
    console.error('Failed to get Google auth URL:', error);
    throw error;
  }
};

/**
 * Get user profile
 *
 * @param {string} accessToken - Google access token
 * @returns {Promise<Object>} User profile
 */
export const getUserProfile = async (accessToken) => {
  try {
    const response = await apiClient.get('/auth/profile', {
      headers: {
        access_token: accessToken,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Failed to get user profile:', error);
    throw error;
  }
};

/**
 * Download file from URL
 *
 * @param {string} url - File URL
 * @param {string} filename - Desired filename
 */
export const downloadFile = (url, filename) => {
  const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
  const link = document.createElement('a');
  link.href = fullUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Save files to Google Drive
 *
 * @param {Object} params - Save parameters
 * @param {string} params.googleAccessToken - Google access token
 * @param {string} params.pdfPath - Path to PDF file
 * @param {string} params.icsPath - Path to ICS file
 * @param {string} params.folderName - Folder name in Google Drive
 * @param {Object} params.metadata - File metadata
 * @returns {Promise<Object>} Save result
 */
export const saveToGoogleDrive = async ({
  googleAccessToken,
  pdfPath,
  icsPath,
  folderName,
  metadata
}) => {
  try {
    const response = await apiClient.post('/conversion/save-to-drive', {
      googleAccessToken,
      pdfPath,
      icsPath,
      folderName: folderName || 'AggieAce',
      metadata
    });
    return response.data;
  } catch (error) {
    console.error('Save to Drive failed:', error);
    throw error.response?.data || error;
  }
};

/**
 * Get user's calendar history
 *
 * @param {string} accessToken - Google access token
 * @param {Object} options - Query options
 * @param {number} [options.limit] - Maximum number of records to return
 * @param {number} [options.offset] - Number of records to skip
 * @returns {Promise<Object>} Calendar history
 */
export const getCalendarHistory = async (accessToken, options = {}) => {
  try {
    const { limit = 50, offset = 0 } = options;
    const response = await apiClient.get('/history', {
      headers: {
        access_token: accessToken,
      },
      params: {
        limit,
        offset
      }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to get calendar history:', error);
    throw error;
  }
};

/**
 * Download ICS file from calendar history
 *
 * @param {number} calendarId - Calendar ID
 * @param {string} accessToken - Google access token
 * @returns {Promise<Blob>} ICS file blob
 */
export const downloadCalendarFromHistory = async (calendarId, accessToken) => {
  try {
    const response = await apiClient.get(`/history/${calendarId}/download`, {
      headers: {
        access_token: accessToken,
      },
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error('Failed to download calendar:', error);
    throw error;
  }
};

/**
 * Delete calendar from history
 *
 * @param {number} calendarId - Calendar ID
 * @param {string} accessToken - Google access token
 * @returns {Promise<Object>} Delete result
 */
export const deleteCalendarFromHistory = async (calendarId, accessToken) => {
  try {
    const response = await apiClient.delete(`/history/${calendarId}`, {
      headers: {
        access_token: accessToken,
      }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to delete calendar:', error);
    throw error;
  }
};

/**
 * Logout user
 */
export const logout = async () => {
  try {
    await apiClient.post('/auth/logout');
  } catch (error) {
    console.error('Logout failed:', error);
    throw error;
  }
};

/**
 * Logout from all devices
 */
export const logoutAll = async () => {
  try {
    await apiClient.post('/auth/logout-all');
  } catch (error) {
    console.error('Logout from all devices failed:', error);
    throw error;
  }
};

export default {
  checkHealth,
  convertSyllabus,
  getJobStatus,
  getQueueStats,
  getGoogleAuthUrl,
  getUserProfile,
  downloadFile,
  saveToGoogleDrive,
  getCalendarHistory,
  downloadCalendarFromHistory,
  deleteCalendarFromHistory,
  logout,
  logoutAll,
};
