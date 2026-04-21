'use strict';
const app = require('./app');
const config = require('./config');
const { initializeGemini } = require('./config/gemini');

/**
 * Start the ElectionGuide AI server.
 * Validates config, initializes Gemini, and starts listening.
 */
async function start() {
  try {
    if (!config.geminiApiKey) {
      console.error(JSON.stringify({
        event: 'startup_error',
        message: 'FATAL: GEMINI_API_KEY environment variable not set',
      }));
      process.exit(1);
    }

    initializeGemini();
    console.log(JSON.stringify({ event: 'init', status: 'gemini_ready' }));

    app.listen(config.port, () => {
      console.log(JSON.stringify({
        event: 'server_start',
        port: config.port,
        env: config.nodeEnv,
        message: `🗳️ ElectionGuide AI running on port ${config.port}`,
      }));
    });
  } catch (error) {
    console.error(JSON.stringify({ event: 'startup_error', error: error.message }));
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log(JSON.stringify({ event: 'shutdown', signal: 'SIGTERM' }));
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  console.error(JSON.stringify({ event: 'unhandled_rejection', reason: String(reason) }));
});

start();
