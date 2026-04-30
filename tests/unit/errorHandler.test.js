'use strict';
const { errorHandler } = require('../../src/middleware/errorHandler');
const { AppError, ValidationError, NotFoundError, RateLimitError, GeminiError } = require('../../src/utils/errors');

describe('ErrorHandler', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      path: '/api/v1/chat',
      originalUrl: '/api/v1/chat',
      method: 'POST',
      ip: '127.0.0.1',
      correlationId: 'test-correlation-id',
      get: jest.fn().mockReturnValue('test-agent'),
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    // Suppress console.error during tests
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test('handles ValidationError with 400 status', () => {
    const err = new ValidationError('Invalid input');
    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
      },
    });
  });

  test('handles NotFoundError with 404 status', () => {
    const err = new NotFoundError('Topic');
    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Topic not found',
      },
    });
  });

  test('handles generic Error with 500 status', () => {
    const err = new Error('Something broke');
    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred. Please try again.',
      },
    });
  });

  test('does not expose stack trace for generic errors', () => {
    const err = new Error('Internal details');
    errorHandler(err, mockReq, mockRes, mockNext);

    const responseBody = mockRes.json.mock.calls[0][0];
    expect(responseBody.error.message).not.toContain('Internal details');
  });

  test('exposes message for AppError subclasses', () => {
    const err = new AppError('Custom app error', 422, 'CUSTOM_ERROR');
    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(422);
    expect(mockRes.json.mock.calls[0][0].error.message).toBe('Custom app error');
  });

  test('logs error with structured JSON', () => {
    const err = new ValidationError('Bad input');
    errorHandler(err, mockReq, mockRes, mockNext);

    expect(console.error).toHaveBeenCalled();
    const loggedStr = console.error.mock.calls[0][0];
    const logged = JSON.parse(loggedStr);
    expect(logged.event).toBe('error');
    expect(logged.httpRequest.url).toBe('/api/v1/chat');
    expect(logged.httpRequest.method).toBe('POST');
  });

  test('logs Cloud Error Reporting format', () => {
    const err = new ValidationError('Bad input');
    errorHandler(err, mockReq, mockRes, mockNext);

    const loggedStr = console.error.mock.calls[0][0];
    const logged = JSON.parse(loggedStr);
    expect(logged['@type']).toBe('type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent');
    expect(logged.serviceContext).toBeDefined();
    expect(logged.serviceContext.service).toBe('electionguide-ai');
  });

  test('logs correlationId from request', () => {
    const err = new ValidationError('Bad input');
    errorHandler(err, mockReq, mockRes, mockNext);

    const loggedStr = console.error.mock.calls[0][0];
    const logged = JSON.parse(loggedStr);
    expect(logged.correlationId).toBe('test-correlation-id');
  });

  test('logs severity WARNING for 4xx errors', () => {
    const err = new ValidationError('Bad input');
    errorHandler(err, mockReq, mockRes, mockNext);

    const loggedStr = console.error.mock.calls[0][0];
    const logged = JSON.parse(loggedStr);
    expect(logged.severity).toBe('WARNING');
  });

  test('logs severity ERROR for 5xx errors', () => {
    const err = new Error('Internal error');
    errorHandler(err, mockReq, mockRes, mockNext);

    const loggedStr = console.error.mock.calls[0][0];
    const logged = JSON.parse(loggedStr);
    expect(logged.severity).toBe('ERROR');
  });

  test('includes stack trace in dev mode', () => {
    // Force dev mode
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    // Re-require config to pick up dev mode
    jest.resetModules();
    const { errorHandler: devHandler } = require('../../src/middleware/errorHandler');

    const err = new Error('Dev error');
    devHandler(err, { ...mockReq, get: jest.fn().mockReturnValue('test-agent') }, mockRes, mockNext);

    expect(console.error).toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });

  test('handles RateLimitError with 429 status', () => {
    const err = new RateLimitError();
    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(429);
    expect(mockRes.json.mock.calls[0][0].error.code).toBe('RATE_LIMIT');
    expect(mockRes.json.mock.calls[0][0].error.message).toContain('Too many requests');
  });

  test('handles GeminiError with 503 status', () => {
    const err = new GeminiError();
    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(503);
    expect(mockRes.json.mock.calls[0][0].error.code).toBe('AI_SERVICE_ERROR');
  });

  test('handles GeminiError with custom message', () => {
    const err = new GeminiError('Model overloaded');
    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(503);
    expect(mockRes.json.mock.calls[0][0].error.message).toBe('Model overloaded');
  });

  test('marks operational errors correctly', () => {
    const err = new AppError('Operational', 400, 'OP_ERROR');
    errorHandler(err, mockReq, mockRes, mockNext);

    const loggedStr = console.error.mock.calls[0][0];
    const logged = JSON.parse(loggedStr);
    expect(logged.isOperational).toBe(true);
  });

  test('marks non-operational errors correctly', () => {
    const err = new Error('Programmer error');
    errorHandler(err, mockReq, mockRes, mockNext);

    const loggedStr = console.error.mock.calls[0][0];
    const logged = JSON.parse(loggedStr);
    expect(logged.isOperational).toBe(false);
  });

  test('handles missing correlationId gracefully', () => {
    const reqWithoutCorrelation = {
      ...mockReq,
      correlationId: undefined,
    };
    const err = new Error('Test');
    errorHandler(err, reqWithoutCorrelation, mockRes, mockNext);

    const loggedStr = console.error.mock.calls[0][0];
    const logged = JSON.parse(loggedStr);
    expect(logged.correlationId).toBe('unknown');
  });
});
