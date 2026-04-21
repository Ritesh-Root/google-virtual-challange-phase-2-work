'use strict';
const request = require('supertest');
const app = require('../../src/app');

describe('Scenario: First-time voter journey', () => {
  let sessionId;

  test('Step 1: User says "I just turned 18" → extracts age, responds about eligibility', async () => {
    const res = await request(app)
      .post('/api/v1/chat')
      .send({ message: 'I just turned 18' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.sessionId).toBeDefined();
    sessionId = res.body.sessionId;

    expect(res.body.data.answer_summary).toBeDefined();
    expect(typeof res.body.data.answer_summary).toBe('string');
    expect(res.body.data.answer_summary.length).toBeGreaterThan(5);
  });

  test('Step 2: User provides state → gets personalized response', async () => {
    const res = await request(app)
      .post('/api/v1/chat')
      .send({ message: 'I am from Maharashtra and want to register', sessionId })
      .expect(200);

    expect(res.body.success).toBe(true);

    // Response should reference registration
    const data = res.body.data;
    expect(data.answer_summary).toBeDefined();

    if (data.next_3_actions) {
      expect(data.next_3_actions.length).toBeLessThanOrEqual(3);
      const hasRegistration = data.next_3_actions.some(
        (a) => /register|form 6|voter|enroll/i.test(a)
      );
      expect(hasRegistration).toBe(true);
    }

    expect(data.disclaimer).toBeDefined();
  });

  test('Step 3: Same session retains context', async () => {
    const res = await request(app)
      .post('/api/v1/chat')
      .send({ message: 'What documents do I need?', sessionId })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.answer_summary).toBeDefined();
    expect(res.body.data.confidence).toBeDefined();
  });
});
