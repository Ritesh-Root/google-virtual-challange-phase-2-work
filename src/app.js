'use strict';
const express = require('express');
const path = require('path');
const config = require('./config');
const { securityMiddleware } = require('./middleware/security');
const { rateLimiter } = require('./middleware/rateLimiter');
const { requestLogger } = require('./middleware/requestLogger');
const { errorHandler } = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();

// Security middleware stack (compression + helmet + cors)
app.use(securityMiddleware());

// Rate limiting
app.use(rateLimiter);

// Body parsing with size limit
app.use(express.json({ limit: config.bodyLimit }));

// Structured request logging
app.use(requestLogger);

// Static files with caching headers
app.use(express.static(path.join(__dirname, '..', 'public'), {
  maxAge: config.staticMaxAge,
  etag: true,
}));

// API routes
app.use(routes);

// SPA fallback — serve index.html for non-API routes
app.get('{*path}', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  }
});

// Centralized error handling (must be last)
app.use(errorHandler);

module.exports = app;
