'use strict';
const fs = require('fs');
const path = require('path');

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

  test('has main landmark role', () => {
    expect(html).toContain('role="main"');
  });

  test('has banner role on header', () => {
    expect(html).toContain('role="banner"');
  });

  test('has contentinfo role on footer', () => {
    expect(html).toContain('role="contentinfo"');
  });
});
