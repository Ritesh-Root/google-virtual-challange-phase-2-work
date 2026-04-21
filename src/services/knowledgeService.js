'use strict';
const electionData = require('../data/electionKnowledge.json');
const { INTENTS } = require('../utils/constants');

/**
 * Retrieves election knowledge from the structured JSON data store.
 * Every response includes source URLs for trust and citation.
 * @class KnowledgeService
 */
class KnowledgeService {
  constructor() {
    /** @private */
    this.data = electionData;
  }

  /**
   * Get topic data by key.
   * @param {string} topicKey - Topic identifier
   * @returns {Object|null} Topic data or null if not found
   */
  getTopic(topicKey) {
    return this.data.topics[topicKey] || null;
  }

  /**
   * Get all available topics for listing.
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
   * @param {string} query - User query to search
   * @returns {Object|null} Matching FAQ entry or null
   */
  searchFAQ(query) {
    const lower = (query || '').toLowerCase();
    return this.data.faq.find((entry) => {
      const questionKey = entry.question.toLowerCase().replace(/what is |what are |\?/g, '').trim();
      return lower.includes(questionKey);
    }) || null;
  }

  /**
   * Retrieve relevant knowledge based on classified intent.
   * @param {string} intent - Classified intent from IntentRouter
   * @param {Object} context - User context slots
   * @returns {{ data: Object|null, sources: Array<{ title: string, url: string }> }}
   */
  retrieve(intent, context) {
    const intentToTopic = {
      [INTENTS.ELIGIBILITY]: 'eligibility',
      [INTENTS.REGISTRATION]: 'registration',
      [INTENTS.TIMELINE]: 'election_timeline',
      [INTENTS.VOTING_DAY]: 'polling_booth',
      [INTENTS.DOCUMENTS]: 'registration',
    };

    const topicKey = intentToTopic[intent];
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
   * @returns {Object} Knowledge base metadata
   */
  getMetadata() {
    return this.data.metadata;
  }
}

module.exports = new KnowledgeService();
