'use strict';
const request = require('supertest');
const app = require('../../src/app');

describe('Scenario: Deadline urgency', () => {
  test('Responds appropriately when election is 5 days away', async () => {
    const res = await request(app)
      .post('/api/v1/chat')
      .send({ message: 'The election is in 5 days, what should I do?' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.answer_summary).toBeDefined();

    if (res.body.data.next_3_actions) {
      expect(res.body.data.next_3_actions.length).toBeGreaterThan(0);
    }
  });

  test('Responds with timeline for election schedule query', async () => {
    const res = await request(app)
      .post('/api/v1/chat')
      .send({ message: 'When are the election dates?' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.answer_summary).toBeDefined();
  });
});
