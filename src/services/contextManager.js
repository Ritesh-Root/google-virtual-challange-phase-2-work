'use strict';
const crypto = require('crypto');
const config = require('../config');
const { INDIAN_STATES, VOTER_STATUS, ELECTION_TYPES } = require('../utils/constants');

/**
 * Manages per-session user context slots.
 * Extracts context from messages and maintains state across conversation turns.
 * Enforces "ask max one clarifying question" policy.
 * @class ContextManager
 */
class ContextManager {
  constructor() {
    /** @private @type {Map<string, {slots: Object, lastAccess: number}>} */
    this.sessions = new Map();
    this._cleanupTimer = null;
    this._startCleanupInterval();
  }

  /**
   * Get or create a session with default context slots.
   * @param {string} [sessionId] - Existing session ID or null for new
   * @returns {{ sessionId: string, slots: Object }}
   */
  getOrCreate(sessionId) {
    if (sessionId && this.sessions.has(sessionId)) {
      const session = this.sessions.get(sessionId);
      session.lastAccess = Date.now();
      return { sessionId, slots: session.slots };
    }

    // Enforce max sessions limit to prevent memory exhaustion
    if (this.sessions.size >= config.maxSessions) {
      this._evictOldest();
    }

    const newId = sessionId || crypto.randomUUID();
    const slots = {
      location: { country: 'India', state: null },
      age: null,
      voterStatus: VOTER_STATUS.UNKNOWN,
      electionType: null,
      preferredLanguage: config.defaultLanguage,
      detailLevel: 'standard',
      daysUntilElection: null,
    };

    this.sessions.set(newId, { slots, lastAccess: Date.now() });
    return { sessionId: newId, slots };
  }

  /**
   * Extract and update context slots from a user message.
   * @param {string} sessionId - Session identifier
   * @param {string} message - Raw user message
   * @returns {Object} Updated slots
   */
  updateFromMessage(sessionId, message) {
    const { slots } = this.getOrCreate(sessionId);
    const lower = (message || '').toLowerCase();

    // Extract age from patterns like "18 years old", "turned 18", "age 18"
    const ageMatch = lower.match(/\b(\d{1,3})\s*(years?\s*old|yrs?|age)\b/i);
    if (ageMatch) {
      slots.age = parseInt(ageMatch[1], 10);
    }
    const justTurnedMatch = lower.match(/\b(just\s+)?turned\s+(\d{1,3})\b/i);
    if (justTurnedMatch) {
      slots.age = parseInt(justTurnedMatch[2], 10);
    }

    // Extract state name
    for (const state of INDIAN_STATES) {
      if (lower.includes(state)) {
        slots.location.state = state.replace(/\b\w/g, (c) => c.toUpperCase());
        break;
      }
    }

    // Extract voter status
    if (/first.time|new voter|never voted/i.test(lower)) {
      slots.voterStatus = VOTER_STATUS.FIRST_TIME;
    }
    if (/already registered|have.*voter id|have.*epic/i.test(lower)) {
      slots.voterStatus = VOTER_STATUS.REGISTERED;
    }
    if (/\bnri\b|overseas|abroad/i.test(lower)) {
      slots.voterStatus = VOTER_STATUS.NRI;
    }

    // Extract election type
    if (/lok sabha|national|general election/i.test(lower)) {
      slots.electionType = ELECTION_TYPES.NATIONAL;
    }
    if (/state|assembly|vidhan sabha/i.test(lower)) {
      slots.electionType = ELECTION_TYPES.STATE;
    }
    if (/local|municipal|panchayat/i.test(lower)) {
      slots.electionType = ELECTION_TYPES.LOCAL;
    }

    // Extract days until election
    const daysMatch = lower.match(/(\d+)\s*days?\s*(left|away|until|before|remaining)/i);
    if (daysMatch) {
      slots.daysUntilElection = parseInt(daysMatch[1], 10);
    }
    const inDaysMatch = lower.match(/in\s+(\d+)\s*days?/i);
    if (inDaysMatch) {
      slots.daysUntilElection = parseInt(inDaysMatch[1], 10);
    }

    return slots;
  }

  /**
   * Determine which critical slot is missing and return a clarifying question.
   * Policy: ask at most ONE question per turn.
   * @param {string} sessionId - Session identifier
   * @param {string} intent - Classified intent
   * @returns {{ slotName: string, question: string }|null}
   */
  getMissingSlotQuestion(sessionId, intent) {
    const { slots } = this.getOrCreate(sessionId);

    const requirements = {
      eligibility: [
        {
          slot: 'age',
          question: '📝 Could you tell me your age? This helps me check voter eligibility requirements for you.',
          check: (v) => v === null || v === undefined,
        },
      ],
      registration: [
        {
          slot: 'voterStatus',
          question: '📝 Are you a first-time voter, or are you already registered and need to update your details?',
          check: (v) => v === VOTER_STATUS.UNKNOWN,
        },
      ],
    };

    const required = requirements[intent];
    if (!required) {
      return null;
    }

    for (const { slot, question, check } of required) {
      const value = slots[slot];
      if (check(value)) {
        return { slotName: slot, question };
      }
    }

    return null;
  }

  /**
   * Get current session count (for health monitoring).
   * @returns {number}
   */
  getSessionCount() {
    return this.sessions.size;
  }

  /** @private Evict the oldest session when limit is reached. */
  _evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;
    for (const [key, val] of this.sessions) {
      if (val.lastAccess < oldestTime) {
        oldestTime = val.lastAccess;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      this.sessions.delete(oldestKey);
    }
  }

  /** @private Start periodic cleanup of expired sessions. */
  _startCleanupInterval() {
    this._cleanupTimer = setInterval(() => {
      const cutoff = Date.now() - config.sessionTtlMs;
      for (const [key, val] of this.sessions) {
        if (val.lastAccess < cutoff) {
          this.sessions.delete(key);
        }
      }
    }, config.sessionCleanupIntervalMs);
    // Allow process to exit even if timer is active
    if (this._cleanupTimer.unref) {
      this._cleanupTimer.unref();
    }
  }

  /**
   * Destroy cleanup interval (for tests).
   */
  destroy() {
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
      this._cleanupTimer = null;
    }
  }
}

module.exports = new ContextManager();
