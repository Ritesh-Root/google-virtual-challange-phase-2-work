'use strict';
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const config = require('../config');

/**
 * Security middleware stack: compression + helmet + CORS.
 * @returns {Array<Function>} Array of Express middleware functions
 */
function securityMiddleware() {
  return [
    // Gzip/Brotli compression for all responses
    compression(),

    // HTTP security headers with strict CSP
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ['\'self\''],
          scriptSrc: ['\'self\''],
          styleSrc: ['\'self\'', '\'unsafe-inline\'', 'https://fonts.googleapis.com'],
          fontSrc: ['\'self\'', 'https://fonts.gstatic.com'],
          imgSrc: ['\'self\'', 'data:'],
          connectSrc: ['\'self\''],
          frameSrc: ['\'none\''],
          objectSrc: ['\'none\''],
        },
      },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'no-referrer' },
    }),

    // CORS configuration
    cors({
      origin: config.allowedOrigins.includes('*') ? '*' : config.allowedOrigins,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type'],
      maxAge: 86400,
    }),
  ];
}

module.exports = { securityMiddleware };
