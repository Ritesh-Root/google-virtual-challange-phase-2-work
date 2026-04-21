'use strict';

/**
 * Base application error with HTTP status code.
 * @class AppError
 * @extends Error
 */
class AppError extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} [statusCode=500] - HTTP status code
   * @param {string} [code='INTERNAL_ERROR'] - Error code identifier
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error for invalid user input.
 * @class ValidationError
 * @extends AppError
 */
class ValidationError extends AppError {
  /** @param {string} message */
  constructor(message) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

/**
 * Resource not found error.
 * @class NotFoundError
 * @extends AppError
 */
class NotFoundError extends AppError {
  /** @param {string} resource - Name of the missing resource */
  constructor(resource) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

/**
 * Rate limit exceeded error.
 * @class RateLimitError
 * @extends AppError
 */
class RateLimitError extends AppError {
  constructor() {
    super('Too many requests, please try again later', 429, 'RATE_LIMIT');
  }
}

/**
 * Gemini AI service error.
 * @class GeminiError
 * @extends AppError
 */
class GeminiError extends AppError {
  /** @param {string} [message] */
  constructor(message) {
    super(message || 'AI service temporarily unavailable', 503, 'AI_SERVICE_ERROR');
  }
}

module.exports = { AppError, ValidationError, NotFoundError, RateLimitError, GeminiError };
