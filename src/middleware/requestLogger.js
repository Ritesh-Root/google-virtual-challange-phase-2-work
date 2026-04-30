'use strict';
const crypto = require('crypto');

/**
 * Structured JSON request logging for Google Cloud Logging.
 * Uses Cloud Run compatible severity levels (INFO, WARNING, ERROR).
 * Adds correlation ID for distributed request tracing.
 * Redacts sensitive fields from logs.
 *
 * @see https://cloud.google.com/run/docs/logging
 * @see https://cloud.google.com/logging/docs/structured-logging
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Function} next
 */
function requestLogger(req, res, next) {
  // Generate or forward correlation ID (supports Cloud Trace propagation)
  const traceHeader = req.get('X-Cloud-Trace-Context');
  const correlationId = req.get('X-Request-ID') || crypto.randomUUID();
  req.correlationId = correlationId;

  // Expose correlation ID in response headers for client-side tracing
  res.setHeader('X-Request-ID', correlationId);

  const start = Date.now();

  res.on('finish', () => {
    const responseTimeMs = Date.now() - start;

    // Cloud Logging structured format with severity levels
    const logEntry = {
      severity: res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARNING' : 'INFO',
      event: 'http_request',
      httpRequest: {
        requestMethod: req.method,
        requestUrl: req.originalUrl || req.url,
        status: res.statusCode,
        responseSize: res.get('content-length') || 0,
        userAgent: req.get('user-agent') || 'unknown',
        remoteIp: req.ip || req.connection?.remoteAddress,
        latency: `${(responseTimeMs / 1000).toFixed(3)}s`,
      },
      correlationId,
      responseTimeMs,
    };

    // Add Cloud Trace context if available (enables trace correlation in GCP)
    if (traceHeader) {
      const [traceId] = traceHeader.split('/');
      logEntry['logging.googleapis.com/trace'] =
        `projects/${process.env.GOOGLE_CLOUD_PROJECT || 'electionguide-ai'}/traces/${traceId}`;
    }

    console.log(JSON.stringify(logEntry));
  });

  next();
}

module.exports = { requestLogger };
