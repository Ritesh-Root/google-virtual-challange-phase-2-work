'use strict';
const cacheService = require('../../src/services/cacheService');

describe('CacheService', () => {
  beforeEach(() => {
    cacheService.clear();
  });

  describe('generateKey', () => {
    test('generates consistent key for same input', () => {
      const key1 = cacheService.generateKey('hello', { location: { state: 'Delhi' } });
      const key2 = cacheService.generateKey('hello', { location: { state: 'Delhi' } });
      expect(key1).toBe(key2);
    });

    test('generates different keys for different messages', () => {
      const key1 = cacheService.generateKey('hello', {});
      const key2 = cacheService.generateKey('goodbye', {});
      expect(key1).not.toBe(key2);
    });

    test('generates different keys for different contexts', () => {
      const key1 = cacheService.generateKey('hello', { location: { state: 'Delhi' } });
      const key2 = cacheService.generateKey('hello', { location: { state: 'Mumbai' } });
      expect(key1).not.toBe(key2);
    });

    test('normalizes case and whitespace', () => {
      const key1 = cacheService.generateKey('Hello World', {});
      const key2 = cacheService.generateKey('  hello world  ', {});
      expect(key1).toBe(key2);
    });
  });

  describe('get/set', () => {
    test('stores and retrieves values', () => {
      cacheService.set('key1', { data: 'test' });
      const result = cacheService.get('key1');
      expect(result).toEqual({ data: 'test' });
    });

    test('returns null for missing keys', () => {
      const result = cacheService.get('nonexistent');
      expect(result).toBeNull();
    });

    test('updates existing keys', () => {
      cacheService.set('key1', { data: 'old' });
      cacheService.set('key1', { data: 'new' });
      const result = cacheService.get('key1');
      expect(result).toEqual({ data: 'new' });
    });
  });

  describe('getStats', () => {
    test('tracks hits and misses', () => {
      cacheService.set('key1', 'value');
      cacheService.get('key1'); // hit
      cacheService.get('key2'); // miss

      const stats = cacheService.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe('50.0%');
    });

    test('returns 0% hit rate when empty', () => {
      const stats = cacheService.getStats();
      expect(stats.hitRate).toBe('0%');
      expect(stats.size).toBe(0);
    });
  });

  describe('clear', () => {
    test('removes all entries and resets stats', () => {
      cacheService.set('key1', 'value');
      cacheService.get('key1');
      cacheService.clear();

      const stats = cacheService.getStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });
});
