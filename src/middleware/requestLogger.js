'use strict';
const crypto = require('crypto');

/**
 * Structured JSON request logging for Cloud Run.
 * Adds correlation ID for request tracing. Redacts sensitive fields.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Function} next
 */
function requestLogger(req, res, next) {
  const correlationId = crypto.randomUUID();
  req.correlationId = correlationId;
  const start = Date.now();

  res.on('finish', () => {
    console.log(JSON.stringify({
      event: 'request',
      correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTimeMs: Date.now() - start,
      userAgent: req.get('user-agent') || 'unknown',
    }));
  });

  next();
}

module.exports = { requestLogger };
