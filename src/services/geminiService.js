'use strict';
const { getModel } = require('../config/gemini');
const { SYSTEM_PROMPT } = require('../utils/prompts');
const { CONFIDENCE } = require('../utils/constants');

/**
 * Orchestrates Gemini API calls AFTER deterministic processing.
 * The LLM is used for WORDING and natural language formatting, NOT for logic.
 * Falls back to raw structured data if Gemini is unavailable.
 * @class GeminiService
 */
class GeminiService {
  /**
   * Generate a natural language response from structured data.
   * @param {string} intent - Classified intent
   * @param {Object} context - User context slots
   * @param {Object} structuredData - Data from checklistGenerator/knowledgeService
   * @param {string} userMessage - Original user message
   * @returns {Object} Response conforming to the response contract
   */
  async generateResponse(intent, context, structuredData, userMessage) {
    try {
      const model = getModel();

      const contextStr = [
        'User Context:',
        `  age=${context.age || 'unknown'}`,
        `  state=${context.location?.state || 'unknown'}`,
        `  voterStatus=${context.voterStatus}`,
        `  electionType=${context.electionType || 'unknown'}`,
        `  language=${context.preferredLanguage}`,
        `  detailLevel=${context.detailLevel}`,
        '',
        'Structured Data (use this as your source of truth):',
        JSON.stringify(structuredData, null, 2),
        '',
        `User Question: ${userMessage}`,
      ].join('\n');

      const prompt = `${SYSTEM_PROMPT}\n\n${contextStr}`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Log token usage for efficiency monitoring
      const usage = result.response.usageMetadata;
      if (usage) {
        console.log(JSON.stringify({
          event: 'gemini_usage',
          promptTokens: usage.promptTokenCount,
          responseTokens: usage.candidatesTokenCount,
          totalTokens: usage.totalTokenCount,
        }));
      }

      return this._parseResponse(responseText, structuredData);
    } catch (error) {
      console.error(JSON.stringify({ event: 'gemini_error', error: error.message }));
      // Graceful fallback: return structured data directly
      return this._buildFallbackResponse(structuredData);
    }
  }

  /**
   * Translate text to a target language using Gemini.
   * @param {string} text - Text to translate
   * @param {string} targetLanguage - Target language name (e.g., 'Hindi')
   * @returns {string} Translated text or original on failure
   */
  async translateResponse(text, targetLanguage) {
    try {
      const model = getModel();
      const prompt = `Translate the following election education content to ${targetLanguage}. 
Maintain all formatting, emojis, and factual accuracy. Only output the translation, nothing else:

${text}`;
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error(JSON.stringify({ event: 'translation_error', error: error.message }));
      return text; // Fallback: return original text
    }
  }

  /** @private Parse Gemini response into response contract format. */
  _parseResponse(responseText, structuredData) {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          answer_summary: parsed.answer_summary || 'Information retrieved successfully.',
          detailed_explanation: parsed.detailed_explanation || '',
          next_3_actions: parsed.next_3_actions || null,
          deadlines: parsed.deadlines || [],
          sources: parsed.sources || [],
          confidence: parsed.confidence || CONFIDENCE.HIGH,
          follow_up_suggestions: parsed.follow_up_suggestions || [],
          disclaimer: parsed.disclaimer || 'This is educational information, not legal advice.',
        };
      }
    } catch (parseError) {
      console.error(JSON.stringify({ event: 'parse_error', error: parseError.message }));
    }

    // If JSON parsing fails, wrap raw text in response contract
    return this._buildFallbackResponse(structuredData, responseText);
  }

  /** @private Build a fallback response when Gemini fails or returns non-JSON. */
  _buildFallbackResponse(structuredData, rawText) {
    const actions = structuredData?.actions || structuredData?.checklist?.actions;
    return {
      answer_summary: rawText || 'Here is the information you requested about the Indian election process.',
      detailed_explanation: typeof structuredData === 'object'
        ? JSON.stringify(structuredData, null, 2)
        : String(structuredData || ''),
      next_3_actions: actions ? actions.slice(0, 3).map((a) => a.action) : null,
      deadlines: [],
      sources: structuredData?.sources || [{ title: 'Election Commission of India', url: 'https://eci.gov.in' }],
      confidence: CONFIDENCE.MEDIUM,
      follow_up_suggestions: ['Tell me about voter registration', 'Show the election timeline'],
      disclaimer: 'This is educational information, not legal advice.',
    };
  }
}

module.exports = new GeminiService();
