'use strict';
const config = require('../config');
const { AppError } = require('../utils/errors');

/**
 * Centralized error handling middleware.
 * Distinguishes operational errors from programmer errors.
 * Never exposes internal details in production.
 * @param {Error} err - Error object
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {Function} _next - Express next function
 */
function errorHandler(err, req, res, _next) {
  // Log the full error internally (structured JSON for Cloud Run)
  console.error(JSON.stringify({
    event: 'error',
    code: err.code || 'UNKNOWN',
    message: err.message,
    path: req.path,
    method: req.method,
    stack: config.isDev ? err.stack : undefined,
  }));

  // Determine status code and error code
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const code = err instanceof AppError ? err.code : 'INTERNAL_ERROR';

  // Client-safe response — never expose stack traces
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: err instanceof AppError
        ? err.message
        : 'An unexpected error occurred. Please try again.',
    },
  });
}

module.exports = { errorHandler };
