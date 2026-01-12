/**
 * 404 Not Found Middleware
 *
 * Handles requests to undefined routes
 *
 * @module middleware/notFound
 */

/**
 * Not found handler middleware
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    availableRoutes: [
      'GET  /api/health',
      'POST /api/conversion',
      'GET  /api/auth/google',
      'GET  /api/auth/google/callback'
    ]
  });
};

export default notFoundHandler;
