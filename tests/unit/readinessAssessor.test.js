'use strict';
const readinessAssessor = require('../../src/services/readinessAssessor');

describe('ReadinessAssessor', () => {
  test('scores registered adult voter with location and timeline as ready', () => {
    const result = readinessAssessor.assess({
      age: 22,
      voterStatus: 'registered',
      location: { state: 'Kerala' },
      daysUntilElection: 30,
    });

    expect(result.readinessScore).toBeGreaterThanOrEqual(85);
    expect(result.statusLabel).toBe('Ready');
    expect(result.confidence).toBe('high');
    expect(result.nextActions.length).toBeGreaterThan(0);
  });

  test('surfaces blockers for first-time voters', () => {
    const result = readinessAssessor.assess({
      age: 18,
      voterStatus: 'first_time',
      location: { state: null },
      daysUntilElection: 5,
    });

    expect(result.statusLabel).toBe('Needs action');
    expect(result.blockers.join(' ')).toContain('Form 6');
    expect(result.nextActions.length).toBeGreaterThan(0);
  });

  test('caps score for voters below eligibility age', () => {
    const result = readinessAssessor.assess({
      age: 17,
      voterStatus: 'registered',
      location: { state: 'Kerala' },
      daysUntilElection: 30,
    });

    expect(result.readinessScore).toBeLessThanOrEqual(35);
    expect(result.statusLabel).toBe('Not ready yet');
    expect(result.blockers.join(' ')).toContain('wait 1 more year');
  });

  test('is deterministic for the same input', () => {
    const context = {
      age: 25,
      voterStatus: 'registered',
      location: { state: 'Delhi' },
      daysUntilElection: 12,
    };

    expect(readinessAssessor.assess(context)).toEqual(readinessAssessor.assess(context));
  });
});
