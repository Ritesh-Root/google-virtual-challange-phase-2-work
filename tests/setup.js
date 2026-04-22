'use strict';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.GEMINI_API_KEY = 'test-key-not-real';
process.env.PORT = '0';

// Mock the @google/generative-ai module
jest.mock('@google/generative-ai', () => {
  const mockGenerateContent = jest.fn().mockResolvedValue({
    response: {
      text: () => JSON.stringify({
        answer_summary: 'Test response about elections.',
        detailed_explanation: 'Detailed test explanation about the election process.',
        next_3_actions: ['Action 1', 'Action 2', 'Action 3'],
        deadlines: [],
        sources: [{ title: 'ECI', url: 'https://eci.gov.in' }],
        confidence: 'high',
        follow_up_suggestions: ['Follow up 1', 'Follow up 2'],
        disclaimer: 'This is educational information, not legal advice.',
      }),
      usageMetadata: {
        promptTokenCount: 100,
        candidatesTokenCount: 50,
        totalTokenCount: 150,
      },
    },
  });

  // Classifier mock — returns 'faq' intent for election-related, 'unsupported' for unrelated
  const mockClassifierContent = jest.fn().mockImplementation((prompt) => {
    const lower = (typeof prompt === 'string' ? prompt : '').toLowerCase();
    if (lower.includes('pizza') || lower.includes('weather') || lower.includes('cat')) {
      return Promise.resolve({
        response: {
          text: () => JSON.stringify({
            intent: 'unsupported',
            confidence: 'high',
            reasoning: 'Not related to elections',
          }),
        },
      });
    }
    return Promise.resolve({
      response: {
        text: () => JSON.stringify({
          intent: 'faq',
          confidence: 'medium',
          reasoning: 'Related to election education',
        }),
      },
    });
  });

  // Translation mock — returns prefixed text
  const mockTranslationContent = jest.fn().mockImplementation((prompt) => {
    return Promise.resolve({
      response: {
        text: () => '[Translated] Test translation output',
      },
    });
  });

  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockImplementation((config) => {
        // If it has a responseSchema with 'intent' property, it's the classifier
        if (config.generationConfig?.responseSchema?.properties?.intent) {
          return { generateContent: mockClassifierContent };
        }
        // If it has responseMimeType: 'application/json', it's the chat model
        if (config.generationConfig?.responseMimeType === 'application/json') {
          return { generateContent: mockGenerateContent };
        }
        // Otherwise it's the translation model
        return { generateContent: mockTranslationContent };
      }),
    })),
    SchemaType: {
      OBJECT: 'OBJECT',
      STRING: 'STRING',
      ARRAY: 'ARRAY',
      INTEGER: 'INTEGER',
    },
  };
});

// Increase timeout for async tests
jest.setTimeout(10000);
