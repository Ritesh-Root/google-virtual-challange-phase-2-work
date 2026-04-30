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

  // ===== NEW TESTS =====

  test('GET /api/v1/topics — includes Cache-Control header', async () => {
    const res = await request(app).get('/api/v1/topics').expect(200);

    expect(res.headers['cache-control']).toContain('public');
    expect(res.headers['cache-control']).toContain('max-age=3600');
  });

  test('GET /api/v1/topics/:topicKey — includes Cache-Control header', async () => {
    const res = await request(app).get('/api/v1/topics/eligibility').expect(200);

    expect(res.headers['cache-control']).toContain('public');
  });

  test('GET /api/v1/topics — each topic has required fields', async () => {
    const res = await request(app).get('/api/v1/topics').expect(200);

    res.body.data.topics.forEach((topic) => {
      expect(typeof topic.key).toBe('string');
      expect(typeof topic.title).toBe('string');
      expect(typeof topic.summary).toBe('string');
      expect(topic.key.length).toBeGreaterThan(0);
    });
  });

  test('GET /api/v1/topics/registration — has registration details', async () => {
    const res = await request(app).get('/api/v1/topics/registration').expect(200);

    expect(res.body.data.title).toContain('Registration');
    expect(res.body.data.methods).toBeDefined();
  });

  test('GET /api/v1/topics/election_timeline — has phases', async () => {
    const res = await request(app).get('/api/v1/topics/election_timeline').expect(200);

    expect(res.body.data.phases).toBeDefined();
    expect(res.body.data.phases.length).toBe(9);
  });

  test('GET /api/v1/topics/voter_rights — has rights list', async () => {
    const res = await request(app).get('/api/v1/topics/voter_rights').expect(200);

    expect(res.body.data.rights).toBeDefined();
    expect(res.body.data.rights.length).toBeGreaterThan(0);
  });
});
