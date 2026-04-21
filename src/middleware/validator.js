'use strict';
const Joi = require('joi');
const { ValidationError } = require('../utils/errors');
const { LIMITS } = require('../utils/constants');

/**
 * Chat message validation schema.
 * @type {Joi.ObjectSchema}
 */
const chatSchema = Joi.object({
  message: Joi.string()
    .trim()
    .min(LIMITS.MIN_MESSAGE_LENGTH)
    .max(LIMITS.MAX_MESSAGE_LENGTH)
    .pattern(/^[^<>]*$/, 'no HTML tags')
    .required()
    .messages({
      'string.max': `Message must be ${LIMITS.MAX_MESSAGE_LENGTH} characters or fewer`,
      'string.pattern.name': 'Message must not contain HTML tags',
      'string.empty': 'Message cannot be empty',
      'any.required': 'Message is required',
    }),
  sessionId: Joi.string().max(LIMITS.MAX_SESSION_ID_LENGTH).optional().allow(null, ''),
  language: Joi.string().valid('en', 'hi').default('en'),
  detailLevel: Joi.string().valid('simple', 'standard', 'detailed').default('standard'),
});

/**
 * Calendar reminder validation schema.
 * @type {Joi.ObjectSchema}
 */
const calendarSchema = Joi.object({
  state: Joi.string().max(50).optional().allow('', null),
});

/**
 * Express middleware factory for Joi validation.
 * @param {Joi.ObjectSchema} schema - Joi schema to validate against
 * @returns {Function} Express middleware function
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const message = error.details.map((d) => d.message).join('; ');
      return next(new ValidationError(message));
    }
    req.validatedBody = value;
    next();
  };
}

module.exports = { chatSchema, calendarSchema, validate };
