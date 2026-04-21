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
});
