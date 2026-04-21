'use strict';

/**
 * Post-processing safety and compliance filter.
 * Applied to EVERY response before returning to user.
 * @class SafetyFilter
 */
class SafetyFilter {
  constructor() {
    /** @private Patterns indicating prompt injection attempts. */
    this.injectionPatterns = [
      /ignore (previous|all|above) instructions/i,
      /system prompt/i,
      /you are now/i,
      /act as/i,
      /pretend (to|you)/i,
      /reveal your/i,
      /\bDAN\b/,
      /<script/i,
      /javascript:/i,
      /override/i,
    ];

    /** @private Patterns indicating political bias requests. */
    this.politicalPatterns = [
      /vote for\s+\w+/i,
      /best (party|candidate)/i,
      /who (should|will) win/i,
      /\b(bjp|congress|aap|tmc|bsp|sp|ncp|shiv sena|jdu|rjd|dmk|aiadmk)\b/i,
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
   * @param {string} message - Raw user message
   * @returns {{ isInjection: boolean, sanitizedMessage: string }}
   */
  detectInjection(message) {
    const normalized = (message || '').trim();
    for (const pattern of this.injectionPatterns) {
      if (pattern.test(normalized)) {
        return { isInjection: true, sanitizedMessage: 'How can I help you learn about elections?' };
      }
    }
    return { isInjection: false, sanitizedMessage: normalized };
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

  /** @private Remove HTML tags and script-related content. */
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
