'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Frontend HTML smoke tests', () => {
  let html;

  beforeAll(() => {
    html = fs.readFileSync(path.join(__dirname, '../../public/index.html'), 'utf-8');
  });

  test('has single <h1> tag', () => {
    const matches = html.match(/<h1[\s>]/g);
    expect(matches).toHaveLength(1);
  });

  test('has lang attribute on <html>', () => {
    expect(html).toMatch(/<html[^>]+lang="/);
  });

  test('has meta description', () => {
    expect(html).toMatch(/<meta[^>]+name="description"/);
  });

  test('has meta viewport', () => {
    expect(html).toMatch(/<meta[^>]+name="viewport"/);
  });

  test('has theme-color meta', () => {
    expect(html).toMatch(/<meta[^>]+name="theme-color"/);
  });

  test('has Open Graph tags', () => {
    expect(html).toMatch(/<meta[^>]+property="og:title"/);
    expect(html).toMatch(/<meta[^>]+property="og:description"/);
  });

  test('has skip-to-content link', () => {
    expect(html).toContain('skip-link');
    expect(html).toContain('#main-content');
  });

  test('chat input has aria-label', () => {
    expect(html).toMatch(/id="chat-input"[^>]*aria-label/);
  });

  test('chat messages area has aria-live', () => {
    expect(html).toMatch(/id="chat-messages"[^>]*aria-live/);
  });

  test('has screen reader announcements region', () => {
    expect(html).toContain('sr-announcements');
    expect(html).toContain('aria-live="assertive"');
  });

  test('has footer with ECI attribution', () => {
    expect(html).toContain('eci.gov.in');
  });

  test('has Google Fonts import', () => {
    expect(html).toContain('fonts.googleapis.com');
  });

  test('has proper heading hierarchy (h1 then h2)', () => {
    const h1Index = html.indexOf('<h1');
    const h2Index = html.indexOf('<h2');
    expect(h1Index).toBeLessThan(h2Index);
  });

  test('no inline scripts (CSP compliance)', () => {
    const inlineScripts = html.match(/<script(?![^>]*src)[^>]*>[\s\S]*?<\/script>/g);
    expect(inlineScripts).toBeNull();
  });

  test('all external links have rel="noopener"', () => {
    const externalLinks = html.match(/target="_blank"[^>]*/g) || [];
    externalLinks.forEach((link) => {
      expect(link).toContain('noopener');
    });
  });

  test('form has unique id', () => {
    expect(html).toContain('id="chat-form"');
  });

  test('send button has aria-label', () => {
    expect(html).toMatch(/id="chat-send"[^>]*aria-label/);
  });

  test('has banner role on header', () => {
    expect(html).toContain('role="banner"');
  });

  test('has contentinfo role on footer', () => {
    expect(html).toContain('role="contentinfo"');
  });

  // ===== NEW ACCESSIBILITY TESTS =====

  test('has nav landmark for site controls', () => {
    expect(html).toMatch(/<nav[^>]+aria-label="Site controls"/);
  });

  test('has nav landmark for quick start', () => {
    expect(html).toMatch(/<nav[^>]+aria-label="Quick start questions"/);
  });

  test('has aria-labelledby on sections', () => {
    expect(html).toMatch(/aria-labelledby="hero-title"/);
    expect(html).toMatch(/aria-labelledby="topics-title"/);
    expect(html).toMatch(/aria-labelledby="chat-title"/);
    expect(html).toMatch(/aria-labelledby="calendar-title"/);
  });

  test('has aria-roledescription on chat container', () => {
    expect(html).toContain('aria-roledescription="Interactive election education chatbot"');
  });

  test('uses hidden attribute instead of display:none for calendar section', () => {
    expect(html).toMatch(/<section[^>]+id="calendar-section"[^>]+hidden/);
  });

  test('has screen reader warning for external links', () => {
    expect(html).toContain('opens in new tab');
  });

  test('has lang attribute on language options', () => {
    expect(html).toMatch(/lang="en"/);
    expect(html).toMatch(/lang="hi"/);
  });

  test('quick start buttons have type="button"', () => {
    const quickBtns = html.match(/<button[^>]*class="quick-btn"[^>]*/g) || [];
    expect(quickBtns.length).toBeGreaterThan(0);
    quickBtns.forEach((btn) => {
      expect(btn).toContain('type="button"');
    });
  });

  test('has voter readiness quick start action', () => {
    expect(html).toContain('id="qs-readiness"');
    expect(html).toContain('Check readiness');
  });

  test('accessibility buttons have type="button"', () => {
    const a11yBtns = html.match(/<button[^>]*class="a11y-btn"[^>]*/g) || [];
    expect(a11yBtns.length).toBeGreaterThan(0);
    a11yBtns.forEach((btn) => {
      expect(btn).toContain('type="button"');
    });
  });

  test('chat input has explicit label', () => {
    expect(html).toMatch(/<label[^>]+for="chat-input"/);
  });

  test('has aria-relevant on chat messages', () => {
    expect(html).toContain('aria-relevant="additions"');
  });

  test('topic grid has role="list"', () => {
    expect(html).toMatch(/id="topic-grid"[^>]*role="list"/);
  });

  test('chat input has enterkeyhint', () => {
    expect(html).toContain('enterkeyhint="send"');
  });

  test('has canonical URL meta tag', () => {
    expect(html).toMatch(/<link[^>]+rel="canonical"/);
  });

  test('links a web app manifest', () => {
    expect(html).toMatch(/<link[^>]+rel="manifest"/);
    expect(html).toContain('/manifest.webmanifest');
  });

  test('has Twitter card meta tags', () => {
    expect(html).toMatch(/<meta[^>]+name="twitter:card"/);
  });

  test('has author meta tag', () => {
    expect(html).toMatch(/<meta[^>]+name="author"/);
  });

  test('has keywords meta tag', () => {
    expect(html).toMatch(/<meta[^>]+name="keywords"/);
  });

  test('has og:site_name meta tag', () => {
    expect(html).toMatch(/<meta[^>]+property="og:site_name"/);
  });

  test('accessibility controls grouped with role="group"', () => {
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Accessibility controls"');
  });

  test('send icon has aria-hidden="true"', () => {
    expect(html).toContain('aria-hidden="true">➤');
  });

  test('mentions Google Gemini in footer', () => {
    expect(html).toContain('Google Gemini');
  });

  test('mentions Google Cloud Run in footer', () => {
    expect(html).toContain('Google Cloud Run');
  });

  test('mentions Google Fonts in footer', () => {
    expect(html).toContain('Google Fonts');
  });

  test('mentions offline service worker shell in footer', () => {
    expect(html).toContain('service worker');
  });
});

