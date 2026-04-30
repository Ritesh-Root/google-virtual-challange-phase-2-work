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
    this.tokenVersion = 1;
  }

  /**
   * Get or create a session with default context slots.
   * @param {string} [sessionId] - Existing session ID or null for new
   * @returns {{ sessionId: string, slots: Object }}
   */
  getOrCreate(sessionId) {
    const decoded = this._decodeSessionId(sessionId);
    if (decoded) {
      return { sessionId, slots: decoded };
    }

    const slots = this._defaultSlots();
    return { sessionId: this.createSessionId(slots), slots };
  }

  /**
   * Extract and update context slots from a user message.
   * @param {string} sessionId - Session identifier
   * @param {string} message - Raw user message
   * @returns {Object} Updated slots
   */
  updateFromMessage(sessionId, message) {
    const { slots } = this.getOrCreate(sessionId);
    return this.updateSlotsFromMessage(slots, message);
  }

  /**
   * Extract and update context slots in an existing slot object.
   * @param {Object} slots - Mutable session slot object
   * @param {string} message - Raw user message
   * @returns {Object} Updated slots
   */
  updateSlotsFromMessage(slots, message) {
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
    const selfReportedAgeMatch = lower.match(/\b(?:i\s*(?:am|'m)|im)\s+(\d{1,3})\b/i);
    if (selfReportedAgeMatch) {
      slots.age = parseInt(selfReportedAgeMatch[1], 10);
    }

    // Extract state name
    for (const state of INDIAN_STATES) {
      if (lower.includes(state)) {
        slots.location.state = state.replace(/\b\w/g, (c) => c.toUpperCase());
        break;
      }
    }

    // Extract voter status
    if (/\bnri\b|overseas|abroad/i.test(lower)) {
      slots.voterStatus = VOTER_STATUS.NRI;
    } else if (
      /first.time|new voter|never voted/i.test(lower) ||
      /\bnot\s+(?:already\s+)?registered\b/i.test(lower) ||
      /\b(?:do not|don't|dont)\s+have\s+(?:a\s+)?(?:voter id|epic)\b/i.test(lower)
    ) {
      slots.voterStatus = VOTER_STATUS.FIRST_TIME;
    } else if (/\balready registered\b|(?:\bhave|\bgot)\s+(?:a\s+)?(?:voter id|epic)\b/i.test(lower)) {
      slots.voterStatus = VOTER_STATUS.REGISTERED;
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

    const isoDateMatch = lower.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
    if (isoDateMatch) {
      slots.electionDate = isoDateMatch[1];
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
    const slots = typeof sessionId === 'object' && sessionId !== null ? sessionId : this.getOrCreate(sessionId).slots;

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
      readiness: [
        {
          slot: 'age',
          question: '📝 Could you tell me your age? I need it before calculating your voter readiness score.',
          check: (v) => v === null || v === undefined,
        },
        {
          slot: 'voterStatus',
          question: '📝 Are you already registered to vote, or do you still need to register?',
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
    return 0;
  }

  /**
   * Issue an opaque, signed session token containing only non-secret context slots.
   * @param {Object} slots - Session context slots
   * @returns {string} Signed session token
   */
  createSessionId(slots) {
    const now = Date.now();
    const payload = {
      v: this.tokenVersion,
      iat: now,
      exp: now + config.sessionTtlMs,
      slots: this._normalizeSlots(slots),
    };
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    return `${encoded}.${this._sign(encoded)}`;
  }

  /**
   * Destroy cleanup interval (kept for tests/backwards compatibility).
   */
  destroy() {}

  /** @private Build default slots. */
  _defaultSlots() {
    return {
      location: { country: 'India', state: null },
      age: null,
      voterStatus: VOTER_STATUS.UNKNOWN,
      electionType: null,
      preferredLanguage: config.defaultLanguage,
      detailLevel: 'standard',
      daysUntilElection: null,
      electionDate: null,
    };
  }

  /** @private Normalize untrusted decoded slot data. */
  _normalizeSlots(slots) {
    const base = this._defaultSlots();
    const input = slots && typeof slots === 'object' ? slots : {};
    const normalized = {
      ...base,
      age: typeof input.age === 'number' && input.age >= 0 && input.age <= 130 ? input.age : base.age,
      voterStatus: Object.values(VOTER_STATUS).includes(input.voterStatus) ? input.voterStatus : base.voterStatus,
      electionType: Object.values(ELECTION_TYPES).includes(input.electionType) ? input.electionType : base.electionType,
      preferredLanguage: config.supportedLanguages.includes(input.preferredLanguage)
        ? input.preferredLanguage
        : base.preferredLanguage,
      detailLevel: ['simple', 'standard', 'detailed'].includes(input.detailLevel)
        ? input.detailLevel
        : base.detailLevel,
      daysUntilElection:
        typeof input.daysUntilElection === 'number' && input.daysUntilElection >= 0 ? input.daysUntilElection : null,
      electionDate: this._isIsoDate(input.electionDate) ? input.electionDate : null,
      location: { ...base.location },
    };

    if (input.location && typeof input.location === 'object') {
      normalized.location.state =
        typeof input.location.state === 'string' && input.location.state.length <= 80 ? input.location.state : null;
    }

    return normalized;
  }

  /** @private Decode and verify a signed session token. */
  _decodeSessionId(sessionId) {
    if (typeof sessionId !== 'string' || !sessionId.includes('.')) {
      return null;
    }
    const [encoded, signature] = sessionId.split('.');
    if (!encoded || !signature || this._sign(encoded) !== signature) {
      return null;
    }

    try {
      const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
      if (payload.v !== this.tokenVersion || typeof payload.exp !== 'number' || payload.exp < Date.now()) {
        return null;
      }
      return this._normalizeSlots(payload.slots);
    } catch (_error) {
      return null;
    }
  }

  /** @private Sign a session token body. */
  _sign(encoded) {
    return crypto.createHmac('sha256', config.sessionSigningSecret).update(encoded).digest('base64url');
  }

  /** @private Validate an ISO calendar date string. */
  _isIsoDate(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
  }
}

module.exports = new ContextManager();
