'use strict';
const app = require('./app');
const config = require('./config');
const { initializeGemini } = require('./config/gemini');

/**
 * Start the ElectionGuide AI server.
 * Validates configuration, initializes Gemini AI models, and starts HTTP listener.
 * Implements graceful shutdown for Cloud Run SIGTERM signals.
 *
 * @module server
 */
function start() {
  try {
    // Validate required configuration
    if (!config.geminiApiKey) {
      console.error(
        JSON.stringify({
          severity: 'CRITICAL',
          event: 'startup_error',
          message: 'FATAL: GEMINI_API_KEY environment variable not set. See .env.example for required configuration.',
        })
      );
      process.exit(1);
    }

    // Validate API key format (basic check — not empty, not placeholder)
    if (config.geminiApiKey === 'your_gemini_api_key_here' || config.geminiApiKey.length < 10) {
      console.error(
        JSON.stringify({
          severity: 'CRITICAL',
          event: 'startup_error',
          message: 'FATAL: GEMINI_API_KEY appears to be a placeholder. Please set a valid API key.',
        })
      );
      process.exit(1);
    }

    // Initialize all 3 Gemini model instances
    initializeGemini();
    console.log(
      JSON.stringify({
        severity: 'INFO',
        event: 'init',
        status: 'gemini_ready',
        models: ['gemini-2.5-flash (chat)', 'gemini-2.5-flash (classifier)', 'gemini-2.5-flash (translation)'],
      })
    );

    // Start HTTP server
    const server = app.listen(config.port, () => {
      console.log(
        JSON.stringify({
          severity: 'INFO',
          event: 'server_start',
          port: config.port,
          env: config.nodeEnv,
          nodeVersion: process.version,
          message: `🗳️ ElectionGuide AI running on port ${config.port}`,
        })
      );
    });

    // Configure server timeouts for Cloud Run
    server.keepAliveTimeout = 65000; // Slightly higher than Cloud Run's 60s
    server.headersTimeout = 66000; // Slightly higher than keepAliveTimeout

    // Graceful shutdown handler for Cloud Run SIGTERM
    const gracefulShutdown = (signal) => {
      console.log(
        JSON.stringify({
          severity: 'INFO',
          event: 'shutdown',
          signal,
          message: 'Graceful shutdown initiated',
        })
      );

      server.close(() => {
        console.log(
          JSON.stringify({
            severity: 'INFO',
            event: 'shutdown_complete',
            message: 'All connections closed. Exiting.',
          })
        );
        process.exit(0);
      });

      // Force shutdown after 10 seconds if connections don't close
      setTimeout(() => {
        console.error(
          JSON.stringify({
            severity: 'WARNING',
            event: 'shutdown_timeout',
            message: 'Forced shutdown after timeout',
          })
        );
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error(
      JSON.stringify({
        severity: 'CRITICAL',
        event: 'startup_error',
        error: error.message,
        stack: error.stack,
      })
    );
    process.exit(1);
  }
}

// Global unhandled rejection handler — prevents silent failures
process.on('unhandledRejection', (reason) => {
  console.error(
    JSON.stringify({
      severity: 'ERROR',
      event: 'unhandled_rejection',
      reason: String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    })
  );
});

// Global uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error(
    JSON.stringify({
      severity: 'CRITICAL',
      event: 'uncaught_exception',
      error: error.message,
      stack: error.stack,
    })
  );
  process.exit(1);
});

start();
