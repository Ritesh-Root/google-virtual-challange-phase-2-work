'use strict';
const { getModel, getClassifierModel, getTranslationModel } = require('../config/gemini');
const { SYSTEM_PROMPT } = require('../utils/prompts');
const { CONFIDENCE, INTENTS } = require('../utils/constants');

/**
 * Orchestrates Gemini API calls AFTER deterministic processing.
 * Uses native JSON schema enforcement — Gemini guarantees valid JSON output.
 * Falls back to raw structured data if Gemini is unavailable.
 *
 * Architecture: Deterministic Engine → Gemini (wording/classification) → Safety Filter
 * The LLM is used for WORDING, TRANSLATION, and FALLBACK CLASSIFICATION, NOT for core logic.
 *
 * @class GeminiService
 */
class GeminiService {
  /**
   * Generate a natural language response from structured data.
   * Gemini is configured with responseMimeType: 'application/json' and a responseSchema,
   * so the response is guaranteed to be valid JSON — no regex extraction needed.
   *
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
        `  electionDate=${context.electionDate || 'unknown'}`,
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
        console.log(
          JSON.stringify({
            event: 'gemini_usage',
            intent,
            promptTokens: usage.promptTokenCount,
            responseTokens: usage.candidatesTokenCount,
            totalTokens: usage.totalTokenCount,
          })
        );
      }

      // Gemini guarantees valid JSON via responseSchema — parse directly
      return this._parseResponse(responseText, structuredData);
    } catch (error) {
      console.error(JSON.stringify({ event: 'gemini_error', error: error.message }));
      // Graceful fallback: return structured data directly
      return this._buildFallbackResponse(structuredData);
    }
  }

  /**
   * Classify a user message into an intent using Gemini as fallback.
   * This is the "LLM as judge" pattern — only called when deterministic
   * regex router returns 'unsupported'. Uses a dedicated classifier model
   * with its own JSON schema for minimal latency.
   *
   * @param {string} message - Raw user message
   * @returns {{ intent: string, confidence: string, reasoning: string }}
   */
  async classifyIntent(message) {
    try {
      const model = getClassifierModel();

      const prompt = `You are an intent classifier for an Indian election education chatbot.
Classify the following user message into one of these intents:
- eligibility: Questions about who can vote, age requirements, citizenship
- registration: Questions about how to register, voter ID, Form 6, EPIC
- timeline: Questions about election dates, schedule, phases
- voting_day: Questions about what happens at polling booths, EVM, VVPAT
- documents: Questions about required documents, ID proof
- faq: General election knowledge questions (ECI, NOTA, model code)
- calendar: Requests for reminders, calendar events, date alerts
- greeting: Greetings, help requests, "what can you do"
- unsupported: Not related to Indian elections at all

User message: "${message}"

Classify this message. If it is related to Indian elections in any way, choose the most relevant intent.
Only use 'unsupported' for completely unrelated topics.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const parsed = JSON.parse(responseText);

      console.log(
        JSON.stringify({
          event: 'gemini_classify',
          message: message.substring(0, 50),
          intent: parsed.intent,
          confidence: parsed.confidence,
        })
      );

      // Validate the intent is in our known set
      const validIntents = Object.values(INTENTS);
      if (validIntents.includes(parsed.intent)) {
        return parsed;
      }

      return { intent: INTENTS.UNSUPPORTED, confidence: CONFIDENCE.LOW, reasoning: 'Unknown intent returned' };
    } catch (error) {
      console.error(JSON.stringify({ event: 'classify_error', error: error.message }));
      return { intent: INTENTS.UNSUPPORTED, confidence: CONFIDENCE.LOW, reasoning: 'Classification failed' };
    }
  }

  /**
   * Translate text to a target language using a dedicated translation model.
   * Uses a separate model instance without JSON schema constraint.
   *
   * @param {string} text - Text to translate
   * @param {string} targetLanguage - Target language name (e.g., 'Hindi')
   * @returns {string} Translated text or original on failure
   */
  async translateResponse(text, targetLanguage) {
    try {
      const model = getTranslationModel();
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

  /**
   * Parse Gemini response into response contract format.
   * With native JSON schema, Gemini guarantees valid JSON.
   * Fallback chain: JSON.parse → regex extraction → raw text wrapping.
   * @private
   */
  _parseResponse(responseText, structuredData) {
    try {
      // Primary: direct JSON.parse (Gemini guarantees valid JSON via responseSchema)
      const parsed = JSON.parse(responseText);
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
    } catch (parseError) {
      console.error(JSON.stringify({ event: 'parse_error', error: parseError.message }));
      // Fallback: try regex extraction for non-schema responses
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extracted = JSON.parse(jsonMatch[0]);
          return {
            answer_summary: extracted.answer_summary || 'Information retrieved successfully.',
            detailed_explanation: extracted.detailed_explanation || '',
            next_3_actions: extracted.next_3_actions || null,
            deadlines: extracted.deadlines || [],
            sources: extracted.sources || [],
            confidence: extracted.confidence || CONFIDENCE.HIGH,
            follow_up_suggestions: extracted.follow_up_suggestions || [],
            disclaimer: extracted.disclaimer || 'This is educational information, not legal advice.',
          };
        }
      } catch (_regexError) {
        // Both parse attempts failed
      }
    }

    // If all parsing fails, wrap raw text in response contract
    return this._buildFallbackResponse(structuredData, responseText);
  }

  /**
   * Build a fallback response when Gemini fails or returns non-JSON.
   * @private
   */
  _buildFallbackResponse(structuredData, rawText) {
    const actions = structuredData?.actions || structuredData?.checklist?.actions;
    return {
      answer_summary: rawText || 'Here is the information you requested about the Indian election process.',
      detailed_explanation:
        typeof structuredData === 'object' ? JSON.stringify(structuredData, null, 2) : String(structuredData || ''),
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
