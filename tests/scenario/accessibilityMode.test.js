'use strict';
const request = require('supertest');
const app = require('../../src/app');

describe('Scenario: Accessibility mode', () => {
  test('Hindi language support works', async () => {
    const res = await request(app).post('/api/v1/chat').send({ message: 'Hello', language: 'hi' }).expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.answer_summary).toBeDefined();
  });

  test('Detail level simple returns response', async () => {
    const res = await request(app)
      .post('/api/v1/chat')
      .send({ message: 'How to register', detailLevel: 'simple' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  test('Detail level detailed returns response', async () => {
    const res = await request(app)
      .post('/api/v1/chat')
      .send({ message: 'How to register', detailLevel: 'detailed' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});
