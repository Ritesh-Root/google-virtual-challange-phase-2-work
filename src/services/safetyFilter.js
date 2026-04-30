'use strict';

/**
 * Defense-in-depth safety and compliance filter.
 * 3-Layer Security Architecture:
 *   Layer 1 (this): Deterministic regex pre-filter — fast, zero API cost
 *   Layer 2: Gemini SafetySettings — BLOCK_LOW_AND_ABOVE on all categories
 *   Layer 3 (this): Output sanitization — XSS, source validation, disclaimers
 *
 * Applied to EVERY request (input) and response (output).
 *
 * @class SafetyFilter
 * @module safetyFilter
 */
class SafetyFilter {
  constructor() {
    /**
     * @private Patterns indicating prompt injection attempts.
     * Covers: English attacks, encoded attacks, role-play attacks, instruction override,
     * multi-language injection (Hindi/Urdu), and encoding-based bypass attempts.
     * @type {RegExp[]}
     */
    this.injectionPatterns = [
      // Direct instruction override
      /ignore\s+(?:(?:all|any|the)\s+)?(?:(?:previous|above|prior|system|my|these)\s+)?(instructions|rules|prompts?)/i,
      /disregard (your|all|previous|the) (rules|instructions|guidelines|constraints)/i,
      /system prompt/i,
      /reveal your/i,
      /show (me |your )(prompt|instructions|system|config|rules|training)/i,
      /what (are|is) your (instructions|prompt|rules|system|training)/i,
      /tell me your (prompt|instructions|system|rules)/i,
      /output your (prompt|instructions|system|initial)/i,
      /print your (prompt|instructions|system|initial)/i,
      // Role-play / persona attacks
      /you are now/i,
      /act as (a |an )?/i,
      /pretend (to be|you are|you're)/i,
      /\bDAN\b/,
      /jailbreak/i,
      /bypass (your |the |all )?/i,
      /unrestricted mode/i,
      /developer mode/i,
      /god mode/i,
      /sudo mode/i,
      /admin mode/i,
      // Code injection
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /data:text\/html/i,
      /vbscript:/i,
      // Override / manipulation
      /override (your |the |all )?/i,
      /new instructions/i,
      /forget (everything|your|all|previous)/i,
      /reset (your |the )?instructions/i,
      /change your (role|behavior|persona|instructions)/i,
      // Encoding-based bypass attempts
      /&#x[0-9a-f]+;/i, // HTML hex entities
      /&#\d+;/i, // HTML decimal entities
      /\\u[0-9a-f]{4}/i, // Unicode escapes
      /\\x[0-9a-f]{2}/i, // Hex escapes
      /base64/i, // Base64 injection hints
      /eval\s*\(/i, // Code execution attempt
      /\x00/, // Null byte injection
      /String\.fromCharCode/i, // JS string construction bypass
      /atob\s*\(/i, // Base64 decode attempt
      /document\.(cookie|domain|write)/i, // DOM manipulation
      /window\.(location|open)/i, // Navigation manipulation
      // Multi-language injection (Hindi)
      /पिछले निर्देश/i, // "previous instructions" in Hindi
      /सिस्टम प्रॉम्प्ट/i, // "system prompt" in Hindi
      /नियम तोड़/i, // "break rules" in Hindi
      /निर्देश बदल/i, // "change instructions" in Hindi
      // Delimiter injection
      /---\s*(system|user|assistant)/i, // Chat delimiter injection
      /\[INST\]/i, // Instruction delimiter
      /<<SYS>>/i, // System delimiter
    ];

    /**
     * @private Patterns indicating political bias requests.
     * Covers party names, candidate endorsements, election predictions, and opinion requests.
     * @type {RegExp[]}
     */
    this.politicalPatterns = [
      /vote for\s+\w+/i,
      /best (party|candidate|leader|minister)/i,
      /who (should|will|is going to) win/i,
      /which party (is|should|will)/i,
      /support (which|what) (party|candidate)/i,
      /who (do you|should i) (vote|support|choose)/i,
      new RegExp(
        '\\b(bjp|congress|inc|aap|tmc|bsp|sp|ncp|shiv sena|shivsena|jdu|rjd|dmk|' +
          'aiadmk|cpim|cpi|ysrcp|brs|jmm|jds|tdp|bss|ljp|akali dal|iuml|mim|aimim)\\b',
        'i'
      ),
    ];
  }

  /**
   * Apply safety filters to a response object.
   * Ensures disclaimer, sanitizes XSS, validates source URLs.
   *
   * @param {Object} response - Response contract object
   * @returns {Object} Sanitized response with disclaimers enforced
   */
  filter(response) {
    const filtered = { ...response };

    // Ensure disclaimer is always present (legal compliance)
    if (!filtered.disclaimer) {
      filtered.disclaimer =
        'This is educational information, not legal advice. For official guidance, visit eci.gov.in';
    }

    // Sanitize text fields against XSS (Layer 3 output sanitization)
    if (filtered.answer_summary) {
      filtered.answer_summary = this._sanitizeHtml(filtered.answer_summary);
    }
    if (filtered.detailed_explanation) {
      filtered.detailed_explanation = this._sanitizeHtml(filtered.detailed_explanation);
    }

    // Sanitize action items
    if (Array.isArray(filtered.next_3_actions)) {
      filtered.next_3_actions = filtered.next_3_actions.map((a) => this._sanitizeHtml(a));
    }

    // Sanitize follow-up suggestions
    if (Array.isArray(filtered.follow_up_suggestions)) {
      filtered.follow_up_suggestions = filtered.follow_up_suggestions.map((s) => this._sanitizeHtml(s));
    }

    // Validate source URLs against a small civic/Google allowlist.
    if (filtered.sources) {
      filtered.sources = filtered.sources
        .filter((source) => this._isAllowedSourceUrl(source?.url))
        .map((source) => ({
          title: this._sanitizeHtml(source.title || 'Source'),
          url: source.url,
        }));
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
   * Redirects to impartial process education.
   *
   * @param {string} message - Raw user message
   * @returns {{ isPolitical: boolean, redirectMessage: string|null }}
   */
  detectPoliticalBias(message) {
    const normalized = (message || '').trim();
    for (const pattern of this.politicalPatterns) {
      if (pattern.test(normalized)) {
        return {
          isPolitical: true,
          redirectMessage:
            'As an impartial education assistant, I focus on the electoral process rather than specific parties ' +
            'or candidates. How can I help you understand the election process?',
        };
      }
    }
    return { isPolitical: false, redirectMessage: null };
  }

  /**
   * Remove HTML tags, script-related content, and dangerous patterns.
   * Layer 3 of defense-in-depth — sanitizes ALL output before returning to user.
   *
   * @private
   * @param {string} text - Raw text to sanitize
   * @returns {string} Sanitized text with dangerous content removed
   */
  _sanitizeHtml(text) {
    if (typeof text !== 'string') {
      return '';
    }
    return text
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags and content
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style tags and content
      .replace(/<[^>]+>/g, '') // Remove all HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .replace(/data:text\/html/gi, '') // Remove data URI HTML
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/expression\s*\(/gi, '') // Remove CSS expressions
      .replace(/url\s*\(\s*['"]?\s*javascript/gi, ''); // Remove CSS url(javascript:)
  }

  /** @private Validate source URLs for civic information and Google integrations. */
  _isAllowedSourceUrl(url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') {
        return false;
      }
      return ['eci.gov.in', 'voters.eci.gov.in', 'calendar.google.com'].includes(parsed.hostname);
    } catch (_error) {
      return false;
    }
  }
}

module.exports = new SafetyFilter();
