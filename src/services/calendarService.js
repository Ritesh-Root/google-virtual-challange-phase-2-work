'use strict';

/**
 * Google Calendar deep link generation and Google Maps polling booth search.
 * Uses URL-based integration (no OAuth required) — secure by design.
 * This is a deliberate security decision: we never access user calendar data.
 * @class CalendarService
 */
class CalendarService {
  /**
   * Generate a Google Calendar event creation URL.
   * @param {{ title: string, description: string, date: string, location?: string }} eventData
   * @returns {string} Google Calendar deep link URL
   */
  generateCalendarLink(eventData) {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: eventData.title,
      details: eventData.description,
      dates: this._formatDate(eventData.date),
      location: eventData.location || '',
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  /**
   * Generate reminder links for standard election milestones.
   * @param {Object} context - User context slots
   * @returns {Array<{ title: string, description: string, link: string }>}
   */
  generateElectionReminders(context) {
    const stateText = context?.location?.state || 'your constituency';
    const milestones = [
      {
        title: '📋 Check Voter Registration Status',
        description: `Verify your name is on the electoral roll for ${stateText}. Visit voters.eci.gov.in or use the Voter Helpline App.`,
      },
      {
        title: '📄 Download Voter Slip',
        description: `Download your voter slip to find your polling booth number and address for ${stateText}.`,
      },
      {
        title: '🏛️ Locate Your Polling Booth',
        description: `Find and visit your designated polling station in ${stateText} before election day.`,
      },
      {
        title: '🗳️ Election Day — Go Vote!',
        description: 'Carry your EPIC/Voter ID. Polling hours: 7:00 AM - 6:00 PM. Your vote matters! 🇮🇳',
      },
    ];

    return milestones.map((milestone) => ({
      ...milestone,
      link: this.generateCalendarLink({
        title: milestone.title.replace(/[📋📄🏛️🗳️]/g, '').trim(),
        description: milestone.description,
        date: new Date().toISOString().split('T')[0],
      }),
    }));
  }

  /**
   * Generate a Google Maps search link for polling booths.
   * @param {string} [state] - Indian state name for location context
   * @returns {string} Google Maps search URL
   */
  generatePollingBoothMapLink(state) {
    const query = state
      ? `polling booth ${state} India`
      : 'polling booth near me India';
    return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  }

  /** @private Format a date string for Google Calendar URL format (YYYYMMDDTHHmmssZ). */
  _formatDate(dateStr) {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        // Fallback to today if date is invalid
        const today = new Date();
        return this._formatDateRange(today);
      }
      return this._formatDateRange(date);
    } catch (_error) {
      const today = new Date();
      return this._formatDateRange(today);
    }
  }

  /** @private Format date range for Google Calendar. */
  _formatDateRange(date) {
    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const end = new Date(date);
    end.setHours(end.getHours() + 1);
    return `${fmt(date)}/${fmt(end)}`;
  }
}

module.exports = new CalendarService();
