'use strict';
require('dotenv').config();

/**
 * Central application configuration.
 * All values sourced from environment variables with safe defaults.
 * @module config
 */
module.exports = Object.freeze({
  port: parseInt(process.env.PORT, 10) || 8080,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
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
});
