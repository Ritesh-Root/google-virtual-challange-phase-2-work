'use strict';
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const config = require('../config');

/**
 * Defense-in-depth security middleware stack.
 * Applies: compression, HTTP security headers (Helmet), CORS, and Permissions-Policy.
 * CSP is configured with strict directives to prevent XSS, clickjacking, and injection.
 *
 * @returns {Array<Function>} Array of Express middleware functions
 */
function securityMiddleware() {
  return [
    // Gzip/Brotli compression for all responses — reduces bandwidth and improves load time
    compression({
      threshold: 512, // Only compress responses larger than 512 bytes
      level: 6, // Balanced compression level (1-9)
    }),

    // HTTP security headers with strict CSP
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      dnsPrefetchControl: { allow: false },
      noSniff: true,
      xssFilter: true,
    }),

    // Permissions-Policy — restrict browser feature access
    (_req, res, next) => {
      res.setHeader(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
      );
      next();
    },

    // CORS configuration
    cors({
      origin: config.allowedOrigins.includes('*') ? '*' : config.allowedOrigins,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-Request-ID'],
      exposedHeaders: ['X-Request-ID', 'X-Response-Time'],
      maxAge: 86400, // Cache preflight for 24 hours
      credentials: false,
    }),
  ];
}

module.exports = { securityMiddleware };
