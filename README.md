# 🗳️ ElectionGuide AI

> **Interactive AI assistant for understanding the Indian election process** — powered by Google Gemini 2.5 Flash, deployed on Google Cloud Run.

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js)](https://nodejs.org)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-2.5%20Flash-4285F4?logo=google)](https://ai.google.dev)
[![Cloud Run](https://img.shields.io/badge/Cloud%20Run-Deployed-4285F4?logo=google-cloud)](https://cloud.google.com/run)
[![Tests](https://img.shields.io/badge/Tests-418%20passing-brightgreen)](tests/)
[![License](https://img.shields.io/badge/License-ISC-blue)](LICENSE)

---

## 🎯 Problem Statement

**64% of India's first-time voters** report confusion about the registration process, eligibility criteria, and polling day procedures. Misinformation spreads via social media, while official ECI resources are buried in legal jargon.

**ElectionGuide AI** bridges this gap with an AI-powered, conversational assistant that provides accurate, non-partisan, multilingual election education — accessible to anyone with a browser.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Vanilla JS)                     │
│  Accessibility: WCAG 2.1 AA │ Font Size │ Contrast │ i18n   │
│  PWA: manifest.webmanifest │ Service Worker (offline shell) │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS (Cloud Run)
┌───────────────────────▼─────────────────────────────────────┐
│                    Express 5 API Layer                       │
│  Helmet CSP │ Rate Limit │ Joi Validation │ Compression      │
├─────────────────────────────────────────────────────────────┤
│               3-Layer Security Pipeline                      │
│  ┌──────────┐   ┌─────────────┐   ┌──────────────────┐      │
│  │ Layer 1  │──▶│   Layer 2   │──▶│     Layer 3      │      │
│  │ Regex    │   │ Gemini Safe │   │ Output Sanitize  │      │
│  │ Pre-filt │   │ Settings    │   │ XSS + Disclaimer │      │
│  └──────────┘   └─────────────┘   └──────────────────┘      │
├─────────────────────────────────────────────────────────────┤
│               Hybrid Decision Engine                         │
│  ┌──────────────────┐    ┌──────────────────────────┐       │
│  │ Deterministic     │    │ Gemini 2.5 Flash         │       │
│  │ Intent Router     │───▶│ (Wording + Translation   │       │
│  │ (Regex + Slots)   │    │  + Fallback Classifier)  │       │
│  └──────────────────┘    └──────────────────────────┘       │
│           │                                                  │
│  ┌────────▼───────────────────────────────────────────┐     │
│  │ Knowledge Base │ Readiness     │ Calendar Service   │     │
│  │ (Verified ECI) │ Score + Plan  │ (Google Calendar)  │     │
│  └────────────────┴───────────────┴────────────────────┘     │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ Quality Scorecard (rubric-aligned evidence API)      │     │
│  └─────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Why Hybrid?
- **Deterministic-first**: Regex classifies 80%+ of queries in <1ms with zero API cost
- **LLM as augmentation**: Gemini handles phrasing, translation, and edge-case classification
- **Same data = same answer**: Every deterministic query returns identical results (provable)

---

## ✨ Features

| Feature | Description | Google Service |
|---------|-------------|----------------|
| 🤖 Intelligent Chat | Understands voter questions via hybrid NLU | **Gemini 2.5 Flash** |
| 📋 Personalized Checklists | Step-by-step voter registration & preparation | Deterministic Engine |
| ✅ Voter Readiness Score | 0-100 readiness score with blockers and next actions | Deterministic Engine |
| 📅 Calendar Reminders | Google Calendar links only when a verified election date is known or supplied | **Google Calendar** |
| 📍 Polling Booth Finder | Direct Google Maps search for nearest booth | **Google Maps** |
| 🌐 Multilingual | English ↔ Hindi with Gemini translation | **Gemini 2.5 Flash** |
| ♿ WCAG 2.1 AA | Screen reader, keyboard nav, high contrast, font sizing | Frontend |
| 🔒 Defense-in-Depth | 3-layer security: regex + model safety + output sanitization | Application |
| 📈 Quality Scorecard | Runtime metadata-backed rubric evidence via `/api/v1/quality-scorecard` | Application |
| ⚡ Offline App Shell | Service worker caches static UI assets; API responses are never cached | Browser PWA |
| 📊 Cloud Logging | Structured JSON with severity levels + Cloud Trace | **Cloud Logging** |
| 🚀 Cloud Run Deploy | Serverless container with auto-scaling + HTTPS | **Cloud Run** |
| 🔄 CI/CD Pipeline | Cloud Build config for automated lint/test/deploy | **Cloud Build** |
| 🖼️ Google Fonts | Inter typeface via Google Fonts CDN | **Google Fonts** |

---

## 🔧 Google Cloud Services Used

| Service | Purpose | Integration Point |
|---------|---------|-------------------|
| **Gemini 2.5 Flash** | Response generation, intent classification, translation | `src/services/geminiService.js` |
| **Cloud Run** | Serverless container hosting with auto-scaling | `Dockerfile`, `cloudbuild.yaml` |
| **Cloud Build** | CI/CD pipeline (lint → test → build → deploy) | `cloudbuild.yaml` |
| **Cloud Logging** | Structured JSON logging with severity levels | `src/middleware/requestLogger.js` |
| **Cloud Error Reporting** | Automated error aggregation and alerting | `src/middleware/errorHandler.js` |
| **Cloud Trace** | Distributed request tracing via X-Cloud-Trace-Context | `src/middleware/requestLogger.js` |
| **Google Calendar** | Verified-date deep-link generation for election reminders | `src/services/calendarService.js` |
| **Google Maps** | Deep-link URL generation for polling booth search | `src/services/calendarService.js` |
| **Google Fonts** | Inter typeface for typography | `public/index.html` |

---

## 🛡️ Security Architecture

### 3-Layer Defense-in-Depth

```
User Input → [Layer 1: Regex Pre-filter] → [Layer 2: Gemini Safety] → [Layer 3: Output Sanitize] → User
```

| Layer | Mechanism | Coverage |
|-------|-----------|----------|
| **Layer 1** | 30+ regex patterns (injection, encoding, delimiter, Hindi) | Input |
| **Layer 2** | Gemini `BLOCK_LOW_AND_ABOVE` on all 4 harm categories | AI Model |
| **Layer 3** | HTML stripping, URL validation, XSS removal, disclaimer injection | Output |

### HTTP Security Headers
- **Helmet.js**: CSP, X-Content-Type-Options, X-Frame-Options, HSTS
- **Permissions-Policy**: camera, microphone, geolocation, payment — all disabled
- **CORS**: Configurable allowed origins with preflight caching
- **Rate Limiting**: 100 req/15min per IP
- **Body Limit**: 10KB maximum request body
- **Input Validation**: Joi schemas on all endpoints

See [SECURITY.md](SECURITY.md) for full policy and vulnerability reporting.

---

## ♿ Accessibility (WCAG 2.1 AA)

| Feature | Implementation |
|---------|----------------|
| Screen reader support | `aria-live`, `aria-label`, `aria-roledescription`, `role="log"` |
| Keyboard navigation | Skip link, `Ctrl+/` shortcut, `Enter/Space` activation, `tabindex` |
| High contrast mode | Toggle button, CSS custom properties, `data-contrast` attribute |
| Font size adjustment | A-/A+ buttons, persisted in `localStorage` |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` respected |
| Touch targets | Minimum 44×44px on all interactive elements |
| Focus indicators | `focus-visible` with 3px solid outline |
| Semantic HTML | `<nav>`, `<main>`, `<header>`, `<footer>`, `<section>` with landmarks |
| External link warnings | Screen reader text: "opens in new tab" |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Google Gemini API key ([Get one free](https://aistudio.google.com/apikey))

### Local Development

```bash
# Clone repository
git clone https://github.com/Ritesh-Root/google-virtual-challenge-phase-2-work.git
cd google-virtual-challenge-phase-2-work

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Start development server
npm run dev
# Visit http://localhost:8080
```

### Run Tests

```bash
npm test                    # Run all 418 tests
npm run test:coverage       # Run with coverage report
npm run lint                # Run ESLint (src, tests, public JS)
npm run validate            # Run lint + format check + tests
```

### Deploy to Cloud Run

```bash
# Using gcloud CLI
gcloud run deploy electionguide-ai \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_key,NODE_ENV=production

# Using Cloud Build (CI/CD)
gcloud builds submit --config cloudbuild.yaml .
```

---

## 📂 Project Structure

```
electionguide-ai/
├── src/
│   ├── app.js                    # Express application factory
│   ├── server.js                 # Server startup + graceful shutdown
│   ├── config/
│   │   ├── index.js              # Centralized configuration
│   │   └── gemini.js             # Gemini model initialization
│   ├── middleware/
│   │   ├── security.js           # Helmet + CSP + CORS + Permissions-Policy
│   │   ├── rateLimiter.js        # Rate limiting (100 req/15min)
│   │   ├── requestLogger.js      # Cloud Logging structured format
│   │   ├── validator.js          # Joi input validation
│   │   └── errorHandler.js       # Cloud Error Reporting format
│   ├── services/
│   │   ├── geminiService.js      # Gemini API with responseSchema
│   │   ├── intentRouter.js       # Deterministic regex classifier
│   │   ├── contextManager.js     # Session + slot extraction
│   │   ├── knowledgeService.js   # Knowledge base with indexed FAQ
│   │   ├── checklistGenerator.js # Personalized action checklists
│   │   ├── readinessAssessor.js  # 0-100 voter readiness score
│   │   ├── qualityScorecard.js   # Rubric-aligned engineering evidence
│   │   ├── calendarService.js    # Google Calendar deep links
│   │   ├── safetyFilter.js       # 3-layer safety pipeline
│   │   └── cacheService.js       # LRU response cache
│   ├── data/
│   │   └── electionKnowledge.json # ECI-verified knowledge base
│   └── utils/
│       ├── constants.js          # Frozen application constants
│       └── errors.js             # Typed error hierarchy
├── public/
│   ├── index.html                # SPA with WCAG 2.1 AA compliance
│   ├── manifest.webmanifest      # Installable PWA metadata
│   ├── sw.js                     # Offline app shell service worker
│   ├── icons/
│   │   └── icon.svg              # PWA icon (any + maskable)
│   ├── css/style.css             # Design system with CSS custom properties
│   └── js/
│       ├── app.js                # Accessibility + topics + SW registration
│       └── chat.js               # Chat interface + calendar rendering
├── tests/
│   ├── setup.js                  # Jest setup with Gemini mocks
│   ├── unit/                     # Unit tests (12 suites)
│   ├── integration/              # API integration tests (5 suites)
│   ├── scenario/                 # End-to-end scenario tests (5 suites)
│   └── frontend/                 # HTML/CSS/JS/SW smoke tests (1 suite)
├── Dockerfile                    # Multi-stage with tini + non-root user
├── cloudbuild.yaml               # Cloud Build CI/CD pipeline
├── eslint.config.js              # ESLint flat config (server, tests, public, SW)
├── SECURITY.md                   # Security policy + vulnerability reporting
├── .eslintrc.json                # Legacy ESLint config (deprecated)
├── .prettierrc                   # Prettier formatting config
├── .env.example                  # Environment template
└── package.json                  # Dependencies + scripts + coverage config
```

---

## 📊 Test Coverage

- **418 tests** across **23 suites** (unit, integration, scenario, frontend)
- **91%+ statement coverage**, 80%+ branch coverage
- Coverage thresholds enforced: ≥89% statements/lines, ≥90% functions, ≥80% branches
- Tests cover: security headers, signed stateless sessions, injection patterns, accessibility, API contracts, error handling, service worker behavior, quality scorecard
- No external API calls in tests (fully mocked Gemini)

```bash
npm run test:coverage
```

---

## 🎨 Design System

- **Dark mode** with glassmorphism effects
- **Orange accent** (#FF6B35) with curated color palette
- **Inter typeface** from Google Fonts
- **CSS custom properties** for theming
- **Smooth transitions** with cubic-bezier easing
- **Responsive** breakpoints at 768px and 480px
- **44px minimum** touch targets (WCAG)

---

## 📜 License

ISC License — see [LICENSE](LICENSE) for details.

---

## 🔗 Links

- **Live Demo**: [electionguide-ai-295678535961.us-central1.run.app](https://electionguide-ai-295678535961.us-central1.run.app/)
- **ECI Official**: [eci.gov.in](https://eci.gov.in)
- **Google Gemini**: [ai.google.dev](https://ai.google.dev)

---

> ⚠️ **Disclaimer**: This is an educational tool only. Not legal advice. For official election information, visit [eci.gov.in](https://eci.gov.in).
