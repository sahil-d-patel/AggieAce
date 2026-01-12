/**
 * Unit Tests for Validation Middleware
 *
 * Tests input validation rules for conversion endpoint
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { validationResult } from 'express-validator';

// Import the validation rules and middleware
import {
  conversionValidationRules,
  validate
} from '../../../src/middleware/validation.middleware.js';

/**
 * Helper to run validation rules against mock request
 */
const runValidation = async (body) => {
  const req = {
    body
  };

  // Run all validation rules
  for (const rule of conversionValidationRules) {
    await rule.run(req);
  }

  return validationResult(req);
};

describe('Validation Middleware', () => {
  // Valid Input Tests

  describe('Valid Input', () => {
    const validInput = {
      className: 'CSCE 121',
      sectionNumber: '501',
      semesterStart: '01/16/2024',
      semesterEnd: '05/03/2024',
      timezone: 'America/Chicago'
    };

    it('should pass validation with valid input', async () => {
      const result = await runValidation(validInput);

      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with minimum length class name', async () => {
      const result = await runValidation({
        ...validInput,
        className: 'CS'  // 2 characters - minimum
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with all valid timezones', async () => {
      const validTimezones = [
        'America/Chicago',
        'America/New_York',
        'America/Los_Angeles',
        'America/Denver',
        'America/Phoenix',
        'Pacific/Honolulu',
        'America/Anchorage'
      ];

      for (const timezone of validTimezones) {
        const result = await runValidation({
          ...validInput,
          timezone
        });

        expect(result.isEmpty()).toBe(true);
      }
    });
  });

  // Class Name Validation Tests

  describe('Class Name Validation', () => {
    const baseInput = {
      sectionNumber: '501',
      semesterStart: '01/16/2024',
      semesterEnd: '05/03/2024',
      timezone: 'America/Chicago'
    };

    it('should reject empty class name', async () => {
      const result = await runValidation({
        ...baseInput,
        className: ''
      });

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'className')).toBe(true);
    });

    it('should reject missing class name', async () => {
      const result = await runValidation(baseInput);

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'className')).toBe(true);
    });

    it('should reject class name that is too short', async () => {
      const result = await runValidation({
        ...baseInput,
        className: 'A'  // Only 1 character
      });

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'className' && e.msg.includes('between 2 and 100'))).toBe(true);
    });

    it('should reject class name that is too long', async () => {
      const result = await runValidation({
        ...baseInput,
        className: 'A'.repeat(101)  // 101 characters
      });

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'className' && e.msg.includes('between 2 and 100'))).toBe(true);
    });

    it('should trim whitespace from class name', async () => {
      const result = await runValidation({
        ...baseInput,
        className: '   CSCE 121   '
      });

      expect(result.isEmpty()).toBe(true);
    });
  });

  // Section Number Validation Tests

  describe('Section Number Validation', () => {
    const baseInput = {
      className: 'CSCE 121',
      semesterStart: '01/16/2024',
      semesterEnd: '05/03/2024',
      timezone: 'America/Chicago'
    };

    it('should reject empty section number', async () => {
      const result = await runValidation({
        ...baseInput,
        sectionNumber: ''
      });

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'sectionNumber')).toBe(true);
    });

    it('should reject section number that is too long', async () => {
      const result = await runValidation({
        ...baseInput,
        sectionNumber: '12345678901234567890X'  // 21 characters
      });

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'sectionNumber')).toBe(true);
    });
  });

  // Date Format Validation Tests

  describe('Date Format Validation', () => {
    const baseInput = {
      className: 'CSCE 121',
      sectionNumber: '501',
      timezone: 'America/Chicago'
    };

    it('should reject invalid semester start date format (YYYY-MM-DD)', async () => {
      const result = await runValidation({
        ...baseInput,
        semesterStart: '2024-01-16',  // Wrong format
        semesterEnd: '05/03/2024'
      });

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'semesterStart' && e.msg.includes('MM/DD/YYYY'))).toBe(true);
    });

    it('should reject invalid semester end date format', async () => {
      const result = await runValidation({
        ...baseInput,
        semesterStart: '01/16/2024',
        semesterEnd: 'May 3, 2024'  // Wrong format
      });

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'semesterEnd' && e.msg.includes('MM/DD/YYYY'))).toBe(true);
    });

    it('should reject empty semester start date', async () => {
      const result = await runValidation({
        ...baseInput,
        semesterStart: '',
        semesterEnd: '05/03/2024'
      });

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'semesterStart')).toBe(true);
    });

    it('should reject invalid month in date', async () => {
      const result = await runValidation({
        ...baseInput,
        semesterStart: '13/16/2024',  // Invalid month
        semesterEnd: '05/03/2024'
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should reject invalid day in date', async () => {
      const result = await runValidation({
        ...baseInput,
        semesterStart: '01/32/2024',  // Invalid day
        semesterEnd: '05/03/2024'
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should accept valid date edge cases', async () => {
      // First day of month
      let result = await runValidation({
        ...baseInput,
        semesterStart: '01/01/2024',
        semesterEnd: '12/31/2024'
      });
      expect(result.isEmpty()).toBe(true);

      // Last days
      result = await runValidation({
        ...baseInput,
        semesterStart: '01/31/2024',
        semesterEnd: '05/31/2024'
      });
      expect(result.isEmpty()).toBe(true);
    });
  });

  // Timezone Validation Tests

  describe('Timezone Validation', () => {
    const baseInput = {
      className: 'CSCE 121',
      sectionNumber: '501',
      semesterStart: '01/16/2024',
      semesterEnd: '05/03/2024'
    };

    it('should reject invalid timezone', async () => {
      const result = await runValidation({
        ...baseInput,
        timezone: 'Europe/London'  // Not in allowed list
      });

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'timezone' && e.msg.includes('Invalid timezone'))).toBe(true);
    });

    it('should reject empty timezone', async () => {
      const result = await runValidation({
        ...baseInput,
        timezone: ''
      });

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'timezone')).toBe(true);
    });

    it('should reject arbitrary string timezone', async () => {
      const result = await runValidation({
        ...baseInput,
        timezone: 'CST'  // Abbreviation not accepted
      });

      expect(result.isEmpty()).toBe(false);
    });
  });

  // Validate Middleware Tests

  describe('validate() Middleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {
        body: {
          className: 'CSCE 121',
          sectionNumber: '501',
          semesterStart: '01/16/2024',
          semesterEnd: '05/03/2024',
          timezone: 'America/Chicago'
        }
      };

      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      mockNext = jest.fn();
    });

    it('should call next() when validation passes', async () => {
      // Run validation rules first
      for (const rule of conversionValidationRules) {
        await rule.run(mockReq);
      }

      validate(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 400 with errors when validation fails', async () => {
      mockReq.body.className = '';  // Invalid

      // Run validation rules
      for (const rule of conversionValidationRules) {
        await rule.run(mockReq);
      }

      validate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation error',
          message: 'Invalid request data',
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'className'
            })
          ])
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return all validation errors', async () => {
      mockReq.body = {
        className: '',
        sectionNumber: '',
        semesterStart: 'invalid',
        semesterEnd: 'invalid',
        timezone: 'invalid'
      };

      // Run validation rules
      for (const rule of conversionValidationRules) {
        await rule.run(mockReq);
      }

      validate(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.errors.length).toBeGreaterThanOrEqual(5);
    });
  });
});
