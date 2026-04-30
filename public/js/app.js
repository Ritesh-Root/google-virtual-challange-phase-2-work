/**
 * ElectionGuide AI — Main Application Orchestrator
 * Handles: accessibility controls, topics loading, language/theme persistence
 */
(function () {
  'use strict';

  // ===== State =====
  const state = {
    fontSize: parseInt(localStorage.getItem('eg-fontsize') || '16', 10),
    contrast: localStorage.getItem('eg-contrast') || 'normal',
    language: localStorage.getItem('eg-language') || 'en',
    detailLevel: localStorage.getItem('eg-detail') || 'standard',
  };

  // ===== DOM References =====
  const langSelect = document.getElementById('lang-select');
  const detailSelect = document.getElementById('detail-select');
  const fontDecrease = document.getElementById('font-decrease');
  const fontIncrease = document.getElementById('font-increase');
  const contrastToggle = document.getElementById('contrast-toggle');
  const topicGrid = document.getElementById('topic-grid');
  const srAnnouncements = document.getElementById('sr-announcements');

  // ===== Initialization =====
  function init() {
    applyFontSize();
    applyContrast();
    applyLanguage();
    applyDetailLevel();
    loadTopics();
    setupEventListeners();
    setupKeyboardShortcuts();
  }

  // ===== Accessibility =====

  /** Apply stored font size. */
  function applyFontSize() {
    document.documentElement.style.fontSize = state.fontSize + 'px';
  }

  /** Apply stored contrast mode. */
  function applyContrast() {
    document.documentElement.setAttribute('data-contrast', state.contrast);
  }

  /** Apply stored language. */
  function applyLanguage() {
    document.documentElement.lang = state.language;
    if (langSelect) {
      langSelect.value = state.language;
    }
  }

  /** Apply stored detail level. */
  function applyDetailLevel() {
    if (detailSelect) {
      detailSelect.value = state.detailLevel;
    }
  }

  /** Announce UI changes to screen readers. */
  function announce(message) {
    if (srAnnouncements) {
      srAnnouncements.textContent = message;
      setTimeout(function () {
        srAnnouncements.textContent = '';
      }, 1000);
    }
  }

  // ===== Event Listeners =====

  function setupEventListeners() {
    // Font size controls
    if (fontDecrease) {
      fontDecrease.addEventListener('click', function () {
        if (state.fontSize > 14) {
          state.fontSize -= 2;
          localStorage.setItem('eg-fontsize', state.fontSize);
          applyFontSize();
          announce('Font size decreased to ' + state.fontSize + ' pixels');
        }
      });
    }

    if (fontIncrease) {
      fontIncrease.addEventListener('click', function () {
        if (state.fontSize < 24) {
          state.fontSize += 2;
          localStorage.setItem('eg-fontsize', state.fontSize);
          applyFontSize();
          announce('Font size increased to ' + state.fontSize + ' pixels');
        }
      });
    }

    // Contrast toggle
    if (contrastToggle) {
      contrastToggle.addEventListener('click', function () {
        state.contrast = state.contrast === 'normal' ? 'high' : 'normal';
        localStorage.setItem('eg-contrast', state.contrast);
        applyContrast();
        announce('Contrast mode: ' + state.contrast);
      });
    }

    // Language selector
    if (langSelect) {
      langSelect.addEventListener('change', function () {
        state.language = this.value;
        localStorage.setItem('eg-language', state.language);
        document.documentElement.lang = state.language;
        announce('Language changed to ' + (state.language === 'hi' ? 'Hindi' : 'English'));
      });
    }

    // Detail level selector
    if (detailSelect) {
      detailSelect.addEventListener('change', function () {
        state.detailLevel = this.value;
        localStorage.setItem('eg-detail', state.detailLevel);
        announce('Detail level set to ' + state.detailLevel);
      });
    }
  }

  // ===== Keyboard Shortcuts =====

  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function (e) {
      // Ctrl+/ or Cmd+/ to focus chat input
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        var chatInput = document.getElementById('chat-input');
        if (chatInput) {
          chatInput.focus();
          announce('Chat input focused');
        }
      }
    });
  }

  // ===== Topics =====

  /** Load topics from API and render cards. */
  function loadTopics() {
    fetch('/api/v1/topics')
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data.success && data.data && data.data.topics) {
          renderTopics(data.data.topics);
        }
      })
      .catch(function (err) {
        console.error('Failed to load topics:', err);
        // Render fallback topics
        renderFallbackTopics();
      });
  }

  /** Render topic cards from API data. */
  function renderTopics(topics) {
    if (!topicGrid) {
      return;
    }
    topicGrid.innerHTML = '';
    topics.forEach(function (topic) {
      var item = document.createElement('div');
      item.setAttribute('role', 'listitem');

      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'topic-card';
      card.setAttribute('aria-label', 'Learn about: ' + topic.title);
      card.innerHTML =
        '<span class="topic-card-title">' +
        escapeHtml(topic.title) +
        '</span>' +
        '<div class="topic-card-summary">' +
        escapeHtml(topic.summary) +
        '</div>';

      // Click to ask about topic
      card.addEventListener('click', function () {
        if (window.ElectionChat) {
          window.ElectionChat.sendMessage('Tell me about ' + topic.title.replace(/[🗳️📋📅🏛️⚖️]/g, '').trim());
        }
      });

      item.appendChild(card);
      topicGrid.appendChild(item);
    });
  }

  /** Render fallback topics when API is unavailable. */
  function renderFallbackTopics() {
    var fallback = [
      { title: '🗳️ Voter Eligibility', summary: 'Who can vote in Indian elections' },
      { title: '📋 Voter Registration', summary: 'How to register as a voter' },
      { title: '📅 Election Timeline', summary: 'The 9 phases of an election' },
      { title: '🏛️ Polling Day Process', summary: 'What happens when you vote' },
      { title: '⚖️ Voter Rights', summary: 'Your democratic rights' },
    ];
    renderTopics(fallback);
  }

  /** Escape HTML to prevent XSS. */
  function escapeHtml(text) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  // ===== Exports =====
  window.ElectionApp = {
    getState: function () {
      return Object.assign({}, state);
    },
    announce: announce,
    escapeHtml: escapeHtml,
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
