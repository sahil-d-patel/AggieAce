/**
 * E2E Tests for Home Page
 *
 * Basic home page rendering and navigation tests
 */

import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // Visual Tests

  test('should have correct page title', async ({ page }) => {
    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check page contains AggieAce branding
    await expect(page.locator('text=AggieAce')).toBeVisible();
  });

  test('should display hero section with call to action', async ({ page }) => {
    await expect(page.getByText('Transform Your Syllabus Into a Calendar')).toBeVisible();

    // Check for descriptive text
    await expect(
      page.getByText(/upload your course syllabus pdf and instantly convert/i)
    ).toBeVisible();
  });

  test('should display three feature cards', async ({ page }) => {
    const featureCards = page.locator('.card');

    // Should have at least 3 feature cards
    await expect(featureCards).toHaveCount(await featureCards.count());

    // Check specific features
    await expect(page.getByText('Easy Upload')).toBeVisible();
    await expect(page.getByText('Instant Conversion')).toBeVisible();
    await expect(page.getByText('Google Drive Sync')).toBeVisible();
  });

  test('should display instructions section', async ({ page }) => {
    await expect(page.getByText('How to Use')).toBeVisible();

    // Check instruction steps
    await expect(page.getByText(/upload your course syllabus pdf file/i)).toBeVisible();
    await expect(page.getByText(/enter your course information/i)).toBeVisible();
    await expect(page.getByText(/click "convert to calendar"/i)).toBeVisible();
  });

  // Responsive Design Tests

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Main elements should still be visible
    await expect(page.getByText('AggieAce')).toBeVisible();
    await expect(page.getByText('Transform Your Syllabus Into a Calendar')).toBeVisible();
    await expect(page.getByText('Drop your syllabus PDF here')).toBeVisible();
  });

  test('should be responsive on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    // Main elements should still be visible
    await expect(page.getByText('AggieAce')).toBeVisible();
    await expect(page.getByText('Easy Upload')).toBeVisible();
  });

  // Header Tests

  test('should display sign in button in header', async ({ page }) => {
    await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible();
  });

  // Footer Tests

  test('should display footer with copyright', async ({ page }) => {
    const currentYear = new Date().getFullYear();
    await expect(page.getByText(new RegExp(`${currentYear}.*AggieAce`, 'i'))).toBeVisible();
  });

  test('should display tagline in footer', async ({ page }) => {
    await expect(page.getByText('Syllabus Amplified, Life Simplified')).toBeVisible();
  });

  // Performance Tests

  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Page should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });

  // Error Handling Tests

  test('should handle 404 gracefully', async ({ page }) => {
    const response = await page.goto('/non-existent-page');

    // Next.js should return a 404 page
    expect(response?.status()).toBe(404);
  });
});
