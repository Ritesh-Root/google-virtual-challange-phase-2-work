'use strict';
const request = require('supertest');
const app = require('../../src/app');

describe('Chat Routes', () => {
  test('POST /api/v1/chat — returns valid response for greeting', async () => {
    const res = await request(app)
      .post('/api/v1/chat')
      .send({ message: 'Hello' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.answer_summary).toBeDefined();
    expect(res.body.sessionId).toBeDefined();
  });

  test('POST /api/v1/chat — returns valid response for eligibility', async () => {
    const res = await request(app)
      .post('/api/v1/chat')
      .send({ message: 'Can I vote?' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.answer_summary).toBeDefined();
  });

  test('POST /api/v1/chat — returns valid response for timeline', async () => {
    const res = await request(app)
      .post('/api/v1/chat')
      .send({ message: 'Show me the election timeline' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  test('POST /api/v1/chat — returns calendar links for reminder request', async () => {
    const res = await request(app)
      .post('/api/v1/chat')
      .send({ message: 'Remind me of election dates' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.calendarLinks).toBeDefined();
    expect(res.body.data.calendarLinks.length).toBeGreaterThan(0);
    expect(res.body.data.mapLink).toBeDefined();
    expect(res.body.data.mapLink).toContain('google.com/maps');
  });

  test('POST /api/v1/chat — rejects empty message', async () => {
    const res = await request(app)
      .post('/api/v1/chat')
      .send({ message: '' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });

  test('POST /api/v1/chat — rejects missing message', async () => {
    const res = await request(app)
      .post('/api/v1/chat')
      .send({})
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  test('POST /api/v1/chat — rejects HTML tags in message', async () => {
    const res = await request(app)
      .post('/api/v1/chat')
      .send({ message: '<script>alert(1)</script>' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  test('POST /api/v1/chat — accepts language parameter', async () => {
    const res = await request(app)
      .post('/api/v1/chat')
      .send({ message: 'Hello', language: 'hi' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  test('POST /api/v1/chat — maintains session across requests', async () => {
    const res1 = await request(app)
      .post('/api/v1/chat')
      .send({ message: 'Hello' })
      .expect(200);

    const sessionId = res1.body.sessionId;
    expect(sessionId).toBeDefined();

    const res2 = await request(app)
      .post('/api/v1/chat')
      .send({ message: 'How do I register?', sessionId })
      .expect(200);

    expect(res2.body.sessionId).toBe(sessionId);
  });
});
