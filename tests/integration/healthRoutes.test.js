'use strict';
const request = require('supertest');
const app = require('../../src/app');

describe('Health Routes', () => {
  test('GET /api/v1/health — returns healthy status', async () => {
    const res = await request(app).get('/api/v1/health').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.version).toBeDefined();
    expect(res.body.data.uptime).toBeDefined();
    expect(typeof res.body.data.uptime).toBe('number');
  });

  test('GET /api/v1/health — includes knowledge base metadata', async () => {
    const res = await request(app).get('/api/v1/health').expect(200);

    expect(res.body.data.knowledgeBase).toBeDefined();
    expect(res.body.data.knowledgeBase.jurisdiction).toBe('India');
    expect(res.body.data.knowledgeBase.version).toBeDefined();
  });

  test('GET /api/v1/health — includes cache stats', async () => {
    const res = await request(app).get('/api/v1/health').expect(200);

    expect(res.body.data.cache).toBeDefined();
    expect(typeof res.body.data.cache.size).toBe('number');
    expect(res.body.data.cache.hitRate).toBeDefined();
  });

  test('GET /api/v1/health — includes session count', async () => {
    const res = await request(app).get('/api/v1/health').expect(200);

    expect(typeof res.body.data.sessions).toBe('number');
  });

  test('GET /api/v1/health — includes timestamp', async () => {
    const res = await request(app).get('/api/v1/health').expect(200);

    expect(res.body.data.timestamp).toBeDefined();
    expect(new Date(res.body.data.timestamp)).toBeInstanceOf(Date);
  });

  // ===== NEW TESTS =====

  test('GET /api/v1/health — includes memory usage', async () => {
    const res = await request(app).get('/api/v1/health').expect(200);

    expect(res.body.data.memoryUsage).toBeDefined();
    expect(res.body.data.memoryUsage.rss).toBeDefined();
    expect(res.body.data.memoryUsage.heapUsed).toBeDefined();
  });

  test('GET /api/v1/health — includes uptime formatted', async () => {
    const res = await request(app).get('/api/v1/health').expect(200);

    expect(res.body.data.uptimeFormatted).toBeDefined();
    expect(res.body.data.uptimeFormatted).toMatch(/\d+h \d+m \d+s/);
  });

  test('GET /api/v1/health — includes topic count', async () => {
    const res = await request(app).get('/api/v1/health').expect(200);

    expect(res.body.data.knowledgeBase.topicCount).toBeDefined();
    expect(res.body.data.knowledgeBase.topicCount).toBeGreaterThan(0);
  });

  test('GET /api/v1/health — includes node version', async () => {
    const res = await request(app).get('/api/v1/health').expect(200);

    expect(res.body.data.nodeVersion).toBeDefined();
    expect(res.body.data.nodeVersion).toMatch(/^v\d+/);
  });

  test('GET /api/v1/health — includes environment', async () => {
    const res = await request(app).get('/api/v1/health').expect(200);

    expect(res.body.data.environment).toBeDefined();
  });

  test('GET /api/v1/health — includes Cache-Control no-cache header', async () => {
    const res = await request(app).get('/api/v1/health').expect(200);

    expect(res.headers['cache-control']).toContain('no-cache');
  });

  test('GET /api/v1/health — includes security headers', async () => {
    const res = await request(app).get('/api/v1/health').expect(200);

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  test('GET /api/v1/quality-scorecard — exposes rubric-aligned evidence', async () => {
    const res = await request(app).get('/api/v1/quality-scorecard').expect(200);
    const criteria = res.body.data.criteria.map((item) => item.key);

    expect(res.body.success).toBe(true);
    expect(res.body.data.schemaVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(res.body.data.generatedAt).toBeUndefined();
    expect(criteria).toEqual(
      expect.arrayContaining(['code_quality', 'security', 'efficiency', 'testing', 'accessibility', 'google_services'])
    );
    expect(res.body.data.safeToExpose).toBe(true);
  });
});
