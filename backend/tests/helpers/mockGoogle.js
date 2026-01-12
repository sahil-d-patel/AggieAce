/**
 * Google API Mock Utilities
 *
 * Provides mock functions for Google OAuth and Drive APIs
 */

import { jest } from '@jest/globals';

// OAuth2 Client Mocks

/**
 * Mock OAuth2 client
 */
export const mockOAuth2Client = {
  generateAuthUrl: jest.fn().mockReturnValue(
    'https://accounts.google.com/o/oauth2/auth?client_id=test&redirect_uri=test&scope=test'
  ),
  getToken: jest.fn().mockResolvedValue({
    tokens: {
      access_token: 'mock_access_token_12345',
      refresh_token: 'mock_refresh_token_12345',
      expiry_date: Date.now() + 3600000, // 1 hour from now
      token_type: 'Bearer',
      scope: 'https://www.googleapis.com/auth/drive.file'
    }
  }),
  setCredentials: jest.fn(),
  credentials: {
    access_token: 'mock_access_token_12345'
  }
};

// Google Drive Mocks

/**
 * Mock Drive file object
 */
export const mockDriveFile = {
  id: 'drive_file_id_123',
  name: 'test_file.ics',
  mimeType: 'text/calendar',
  webViewLink: 'https://drive.google.com/file/d/drive_file_id_123/view',
  webContentLink: 'https://drive.google.com/uc?id=drive_file_id_123&export=download'
};

/**
 * Mock Drive folder object
 */
export const mockDriveFolder = {
  id: 'drive_folder_id_456',
  name: 'AggieAce',
  mimeType: 'application/vnd.google-apps.folder',
  webViewLink: 'https://drive.google.com/drive/folders/drive_folder_id_456'
};

/**
 * Mock Google Drive service
 */
export const mockDriveService = {
  files: {
    list: jest.fn().mockResolvedValue({
      data: { files: [] }
    }),
    create: jest.fn().mockResolvedValue({
      data: mockDriveFile
    }),
    get: jest.fn().mockResolvedValue({
      data: mockDriveFile
    })
  }
};

// User Profile Mocks

/**
 * Mock Google user profile
 */
export const mockGoogleUserProfile = {
  id: 'google_user_123456789',
  email: 'testuser@gmail.com',
  verified_email: true,
  name: 'Test User',
  given_name: 'Test',
  family_name: 'User',
  picture: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
  locale: 'en'
};

/**
 * Mock axios response for Google userinfo endpoint
 */
export const mockGoogleUserInfoResponse = {
  data: mockGoogleUserProfile
};

// Helper Functions

/**
 * Reset all Google API mocks
 */
export const resetGoogleMocks = () => {
  mockOAuth2Client.generateAuthUrl.mockClear();
  mockOAuth2Client.getToken.mockClear();
  mockOAuth2Client.setCredentials.mockClear();
  mockDriveService.files.list.mockClear();
  mockDriveService.files.create.mockClear();
  mockDriveService.files.get.mockClear();
};

/**
 * Setup mock to find existing folder
 */
export const setupMockFolderExists = (folder = mockDriveFolder) => {
  mockDriveService.files.list.mockResolvedValueOnce({
    data: { files: [folder] }
  });
};

/**
 * Setup mock for folder not found (will create new)
 */
export const setupMockFolderNotFound = () => {
  mockDriveService.files.list.mockResolvedValueOnce({
    data: { files: [] }
  });
};

/**
 * Setup mock for successful file upload
 */
export const setupMockFileUpload = (file = mockDriveFile) => {
  mockDriveService.files.create.mockResolvedValueOnce({
    data: file
  });
};

/**
 * Setup mock for OAuth token exchange error
 */
export const setupMockOAuthError = () => {
  mockOAuth2Client.getToken.mockRejectedValueOnce(
    new Error('Invalid authorization code')
  );
};

export default {
  mockOAuth2Client,
  mockDriveService,
  mockDriveFile,
  mockDriveFolder,
  mockGoogleUserProfile,
  mockGoogleUserInfoResponse,
  resetGoogleMocks,
  setupMockFolderExists,
  setupMockFolderNotFound,
  setupMockFileUpload,
  setupMockOAuthError
};