describe('Frontend CSS smoke tests', () => {
  let css;

  beforeAll(() => {
    css = fs.readFileSync(path.join(__dirname, '../../public/css/style.css'), 'utf-8');
  });

  test('has CSS custom properties (design system)', () => {
    expect(css).toContain('--primary:');
    expect(css).toContain('--bg-primary:');
    expect(css).toContain('--text-primary:');
  });

  test('has high contrast mode', () => {
    expect(css).toContain('data-contrast="high"');
  });

  test('has reduced motion media query', () => {
    expect(css).toContain('prefers-reduced-motion');
  });

  test('has minimum 44px touch targets', () => {
    expect(css).toContain('min-height: 44px');
  });

  test('has responsive breakpoints', () => {
    expect(css).toContain('@media (max-width: 768px)');
    expect(css).toContain('@media (max-width: 480px)');
  });

  test('has focus-visible styles', () => {
    expect(css).toContain(':focus-visible');
  });

  test('has skip-link styles', () => {
    expect(css).toContain('.skip-link');
  });

  test('has sr-only utility class', () => {
    expect(css).toContain('.sr-only');
  });

  test('uses Inter font family', () => {
    expect(css).toContain("'Inter'");
  });

  test('has glassmorphism effect', () => {
    expect(css).toContain('backdrop-filter');
    expect(css).toContain('blur');
  });

  test('has smooth transitions', () => {
    expect(css).toContain('cubic-bezier');
  });

  test('has typing indicator animation', () => {
    expect(css).toContain('typingBounce');
  });
});

