'use strict';
const request = require('supertest');
const app = require('../../src/app');

describe('Calendar Routes', () => {
  test('POST /api/v1/calendar/reminders — returns reminder links', async () => {
    const res = await request(app).post('/api/v1/calendar/reminders').send({ state: 'Maharashtra' }).expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.reminders).toBeDefined();
    expect(res.body.data.reminders.length).toBeGreaterThan(0);

    // Each reminder should have title, description, and link
    const reminder = res.body.data.reminders[0];
    expect(reminder.title).toBeDefined();
    expect(reminder.description).toBeDefined();
    expect(reminder.link).toContain('calendar.google.com');
  });

  test('POST /api/v1/calendar/reminders — returns map link', async () => {
    const res = await request(app).post('/api/v1/calendar/reminders').send({ state: 'Delhi' }).expect(200);

    expect(res.body.data.mapLink).toBeDefined();
    expect(res.body.data.mapLink).toContain('google.com/maps');
    expect(res.body.data.mapLink).toContain('Delhi');
  });

  test('POST /api/v1/calendar/reminders — works without state', async () => {
    const res = await request(app).post('/api/v1/calendar/reminders').send({}).expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.reminders.length).toBeGreaterThan(0);
  });
});
