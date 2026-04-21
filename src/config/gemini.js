'use strict';
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('./index');

/** @type {import('@google/generative-ai').GenerativeModel|null} */
let model = null;

/**
 * Initialize the Gemini AI model with safety settings.
 * @returns {import('@google/generative-ai').GenerativeModel}
 * @throws {Error} If GEMINI_API_KEY is not set
 */
function initializeGemini() {
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }
  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.4,
      topP: 0.85,
      maxOutputTokens: 1024,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  });
  return model;
}

/**
 * Get the initialized Gemini model instance (lazy init).
 * @returns {import('@google/generative-ai').GenerativeModel}
 */
function getModel() {
  if (!model) {
    initializeGemini();
  }
  return model;
}

module.exports = { initializeGemini, getModel };
