'use strict';

/**
 * Application-wide constants.
 * All magic numbers and strings are defined here.
 * @module constants
 */

/** All supported intents for the decision engine. */
const INTENTS = Object.freeze({
  ELIGIBILITY: 'eligibility',
  REGISTRATION: 'registration',
  TIMELINE: 'timeline',
  VOTING_DAY: 'voting_day',
  DOCUMENTS: 'documents',
  FAQ: 'faq',
  CALENDAR: 'calendar',
  GREETING: 'greeting',
  UNSUPPORTED: 'unsupported',
});

/** Supported voter statuses. */
const VOTER_STATUS = Object.freeze({
  FIRST_TIME: 'first_time',
  REGISTERED: 'registered',
  NRI: 'nri',
  UNKNOWN: 'unknown',
});

/** Supported election types. */
const ELECTION_TYPES = Object.freeze({
  NATIONAL: 'national',
  STATE: 'state',
  LOCAL: 'local',
});

/** Supported detail levels for response formatting. */
const DETAIL_LEVELS = Object.freeze({
  SIMPLE: 'simple',
  STANDARD: 'standard',
  DETAILED: 'detailed',
});

/** Confidence levels for response accuracy. */
const CONFIDENCE = Object.freeze({
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
});

/** Urgency thresholds in days. */
const URGENCY_THRESHOLDS = Object.freeze({
  CRITICAL: 7,
  HIGH: 14,
  MEDIUM: 30,
  LOW: 60,
});

/** Maximum input lengths and UI constants. */
const LIMITS = Object.freeze({
  MAX_MESSAGE_LENGTH: 500,
  MAX_SESSION_ID_LENGTH: 64,
  MIN_MESSAGE_LENGTH: 1,
  DEBOUNCE_MS: 300,
  TOUCH_TARGET_PX: 44,
});

/** Indian states and union territories for context extraction. */
const INDIAN_STATES = [
  'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
  'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka',
  'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram',
  'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu',
  'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal',
  'delhi', 'jammu and kashmir', 'ladakh',
];

module.exports = {
  INTENTS, VOTER_STATUS, ELECTION_TYPES, DETAIL_LEVELS,
  CONFIDENCE, URGENCY_THRESHOLDS, LIMITS, INDIAN_STATES,
};
