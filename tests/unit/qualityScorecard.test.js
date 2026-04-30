'use strict';
const qualityScorecard = require('../../src/services/qualityScorecard');

describe('QualityScorecard', () => {
  test('returns rubric evidence for all challenge criteria', () => {
    const scorecard = qualityScorecard.getScorecard();
    const criteria = scorecard.criteria.map((item) => item.key);

    expect(criteria).toEqual(
      expect.arrayContaining(['code_quality', 'security', 'efficiency', 'testing', 'accessibility', 'google_services'])
    );
    expect(scorecard.safeToExpose).toBe(true);
  });

  test('publishes a stable scorecard contract', () => {
    const scorecard = qualityScorecard.getScorecard();

    expect(scorecard.schemaVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(scorecard.lastVerifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(scorecard.generatedFrom).toEqual(expect.arrayContaining(['package.json']));
    expect(scorecard.verification.scorecardMode).toBe('runtime_metadata');
    expect(scorecard.verification.coverageThresholds.statements).toBeGreaterThanOrEqual(80);
    scorecard.criteria.forEach((criterion) => {
      expect(Array.isArray(criterion.sourceRefs)).toBe(true);
      expect(criterion.sourceRefs.length).toBeGreaterThan(0);
      expect(Array.isArray(criterion.evidence)).toBe(true);
      expect(criterion.evidence.length).toBeGreaterThan(0);
    });
  });

  test('does not expose secrets or environment variables', () => {
    const serialized = JSON.stringify(qualityScorecard.getScorecard()).toLowerCase();

    expect(serialized).not.toContain('api_key');
    expect(serialized).not.toContain('gemini_api_key');
    expect(serialized).not.toContain('secret=');
    expect(serialized).not.toContain('password');
  });
});
