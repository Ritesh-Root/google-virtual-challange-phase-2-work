/**
 * ElectionGuide AI — Chat Interface
 * Handles: message sending, response rendering, calendar links, debounce
 */
(function () {
  'use strict';

  // ===== State =====
  var sessionId = localStorage.getItem('eg-sessionId') || null;
  var isLoading = false;
  var debounceTimer = null;
  var DEBOUNCE_MS = 300;

  // ===== DOM References =====
  var chatForm = document.getElementById('chat-form');
  var chatInput = document.getElementById('chat-input');
  var chatMessages = document.getElementById('chat-messages');
  var calendarSection = document.getElementById('calendar-section');
  var calendarLinks = document.getElementById('calendar-links');
  var mapLinkContainer = document.getElementById('map-link-container');
  var quickButtons = document.querySelectorAll('.quick-btn');

  // ===== Initialization =====
  function init() {
    setupFormListener();
    setupQuickButtons();
    addWelcomeMessage();
  }

  // ===== Form Handling =====

  function setupFormListener() {
    if (chatForm) {
      chatForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var message = (chatInput.value || '').trim();
        if (message && !isLoading) {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(function () {
            sendMessage(message);
          }, DEBOUNCE_MS);
        }
      });
    }
  }

  function setupQuickButtons() {
    quickButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var message = this.getAttribute('data-message');
        if (message && !isLoading) {
          sendMessage(message);
        }
      });
    });
  }

  // ===== Send Message =====

  function sendMessage(message) {
    if (isLoading) {
      return;
    }

    // Add user message bubble
    addMessage(message, 'user');
    chatInput.value = '';
    isLoading = true;

    // Accessibility: announce loading state
    if (chatMessages) {
      chatMessages.setAttribute('aria-busy', 'true');
    }
    announceLoading('ElectionGuide AI is thinking...');

    // Show typing indicator
    var typingEl = showTyping();

    // Get user preferences
    var appState = window.ElectionApp ? window.ElectionApp.getState() : {};

    // Send to API
    fetch('/api/v1/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message,
        sessionId: sessionId,
        language: appState.language || 'en',
        detailLevel: appState.detailLevel || 'standard',
      }),
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        removeTyping(typingEl);
        isLoading = false;
        if (chatMessages) {
          chatMessages.setAttribute('aria-busy', 'false');
        }
        announceLoading('');

        if (data.success) {
          sessionId = data.sessionId;
          localStorage.setItem('eg-sessionId', sessionId);
          renderAIResponse(data.data);
        } else {
          addErrorMessage(data.error ? data.error.message : 'Something went wrong');
        }
      })
      .catch(function (err) {
        removeTyping(typingEl);
        isLoading = false;
        if (chatMessages) {
          chatMessages.setAttribute('aria-busy', 'false');
        }
        announceLoading('');
        addErrorMessage('Network error. Please check your connection.');
        console.error('Chat error:', err);
      });
  }

  // ===== Message Rendering =====

  function addWelcomeMessage() {
    if (!chatMessages) {
      return;
    }
    var div = document.createElement('div');
    div.className = 'message message-ai';
    div.innerHTML =
      '<div class="message-summary">🗳️ Welcome to <strong>ElectionGuide AI</strong>! ' +
      "I'm here to help you understand the Indian election process. " +
      'Ask me anything or click a topic above to get started!</div>';
    chatMessages.appendChild(div);
  }

  function addMessage(text, type) {
    if (!chatMessages) {
      return;
    }
    var div = document.createElement('div');
    div.className = 'message message-' + type;
    div.textContent = text;
    chatMessages.appendChild(div);
    scrollToBottom();
  }

  function addErrorMessage(text) {
    if (!chatMessages) {
      return;
    }
    var div = document.createElement('div');
    div.className = 'message message-ai';
    div.innerHTML = '<div class="message-summary" style="color: var(--danger);">⚠️ ' + escapeHtml(text) + '</div>';
    chatMessages.appendChild(div);
    scrollToBottom();
  }

  function renderAIResponse(data) {
    if (!chatMessages) {
      return;
    }

    var div = document.createElement('div');
    div.className = 'message message-ai';
    var html = '';

    // Answer summary
    if (data.answer_summary) {
      html += '<div class="message-summary">' + escapeHtml(data.answer_summary) + '</div>';
    }

    // Deterministic voter readiness score
    var readinessWidget = data.widgets && data.widgets.readiness;
    if (readinessWidget && typeof readinessWidget.score === 'number') {
      var readinessScore = Math.max(0, Math.min(100, Math.round(readinessWidget.score)));
      html +=
        '<div class="readiness-meter" aria-label="Voter readiness score ' +
        readinessScore +
        ' out of 100">' +
        '<div class="readiness-meter-header"><span>Voter readiness</span><strong>' +
        readinessScore +
        '/100</strong></div>' +
        '<div class="readiness-track"><div class="readiness-fill" style="width:' +
        readinessScore +
        '%"></div></div>' +
        '<div class="readiness-status">' +
        escapeHtml(readinessWidget.status || 'Readiness checked') +
        '</div></div>';
    }

    // Detailed explanation (expandable)
    if (data.detailed_explanation) {
      html +=
        '<details style="margin-top: 12px;"><summary style="cursor:pointer; color: var(--primary); font-weight: 500;">📖 View detailed explanation</summary>' +
        '<div style="margin-top: 8px; font-size: 0.9rem; color: var(--text-secondary);">' +
        formatMarkdown(data.detailed_explanation) +
        '</div></details>';
    }

    // Next 3 Actions
    if (data.next_3_actions && data.next_3_actions.length > 0) {
      html += '<div class="message-actions">';
      data.next_3_actions.forEach(function (action) {
        html += '<div class="action-card">' + escapeHtml(action) + '</div>';
      });
      html += '</div>';
    }

    // Calendar links (special rendering)
    if (data.calendarLinks && data.calendarLinks.length > 0) {
      renderCalendarSection(data.calendarLinks, data.mapLink);
    }

    // Confidence badge
    if (data.confidence) {
      html +=
        '<span class="confidence-badge confidence-' +
        escapeHtml(data.confidence) +
        '">' +
        escapeHtml(data.confidence) +
        ' confidence</span>';
    }

    // Sources
    if (data.sources && data.sources.length > 0) {
      html += '<div class="message-sources">📚 Sources: ';
      data.sources.forEach(function (source, i) {
        if (i > 0) {
          html += ' • ';
        }
        html +=
          '<a href="' +
          escapeHtml(source.url) +
          '" target="_blank" rel="noopener noreferrer">' +
          escapeHtml(source.title) +
          '</a>';
      });
      html += '</div>';
    }

    // Follow-up suggestions
    if (data.follow_up_suggestions && data.follow_up_suggestions.length > 0) {
      html += '<div class="follow-up-chips">';
      data.follow_up_suggestions.forEach(function (suggestion) {
        html +=
          '<button class="follow-up-chip" data-message="' +
          escapeHtml(suggestion) +
          '">' +
          escapeHtml(suggestion) +
          '</button>';
      });
      html += '</div>';
    }

    // Disclaimer
    if (data.disclaimer) {
      html += '<div class="message-disclaimer">⚠️ ' + escapeHtml(data.disclaimer) + '</div>';
    }

    div.innerHTML = html;

    // Wire up follow-up chips
    div.querySelectorAll('.follow-up-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var msg = this.getAttribute('data-message');
        if (msg) {
          sendMessage(msg);
        }
      });
    });

    chatMessages.appendChild(div);
    scrollToBottom();

    // Accessibility: focus management — move focus to new response
    div.setAttribute('tabindex', '-1');
    div.focus({ preventScroll: true });

    // Screen reader announcement
    if (window.ElectionApp) {
      window.ElectionApp.announce('Response received from ElectionGuide AI');
    }
  }

  // ===== Calendar Rendering =====

  function renderCalendarSection(links, mapLink) {
    if (!calendarSection || !calendarLinks) {
      return;
    }

    calendarSection.removeAttribute('hidden');
    calendarLinks.innerHTML = '';

    links.forEach(function (item) {
      var card = document.createElement('div');
      card.className = 'calendar-card';
      card.innerHTML =
        '<div class="calendar-card-info">' +
        '<h3>' +
        escapeHtml(item.title) +
        '</h3>' +
        '<p>' +
        escapeHtml(item.description) +
        '</p></div>' +
        '<a href="' +
        escapeHtml(item.link) +
        '" target="_blank" rel="noopener noreferrer" ' +
        'class="calendar-add-btn" aria-label="Add ' +
        escapeHtml(item.title) +
        ' to Google Calendar">' +
        '📅 Add to Calendar</a>';
      calendarLinks.appendChild(card);
    });

    if (mapLink && mapLinkContainer) {
      mapLinkContainer.innerHTML =
        '<a href="' +
        escapeHtml(mapLink) +
        '" target="_blank" rel="noopener noreferrer" ' +
        'class="map-btn" aria-label="Find your polling booth on Google Maps">' +
        '📍 Find Polling Booth on Google Maps</a>';
    }

    // Scroll to calendar section
    calendarSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ===== Typing Indicator =====

  function showTyping() {
    if (!chatMessages) {
      return null;
    }
    var div = document.createElement('div');
    div.className = 'typing-indicator';
    div.setAttribute('aria-label', 'ElectionGuide AI is thinking');
    div.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    chatMessages.appendChild(div);
    scrollToBottom();
    return div;
  }

  function removeTyping(el) {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }

  // ===== Utilities =====

  /** Announce loading state to screen readers via the dedicated loading-status element. */
  function announceLoading(text) {
    var loadingStatus = document.getElementById('loading-status');
    if (loadingStatus) {
      loadingStatus.textContent = text;
    }
  }

  function scrollToBottom() {
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  function escapeHtml(text) {
    if (!text) {
      return '';
    }
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  /** Basic markdown to HTML for detailed explanations. */
  function formatMarkdown(text) {
    if (!text) {
      return '';
    }
    return escapeHtml(text)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.*?)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  // ===== Exports =====
  window.ElectionChat = {
    sendMessage: sendMessage,
  };

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
