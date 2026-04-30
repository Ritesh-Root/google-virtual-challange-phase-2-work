'use strict';
const { Router } = require('express');
const { validate, chatSchema, calendarSchema } = require('../middleware/validator');
const intentRouter = require('../services/intentRouter');
const contextManager = require('../services/contextManager');
const checklistGenerator = require('../services/checklistGenerator');
const knowledgeService = require('../services/knowledgeService');
const geminiService = require('../services/geminiService');
const calendarService = require('../services/calendarService');
const readinessAssessor = require('../services/readinessAssessor');
const safetyFilter = require('../services/safetyFilter');
const cacheService = require('../services/cacheService');
const { NotFoundError } = require('../utils/errors');
const { INTENTS, CONFIDENCE } = require('../utils/constants');

const router = Router();

/**
 * Apply common response post-processing before returning chat data.
 * Keeps deterministic branches on the same safety, translation, cache, and timing path.
 *
 * @param {Object} params - Response finalization inputs
 * @returns {Promise<void>}
 */
async function finalizeChatResponse({ response, slots, cacheKey, res, sessionId, startTime }) {
  const safeResponse = safetyFilter.filter(response);

  if (slots.preferredLanguage !== 'en' && safeResponse.answer_summary) {
    const langName = slots.preferredLanguage === 'hi' ? 'Hindi' : 'English';
    safeResponse.answer_summary = await geminiService.translateResponse(safeResponse.answer_summary, langName);
    if (safeResponse.detailed_explanation) {
      safeResponse.detailed_explanation = await geminiService.translateResponse(
        safeResponse.detailed_explanation,
        langName
      );
    }
  }

  cacheService.set(cacheKey, safeResponse);
  res.setHeader('X-Response-Time', `${Date.now() - startTime}ms`);
  res.json({ success: true, data: safeResponse, sessionId });
}

/**
 * Build the deterministic readiness response while keeping widget data namespaced.
 *
 * @param {Object} readiness - Readiness assessment result
 * @param {Object} slots - Session context slots
 * @returns {Object} Chat response object
 */
function buildReadinessResponse(readiness, slots) {
  const isSimple = slots.detailLevel === 'simple';
  const explanation = [
    'Readiness factors checked:',
    ...readiness.verified.map((item) => `- ${item}`),
    readiness.blockers.length ? '\nBlockers to resolve:' : '',
    ...readiness.blockers.map((item) => `- ${item}`),
    readiness.recommendations.length ? '\nRecommended improvements:' : '',
    ...readiness.recommendations.map((item) => `- ${item}`),
  ]
    .filter(Boolean)
    .join('\n');

  return {
    answer_summary: `Your voter readiness score is ${readiness.readinessScore}/100 (${readiness.statusLabel}). ${
      readiness.nextActions[0] || 'Keep your voter details and polling booth information ready.'
    }`,
    detailed_explanation: isSimple ? null : explanation,
    next_3_actions: isSimple ? readiness.nextActions.slice(0, 2) : readiness.nextActions,
    deadlines: [],
    sources: [{ title: 'Election Commission of India', url: 'https://eci.gov.in' }],
    confidence: readiness.confidence,
    follow_up_suggestions: ['I am 19 and registered in Delhi, am I ready?', 'Remind me of election dates'],
    disclaimer: 'This is educational information, not legal advice.',
    widgets: {
      readiness: {
        score: readiness.readinessScore,
        status: readiness.statusLabel,
        blockers: readiness.blockers,
        recommendations: readiness.recommendations,
        verified: readiness.verified,
      },
    },
  };
}

/**
 * POST /api/v1/chat — Main conversational endpoint.
 * Implements the full hybrid decision pipeline:
 * Sanitize → Intent (deterministic) → Slots → Missing check → Knowledge → Checklist
 * → Gemini (wording) → Safety → [LLM classify fallback if unsupported] → Response
 *
 * @route POST /api/v1/chat
 * @param {string} req.body.message - User's message (1-500 chars, no HTML)
 * @param {string} [req.body.sessionId] - Existing session ID
 * @param {string} [req.body.language='en'] - Response language (en|hi)
 * @param {string} [req.body.detailLevel='standard'] - Detail level (simple|standard|detailed)
 * @returns {{ success: boolean, data: Object, sessionId: string }}
 */
