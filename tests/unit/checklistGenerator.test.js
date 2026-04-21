'use strict';
const checklistGenerator = require('../../src/services/checklistGenerator');

describe('ChecklistGenerator', () => {
  describe('generate', () => {
    test('generates registration checklist for first-time voter', () => {
      const result = checklistGenerator.generate({
        age: 18,
        voterStatus: 'first_time',
        location: { state: 'Maharashtra' },
        daysUntilElection: null,
      });

      expect(result.actions).toBeDefined();
      expect(result.actions.length).toBeGreaterThan(0);
      expect(result.confidence).toBe('high');
      expect(result.totalSteps).toBe(result.actions.length);

      // Should include registration actions
      const hasRegistration = result.actions.some((a) => a.category === 'registration');
      expect(hasRegistration).toBe(true);
    });

    test('generates underage response for minors', () => {
      const result = checklistGenerator.generate({ age: 16, voterStatus: 'unknown' });
      expect(result.actions.length).toBe(3);
      expect(result.urgencyLevel).toBe('low');
      expect(result.actions[0].action).toContain('2 year');
    });

    test('generates NRI-specific actions', () => {
      const result = checklistGenerator.generate({
        age: 30,
        voterStatus: 'nri',
        location: { state: null },
        daysUntilElection: null,
      });

      const hasNri = result.actions.some((a) => a.category === 'nri');
      expect(hasNri).toBe(true);
      const form6a = result.actions.some((a) => a.action.includes('Form 6A'));
      expect(form6a).toBe(true);
    });

    test('includes preparation and voting day actions for all voters', () => {
      const result = checklistGenerator.generate({
        age: 25,
        voterStatus: 'first_time',
        location: { state: null },
        daysUntilElection: null,
      });

      const hasPrep = result.actions.some((a) => a.category === 'preparation');
      const hasVoting = result.actions.some((a) => a.category === 'voting_day');
      expect(hasPrep).toBe(true);
      expect(hasVoting).toBe(true);
    });

    test('calculates critical urgency for 5 days', () => {
      const result = checklistGenerator.generate({
        age: 25,
        voterStatus: 'first_time',
        location: { state: null },
        daysUntilElection: 5,
      });

      expect(result.urgencyLevel).toBe('critical');
    });

    test('calculates high urgency for 10 days', () => {
      const result = checklistGenerator.generate({
        age: 25,
        voterStatus: 'first_time',
        location: { state: null },
        daysUntilElection: 10,
      });

      expect(result.urgencyLevel).toBe('high');
    });

    test('calculates medium urgency for 20 days', () => {
      const result = checklistGenerator.generate({
        age: 25,
        voterStatus: 'first_time',
        location: {},
        daysUntilElection: 20,
      });

      expect(result.urgencyLevel).toBe('medium');
    });

    test('calculates low urgency for 90 days', () => {
      const result = checklistGenerator.generate({
        age: 25,
        voterStatus: 'first_time',
        location: {},
        daysUntilElection: 90,
      });

      expect(result.urgencyLevel).toBe('low');
    });

    test('returns unknown urgency when days not specified', () => {
      const result = checklistGenerator.generate({
        age: 25,
        voterStatus: 'first_time',
        location: {},
        daysUntilElection: null,
      });

      expect(result.urgencyLevel).toBe('unknown');
    });

    test('is deterministic — same input yields same output', () => {
      const context = { age: 22, voterStatus: 'first_time', location: { state: 'Kerala' }, daysUntilElection: 30 };
      const result1 = checklistGenerator.generate(context);
      const result2 = checklistGenerator.generate(context);

      expect(result1.actions.length).toBe(result2.actions.length);
      expect(result1.urgencyLevel).toBe(result2.urgencyLevel);
      result1.actions.forEach((action, i) => {
        expect(action.action).toBe(result2.actions[i].action);
      });
    });
  });

  describe('generateTimeline', () => {
    test('returns election phases', () => {
      const result = checklistGenerator.generateTimeline();
      expect(result.phases).toBeDefined();
      expect(result.phases.length).toBe(9);
      expect(result.confidence).toBe('high');
    });

    test('first phase is Schedule Announcement', () => {
      const result = checklistGenerator.generateTimeline();
      expect(result.phases[0].name).toBe('Schedule Announcement');
    });

    test('last phase is Counting & Results', () => {
      const result = checklistGenerator.generateTimeline();
      expect(result.phases[8].name).toBe('Counting & Results');
    });
  });
});
