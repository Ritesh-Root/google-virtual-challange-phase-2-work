'use strict';
const rateLimit = require('express-rate-limit');
const config = require('../config');

/**
 * Rate limiting middleware.
 * 100 requests per 15 minutes per IP. Skips health endpoint.
 */
const rateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/v1/health',
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMIT', message: 'Too many requests. Please try again in a few minutes.' },
    });
  },
});

module.exports = { rateLimiter };
