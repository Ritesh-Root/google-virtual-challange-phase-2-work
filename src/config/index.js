'use strict';
require('dotenv').config();

/**
 * Central application configuration.
 * All values sourced from environment variables with safe defaults.
 * Immutable via Object.freeze to prevent accidental mutation.
 *
 * @module config
 * @typedef {Object} AppConfig
 * @property {number} port - HTTP server port
 * @property {string} nodeEnv - Environment name (development, production, test)
 * @property {boolean} isDev - True if running in development mode
 * @property {boolean} isProd - True if running in production mode
 * @property {string} geminiApiKey - Google Gemini API key
 * @property {number} rateLimitWindowMs - Rate limit window duration in ms
 * @property {number} rateLimitMax - Maximum requests per rate limit window
 * @property {number} cacheMaxSize - Maximum entries in LRU cache
 * @property {number} cacheTtlMs - Cache entry time-to-live in ms
 * @property {number} maxSessions - Maximum concurrent sessions
 * @property {number} sessionTtlMs - Session time-to-live in ms
 * @property {number} sessionCleanupIntervalMs - Session cleanup interval in ms
 * @property {string[]} allowedOrigins - CORS allowed origins
 * @property {string} defaultLanguage - Default response language
 * @property {string[]} supportedLanguages - Supported language codes
 * @property {string} jurisdiction - Legal jurisdiction scope
 * @property {string} bodyLimit - Maximum request body size
 * @property {string} staticMaxAge - Static file cache duration
 * @property {string} gcpProject - Google Cloud project ID
 */
module.exports = Object.freeze({
  port: parseInt(process.env.PORT, 10) || 8080,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',
  geminiApiKey: process.env.GEMINI_API_KEY,
  rateLimitWindowMs: 15 * 60 * 1000,
  rateLimitMax: 100,
  cacheMaxSize: 200,
  cacheTtlMs: 30 * 60 * 1000,
  maxSessions: 1000,
  sessionTtlMs: 30 * 60 * 1000,
  sessionCleanupIntervalMs: 5 * 60 * 1000,
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'hi'],
  jurisdiction: 'India',
  bodyLimit: '10kb',
  staticMaxAge: process.env.NODE_ENV === 'production' ? '1h' : '0',
  gcpProject: process.env.GOOGLE_CLOUD_PROJECT || 'electionguide-ai',
});
