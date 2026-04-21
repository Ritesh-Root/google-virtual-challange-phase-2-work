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

  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    })),
  };
});

// Increase timeout for async tests
jest.setTimeout(10000);
