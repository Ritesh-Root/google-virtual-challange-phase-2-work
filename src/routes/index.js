'use strict';
const { Router } = require('express');
const { validate, chatSchema, calendarSchema } = require('../middleware/validator');
const intentRouter = require('../services/intentRouter');
const contextManager = require('../services/contextManager');
const checklistGenerator = require('../services/checklistGenerator');
const knowledgeService = require('../services/knowledgeService');
const geminiService = require('../services/geminiService');
const calendarService = require('../services/calendarService');
const safetyFilter = require('../services/safetyFilter');
const cacheService = require('../services/cacheService');
const { NotFoundError } = require('../utils/errors');
const { INTENTS, CONFIDENCE } = require('../utils/constants');

const router = Router();

/**
 * POST /api/v1/chat — Main conversational endpoint.
 * Implements the full decision pipeline:
 * Sanitize → Intent → Slots → Missing check → Knowledge → Checklist → Gemini → Safety
 */
router.post('/api/v1/chat', validate(chatSchema), async (req, res, next) => {
  try {
    const { message, sessionId, language, detailLevel } = req.validatedBody;

    // 1. Safety: check for prompt injection
    const injectionCheck = safetyFilter.detectInjection(message);
    if (injectionCheck.isInjection) {
      const session = contextManager.getOrCreate(sessionId);
      return res.json({
        success: true,
        data: {
          answer_summary: '🗳️ ' + injectionCheck.sanitizedMessage,
          detailed_explanation: 'I can help you learn about the election process in India. Try asking about voter registration, the election timeline, or what happens on polling day.',
          next_3_actions: ['Ask about voter eligibility', 'Learn the election timeline', 'Understand the voting process'],
          deadlines: [],
          sources: [{ title: 'Election Commission of India', url: 'https://eci.gov.in' }],
          confidence: CONFIDENCE.HIGH,
          follow_up_suggestions: ['How do I register to vote?', 'What is NOTA?'],
          disclaimer: 'This is educational information, not legal advice.',
        },
        sessionId: session.sessionId,
      });
    }

    // 2. Safety: check for political bias requests
    const politicalCheck = safetyFilter.detectPoliticalBias(message);
    if (politicalCheck.isPolitical) {
      const session = contextManager.getOrCreate(sessionId);
      return res.json({
        success: true,
        data: {
          answer_summary: '🏛️ ' + politicalCheck.redirectMessage,
          detailed_explanation: null,
          next_3_actions: null,
          deadlines: [],
          sources: [{ title: 'Election Commission of India', url: 'https://eci.gov.in' }],
          confidence: CONFIDENCE.HIGH,
          follow_up_suggestions: ['Tell me about the election process', 'How do I register to vote?'],
          disclaimer: 'This is educational information, not legal advice.',
        },
        sessionId: session.sessionId,
      });
    }

    // 3. Classify intent (deterministic)
    const { intent } = intentRouter.classify(message);

    // 4. Get/create session and update context from message
    const session = contextManager.getOrCreate(sessionId);
    const slots = contextManager.updateFromMessage(session.sessionId, message);
    if (language) {
      slots.preferredLanguage = language;
    }
    if (detailLevel) {
      slots.detailLevel = detailLevel;
    }

    // 5. Handle greeting intent directly (no LLM needed)
    if (intent === INTENTS.GREETING) {
      return res.json({
        success: true,
        data: {
          answer_summary: '🗳️ Welcome to ElectionGuide AI! I\'m here to help you understand the Indian election process.',
          detailed_explanation: 'I can help you with:\n\n- **Voter eligibility** — check if you can vote\n- **Registration** — step-by-step guide to register\n- **Election timeline** — all 9 phases explained\n- **Polling day** — what happens at the booth\n- **Required documents** — what to bring\n- **Calendar reminders** — never miss a deadline\n\nJust ask me anything about elections! 🇮🇳',
          next_3_actions: ['Check your voter eligibility', 'Learn how to register to vote', 'View the election timeline'],
          deadlines: [],
          sources: [{ title: 'Election Commission of India', url: 'https://eci.gov.in' }],
          confidence: CONFIDENCE.HIGH,
          follow_up_suggestions: ['Am I eligible to vote?', 'How do I register?'],
          disclaimer: null,
        },
        sessionId: session.sessionId,
      });
    }

    // 6. Check for missing critical slots (ask max 1 clarifying question)
    const missingSlot = contextManager.getMissingSlotQuestion(session.sessionId, intent);
    if (missingSlot) {
      return res.json({
        success: true,
        data: {
          answer_summary: missingSlot.question,
          detailed_explanation: null,
          next_3_actions: null,
          deadlines: [],
          sources: [],
          confidence: CONFIDENCE.MEDIUM,
          follow_up_suggestions: [],
          disclaimer: null,
        },
        sessionId: session.sessionId,
      });
    }

    // 7. Check cache for identical query + context
    const cacheKey = cacheService.generateKey(message, slots);
    const cachedResponse = cacheService.get(cacheKey);
    if (cachedResponse) {
      return res.json({ success: true, data: cachedResponse, sessionId: session.sessionId, cached: true });
    }

    // 8. Handle calendar intent specially
    if (intent === INTENTS.CALENDAR) {
      const reminders = calendarService.generateElectionReminders(slots);
      const mapLink = calendarService.generatePollingBoothMapLink(slots.location?.state);
      const calendarResponse = {
        answer_summary: '📅 Here are your election reminder links! Click any to add to your Google Calendar.',
        detailed_explanation: 'I\'ve prepared calendar events for key election milestones. Click the links below to add them directly to your Google Calendar. You can also find your nearest polling booth on Google Maps.',
        next_3_actions: [
          'Click a reminder link below to add to Google Calendar',
          'Find your polling booth on Google Maps',
          'Download the Voter Helpline App for push notifications',
        ],
        deadlines: [],
        sources: [{ title: 'Google Calendar', url: 'https://calendar.google.com' }],
        confidence: CONFIDENCE.HIGH,
        follow_up_suggestions: ['Show me the election timeline', 'What documents do I need on voting day?'],
        disclaimer: null,
        calendarLinks: reminders,
        mapLink,
      };
      return res.json({ success: true, data: calendarResponse, sessionId: session.sessionId });
    }

    // 9. Retrieve knowledge and generate checklist
    const knowledge = knowledgeService.retrieve(intent, slots);
    let checklist = null;
    if (intent === INTENTS.ELIGIBILITY || intent === INTENTS.REGISTRATION) {
      checklist = checklistGenerator.generate(slots);
    } else if (intent === INTENTS.TIMELINE) {
      checklist = checklistGenerator.generateTimeline(slots.electionType);
    }

    const structuredData = {
      ...knowledge.data,
      checklist,
      sources: knowledge.sources,
    };

    // 10. Handle unsupported intent with graceful fallback
    if (intent === INTENTS.UNSUPPORTED) {
      // Try FAQ search as last resort
      const faqResult = knowledgeService.searchFAQ(message);
      if (faqResult) {
        const faqData = { ...faqResult, sources: [{ title: 'ECI FAQ', url: faqResult.source_url }] };
        const response = await geminiService.generateResponse(intent, slots, faqData, message);
        const safeResponse = safetyFilter.filter(response);
        cacheService.set(cacheKey, safeResponse);
        return res.json({ success: true, data: safeResponse, sessionId: session.sessionId });
      }

      return res.json({
        success: true,
        data: {
          answer_summary: '🏛️ I specialize in Indian election education. I can help with voter registration, election timelines, polling day processes, and more.',
          detailed_explanation: 'Currently, I cover elections governed by the Election Commission of India (ECI). For topics outside Indian elections, please consult the relevant authority in your region.\n\nHere\'s what I can help you with:\n- Voter eligibility and registration\n- Election timeline and phases\n- Polling day process\n- Required documents\n- Your rights as a voter\n- Setting calendar reminders',
          next_3_actions: ['Ask about voter eligibility', 'Learn the election process', 'View required documents for voting'],
          deadlines: [],
          sources: [{ title: 'Election Commission of India', url: 'https://eci.gov.in' }],
          confidence: CONFIDENCE.HIGH,
          follow_up_suggestions: ['How do I register to vote in India?', 'What is the election timeline?'],
          disclaimer: 'This is educational information, not legal advice.',
        },
        sessionId: session.sessionId,
      });
    }

    // 11. Generate Gemini response (LLM wording pass on structured data)
    const response = await geminiService.generateResponse(intent, slots, structuredData, message);

    // 12. Apply safety filter
    const safeResponse = safetyFilter.filter(response);

    // 13. Translate if language is not English
    if (slots.preferredLanguage !== 'en' && safeResponse.answer_summary) {
      const langName = slots.preferredLanguage === 'hi' ? 'Hindi' : 'English';
      safeResponse.answer_summary = await geminiService.translateResponse(safeResponse.answer_summary, langName);
      if (safeResponse.detailed_explanation) {
        safeResponse.detailed_explanation = await geminiService.translateResponse(
          safeResponse.detailed_explanation, langName
        );
      }
    }

    // 14. Cache and return
    cacheService.set(cacheKey, safeResponse);
    res.json({ success: true, data: safeResponse, sessionId: session.sessionId });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/topics — List all available learning modules.
 */
router.get('/api/v1/topics', (_req, res) => {
  const topics = knowledgeService.getAllTopics();
  res.json({ success: true, data: { topics } });
});

/**
 * GET /api/v1/topics/:topicKey — Get detailed topic information.
 */
router.get('/api/v1/topics/:topicKey', (req, res, next) => {
  const topic = knowledgeService.getTopic(req.params.topicKey);
  if (!topic) {
    return next(new NotFoundError('Topic'));
  }
  res.json({ success: true, data: topic });
});

/**
 * POST /api/v1/calendar/reminders — Generate calendar reminder deep links.
 */
router.post('/api/v1/calendar/reminders', validate(calendarSchema), (req, res) => {
  const { state } = req.validatedBody || {};
  const context = { location: { state: state || null } };
  const reminders = calendarService.generateElectionReminders(context);
  const mapLink = calendarService.generatePollingBoothMapLink(state);
  res.json({ success: true, data: { reminders, mapLink } });
});

/**
 * GET /api/v1/health — Health check with dependency status and cache stats.
 */
router.get('/api/v1/health', (_req, res) => {
  const knowledgeMeta = knowledgeService.getMetadata();
  res.json({
    success: true,
    data: {
      status: 'healthy',
      uptime: Math.floor(process.uptime()),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      knowledgeBase: {
        version: knowledgeMeta.version,
        lastVerified: knowledgeMeta.last_verified_on,
        jurisdiction: knowledgeMeta.jurisdiction,
      },
      cache: cacheService.getStats(),
      sessions: contextManager.getSessionCount(),
      timestamp: new Date().toISOString(),
    },
  });
});

module.exports = router;
