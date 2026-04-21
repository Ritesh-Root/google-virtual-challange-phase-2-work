'use strict';
const contextManager = require('../../src/services/contextManager');

describe('ContextManager', () => {
  afterAll(() => {
    contextManager.destroy();
  });

  describe('getOrCreate', () => {
    test('creates new session with default slots', () => {
      const { sessionId, slots } = contextManager.getOrCreate();
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(slots.location.country).toBe('India');
      expect(slots.location.state).toBeNull();
      expect(slots.age).toBeNull();
      expect(slots.voterStatus).toBe('unknown');
      expect(slots.preferredLanguage).toBe('en');
    });

    test('returns existing session by ID', () => {
      const { sessionId } = contextManager.getOrCreate();
      const { sessionId: sameId, slots } = contextManager.getOrCreate(sessionId);
      expect(sameId).toBe(sessionId);
      expect(slots).toBeDefined();
    });

    test('creates new session for unknown ID', () => {
      const { sessionId } = contextManager.getOrCreate('unknown-id-123');
      expect(sessionId).toBe('unknown-id-123');
    });
  });

  describe('updateFromMessage', () => {
    test('extracts age from "18 years old"', () => {
      const { sessionId } = contextManager.getOrCreate();
      const slots = contextManager.updateFromMessage(sessionId, 'I am 18 years old');
      expect(slots.age).toBe(18);
    });

    test('extracts age from "turned 18"', () => {
      const { sessionId } = contextManager.getOrCreate();
      const slots = contextManager.updateFromMessage(sessionId, 'I just turned 18');
      expect(slots.age).toBe(18);
    });

    test('extracts state from message', () => {
      const { sessionId } = contextManager.getOrCreate();
      const slots = contextManager.updateFromMessage(sessionId, 'I live in Maharashtra');
      expect(slots.location.state).toBe('Maharashtra');
    });

    test('extracts Delhi as state', () => {
      const { sessionId } = contextManager.getOrCreate();
      const slots = contextManager.updateFromMessage(sessionId, 'I am from Delhi');
      expect(slots.location.state).toBe('Delhi');
    });

    test('detects first-time voter status', () => {
      const { sessionId } = contextManager.getOrCreate();
      const slots = contextManager.updateFromMessage(sessionId, 'I am a first-time voter');
      expect(slots.voterStatus).toBe('first_time');
    });

    test('detects registered voter status', () => {
      const { sessionId } = contextManager.getOrCreate();
      const slots = contextManager.updateFromMessage(sessionId, 'I already have a voter ID');
      expect(slots.voterStatus).toBe('registered');
    });

    test('detects NRI status', () => {
      const { sessionId } = contextManager.getOrCreate();
      const slots = contextManager.updateFromMessage(sessionId, 'I am an NRI living abroad');
      expect(slots.voterStatus).toBe('nri');
    });

    test('detects national election type', () => {
      const { sessionId } = contextManager.getOrCreate();
      const slots = contextManager.updateFromMessage(sessionId, 'When is the Lok Sabha election?');
      expect(slots.electionType).toBe('national');
    });

    test('detects state election type', () => {
      const { sessionId } = contextManager.getOrCreate();
      const slots = contextManager.updateFromMessage(sessionId, 'Tell me about state assembly elections');
      expect(slots.electionType).toBe('state');
    });

    test('extracts days until election', () => {
      const { sessionId } = contextManager.getOrCreate();
      const slots = contextManager.updateFromMessage(sessionId, 'Election is in 5 days');
      expect(slots.daysUntilElection).toBe(5);
    });

    test('handles empty message gracefully', () => {
      const { sessionId } = contextManager.getOrCreate();
      const slots = contextManager.updateFromMessage(sessionId, '');
      expect(slots).toBeDefined();
    });
  });

  describe('getMissingSlotQuestion', () => {
    test('asks for age when eligibility intent and age is null', () => {
      const { sessionId } = contextManager.getOrCreate();
      const result = contextManager.getMissingSlotQuestion(sessionId, 'eligibility');
      expect(result).not.toBeNull();
      expect(result.slotName).toBe('age');
      expect(result.question).toContain('age');
    });

    test('returns null for eligibility when age is set', () => {
      const { sessionId } = contextManager.getOrCreate();
      contextManager.updateFromMessage(sessionId, 'I am 20 years old');
      const result = contextManager.getMissingSlotQuestion(sessionId, 'eligibility');
      expect(result).toBeNull();
    });

    test('asks for voter status when registration intent', () => {
      const { sessionId } = contextManager.getOrCreate();
      const result = contextManager.getMissingSlotQuestion(sessionId, 'registration');
      expect(result).not.toBeNull();
      expect(result.slotName).toBe('voterStatus');
    });

    test('returns null for unsupported intent', () => {
      const { sessionId } = contextManager.getOrCreate();
      const result = contextManager.getMissingSlotQuestion(sessionId, 'greeting');
      expect(result).toBeNull();
    });
  });

  describe('getSessionCount', () => {
    test('returns number of active sessions', () => {
      const count = contextManager.getSessionCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
