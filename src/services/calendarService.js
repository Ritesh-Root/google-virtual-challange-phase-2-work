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
  generateElectionReminders(context, options = {}) {
    const stateText = context?.location?.state || 'your constituency';
    const now = options.now instanceof Date ? options.now : new Date();
    const electionDate = this._resolveElectionDate(context, now);
    if (!electionDate) {
      return [];
    }

    const milestones = this._buildMilestones(electionDate, stateText, now);

    return milestones.map((milestone) => ({
      title: milestone.title,
      description: milestone.description,
      date: milestone.date,
      link: this.generateCalendarLink({
        title: milestone.title.replace(/[📋📄🏛️🗳️]/g, '').trim(),
        description: milestone.description,
        date: milestone.date,
      }),
    }));
  }

  /**
   * Generate a Google Maps search link for polling booths.
   * @param {string} [state] - Indian state name for location context
   * @returns {string} Google Maps search URL
   */
  generatePollingBoothMapLink(state) {
    const query = state ? `polling booth ${state} India` : 'polling booth near me India';
    return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  }

  /** @private Format a date string for Google Calendar URL format (YYYYMMDDTHHmmssZ). */
  _formatDate(dateStr) {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid calendar date');
      }
      return this._formatDateRange(date);
    } catch (error) {
      throw new Error(`Cannot format invalid calendar date: ${error.message}`);
    }
  }

  /** @private Format date range for Google Calendar. */
  _formatDateRange(date) {
    const fmt = (d) =>
      d
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '');
    const end = new Date(date);
    end.setHours(end.getHours() + 1);
    return `${fmt(date)}/${fmt(end)}`;
  }

  /** @private Resolve a verified/user-provided election date, or null when unavailable. */
  _resolveElectionDate(context, now) {
    if (context?.electionDate) {
      const date = new Date(`${context.electionDate}T00:00:00Z`);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    if (typeof context?.daysUntilElection === 'number' && context.daysUntilElection >= 0) {
      const date = new Date(now);
      date.setUTCDate(date.getUTCDate() + context.daysUntilElection);
      date.setUTCHours(0, 0, 0, 0);
      return date;
    }

    return null;
  }

  /** @private Build future reminder milestones from a known election date. */
  _buildMilestones(electionDate, stateText, now) {
    const startOfToday = new Date(now);
    startOfToday.setUTCHours(0, 0, 0, 0);

    const daysBefore = (days) => {
      const date = new Date(electionDate);
      date.setUTCDate(date.getUTCDate() - days);
      return date.toISOString().split('T')[0];
    };

    const candidates = [
      {
        title: '📋 Check Voter Registration Status',
        description:
          `Verify your name is on the electoral roll for ${stateText}. ` +
          'Visit voters.eci.gov.in or use the Voter Helpline App.',
        date: daysBefore(30),
      },
      {
        title: '📄 Download Voter Slip',
        description: `Download your voter slip to find your polling booth number and address for ${stateText}.`,
        date: daysBefore(14),
      },
      {
        title: '🏛️ Locate Your Polling Booth',
        description: `Find and visit your designated polling station in ${stateText} before election day.`,
        date: daysBefore(7),
      },
      {
        title: '🗳️ Election Day — Go Vote!',
        description: 'Carry your EPIC/Voter ID. Polling hours are published by ECI for each election.',
        date: electionDate.toISOString().split('T')[0],
      },
    ];

    return candidates.filter((milestone) => new Date(`${milestone.date}T00:00:00Z`) >= startOfToday);
  }
}

module.exports = new CalendarService();
