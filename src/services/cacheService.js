'use strict';
const crypto = require('crypto');
const config = require('../config');

/**
 * LRU (Least Recently Used) cache with TTL for deterministic responses.
 * Only caches deterministic engine outputs, NOT variable Gemini outputs.
 * Cache key includes message + context hash for personalized results.
 * @class CacheService
 */
class CacheService {
  constructor() {
    /** @private */
    this.cache = new Map();
    /** @private */
    this.maxSize = config.cacheMaxSize;
    /** @private */
    this.ttlMs = config.cacheTtlMs;
    /** @private */
    this.hits = 0;
    /** @private */
    this.misses = 0;
  }

  /**
   * Generate a cache key from message + context.
   * Includes relevant context fields for personalized caching.
   * @param {string} message - Normalized message
   * @param {Object} context - User context slots
   * @returns {string} MD5 hash cache key
   */
  generateKey(message, context) {
    const keyData = JSON.stringify({
      msg: (message || '').toLowerCase().trim(),
      state: context?.location?.state || null,
      status: context?.voterStatus || null,
      lang: context?.preferredLanguage || 'en',
    });
    return crypto.createHash('md5').update(keyData).digest('hex');
  }

  /**
   * Get a cached value if it exists and hasn't expired.
   * @param {string} key - Cache key
   * @returns {*|null} Cached value or null
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    this.hits++;
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  /**
   * Store a value in the cache, evicting LRU entry if at capacity.
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   */
  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  /**
   * Get cache statistics for health endpoint and efficiency monitoring.
   * @returns {{ size: number, maxSize: number, hits: number, misses: number, hitRate: string }}
   */
  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? `${((this.hits / total) * 100).toFixed(1)}%` : '0%',
    };
  }

  /**
   * Clear all cache entries and reset stats.
   */
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

module.exports = new CacheService();
