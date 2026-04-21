'use strict';
const { INTENTS } = require('../utils/constants');

/**
 * Deterministic intent classification using regex pattern matching.
 * Runs BEFORE Gemini API call — proves algorithmic logic, not just LLM prompting.
 * @class IntentRouter
 */
class IntentRouter {
  constructor() {
    /** @private Pattern map: intent → regex array. ORDER MATTERS — first match wins. */
    this.patterns = new Map([
      [INTENTS.GREETING, [
        /^(hi|hello|hey|help|start|begin)\b/i, /good (morning|afternoon|evening)/i,
        /^what can you do/i, /^how.*help/i,
      ]],
      [INTENTS.CALENDAR, [
        /\bremind/i, /\breminder/i, /\bcalendar\b/i, /\bnotif/i,
        /\balert me\b/i, /\badd.*date/i, /\bsave.*date/i,
      ]],
      [INTENTS.ELIGIBILITY, [
        /\b(eligible|eligib)\b/i, /can i vote/i, /\b(age|old enough)\b.*\bvot/i,
        /\bqualif/i, /who can vote/i, /am i.*allowed/i, /\bminimum age\b/i,
      ]],
      [INTENTS.REGISTRATION, [
        /\bregist(er|ration)\b/i, /\bvoter id\b/i, /\bepic\b/i, /\bform 6\b/i,
        /\benroll/i, /sign up.*vot/i, /how (to|do i).*vote\b/i, /\bapply.*voter\b/i,
      ]],
      [INTENTS.TIMELINE, [
        /\btimeline\b/i, /\bschedule\b/i, /\bphase/i, /when.*election/i,
        /\bdates?\b.*elect/i, /election.*\bdates?\b/i, /\bstages?\b/i,
      ]],
      [INTENTS.VOTING_DAY, [
        /voting day/i, /polling\b/i, /\bbooth\b/i, /\bevm\b/i, /\bvvpat\b/i,
        /cast.*vote/i, /election day/i, /on.*day.*vot/i, /what happens.*poll/i,
      ]],
      [INTENTS.DOCUMENTS, [
        /\bdocument/i, /\bpapers?\b/i, /\bid proof\b/i, /what.*need.*bring/i,
        /\brequired\b.*\b(doc|paper|proof)/i, /what.*carry/i,
      ]],
      [INTENTS.FAQ, [
        /what is\b/i, /\bexplain\b/i, /\bmeaning\b/i, /\bdefine\b/i,
        /\bnota\b/i, /\beci\b/i, /model code/i, /\btell me about\b/i,
      ]],
    ]);
  }

  /**
   * Classify a user message into an intent.
   * @param {string} message - Raw user message
   * @returns {{ intent: string, confidence: string, matchedPattern: string|null }}
   */
  classify(message) {
    const normalized = (message || '').trim().toLowerCase();

    if (!normalized) {
      return { intent: INTENTS.UNSUPPORTED, confidence: 'low', matchedPattern: null };
    }

    for (const [intent, regexList] of this.patterns) {
      for (const pattern of regexList) {
        if (pattern.test(normalized)) {
          return { intent, confidence: 'high', matchedPattern: pattern.toString() };
        }
      }
    }

    return { intent: INTENTS.UNSUPPORTED, confidence: 'low', matchedPattern: null };
  }

  /**
   * Get all supported intent names.
   * @returns {string[]}
   */
  getSupportedIntents() {
    return Object.values(INTENTS);
  }
}

module.exports = new IntentRouter();
