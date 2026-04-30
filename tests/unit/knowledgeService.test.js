'use strict';
const knowledgeService = require('../../src/services/knowledgeService');

describe('KnowledgeService', () => {
  describe('getTopic', () => {
    test('returns eligibility topic', () => {
      const topic = knowledgeService.getTopic('eligibility');
      expect(topic).not.toBeNull();
      expect(topic.title).toContain('Eligibility');
      expect(topic.source_url).toBeDefined();
    });

    test('returns registration topic', () => {
      const topic = knowledgeService.getTopic('registration');
      expect(topic).not.toBeNull();
      expect(topic.title).toContain('Registration');
    });

    test('returns null for unknown topic', () => {
      const topic = knowledgeService.getTopic('nonexistent');
      expect(topic).toBeNull();
    });
  });

  describe('getAllTopics', () => {
    test('returns all topics with key, title, summary', () => {
      const topics = knowledgeService.getAllTopics();
      expect(topics.length).toBeGreaterThanOrEqual(5);
      topics.forEach((topic) => {
        expect(topic.key).toBeDefined();
        expect(topic.title).toBeDefined();
        expect(topic.summary).toBeDefined();
      });
    });
  });

  describe('searchFAQ', () => {
    test('finds NOTA FAQ entry', () => {
      const result = knowledgeService.searchFAQ('What is NOTA?');
      expect(result).not.toBeNull();
      expect(result.answer).toContain('None of the Above');
    });

    test('finds ECI FAQ entry', () => {
      const result = knowledgeService.searchFAQ('Tell me about ECI');
      expect(result).not.toBeNull();
      expect(result.answer).toContain('Election Commission');
    });

    test('returns null for unmatched query', () => {
      const result = knowledgeService.searchFAQ('random unrelated question');
      expect(result).toBeNull();
    });

    test('does not match generic stopwords to FAQ entries', () => {
      expect(knowledgeService.searchFAQ('what weather')).toBeNull();
      expect(knowledgeService.searchFAQ('what is cricket')).toBeNull();
    });

    test('handles empty query', () => {
      const result = knowledgeService.searchFAQ('');
      expect(result).toBeNull();
    });
  });

  describe('retrieve', () => {
    test('retrieves data for eligibility intent', () => {
      const result = knowledgeService.retrieve('eligibility', {});
      expect(result.data).not.toBeNull();
      expect(result.sources.length).toBeGreaterThan(0);
      expect(result.sources[0].url).toContain('eci.gov.in');
    });

    test('retrieves data for registration intent', () => {
      const result = knowledgeService.retrieve('registration', {});
      expect(result.data).not.toBeNull();
    });

    test('retrieves data for timeline intent', () => {
      const result = knowledgeService.retrieve('timeline', {});
      expect(result.data).not.toBeNull();
    });

    test('returns empty for unsupported intent', () => {
      const result = knowledgeService.retrieve('unsupported', {});
      expect(result.data).toBeNull();
      expect(result.sources).toEqual([]);
    });
  });

  describe('getMetadata', () => {
    test('returns metadata with jurisdiction and version', () => {
      const meta = knowledgeService.getMetadata();
      expect(meta.jurisdiction).toBe('India');
      expect(meta.version).toBeDefined();
      expect(meta.source_url).toContain('eci.gov.in');
    });
  });
});
