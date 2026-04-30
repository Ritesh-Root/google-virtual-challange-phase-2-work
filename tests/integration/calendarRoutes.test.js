'use strict';
const request = require('supertest');
const app = require('../../src/app');

describe('Calendar Routes', () => {
  test('POST /api/v1/calendar/reminders — returns reminder links', async () => {
    const res = await request(app)
      .post('/api/v1/calendar/reminders')
      .send({ state: 'Maharashtra', electionDate: '2026-05-31' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.reminders).toBeDefined();
    expect(res.body.data.reminders.length).toBeGreaterThan(0);

    // Each reminder should have title, description, and link
    const reminder = res.body.data.reminders[0];
    expect(reminder.title).toBeDefined();
    expect(reminder.description).toBeDefined();
    expect(reminder.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(reminder.link).toContain('calendar.google.com');
  });

  test('POST /api/v1/calendar/reminders — returns map link', async () => {
    const res = await request(app).post('/api/v1/calendar/reminders').send({ state: 'Delhi' }).expect(200);

    expect(res.body.data.mapLink).toBeDefined();
    expect(res.body.data.mapLink).toContain('google.com/maps');
    expect(res.body.data.mapLink).toContain('Delhi');
  });

  test('POST /api/v1/calendar/reminders — does not invent dates without election context', async () => {
    const res = await request(app).post('/api/v1/calendar/reminders').send({}).expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.reminders).toEqual([]);
    expect(res.body.data.dateStatus).toBe('unavailable');
  });

  test('POST /api/v1/calendar/reminders — supports daysUntilElection context', async () => {
    const res = await request(app).post('/api/v1/calendar/reminders').send({ daysUntilElection: 30 }).expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.reminders.length).toBeGreaterThan(0);
    expect(res.body.data.dateStatus).toBe('verified_from_user_context');
  });
});
