'use strict';
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const config = require('./index');

/** @type {import('@google/generative-ai').GenerativeModel|null} */
let chatModel = null;
/** @type {import('@google/generative-ai').GenerativeModel|null} */
let classifierModel = null;
/** @type {import('@google/generative-ai').GenerativeModel|null} */
let translationModel = null;

/**
 * JSON schema for the structured response contract.
 * Gemini will enforce this schema natively — no regex extraction needed.
 * @type {Object}
 */
const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    answer_summary: {
      type: SchemaType.STRING,
      description: '2-4 sentence plain language summary of the answer',
    },
    detailed_explanation: {
      type: SchemaType.STRING,
      description: 'Full markdown-formatted explanation with numbered steps or bullets',
    },
    next_3_actions: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: 'Up to 3 specific actionable next steps, or empty if not applicable',
    },
    deadlines: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          event: { type: SchemaType.STRING },
          date: { type: SchemaType.STRING },
          urgency: { type: SchemaType.STRING },
        },
        required: ['event'],
      },
      description: 'Upcoming deadlines or empty array',
    },
    sources: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          url: { type: SchemaType.STRING },
        },
        required: ['title', 'url'],
      },
      description: 'Source citations with title and URL',
    },
    confidence: {
      type: SchemaType.STRING,
      description: 'Confidence level: high, medium, or low',
    },
    follow_up_suggestions: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: '2 related follow-up questions the user might ask',
    },
    disclaimer: {
      type: SchemaType.STRING,
      description: 'Legal disclaimer text',
    },
  },
  required: ['answer_summary', 'confidence', 'disclaimer'],
};

/**
 * JSON schema for intent classification fallback.
 * @type {Object}
 */
const CLASSIFIER_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    intent: {
      type: SchemaType.STRING,
      description:
        'One of: eligibility, registration, timeline, voting_day, documents, faq, calendar, greeting, unsupported',
    },
    confidence: {
      type: SchemaType.STRING,
      description: 'high, medium, or low',
    },
    reasoning: {
      type: SchemaType.STRING,
      description: 'Brief explanation of why this intent was chosen',
    },
  },
  required: ['intent', 'confidence'],
};

/**
 * Defense-in-depth safety settings — maximum blocking on all categories.
 * Layer 2 of 3-layer security: Regex pre-filter → Gemini SafetySettings → Output sanitization.
 * @type {Array}
 */
const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
];

/**
 * Initialize the primary chat model with structured JSON output.
 * Uses Gemini's native responseSchema to guarantee valid JSON responses.
 * @returns {import('@google/generative-ai').GenerativeModel}
 * @throws {Error} If GEMINI_API_KEY is not set
 */
function initializeGemini() {
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }
  const genAI = new GoogleGenerativeAI(config.geminiApiKey);

  // Primary chat model — enforces JSON response contract
  chatModel = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.4,
      topP: 0.85,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
    safetySettings: SAFETY_SETTINGS,
  });

  // Intent classifier model — lightweight JSON classification
  classifierModel = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 256,
      responseMimeType: 'application/json',
      responseSchema: CLASSIFIER_SCHEMA,
    },
    safetySettings: SAFETY_SETTINGS,
  });

  // Translation model — free-form text output (no JSON constraint)
  translationModel = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1024,
    },
    safetySettings: SAFETY_SETTINGS,
  });

  return chatModel;
}

/**
 * Get the initialized chat model instance (lazy init).
 * @returns {import('@google/generative-ai').GenerativeModel}
 */
function getModel() {
  if (!chatModel) {
    initializeGemini();
  }
  return chatModel;
}

/**
 * Get the intent classifier model (lazy init).
 * @returns {import('@google/generative-ai').GenerativeModel}
 */
function getClassifierModel() {
  if (!classifierModel) {
    initializeGemini();
  }
  return classifierModel;
}

/**
 * Get the translation model (lazy init).
 * @returns {import('@google/generative-ai').GenerativeModel}
 */
function getTranslationModel() {
  if (!translationModel) {
    initializeGemini();
  }
  return translationModel;
}

module.exports = {
  initializeGemini,
  getModel,
  getClassifierModel,
  getTranslationModel,
  RESPONSE_SCHEMA,
  CLASSIFIER_SCHEMA,
  SAFETY_SETTINGS,
};
