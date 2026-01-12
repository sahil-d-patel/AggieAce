/**
 * E2E Tests for Conversion Flow
 *
 * Tests the complete syllabus to calendar conversion user journey
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Conversion Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // Page Load Tests

  test('should display the home page correctly', async ({ page }) => {
    // Check for main heading
    await expect(page.getByText('Transform Your Syllabus Into a Calendar')).toBeVisible();

    // Check for feature cards
    await expect(page.getByText('Easy Upload')).toBeVisible();
    await expect(page.getByText('Instant Conversion')).toBeVisible();
    await expect(page.getByText('Google Drive Sync')).toBeVisible();

    // Check for upload zone
    await expect(page.getByText('Drop your syllabus PDF here')).toBeVisible();

    // Check for instructions
    await expect(page.getByText('How to Use')).toBeVisible();
  });

  test('should display header with AggieAce branding', async ({ page }) => {
    await expect(page.getByText('AggieAce')).toBeVisible();
    await expect(page.getByText('Sign in with Google')).toBeVisible();
  });

  test('should display footer', async ({ page }) => {
    await expect(page.getByText('Syllabus Amplified, Life Simplified')).toBeVisible();
  });

  // File Upload Tests

  test('should show metadata form after selecting a PDF file', async ({ page }) => {
    // Initially, form should not be visible
    await expect(page.getByLabel('Class Name')).not.toBeVisible();

    // Upload a PDF file using file chooser
    const fileInput = page.locator('#file-input');

    // Create a simple PDF-like buffer for testing
    await fileInput.setInputFiles({
      name: 'test-syllabus.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 test content')
    });

    // Form should now be visible
    await expect(page.getByLabel('Class Name')).toBeVisible();
    await expect(page.getByLabel('Section Number')).toBeVisible();
    await expect(page.getByLabel('Semester Start Date')).toBeVisible();
    await expect(page.getByLabel('Semester End Date')).toBeVisible();
    await expect(page.getByLabel('Timezone')).toBeVisible();

    // Convert button should be visible
    await expect(page.getByRole('button', { name: /convert to calendar/i })).toBeVisible();
  });

  test('should display selected file name and size', async ({ page }) => {
    const fileInput = page.locator('#file-input');

    await fileInput.setInputFiles({
      name: 'my-course-syllabus.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 ' + 'x'.repeat(1024)) // ~1KB file
    });

    await expect(page.getByText('my-course-syllabus.pdf')).toBeVisible();
    await expect(page.getByText(/\d+\.\d+ MB/)).toBeVisible();
  });

  test('should remove file when clicking remove button', async ({ page }) => {
    const fileInput = page.locator('#file-input');

    await fileInput.setInputFiles({
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 test')
    });

    // Verify file is shown
    await expect(page.getByText('test.pdf')).toBeVisible();

    // Click remove button
    await page.getByTitle('Remove file').click();

    // File should be removed
    await expect(page.getByText('test.pdf')).not.toBeVisible();
    await expect(page.getByText('Drop your syllabus PDF here')).toBeVisible();
  });

  // Form Validation Tests

  test('should have disabled convert button when form is incomplete', async ({ page }) => {
    const fileInput = page.locator('#file-input');

    await fileInput.setInputFiles({
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 test')
    });

    const convertButton = page.getByRole('button', { name: /convert to calendar/i });
    await expect(convertButton).toBeDisabled();
  });

  test('should enable convert button when all fields are filled', async ({ page }) => {
    const fileInput = page.locator('#file-input');

    await fileInput.setInputFiles({
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 test')
    });

    // Fill in the form
    await page.getByLabel('Class Name').fill('CSCE 121');
    await page.getByLabel('Section Number').fill('501');
    await page.getByLabel('Semester Start Date').fill('01/16/2024');
    await page.getByLabel('Semester End Date').fill('05/03/2024');

    const convertButton = page.getByRole('button', { name: /convert to calendar/i });
    await expect(convertButton).toBeEnabled();
  });

  test('should show alert for invalid date format', async ({ page }) => {
    const fileInput = page.locator('#file-input');

    await fileInput.setInputFiles({
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 test')
    });

    // Fill with invalid date
    await page.getByLabel('Class Name').fill('CSCE 121');
    await page.getByLabel('Section Number').fill('501');
    await page.getByLabel('Semester Start Date').fill('2024-01-16'); // Wrong format
    await page.getByLabel('Semester End Date').fill('05/03/2024');

    // Listen for dialog
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('MM/DD/YYYY');
      await dialog.dismiss();
    });

    await page.getByRole('button', { name: /convert to calendar/i }).click();
  });

  // Timezone Selection Tests

  test('should have all timezone options available', async ({ page }) => {
    const fileInput = page.locator('#file-input');

    await fileInput.setInputFiles({
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 test')
    });

    const timezoneSelect = page.getByLabel('Timezone');

    // Check all timezone options
    await expect(timezoneSelect.locator('option[value="America/Chicago"]')).toBeAttached();
    await expect(timezoneSelect.locator('option[value="America/New_York"]')).toBeAttached();
    await expect(timezoneSelect.locator('option[value="America/Los_Angeles"]')).toBeAttached();
    await expect(timezoneSelect.locator('option[value="America/Denver"]')).toBeAttached();
    await expect(timezoneSelect.locator('option[value="America/Phoenix"]')).toBeAttached();
    await expect(timezoneSelect.locator('option[value="Pacific/Honolulu"]')).toBeAttached();
    await expect(timezoneSelect.locator('option[value="America/Anchorage"]')).toBeAttached();
  });

  test('should default to Central Time', async ({ page }) => {
    const fileInput = page.locator('#file-input');

    await fileInput.setInputFiles({
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 test')
    });

    const timezoneSelect = page.getByLabel('Timezone');
    await expect(timezoneSelect).toHaveValue('America/Chicago');
  });

  // Drag and Drop Tests

  test('should highlight drop zone on drag over', async ({ page }) => {
    const dropZone = page.locator('.upload-zone');

    // Simulate drag over
    await dropZone.dispatchEvent('dragover', {
      dataTransfer: { files: [] }
    });

    // Check for active class
    await expect(dropZone).toHaveClass(/upload-zone-active/);
  });

  // Accessibility Tests

  test('should have accessible form labels', async ({ page }) => {
    const fileInput = page.locator('#file-input');

    await fileInput.setInputFiles({
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 test')
    });

    // All form fields should have associated labels
    await expect(page.getByLabel('Class Name')).toBeVisible();
    await expect(page.getByLabel('Section Number')).toBeVisible();
    await expect(page.getByLabel('Semester Start Date')).toBeVisible();
    await expect(page.getByLabel('Semester End Date')).toBeVisible();
    await expect(page.getByLabel('Timezone')).toBeVisible();
  });

  test('should be keyboard navigable', async ({ page }) => {
    const fileInput = page.locator('#file-input');

    await fileInput.setInputFiles({
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 test')
    });

    // Tab through form fields
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Class Name')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Section Number')).toBeFocused();
  });
});
