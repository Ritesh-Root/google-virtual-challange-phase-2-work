'use strict';
const electionData = require('../data/electionKnowledge.json');
const { INTENTS } = require('../utils/constants');

/**
 * Retrieves election knowledge from the structured JSON data store.
 * Every response includes source URLs for trust and citation.
 * Uses pre-built index for O(1) FAQ lookup (vs O(n) linear scan).
 *
 * @class KnowledgeService
 * @module knowledgeService
 */
class KnowledgeService {
  constructor() {
    /** @private @type {Object} Raw election data */
    this.data = electionData;

    /** @private @type {Map<string, Object>} Pre-built FAQ keyword index for fast lookup */
    this.faqIndex = this._buildFaqIndex();

    /** @private @type {Object<string, string>} Intent-to-topic key mapping */
    this.intentToTopic = Object.freeze({
      [INTENTS.ELIGIBILITY]: 'eligibility',
      [INTENTS.REGISTRATION]: 'registration',
      [INTENTS.TIMELINE]: 'election_timeline',
      [INTENTS.VOTING_DAY]: 'polling_booth',
      [INTENTS.DOCUMENTS]: 'registration',
    });

    /** @private @type {Set<string>} Stopwords ignored during FAQ fallback matching */
    this.faqStopwords = new Set([
      'a',
      'about',
      'an',
      'and',
      'are',
      'can',
      'do',
      'does',
      'for',
      'how',
      'i',
      'in',
      'is',
      'me',
      'my',
      'of',
      'or',
      'tell',
      'the',
      'to',
      'what',
      'when',
      'where',
      'who',
      'why',
    ]);
  }

  /**
   * Get topic data by key.
   *
   * @param {string} topicKey - Topic identifier
   * @returns {Object|null} Topic data or null if not found
   */
  getTopic(topicKey) {
    return this.data.topics[topicKey] || null;
  }

  /**
   * Get all available topics for listing.
   *
   * @returns {Array<{ key: string, title: string, summary: string }>}
   */
  getAllTopics() {
    return Object.entries(this.data.topics).map(([key, topic]) => ({
      key,
      title: topic.title,
      summary: topic.summary,
    }));
  }

  /**
   * Search FAQ entries by keyword match.
   * Uses pre-built index for efficient lookup instead of linear scan.
   *
   * @param {string} query - User query to search
   * @returns {Object|null} Matching FAQ entry or null
   */
  searchFAQ(query) {
    const lower = (query || '').toLowerCase();
    const queryTokens = new Set(this._faqTokens(lower));

    // First: try indexed exact keyword match (O(1))
    for (const [keyword, entry] of this.faqIndex) {
      if (lower.includes(keyword)) {
        return entry;
      }
    }

    if (queryTokens.size === 0) {
      return null;
    }

    // Fallback: require shared meaningful FAQ tokens, not generic words like "what".
    return (
      this.data.faq.find((entry) => {
        const questionTokens = this._faqTokens(entry.question);
        return questionTokens.some((token) => queryTokens.has(token));
      }) || null
    );
  }

  /**
   * Retrieve relevant knowledge based on classified intent.
   *
   * @param {string} intent - Classified intent from IntentRouter
   * @param {Object} _context - User context slots (reserved for future personalization)
   * @returns {{ data: Object|null, sources: Array<{ title: string, url: string }> }}
   */
  retrieve(intent, _context) {
    const topicKey = this.intentToTopic[intent];
    const topic = topicKey ? this.getTopic(topicKey) : null;

    if (topic) {
      return {
        data: topic,
        sources: [{ title: topic.title, url: topic.source_url }],
      };
    }

    return { data: null, sources: [] };
  }

  /**
   * Get metadata about the knowledge base for health checks.
   *
   * @returns {Object} Knowledge base metadata including version and last verified date
   */
  getMetadata() {
    return this.data.metadata;
  }

  /**
   * Build a pre-indexed keyword map for fast FAQ lookups.
   * Extracts the core keyword from each FAQ question for O(1) matching.
   *
   * @private
   * @returns {Map<string, Object>} Keyword → FAQ entry map
   */
  _buildFaqIndex() {
    const index = new Map();
    for (const entry of this.data.faq) {
      // Extract the main keyword (e.g., "nota" from "What is NOTA?")
      const keyword = entry.question
        .toLowerCase()
        .replace(/what (is|are) (a |an |the )?/g, '')
        .replace(/[?.,!]/g, '')
        .trim();
      if (keyword) {
        index.set(keyword, entry);
      }
    }
    return index;
  }

  /**
   * Tokenize text for conservative FAQ fallback matching.
   *
   * @private
   * @param {string} text - Input text
   * @returns {string[]} Meaningful tokens
   */
  _faqTokens(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 2 && !this.faqStopwords.has(token));
  }
}

module.exports = new KnowledgeService();
