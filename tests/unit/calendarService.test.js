'use strict';
const calendarService = require('../../src/services/calendarService');

describe('CalendarService', () => {
  describe('generateCalendarLink', () => {
    test('generates valid Google Calendar URL', () => {
      const link = calendarService.generateCalendarLink({
        title: 'Test Event',
        description: 'Test description',
        date: '2026-05-01',
      });

      expect(link).toContain('calendar.google.com/calendar/render');
      expect(link).toContain('action=TEMPLATE');
      expect(link).toContain('Test+Event');
    });

    test('handles missing location gracefully', () => {
      const link = calendarService.generateCalendarLink({
        title: 'Event',
        description: 'Desc',
        date: '2026-06-01',
      });

      expect(link).toContain('calendar.google.com');
    });

    test('includes location when provided', () => {
      const link = calendarService.generateCalendarLink({
        title: 'Voting',
        description: 'Go vote',
        date: '2026-05-01',
        location: 'Mumbai, India',
      });

      expect(link).toContain('Mumbai');
    });
  });

  describe('generateElectionReminders', () => {
    test('returns no dated milestones without a verified election date', () => {
      const reminders = calendarService.generateElectionReminders({});
      expect(reminders).toHaveLength(0);
    });

    test('returns future milestones from an explicit election date', () => {
      const reminders = calendarService.generateElectionReminders(
        { electionDate: '2026-05-31' },
        { now: new Date('2026-05-01T00:00:00Z') }
      );
      expect(reminders).toHaveLength(4);
    });

    test('each reminder has title, description, and link', () => {
      const reminders = calendarService.generateElectionReminders(
        { electionDate: '2026-05-31' },
        { now: new Date('2026-05-01T00:00:00Z') }
      );
      reminders.forEach((r) => {
        expect(r.title).toBeDefined();
        expect(r.description).toBeDefined();
        expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(r.link).toContain('calendar.google.com');
      });
    });

    test('uses state name in descriptions', () => {
      const reminders = calendarService.generateElectionReminders(
        {
          electionDate: '2026-05-31',
          location: { state: 'Kerala' },
        },
        { now: new Date('2026-05-01T00:00:00Z') }
      );

      const hasState = reminders.some((r) => r.description.includes('Kerala'));
      expect(hasState).toBe(true);
    });

    test('uses default text when no state', () => {
      const reminders = calendarService.generateElectionReminders(
        { electionDate: '2026-05-31' },
        { now: new Date('2026-05-01T00:00:00Z') }
      );
      const hasDefault = reminders.some((r) => r.description.includes('your constituency'));
      expect(hasDefault).toBe(true);
    });

    test('handles null context without inventing dates', () => {
      const reminders = calendarService.generateElectionReminders(null);
      expect(reminders).toHaveLength(0);
    });

    test('derives election day from daysUntilElection', () => {
      const reminders = calendarService.generateElectionReminders(
        { daysUntilElection: 30 },
        { now: new Date('2026-05-01T00:00:00Z') }
      );

      expect(reminders.map((item) => item.date)).toContain('2026-05-31');
      expect(new Set(reminders.map((item) => item.date)).size).toBeGreaterThan(1);
    });
  });

  describe('generatePollingBoothMapLink', () => {
    test('generates Maps URL with state', () => {
      const link = calendarService.generatePollingBoothMapLink('Delhi');
      expect(link).toContain('google.com/maps/search');
      expect(link).toContain('Delhi');
    });

    test('generates Maps URL without state', () => {
      const link = calendarService.generatePollingBoothMapLink();
      expect(link).toContain('google.com/maps/search');
      expect(link).toContain('near%20me');
    });

    test('generates Maps URL with null state', () => {
      const link = calendarService.generatePollingBoothMapLink(null);
      expect(link).toContain('near%20me');
    });
  });

  describe('_formatDate', () => {
    test('formats valid date string', () => {
      const result = calendarService._formatDate('2026-05-01');
      expect(result).toContain('/');
      expect(result).toMatch(/\d{8}T\d{6}Z/);
    });

    test('rejects invalid date string instead of falling back to today', () => {
      expect(() => calendarService._formatDate('not-a-date')).toThrow('invalid calendar date');
    });

    test('rejects empty string instead of falling back to today', () => {
      expect(() => calendarService._formatDate('')).toThrow('invalid calendar date');
    });
  });

  describe('_formatDateRange', () => {
    test('returns start/end date pair', () => {
      const result = calendarService._formatDateRange(new Date('2026-05-01T10:00:00Z'));
      expect(result).toContain('/');
      const [start, end] = result.split('/');
      expect(start).toMatch(/\d{8}T\d{6}Z/);
      expect(end).toMatch(/\d{8}T\d{6}Z/);
    });

    test('end is 1 hour after start', () => {
      const date = new Date('2026-05-01T10:00:00Z');
      const result = calendarService._formatDateRange(date);
      const [start, end] = result.split('/');
      expect(start).toContain('100000');
      expect(end).toContain('110000');
    });
  });
});
