'use strict';
const intentRouter = require('../../src/services/intentRouter');

describe('IntentRouter', () => {
  describe('classify', () => {
    test('classifies eligibility questions correctly', () => {
      const result = intentRouter.classify('Can I vote?');
      expect(result.intent).toBe('eligibility');
      expect(result.confidence).toBe('high');
      expect(result.matchedPattern).toBeDefined();
    });

    test('classifies "who can vote" as eligibility', () => {
      const result = intentRouter.classify('Who can vote in India?');
      expect(result.intent).toBe('eligibility');
    });

    test('classifies "am I eligible" as eligibility', () => {
      const result = intentRouter.classify('Am I eligible to vote?');
      expect(result.intent).toBe('eligibility');
    });

    test('classifies registration questions correctly', () => {
      const result = intentRouter.classify('How do I register to vote?');
      expect(result.intent).toBe('registration');
    });

    test('classifies "voter ID" as registration', () => {
      const result = intentRouter.classify('How to get a voter ID?');
      expect(result.intent).toBe('registration');
    });

    test('classifies "Form 6" as registration', () => {
      const result = intentRouter.classify('Tell me about Form 6');
      expect(result.intent).toBe('registration');
    });

    test('routes voter checklist requests to registration guidance', () => {
      const result = intentRouter.classify('Show my voter checklist');
      expect(result.intent).toBe('registration');
    });

    test('does not route generic action plans to readiness scoring', () => {
      const result = intentRouter.classify('Build an action plan');
      expect(result.intent).not.toBe('readiness');
    });

    test('classifies explicit readiness questions', () => {
      const result = intentRouter.classify('Am I ready to vote?');
      expect(result.intent).toBe('readiness');
    });

    test('classifies timeline questions correctly', () => {
      const result = intentRouter.classify('Show me the election timeline');
      expect(result.intent).toBe('timeline');
    });

    test('classifies "when is the election" as timeline', () => {
      const result = intentRouter.classify('When is the next election?');
      expect(result.intent).toBe('timeline');
    });

    test('classifies voting day questions correctly', () => {
      const result = intentRouter.classify('What happens on voting day?');
      expect(result.intent).toBe('voting_day');
    });

    test('classifies "polling booth" as voting_day', () => {
      const result = intentRouter.classify('Where is my polling booth?');
      expect(result.intent).toBe('voting_day');
    });

    test('classifies "EVM" as voting_day', () => {
      const result = intentRouter.classify('How does the EVM work?');
      expect(result.intent).toBe('voting_day');
    });

    test('classifies document questions correctly', () => {
      const result = intentRouter.classify('What documents do I need?');
      expect(result.intent).toBe('documents');
    });

    test('classifies FAQ questions correctly', () => {
      const result = intentRouter.classify('What is NOTA?');
      expect(result.intent).toBe('faq');
    });

    test('classifies "explain" as FAQ', () => {
      const result = intentRouter.classify('Explain the election process');
      expect(result.intent).toBe('faq');
    });

    test('classifies calendar/reminder questions correctly', () => {
      const result = intentRouter.classify('Remind me of election dates');
      expect(result.intent).toBe('calendar');
    });

    test('classifies "set reminder" as calendar', () => {
      const result = intentRouter.classify('Can you set a reminder?');
      expect(result.intent).toBe('calendar');
    });

    test('classifies greeting correctly', () => {
      const result = intentRouter.classify('Hello');
      expect(result.intent).toBe('greeting');
    });

    test('classifies "hi" as greeting', () => {
      const result = intentRouter.classify('Hi there');
      expect(result.intent).toBe('greeting');
    });

    test('classifies "help" as greeting', () => {
      const result = intentRouter.classify('help');
      expect(result.intent).toBe('greeting');
    });

    test('returns unsupported for unrelated queries', () => {
      const result = intentRouter.classify('I like pizza and cats');
      expect(result.intent).toBe('unsupported');
      expect(result.confidence).toBe('low');
      expect(result.matchedPattern).toBeNull();
    });

    test('returns unsupported for empty string', () => {
      const result = intentRouter.classify('');
      expect(result.intent).toBe('unsupported');
    });

    test('returns unsupported for null', () => {
      const result = intentRouter.classify(null);
      expect(result.intent).toBe('unsupported');
    });

    test('returns unsupported for undefined', () => {
      const result = intentRouter.classify(undefined);
      expect(result.intent).toBe('unsupported');
    });

    test('is case insensitive', () => {
      const result = intentRouter.classify('CAN I VOTE?');
      expect(result.intent).toBe('eligibility');
    });

    test('trims whitespace', () => {
      const result = intentRouter.classify('  hello  ');
      expect(result.intent).toBe('greeting');
    });
  });

  describe('getSupportedIntents', () => {
    test('returns all intent values', () => {
      const intents = intentRouter.getSupportedIntents();
      expect(intents).toContain('eligibility');
      expect(intents).toContain('registration');
      expect(intents).toContain('greeting');
      expect(intents).toContain('unsupported');
      expect(intents.length).toBeGreaterThanOrEqual(9);
    });
  });
});
