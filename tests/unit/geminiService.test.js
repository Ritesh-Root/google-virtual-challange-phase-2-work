'use strict';

// Must clear require cache to get fresh instances
beforeEach(() => {
  jest.clearAllMocks();
});

describe('GeminiService', () => {
  let geminiService;

  beforeAll(() => {
    geminiService = require('../../src/services/geminiService');
  });

  describe('generateResponse', () => {
    test('returns valid response contract for election query', async () => {
      const result = await geminiService.generateResponse(
        'eligibility',
        {
          age: 18,
          location: { state: 'Maharashtra' },
          voterStatus: 'first_time',
          preferredLanguage: 'en',
          detailLevel: 'standard',
        },
        { title: 'Eligibility', summary: 'Test' },
        'Can I vote?'
      );

      expect(result.answer_summary).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.disclaimer).toBeDefined();
    });

    test('handles context with missing location fields', async () => {
      const result = await geminiService.generateResponse(
        'registration',
        { age: null, voterStatus: 'unknown', preferredLanguage: 'en', detailLevel: 'standard' },
        { title: 'Registration' },
        'How to register?'
      );

      expect(result.answer_summary).toBeDefined();
    });

    test('handles context with null age and election type', async () => {
      const result = await geminiService.generateResponse(
        'faq',
        {
          age: null,
          location: {},
          voterStatus: 'unknown',
          electionType: null,
          preferredLanguage: 'en',
          detailLevel: 'standard',
        },
        { title: 'FAQ', summary: 'General' },
        'What is NOTA?'
      );

      expect(result.answer_summary).toBeDefined();
    });
  });

  describe('classifyIntent', () => {
    test('classifies election-related query', async () => {
      const result = await geminiService.classifyIntent('Tell me about election process');
      expect(result.intent).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    test('returns a valid intent for election queries', async () => {
      const result = await geminiService.classifyIntent('How do I register to vote?');
      expect([
        'eligibility',
        'registration',
        'timeline',
        'voting_day',
        'documents',
        'faq',
        'calendar',
        'greeting',
        'unsupported',
      ]).toContain(result.intent);
    });
  });

  describe('translateResponse', () => {
    test('translates text and returns a string', async () => {
      const result = await geminiService.translateResponse('Hello world', 'Hindi');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('_parseResponse', () => {
    test('parses valid JSON response', () => {
      const validJson = JSON.stringify({
        answer_summary: 'Test summary',
        confidence: 'high',
        disclaimer: 'Test disclaimer',
      });

      const result = geminiService._parseResponse(validJson, {});
      expect(result.answer_summary).toBe('Test summary');
      expect(result.confidence).toBe('high');
    });

    test('handles embedded JSON with regex fallback', () => {
      const messyResponse =
        'Here is the response: {"answer_summary": "Extracted", "confidence": "medium", "disclaimer": "test"}';
      const result = geminiService._parseResponse(messyResponse, {});
      expect(result.answer_summary).toBe('Extracted');
    });

    test('returns fallback for completely unparseable response', () => {
      const result = geminiService._parseResponse('Not JSON at all without braces', { title: 'Fallback data' });
      expect(result.answer_summary).toBe('Not JSON at all without braces');
      expect(result.confidence).toBe('medium');
    });

    test('fills missing fields with defaults', () => {
      const partial = JSON.stringify({ answer_summary: 'Partial' });
      const result = geminiService._parseResponse(partial, {});
      expect(result.answer_summary).toBe('Partial');
      expect(result.detailed_explanation).toBe('');
      expect(result.deadlines).toEqual([]);
      expect(result.disclaimer).toBe('This is educational information, not legal advice.');
    });

    test('handles JSON with all fields populated', () => {
      const full = JSON.stringify({
        answer_summary: 'Full summary',
        detailed_explanation: 'Full detail',
        next_3_actions: ['A1', 'A2', 'A3'],
        deadlines: [{ event: 'Deadline', date: '2026-05-01', urgency: 'high' }],
        sources: [{ title: 'ECI', url: 'https://eci.gov.in' }],
        confidence: 'high',
        follow_up_suggestions: ['Q1', 'Q2'],
        disclaimer: 'Custom disclaimer',
      });
      const result = geminiService._parseResponse(full, {});
      expect(result.next_3_actions).toHaveLength(3);
      expect(result.deadlines).toHaveLength(1);
      expect(result.sources).toHaveLength(1);
    });

    test('handles response where regex also fails', () => {
      // No JSON-like content at all
      const result = geminiService._parseResponse('Plain text with no braces', {
        sources: [{ title: 'ECI', url: 'https://eci.gov.in' }],
      });
      expect(result.answer_summary).toBe('Plain text with no braces');
      expect(result.sources[0].title).toBe('ECI');
    });
  });

  describe('_buildFallbackResponse', () => {
    test('builds response with actions from structured data', () => {
      const data = {
        actions: [{ action: 'Step 1' }, { action: 'Step 2' }, { action: 'Step 3' }, { action: 'Step 4' }],
        sources: [{ title: 'ECI', url: 'https://eci.gov.in' }],
      };

      const result = geminiService._buildFallbackResponse(data);
      expect(result.next_3_actions).toHaveLength(3);
      expect(result.next_3_actions[0]).toBe('Step 1');
      expect(result.sources[0].title).toBe('ECI');
    });

    test('builds response with checklist actions', () => {
      const data = {
        checklist: {
          actions: [{ action: 'Check registration' }],
        },
      };

      const result = geminiService._buildFallbackResponse(data);
      expect(result.next_3_actions).toHaveLength(1);
    });

    test('builds response with raw text', () => {
      const result = geminiService._buildFallbackResponse({}, 'Raw fallback text');
      expect(result.answer_summary).toBe('Raw fallback text');
    });

    test('builds response with null data', () => {
      const result = geminiService._buildFallbackResponse(null);
      expect(result.answer_summary).toBeDefined();
      expect(result.sources).toEqual([{ title: 'Election Commission of India', url: 'https://eci.gov.in' }]);
    });

    test('builds response with string data', () => {
      const result = geminiService._buildFallbackResponse('string data');
      expect(result.detailed_explanation).toBe('string data');
    });

    test('always has required fields', () => {
      const result = geminiService._buildFallbackResponse({});
      expect(result.confidence).toBe('medium');
      expect(result.disclaimer).toBeDefined();
      expect(result.follow_up_suggestions).toHaveLength(2);
      expect(result.deadlines).toEqual([]);
    });
  });
});
