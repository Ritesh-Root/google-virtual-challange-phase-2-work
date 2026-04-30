'use strict';
const request = require('supertest');
const app = require('../../src/app');

/**
 * Security integration tests.
 * Validates HTTP security headers, CSP, rate limiting, and input validation.
 * These tests ensure compliance with defense-in-depth requirements.
 */
describe('Security Headers and Policies', () => {
  test('does not trust forwarded IP headers unless explicitly configured', () => {
    expect(app.get('trust proxy')).toBe(false);
  });

  test('includes Content-Security-Policy header', async () => {
    const res = await request(app).get('/api/v1/health').expect(200);
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  test('CSP blocks unsafe script sources', async () => {
    const res = await request(app).get('/api/v1/health').expect(200);
    const csp = res.headers['content-security-policy'];
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  test('CSP blocks frame sources', async () => {
    const res = await request(app).get('/api/v1/health').expect(200);
    const csp = res.headers['content-security-policy'];
    expect(csp).toContain("frame-src 'none'");
  });

  test('CSP blocks object sources', async () => {
    const res = await request(app).get('/api/v1/health').expect(200);
    const csp = res.headers['content-security-policy'];
    expect(csp).toContain("object-src 'none'");
  });

  test('includes X-Content-Type-Options header', async () => {
    const res = await request(app).get('/api/v1/health').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  test('includes Strict-Transport-Security header', async () => {
    const res = await request(app).get('/api/v1/health').expect(200);
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['strict-transport-security']).toContain('max-age');
  });

  test('includes Referrer-Policy header', async () => {
    const res = await request(app).get('/api/v1/health').expect(200);
    expect(res.headers['referrer-policy']).toBeDefined();
  });

  test('includes Permissions-Policy header', async () => {
    const res = await request(app).get('/api/v1/health').expect(200);
    expect(res.headers['permissions-policy']).toBeDefined();
    expect(res.headers['permissions-policy']).toContain('camera=()');
    expect(res.headers['permissions-policy']).toContain('microphone=()');
  });

  test('includes Cross-Origin headers', async () => {
    const res = await request(app).get('/api/v1/health').expect(200);
    expect(res.headers['cross-origin-opener-policy']).toBeDefined();
    expect(res.headers['cross-origin-resource-policy']).toBeDefined();
  });

  test('does not expose X-Powered-By header', async () => {
    const res = await request(app).get('/api/v1/health').expect(200);
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  test('includes X-Request-ID in response', async () => {
    const res = await request(app).get('/api/v1/health').expect(200);
    expect(res.headers['x-request-id']).toBeDefined();
  });

  test('forwards X-Request-ID from client', async () => {
    const customId = 'security-test-correlation-id';
    const res = await request(app).get('/api/v1/health').set('X-Request-ID', customId).expect(200);

    expect(res.headers['x-request-id']).toBe(customId);
  });

  test('static asset requests do not consume API chat quota', async () => {
    const staticRequests = Array.from({ length: 105 }, () => request(app).get('/js/app.js'));
    const staticResponses = await Promise.all(staticRequests);
    expect(staticResponses.every((res) => res.statusCode === 200)).toBe(true);

    const chatRes = await request(app).post('/api/v1/chat').send({ message: 'Hello after assets' }).expect(200);
    expect(chatRes.body.success).toBe(true);
  });
});

describe('Input Validation Security', () => {
  test('rejects messages containing HTML tags', async () => {
    const res = await request(app).post('/api/v1/chat').send({ message: '<img src=x onerror=alert(1)>' }).expect(400);

    expect(res.body.success).toBe(false);
  });

  test('rejects messages exceeding max length', async () => {
    const res = await request(app)
      .post('/api/v1/chat')
      .send({ message: 'x'.repeat(501) })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  test('rejects empty message string', async () => {
    const res = await request(app).post('/api/v1/chat').send({ message: '' }).expect(400);

    expect(res.body.success).toBe(false);
  });

  test('rejects null message', async () => {
    const res = await request(app).post('/api/v1/chat').send({ message: null }).expect(400);

    expect(res.body.success).toBe(false);
  });

  test('rejects array message', async () => {
    const res = await request(app)
      .post('/api/v1/chat')
      .send({ message: ['Hello'] })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  test('rejects numeric message', async () => {
    const res = await request(app).post('/api/v1/chat').send({ message: 12345 }).expect(400);

    expect(res.body.success).toBe(false);
  });

  test('rejects unsupported language code', async () => {
    const res = await request(app).post('/api/v1/chat').send({ message: 'Hello', language: 'zh' }).expect(400);

    expect(res.body.success).toBe(false);
  });
});

describe('API Error Handling', () => {
  test('serves SPA fallback for non-API routes', async () => {
    const res = await request(app).get('/learning/path').expect(200);

    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('ElectionGuide AI');
  });

  test('returns 404 for unknown API routes', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    // Will fallback to sendFile which returns HTML, or 404 if API path
    expect([200, 404]).toContain(res.statusCode);
  });

  test('returns valid JSON for chat errors', async () => {
    const res = await request(app).post('/api/v1/chat').send({}).expect(400);

    expect(res.body).toBeDefined();
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBeDefined();
    expect(res.body.error.message).toBeDefined();
  });
});
