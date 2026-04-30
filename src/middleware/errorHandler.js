'use strict';
const config = require('../config');
const { AppError } = require('../utils/errors');

/**
 * Centralized error handling middleware.
 * Distinguishes operational errors (client-safe) from programmer errors.
 * Never exposes internal details in production.
 * Outputs structured JSON compatible with Google Cloud Error Reporting.
 *
 * @see https://cloud.google.com/error-reporting/docs/formatting-error-messages
 *
 * @param {Error} err - Error object
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {Function} _next - Express next function (required for Express error handler signature)
 */
function errorHandler(err, req, res, _next) {
  // Determine status code and error code
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const code = err instanceof AppError ? err.code : 'INTERNAL_ERROR';
  const isOperational = err instanceof AppError && err.isOperational;

  // Structured error log compatible with Google Cloud Error Reporting
  const errorLog = {
    severity: statusCode >= 500 ? 'ERROR' : 'WARNING',
    '@type': 'type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent',
    event: 'error',
    code,
    message: err.message,
    httpRequest: {
      method: req.method,
      url: req.originalUrl || req.url,
      responseStatusCode: statusCode,
      remoteIp: req.ip,
      userAgent: req.get('user-agent') || 'unknown',
    },
    correlationId: req.correlationId || 'unknown',
    isOperational,
    stack: config.isDev ? err.stack : undefined,
    serviceContext: {
      service: 'electionguide-ai',
      version: '1.0.0',
    },
  };

  console.error(JSON.stringify(errorLog));

  // Client-safe response — never expose stack traces or internal details
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: isOperational ? err.message : 'An unexpected error occurred. Please try again.',
    },
  });
}

module.exports = { errorHandler };
