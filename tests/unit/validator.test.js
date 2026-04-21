'use strict';
const Joi = require('joi');
const { chatSchema, calendarSchema, validate } = require('../../src/middleware/validator');

describe('Validator Middleware', () => {
  describe('chatSchema', () => {
    test('validates correct message', () => {
      const { error } = chatSchema.validate({ message: 'Hello' });
      expect(error).toBeUndefined();
    });

    test('rejects empty message', () => {
      const { error } = chatSchema.validate({ message: '' });
      expect(error).toBeDefined();
    });

    test('rejects missing message', () => {
      const { error } = chatSchema.validate({});
      expect(error).toBeDefined();
    });

    test('rejects message with HTML tags', () => {
      const { error } = chatSchema.validate({ message: '<b>Hello</b>' });
      expect(error).toBeDefined();
    });

    test('rejects message over 500 chars', () => {
      const { error } = chatSchema.validate({ message: 'a'.repeat(501) });
      expect(error).toBeDefined();
    });

    test('accepts message at exactly 500 chars', () => {
      const { error } = chatSchema.validate({ message: 'a'.repeat(500) });
      expect(error).toBeUndefined();
    });

    test('accepts valid language', () => {
      const { error, value } = chatSchema.validate({ message: 'Hi', language: 'hi' });
      expect(error).toBeUndefined();
      expect(value.language).toBe('hi');
    });

    test('rejects invalid language', () => {
      const { error } = chatSchema.validate({ message: 'Hi', language: 'fr' });
      expect(error).toBeDefined();
    });

    test('defaults language to en', () => {
      const { value } = chatSchema.validate({ message: 'Hi' });
      expect(value.language).toBe('en');
    });

    test('accepts valid detail level', () => {
      const { error } = chatSchema.validate({ message: 'Hi', detailLevel: 'detailed' });
      expect(error).toBeUndefined();
    });

    test('strips unknown fields', () => {
      const { value } = chatSchema.validate(
        { message: 'Hi', malicious: 'field' },
        { stripUnknown: true }
      );
      expect(value.malicious).toBeUndefined();
    });
  });

  describe('calendarSchema', () => {
    test('validates with state', () => {
      const { error } = calendarSchema.validate({ state: 'Maharashtra' });
      expect(error).toBeUndefined();
    });

    test('validates without state', () => {
      const { error } = calendarSchema.validate({});
      expect(error).toBeUndefined();
    });

    test('validates with empty state', () => {
      const { error } = calendarSchema.validate({ state: '' });
      expect(error).toBeUndefined();
    });
  });

  describe('validate middleware', () => {
    test('calls next on valid input', () => {
      const req = { body: { message: 'Hello' } };
      const res = {};
      const next = jest.fn();

      validate(chatSchema)(req, res, next);
      expect(next).toHaveBeenCalledWith();
      expect(req.validatedBody).toBeDefined();
      expect(req.validatedBody.message).toBe('Hello');
    });

    test('calls next with error on invalid input', () => {
      const req = { body: {} };
      const res = {};
      const next = jest.fn();

      validate(chatSchema)(req, res, next);
      expect(next).toHaveBeenCalled();
      const err = next.mock.calls[0][0];
      expect(err).toBeDefined();
      expect(err.statusCode).toBe(400);
    });
  });
});
