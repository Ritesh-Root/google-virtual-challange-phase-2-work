'use strict';
const express = require('express');
const path = require('path');
const config = require('./config');
const { securityMiddleware } = require('./middleware/security');
const { rateLimiter } = require('./middleware/rateLimiter');
const { requestLogger } = require('./middleware/requestLogger');
const { errorHandler } = require('./middleware/errorHandler');
const { AppError, NotFoundError, ValidationError } = require('./utils/errors');
const routes = require('./routes');

/**
 * Express application factory.
 * Assembles middleware stack in correct order:
 * Security → Logging → Rate Limit → Body Parse → Static → Routes → 404 → Error Handler
 *
 * @module app
 */
const app = express();

// Trust proxy for Cloud Run (required for correct IP in rate limiting and logging)
app.set('trust proxy', 1);

// Disable X-Powered-By header (defense-in-depth, also done by Helmet)
app.disable('x-powered-by');

// Security middleware stack (compression + helmet + permissions-policy + cors)
app.use(securityMiddleware());

// Structured request logging and correlation ID must run before middleware that can reject requests
app.use(requestLogger);

// Rate limiting — applied before body parsing for efficiency
app.use(rateLimiter);

// Body parsing with strict size limit (defense against payload DoS)
app.use(express.json({ limit: config.bodyLimit }));

// Normalize body parser errors into client-safe API errors.
app.use((err, _req, _res, next) => {
  if (err.type === 'entity.parse.failed') {
    return next(new ValidationError('Request body must be valid JSON'));
  }
  if (err.type === 'entity.too.large' || err.status === 413) {
    return next(new AppError(`Request body must be ${config.bodyLimit} or smaller`, 413, 'PAYLOAD_TOO_LARGE'));
  }
  return next(err);
});

// Static files with aggressive caching headers and security
app.use(
  express.static(path.join(__dirname, '..', 'public'), {
    maxAge: config.staticMaxAge,
    etag: true,
    lastModified: true,
    index: 'index.html',
    dotfiles: 'deny', // Deny access to dotfiles (security)
    extensions: false, // Disable extension-less file serving
  })
);

// API routes
app.use(routes);

// SPA fallback — serve index.html for non-API routes
app.get('{*path}', (req, res, next) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  } else {
    next(new NotFoundError('Endpoint'));
  }
});

// Centralized error handling (must be last middleware)
app.use(errorHandler);

module.exports = app;
