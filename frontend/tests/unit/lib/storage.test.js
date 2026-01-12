/**
 * Unit Tests for Storage Library
 *
 * Tests localStorage operations for authentication data
 */

import {
  saveAuthData,
  getAccessToken,
  getRefreshToken,
  getUserInfo,
  isAuthenticated,
  clearAuthData
} from '@/lib/storage';

describe('Storage Library', () => {
  // Setup and Teardown

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // saveAuthData Tests

  describe('saveAuthData', () => {
    it('should save access token to localStorage', () => {
      saveAuthData({
        accessToken: 'test-access-token',
        userInfo: { name: 'Test User' }
      });

      expect(localStorage.getItem('aggieace_access_token')).toBe('test-access-token');
    });

    it('should save refresh token when provided', () => {
      saveAuthData({
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        userInfo: { name: 'Test User' }
      });

      expect(localStorage.getItem('aggieace_refresh_token')).toBe('test-refresh-token');
    });

    it('should not save refresh token when not provided', () => {
      saveAuthData({
        accessToken: 'test-access-token',
        userInfo: { name: 'Test User' }
      });

      expect(localStorage.getItem('aggieace_refresh_token')).toBeNull();
    });

    it('should save user info as JSON string', () => {
      const userInfo = {
        name: 'Test User',
        email: 'test@example.com',
        picture: 'https://example.com/photo.jpg'
      };

      saveAuthData({
        accessToken: 'test-access-token',
        userInfo
      });

      const storedUserInfo = localStorage.getItem('aggieace_user_info');
      expect(storedUserInfo).toBe(JSON.stringify(userInfo));
    });

    it('should store all fields correctly', () => {
      const authData = {
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        userInfo: { id: 1, name: 'Test', email: 'test@test.com' }
      };

      saveAuthData(authData);

      expect(localStorage.getItem('aggieace_access_token')).toBe('access-123');
      expect(localStorage.getItem('aggieace_refresh_token')).toBe('refresh-456');
      expect(JSON.parse(localStorage.getItem('aggieace_user_info'))).toEqual(authData.userInfo);
    });
  });

  // getAccessToken Tests

  describe('getAccessToken', () => {
    it('should return access token when set', () => {
      localStorage.setItem('aggieace_access_token', 'my-token');

      expect(getAccessToken()).toBe('my-token');
    });

    it('should return null when access token not set', () => {
      expect(getAccessToken()).toBeNull();
    });

    it('should return empty string if stored as empty', () => {
      localStorage.setItem('aggieace_access_token', '');

      // Empty string is falsy and not a valid token, so it should be treated like null
      // for authentication purposes
      expect(getAccessToken()).toBe('');
    });
  });

  // getRefreshToken Tests

  describe('getRefreshToken', () => {
    it('should return refresh token when set', () => {
      localStorage.setItem('aggieace_refresh_token', 'my-refresh-token');

      expect(getRefreshToken()).toBe('my-refresh-token');
    });

    it('should return null when refresh token not set', () => {
      expect(getRefreshToken()).toBeNull();
    });
  });

  // getUserInfo Tests

  describe('getUserInfo', () => {
    it('should return parsed user info object', () => {
      const userInfo = {
        name: 'Test User',
        email: 'test@example.com',
        picture: 'https://example.com/photo.jpg'
      };

      localStorage.setItem('aggieace_user_info', JSON.stringify(userInfo));

      expect(getUserInfo()).toEqual(userInfo);
    });

    it('should return null when user info not set', () => {
      expect(getUserInfo()).toBeNull();
    });

    it('should return null when user info is invalid JSON', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      localStorage.setItem('aggieace_user_info', 'invalid-json-{');

      expect(getUserInfo()).toBeNull();

      consoleSpy.mockRestore();
    });

    it('should handle complex user objects', () => {
      const complexUser = {
        id: 'google-123',
        name: 'Test User',
        email: 'test@example.com',
        picture: 'https://example.com/photo.jpg',
        metadata: {
          createdAt: '2024-01-01',
          lastLogin: '2024-01-15'
        }
      };

      localStorage.setItem('aggieace_user_info', JSON.stringify(complexUser));

      expect(getUserInfo()).toEqual(complexUser);
    });
  });

  // isAuthenticated Tests

  describe('isAuthenticated', () => {
    it('should return true when access token exists', () => {
      localStorage.setItem('aggieace_access_token', 'some-token');

      expect(isAuthenticated()).toBe(true);
    });

    it('should return false when access token does not exist', () => {
      expect(isAuthenticated()).toBe(false);
    });

    it('should return false when access token is empty string', () => {
      localStorage.setItem('aggieace_access_token', '');

      expect(isAuthenticated()).toBe(false);
    });

    it('should work correctly after saving auth data', () => {
      expect(isAuthenticated()).toBe(false);

      saveAuthData({
        accessToken: 'test-token',
        userInfo: { name: 'Test' }
      });

      expect(isAuthenticated()).toBe(true);
    });
  });

  // clearAuthData Tests

  describe('clearAuthData', () => {
    it('should remove all auth keys from localStorage', () => {
      // Set up auth data
      saveAuthData({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        userInfo: { name: 'Test User' }
      });

      // Verify data is set
      expect(localStorage.getItem('aggieace_access_token')).not.toBeNull();
      expect(localStorage.getItem('aggieace_refresh_token')).not.toBeNull();
      expect(localStorage.getItem('aggieace_user_info')).not.toBeNull();

      // Clear auth data
      clearAuthData();

      // Verify all keys are removed
      expect(localStorage.getItem('aggieace_access_token')).toBeNull();
      expect(localStorage.getItem('aggieace_refresh_token')).toBeNull();
      expect(localStorage.getItem('aggieace_user_info')).toBeNull();
    });

    it('should not affect other localStorage items', () => {
      localStorage.setItem('other_key', 'other_value');
      saveAuthData({
        accessToken: 'token',
        userInfo: { name: 'Test' }
      });

      clearAuthData();

      expect(localStorage.getItem('other_key')).toBe('other_value');
    });

    it('should make isAuthenticated return false', () => {
      saveAuthData({
        accessToken: 'token',
        userInfo: { name: 'Test' }
      });

      expect(isAuthenticated()).toBe(true);

      clearAuthData();

      expect(isAuthenticated()).toBe(false);
    });
  });

  // Integration Tests

  describe('Integration', () => {
    it('should handle full auth lifecycle', () => {
      // Initially not authenticated
      expect(isAuthenticated()).toBe(false);
      expect(getAccessToken()).toBeNull();
      expect(getUserInfo()).toBeNull();

      // Save auth data
      const authData = {
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        userInfo: { name: 'John Doe', email: 'john@example.com' }
      };
      saveAuthData(authData);

      // Verify authenticated
      expect(isAuthenticated()).toBe(true);
      expect(getAccessToken()).toBe('access-123');
      expect(getRefreshToken()).toBe('refresh-456');
      expect(getUserInfo()).toEqual(authData.userInfo);

      // Clear auth
      clearAuthData();

      // Verify cleared
      expect(isAuthenticated()).toBe(false);
      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
      expect(getUserInfo()).toBeNull();
    });

    it('should update existing auth data', () => {
      // Save initial data
      saveAuthData({
        accessToken: 'old-token',
        userInfo: { name: 'Old User' }
      });

      expect(getAccessToken()).toBe('old-token');

      // Save new data
      saveAuthData({
        accessToken: 'new-token',
        userInfo: { name: 'New User' }
      });

      expect(getAccessToken()).toBe('new-token');
      expect(getUserInfo()).toEqual({ name: 'New User' });
    });
  });
});