describe('Frontend JS smoke tests', () => {
  let appJs, chatJs;

  beforeAll(() => {
    appJs = fs.readFileSync(path.join(__dirname, '../../public/js/app.js'), 'utf-8');
    chatJs = fs.readFileSync(path.join(__dirname, '../../public/js/chat.js'), 'utf-8');
  });

  test('app.js uses strict mode', () => {
    expect(appJs).toContain("'use strict'");
  });

  test('chat.js uses strict mode', () => {
    expect(chatJs).toContain("'use strict'");
  });

  test('app.js exports ElectionApp', () => {
    expect(appJs).toContain('window.ElectionApp');
  });

  test('chat.js exports ElectionChat', () => {
    expect(chatJs).toContain('window.ElectionChat');
  });

  test('app.js has XSS protection (escapeHtml)', () => {
    expect(appJs).toContain('escapeHtml');
  });

  test('chat.js has XSS protection (escapeHtml)', () => {
    expect(chatJs).toContain('escapeHtml');
  });

  test('chat.js debounces form submission', () => {
    expect(chatJs).toContain('debounce');
  });

  test('app.js manages accessibility state', () => {
    expect(appJs).toContain('fontSize');
    expect(appJs).toContain('contrast');
  });

  test('app.js has keyboard shortcuts', () => {
    expect(appJs).toContain('keydown');
  });

  test('app.js registers service worker safely', () => {
    expect(appJs).toContain('serviceWorker');
    expect(appJs).toContain('isSecureContext');
    expect(appJs).toContain('/sw.js');
  });

  test('chat.js manages session state', () => {
    expect(chatJs).toContain('sessionId');
  });

  test('chat.js handles loading states', () => {
    expect(chatJs).toContain('aria-busy');
  });

  test('chat.js renders voter readiness meter', () => {
    expect(chatJs).toContain('readiness-meter');
    expect(chatJs).toContain('widgets');
    expect(chatJs).toContain('readinessWidget');
  });

  test('chat.js has focus management', () => {
    expect(chatJs).toContain('focus');
  });
});

describe('Frontend service worker smoke tests', () => {
  let sw, manifest;

  beforeAll(() => {
    sw = fs.readFileSync(path.join(__dirname, '../../public/sw.js'), 'utf-8');
    manifest = fs.readFileSync(path.join(__dirname, '../../public/manifest.webmanifest'), 'utf-8');
  });

  test('service worker caches static app shell only', () => {
    expect(sw).toContain('STATIC_ASSETS');
    expect(sw).toContain('/css/style.css');
    expect(sw).toContain('/js/app.js');
    expect(sw).toContain('/js/chat.js');
    expect(sw).toContain('STATIC_ASSET_PATHS.has(url.pathname)');
  });

  test('service worker avoids caching API responses', () => {
    const harness = createServiceWorkerHarness(sw);
    const event = createFetchEvent('https://electionguide.test/api/v1/topics');

    harness.listeners.fetch(event);

    expect(event.respondWith).not.toHaveBeenCalled();
    expect(harness.fetch).not.toHaveBeenCalled();
  });

  test('service worker ignores non-shell same-origin routes', () => {
    const harness = createServiceWorkerHarness(sw);
    const event = createFetchEvent('https://electionguide.test/reports/latest');

    harness.listeners.fetch(event);

    expect(event.respondWith).not.toHaveBeenCalled();
    expect(harness.fetch).not.toHaveBeenCalled();
  });

  test('service worker refreshes shell assets before returning them', async () => {
    const harness = createServiceWorkerHarness(sw);
    const event = createFetchEvent('https://electionguide.test/js/app.js');

    harness.listeners.fetch(event);
    const response = await event.responsePromise;

    expect(response.ok).toBe(true);
    expect(harness.fetch).toHaveBeenCalledWith(event.request, { cache: 'no-cache' });
    expect(harness.cache.put).toHaveBeenCalledWith(event.request, response);
  });

  test('manifest declares standalone educational app metadata', () => {
    const parsed = JSON.parse(manifest);
    expect(parsed.name).toBe('ElectionGuide AI');
    expect(parsed.display).toBe('standalone');
    expect(parsed.categories).toContain('education');
  });
});

function createServiceWorkerHarness(swSource) {
  const listeners = {};
  const cache = {
    addAll: jest.fn().mockResolvedValue(undefined),
    match: jest.fn().mockResolvedValue({ ok: true, cached: true }),
    put: jest.fn().mockResolvedValue(undefined),
  };
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    clone() {
      return this;
    },
  });
  const context = {
    caches: {
      open: jest.fn().mockResolvedValue(cache),
      keys: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue(true),
    },
    fetch: fetchMock,
    self: {
      clients: {
        claim: jest.fn().mockResolvedValue(undefined),
      },
      location: {
        origin: 'https://electionguide.test',
      },
      addEventListener(type, handler) {
        listeners[type] = handler;
      },
    },
    Set,
    URL,
  };

  vm.runInNewContext(swSource, context);

  return { cache, fetch: fetchMock, listeners };
}

function createFetchEvent(url) {
  const event = {
    request: {
      method: 'GET',
      url,
    },
    respondWith: jest.fn((promise) => {
      event.responsePromise = promise;
    }),
    waitUntil: jest.fn(),
  };

  return event;
}
