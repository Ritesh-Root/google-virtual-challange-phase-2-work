'use strict';
const request = require('supertest');
const app = require('../../src/app');

describe('Topic Routes', () => {
  test('GET /api/v1/topics — returns topic list', async () => {
    const res = await request(app).get('/api/v1/topics').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.topics).toBeDefined();
    expect(res.body.data.topics.length).toBeGreaterThanOrEqual(5);

    const topic = res.body.data.topics[0];
    expect(topic.key).toBeDefined();
    expect(topic.title).toBeDefined();
    expect(topic.summary).toBeDefined();
  });

  test('GET /api/v1/topics/:topicKey — returns topic details', async () => {
    const res = await request(app).get('/api/v1/topics/eligibility').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.title).toContain('Eligibility');
    expect(res.body.data.source_url).toBeDefined();
  });

  test('GET /api/v1/topics/:topicKey — returns 404 for unknown topic', async () => {
    const res = await request(app).get('/api/v1/topics/nonexistent').expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