router.post('/api/v1/chat', validate(chatSchema), async (req, res, next) => {
  try {
    const startTime = Date.now();
    const { message, sessionId, language, detailLevel } = req.validatedBody;

    // 1. Safety: check for prompt injection (Layer 1 — regex pre-filter)
    const injectionCheck = safetyFilter.detectInjection(message);
    if (injectionCheck.isInjection) {
      console.log(
        JSON.stringify({
          severity: 'WARNING',
          event: 'injection_blocked',
          pattern: injectionCheck.matchedPattern,
          correlationId: req.correlationId,
        })
      );

      const session = contextManager.getOrCreate(sessionId);
      return res.json({
        success: true,
        data: {
          answer_summary: `\uD83D\uDDF3\uFE0F ${injectionCheck.sanitizedMessage}`,
          detailed_explanation:
            'I can help you learn about the election process in India. Try asking about voter registration, the election timeline, or what happens on polling day.',
          next_3_actions: [
            'Ask about voter eligibility',
            'Learn the election timeline',
            'Understand the voting process',
          ],
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
      console.log(
        JSON.stringify({
          severity: 'INFO',
          event: 'political_redirect',
          correlationId: req.correlationId,
        })
      );

      const session = contextManager.getOrCreate(sessionId);
      return res.json({
        success: true,
        data: {
          answer_summary: `\uD83C\uDFDB\uFE0F ${politicalCheck.redirectMessage}`,
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

    // 3. Classify intent (deterministic — regex pattern matching)
    const classification = intentRouter.classify(message);
    const { intent } = classification;

    // 4. Get/create session and update context from message
    const session = contextManager.getOrCreate(sessionId);
    const slots = contextManager.updateFromMessage(session.sessionId, message);
    if (language) {
      slots.preferredLanguage = language;
    }
    if (detailLevel) {
      slots.detailLevel = detailLevel;
    }

    // 5. Handle greeting intent directly (no LLM needed — saves API cost)
    if (intent === INTENTS.GREETING) {
      return res.json({
        success: true,
        data: {
          answer_summary:
            "\uD83D\uDDF3\uFE0F Welcome to ElectionGuide AI! I'm here to help you understand the Indian election process.",
          detailed_explanation:
            'I can help you with:\n\n- **Voter eligibility** \u2014 check if you can vote\n- **Registration** \u2014 step-by-step guide to register\n- **Election timeline** \u2014 all 9 phases explained\n- **Polling day** \u2014 what happens at the booth\n- **Required documents** \u2014 what to bring\n- **Calendar reminders** \u2014 never miss a deadline\n\nJust ask me anything about elections! \uD83C\uDDEE\uD83C\uDDF3',
          next_3_actions: [
            'Check your voter eligibility',
            'Learn how to register to vote',
            'View the election timeline',
          ],
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

    // 7. Check cache for identical query + context (efficiency optimization)
    const cacheKey = cacheService.generateKey(message, slots);
    const cachedResponse = cacheService.get(cacheKey);
    if (cachedResponse) {
      // Set cache header for transparency
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Response-Time', `${Date.now() - startTime}ms`);
      return res.json({ success: true, data: cachedResponse, sessionId: session.sessionId, cached: true });
    }
    res.setHeader('X-Cache', 'MISS');

    // 8. Handle calendar intent specially (Google Calendar + Maps deep links)
    if (intent === INTENTS.CALENDAR) {
      const reminders = calendarService.generateElectionReminders(slots);
      const mapLink = calendarService.generatePollingBoothMapLink(slots.location?.state);
      const calendarResponse = {
        answer_summary: '\uD83D\uDCC5 Here are your election reminder links! Click any to add to your Google Calendar.',
        detailed_explanation:
          "I've prepared calendar events for key election milestones. Click the links below to add them directly to your Google Calendar. You can also find your nearest polling booth on Google Maps.",
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
      return finalizeChatResponse({
        response: calendarResponse,
        slots,
        cacheKey,
        res,
        sessionId: session.sessionId,
        startTime,
      });
    }

    // 9. Deterministic voter readiness scoring
    if (intent === INTENTS.READINESS) {
      const readiness = readinessAssessor.assess(slots);
      return finalizeChatResponse({
        response: buildReadinessResponse(readiness, slots),
        slots,
        cacheKey,
        res,
        sessionId: session.sessionId,
        startTime,
      });
    }

    // 10. Retrieve knowledge and generate checklist (deterministic engine)
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

    // 10. Handle unsupported intent with HYBRID fallback engine
    if (intent === INTENTS.UNSUPPORTED) {
      // Attempt 1: FAQ keyword search (indexed, fast)
      const faqResult = knowledgeService.searchFAQ(message);
      if (faqResult) {
        const faqData = { ...faqResult, sources: [{ title: 'ECI FAQ', url: faqResult.source_url }] };
        const response = await geminiService.generateResponse(intent, slots, faqData, message);
        return finalizeChatResponse({
          response,
          slots,
          cacheKey,
          res,
          sessionId: session.sessionId,
          startTime,
        });
      }

      // Attempt 2: LLM fallback classification (hybrid engine)
      const llmClassification = await geminiService.classifyIntent(message);
      if (llmClassification.intent !== INTENTS.UNSUPPORTED && llmClassification.confidence !== 'low') {
        console.log(
          JSON.stringify({
            severity: 'INFO',
            event: 'hybrid_fallback',
            originalIntent: 'unsupported',
            llmIntent: llmClassification.intent,
            confidence: llmClassification.confidence,
            correlationId: req.correlationId,
          })
        );

        // Re-process with LLM-classified intent
        const llmKnowledge = knowledgeService.retrieve(llmClassification.intent, slots);
        let llmChecklist = null;
        if (llmClassification.intent === INTENTS.ELIGIBILITY || llmClassification.intent === INTENTS.REGISTRATION) {
          llmChecklist = checklistGenerator.generate(slots);
        } else if (llmClassification.intent === INTENTS.TIMELINE) {
          llmChecklist = checklistGenerator.generateTimeline(slots.electionType);
        }

        const llmStructuredData = {
          ...llmKnowledge.data,
          checklist: llmChecklist,
          sources: llmKnowledge.sources,
        };

        const llmResponse = await geminiService.generateResponse(
          llmClassification.intent,
          slots,
          llmStructuredData,
          message
        );
        return finalizeChatResponse({
          response: llmResponse,
          slots,
          cacheKey,
          res,
          sessionId: session.sessionId,
          startTime,
        });
      }

      // Final fallback: static boundary response
      return finalizeChatResponse({
        response: {
          answer_summary:
            '\uD83C\uDFDB\uFE0F I specialize in Indian election education. I can help with voter registration, election timelines, polling day processes, and more.',
          detailed_explanation:
            "Currently, I cover elections governed by the Election Commission of India (ECI). For topics outside Indian elections, please consult the relevant authority in your region.\n\nHere's what I can help you with:\n- Voter eligibility and registration\n- Election timeline and phases\n- Polling day process\n- Required documents\n- Your rights as a voter\n- Setting calendar reminders",
          next_3_actions: [
            'Ask about voter eligibility',
            'Learn the election process',
            'View required documents for voting',
          ],
          deadlines: [],
          sources: [{ title: 'Election Commission of India', url: 'https://eci.gov.in' }],
          confidence: CONFIDENCE.HIGH,
          follow_up_suggestions: ['How do I register to vote in India?', 'What is the election timeline?'],
          disclaimer: 'This is educational information, not legal advice.',
        },
        slots,
        cacheKey,
        res,
        sessionId: session.sessionId,
        startTime,
      });
    }

    // 11. Generate Gemini response (LLM wording pass on structured data)
    const response = await geminiService.generateResponse(intent, slots, structuredData, message);

    // 12. Safety, translation, cache, and return
    await finalizeChatResponse({
      response,
      slots,
      cacheKey,
      res,
      sessionId: session.sessionId,
      startTime,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/topics — List all available learning modules.
 * Returns cacheable topic listing from the knowledge base.
 *
 * @route GET /api/v1/topics
 * @returns {{ success: boolean, data: { topics: Array } }}
 */
router.get('/api/v1/topics', (_req, res) => {
  const topics = knowledgeService.getAllTopics();
  // Topics are static — cache aggressively
  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  res.json({ success: true, data: { topics } });
});

/**
 * GET /api/v1/topics/:topicKey — Get detailed topic information.
 *
 * @route GET /api/v1/topics/:topicKey
 * @param {string} req.params.topicKey - Topic identifier
 * @returns {{ success: boolean, data: Object }}
 */
router.get('/api/v1/topics/:topicKey', (req, res, next) => {
  const topic = knowledgeService.getTopic(req.params.topicKey);
  if (!topic) {
    return next(new NotFoundError('Topic'));
  }
  // Topic data is static — cache aggressively
  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  res.json({ success: true, data: topic });
});

/**
 * POST /api/v1/calendar/reminders — Generate calendar reminder deep links.
 * Creates Google Calendar event URLs and Google Maps polling booth search link.
 *
 * @route POST /api/v1/calendar/reminders
 * @param {string} [req.body.state] - Indian state for location context
 * @returns {{ success: boolean, data: { reminders: Array, mapLink: string } }}
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
 * Compatible with Cloud Run health checks and Google Cloud Monitoring.
 *
 * @route GET /api/v1/health
 * @returns {{ success: boolean, data: Object }}
 */
router.get('/api/v1/health', (_req, res) => {
  const knowledgeMeta = knowledgeService.getMetadata();
  const uptimeSeconds = Math.floor(process.uptime());

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({
    success: true,
    data: {
      status: 'healthy',
      uptime: uptimeSeconds,
      uptimeFormatted: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`,
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      knowledgeBase: {
        version: knowledgeMeta.version,
        lastVerified: knowledgeMeta.last_verified_on,
        jurisdiction: knowledgeMeta.jurisdiction,
        topicCount: knowledgeService.getAllTopics().length,
      },
      cache: cacheService.getStats(),
      sessions: contextManager.getSessionCount(),
      memoryUsage: {
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      },
      timestamp: new Date().toISOString(),
    },
  });
});

module.exports = router;
