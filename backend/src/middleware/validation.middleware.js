/**
 * Validation Middleware
 *
 * Request validation using express-validator
 *
 * @module middleware/validation
 */

import { body, validationResult } from 'express-validator';

/**
 * Validation rules for syllabus conversion
 */
export const conversionValidationRules = [
  body('className')
    .trim()
    .notEmpty()
    .withMessage('Class name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Class name must be between 2 and 100 characters'),

  body('sectionNumber')
    .trim()
    .notEmpty()
    .withMessage('Section number is required')
    .isLength({ min: 1, max: 20 })
    .withMessage('Section number must be between 1 and 20 characters'),

  body('semesterStart')
    .trim()
    .notEmpty()
    .withMessage('Semester start date is required')
    .matches(/^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/)
    .withMessage('Semester start date must be in MM/DD/YYYY format'),

  body('semesterEnd')
    .trim()
    .notEmpty()
    .withMessage('Semester end date is required')
    .matches(/^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/)
    .withMessage('Semester end date must be in MM/DD/YYYY format'),

  body('timezone')
    .trim()
    .notEmpty()
    .withMessage('Timezone is required')
    .isIn([
      'America/Chicago',
      'America/New_York',
      'America/Los_Angeles',
      'America/Denver',
      'America/Phoenix',
      'Pacific/Honolulu',
      'America/Anchorage'
    ])
    .withMessage('Invalid timezone')
];

/**
 * Middleware to check validation results
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      message: 'Invalid request data',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }

  next();
};

export default {
  conversionValidationRules,
  validate
};
