# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 1.0.x   | ✅ Active support   |

## Security Architecture

ElectionGuide AI implements a **3-layer defense-in-depth** security model:

### Layer 1: Deterministic Pre-filter (Input)
- 30+ regex patterns detecting prompt injection, encoding attacks, and role-play bypass
- Hindi language injection detection
- Political bias detection and impartial redirect
- Applied to ALL incoming messages before any AI processing

### Layer 2: Gemini Safety Settings (AI)
- `BLOCK_LOW_AND_ABOVE` on all 4 harm categories:
  - Harassment, Hate Speech, Sexually Explicit, Dangerous Content
- Native `responseSchema` enforcement ensures valid JSON output

### Layer 3: Output Sanitization (Response)
- HTML tag stripping on all text fields
- Source URL protocol validation (https/http only)
- Mandatory legal disclaimer injection
- XSS prevention across all response fields

### Infrastructure Security
- **Helmet.js** with strict Content-Security-Policy
- **Permissions-Policy** restricting camera, microphone, geolocation, payment
- **HSTS** with 1-year max-age, includeSubDomains, preload
- **Rate limiting** — 100 requests/15min per IP
- **Body size limit** — 10KB max request body
- **Joi validation** on all endpoints
- **Docker** — multi-stage build with non-root user
- **CORS** — configurable allowed origins

## Reporting a Vulnerability

If you discover a security vulnerability, please:

1. **Do NOT** open a public issue
2. Email: security@electionguide-ai.example.com
3. Include: description, steps to reproduce, potential impact
4. We will respond within 48 hours

## API Key Security

- API keys are loaded from environment variables only
- `.env` is in `.gitignore` — never committed
- `.env.example` provides template without real keys
- API key format validation at startup
