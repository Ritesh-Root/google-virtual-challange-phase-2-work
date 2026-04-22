'use strict';

/**
 * Defense-in-depth safety and compliance filter.
 * 3-Layer Security Architecture:
 *   Layer 1 (this): Deterministic regex pre-filter — fast, no API cost
 *   Layer 2: Gemini SafetySettings — BLOCK_LOW_AND_ABOVE on all categories
 *   Layer 3 (this): Output sanitization — XSS, source validation, disclaimers
 *
 * Applied to EVERY request (input) and response (output).
 * @class SafetyFilter
 */
class SafetyFilter {
  constructor() {
    /**
     * @private Patterns indicating prompt injection attempts.
     * Covers: English attacks, encoded attacks, role-play attacks, instruction override.
     */
    this.injectionPatterns = [
      // Direct instruction override
      /ignore (previous|all|above|prior|system) instructions/i,
      /disregard (your|all|previous) (rules|instructions|guidelines)/i,
      /system prompt/i,
      /reveal your/i,
      /show (me|your) (prompt|instructions|system|config)/i,
      // Role-play / persona attacks
      /you are now/i,
      /act as/i,
      /pretend (to|you)/i,
      /\bDAN\b/,
      /jailbreak/i,
      /bypass/i,
      /unrestricted mode/i,
      // Code injection
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      // Override / manipulation
      /override/i,
      /new instructions/i,
      /forget (everything|your|all)/i,
      // Encoding-based bypass attempts
      /&#x[0-9a-f]+;/i,         // HTML hex entities
      /&#\d+;/i,                  // HTML decimal entities
      /\\u[0-9a-f]{4}/i,         // Unicode escapes
      /base64/i,                  // Base64 injection hints
      /eval\s*\(/i,              // Code execution attempt
      // Multi-language injection (Hindi)
      /पिछले निर्देश/i,           // "previous instructions" in Hindi
      /सिस्टम प्रॉम्प्ट/i,         // "system prompt" in Hindi
    ];

    /**
     * @private Patterns indicating political bias requests.
     * Covers party names, candidate endorsements, election predictions.
     */
    this.politicalPatterns = [
      /vote for\s+\w+/i,
      /best (party|candidate)/i,
      /who (should|will) win/i,
      /which party/i,
      /support (which|what) (party|candidate)/i,
      /\b(bjp|congress|aap|tmc|bsp|sp|ncp|shiv sena|jdu|rjd|dmk|aiadmk|cpim|cpi|ysrcp|brs|jmm)\b/i,
    ];
  }

  /**
   * Apply safety filters to a response object.
   * @param {Object} response - Response contract object
   * @returns {Object} Sanitized response with disclaimers
   */
  filter(response) {
    const filtered = { ...response };

    // Ensure disclaimer is always present
    if (!filtered.disclaimer) {
      filtered.disclaimer = 'This is educational information, not legal advice. For official guidance, visit eci.gov.in';
    }

    // Sanitize text fields against XSS
    if (filtered.answer_summary) {
      filtered.answer_summary = this._sanitizeHtml(filtered.answer_summary);
    }
    if (filtered.detailed_explanation) {
      filtered.detailed_explanation = this._sanitizeHtml(filtered.detailed_explanation);
    }

    // Validate source URLs
    if (filtered.sources) {
      filtered.sources = filtered.sources.filter((s) =>
        s.url && (s.url.startsWith('https://') || s.url.startsWith('http://'))
      );
    }

    return filtered;
  }

  /**
   * Check if a user message contains prompt injection attempts.
   * This is Layer 1 of the defense-in-depth strategy.
   * Layer 2 (Gemini SafetySettings) provides additional protection at the model level.
   *
   * @param {string} message - Raw user message
   * @returns {{ isInjection: boolean, sanitizedMessage: string, matchedPattern: string|null }}
   */
  detectInjection(message) {
    const normalized = (message || '').trim();
    for (const pattern of this.injectionPatterns) {
      if (pattern.test(normalized)) {
        return {
          isInjection: true,
          sanitizedMessage: 'How can I help you learn about elections?',
          matchedPattern: pattern.toString(),
        };
      }
    }
    return { isInjection: false, sanitizedMessage: normalized, matchedPattern: null };
  }

  /**
   * Check if a message requests political bias.
   * @param {string} message - Raw user message
   * @returns {{ isPolitical: boolean, redirectMessage: string|null }}
   */
  detectPoliticalBias(message) {
    const normalized = (message || '').trim();
    for (const pattern of this.politicalPatterns) {
      if (pattern.test(normalized)) {
        return {
          isPolitical: true,
          redirectMessage: 'As an impartial education assistant, I focus on the electoral process rather than specific parties or candidates. How can I help you understand the election process?',
        };
      }
    }
    return { isPolitical: false, redirectMessage: null };
  }

  /**
   * Remove HTML tags and script-related content.
   * Layer 3 of defense-in-depth — sanitizes ALL output before returning to user.
   * @private
   */
  _sanitizeHtml(text) {
    if (typeof text !== 'string') {
      return '';
    }
    return text
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
}

module.exports = new SafetyFilter();
