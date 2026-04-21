'use strict';
const request = require('supertest');
const app = require('../../src/app');

describe('Scenario: Unsupported region query', () => {
  test('UK election query → graceful boundary response', async () => {
    const res = await request(app)
      .post('/api/v1/chat')
      .send({ message: 'How do elections work in the UK?' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.answer_summary).toBeDefined();

    const summary = res.body.data.answer_summary.toLowerCase();
    expect(
      summary.includes('india') || summary.includes('specialize') || summary.includes('currently') || summary.includes('election commission')
    ).toBe(true);

    if (res.body.data.next_3_actions) {
      expect(res.body.data.next_3_actions.length).toBeGreaterThan(0);
    }
  });

  test('Random non-election question → graceful boundary', async () => {
    const res = await request(app)
      .post('/api/v1/chat')
      .send({ message: 'What is the weather in Mumbai?' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.answer_summary).toBeDefined();
  });
});
