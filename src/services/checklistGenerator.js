'use strict';
const { VOTER_STATUS, URGENCY_THRESHOLDS, CONFIDENCE } = require('../utils/constants');

/**
 * Generates personalized, deterministic checklists and timelines.
 * SAME INPUT always produces SAME OUTPUT — proves algorithmic logic.
 * @class ChecklistGenerator
 */
class ChecklistGenerator {
  /**
   * Generate a personalized action checklist based on user context.
   * @param {Object} context - User's context slots
   * @returns {{ actions: Array, urgencyLevel: string, confidence: string, totalSteps: number }}
   */
  generate(context) {
    // Underage check
    if (context.age !== null && context.age !== undefined && context.age < 18) {
      return this._underageResponse(context.age);
    }

    const actions = [];

    // Registration actions for first-time or unknown voters
    if (context.voterStatus === VOTER_STATUS.FIRST_TIME || context.voterStatus === VOTER_STATUS.UNKNOWN) {
      actions.push(...this._registrationActions(context));
    }

    // NRI-specific actions
    if (context.voterStatus === VOTER_STATUS.NRI) {
      actions.push(...this._nriActions());
    }

    // Pre-election preparation for all voters
    actions.push(...this._preElectionActions());

    // Voting day actions for all voters
    actions.push(...this._votingDayActions());

    // Apply urgency based on days remaining
    const urgencyLevel = this._calculateUrgency(context.daysUntilElection);
    const sortedActions = this._sortByUrgency(actions, urgencyLevel);

    return {
      actions: sortedActions,
      urgencyLevel,
      confidence: CONFIDENCE.HIGH,
      totalSteps: sortedActions.length,
    };
  }

  /**
   * Generate the standard election timeline.
   * @param {string} [electionType] - National, state, or local
   * @returns {{ phases: Array, confidence: string }}
   */
  generateTimeline(electionType) {
    const electionData = require('../data/electionKnowledge.json');
    const timeline = electionData.topics.election_timeline;
    return {
      phases: timeline ? timeline.phases : [],
      electionType: electionType || 'general',
      confidence: CONFIDENCE.HIGH,
    };
  }

  /** @private Generate registration steps. */
  _registrationActions(context) {
    const stateText = context.location?.state ? ` in ${context.location.state}` : '';
    return [
      { priority: 1, action: `Check if you're already on the electoral roll at voters.eci.gov.in`, category: 'registration', completed: false },
      { priority: 2, action: `Fill Form 6 for new voter registration (online at voters.eci.gov.in or via Voter Helpline App)`, category: 'registration', completed: false },
      { priority: 3, action: `Prepare documents: proof of identity, age, and address${stateText}`, category: 'registration', completed: false },
      { priority: 4, action: 'Submit form and note your reference number for tracking', category: 'registration', completed: false },
      { priority: 5, action: 'Wait for Booth Level Officer (BLO) verification visit — keep documents ready', category: 'registration', completed: false },
    ];
  }

  /** @private Generate NRI-specific steps. */
  _nriActions() {
    return [
      { priority: 1, action: 'Register via Form 6A at voters.eci.gov.in', category: 'nri', completed: false },
      { priority: 2, action: 'Provide valid Indian passport details', category: 'nri', completed: false },
      { priority: 3, action: 'Check e-postal ballot eligibility for your constituency', category: 'nri', completed: false },
    ];
  }

  /** @private Generate pre-election preparation steps. */
  _preElectionActions() {
    return [
      { priority: 10, action: 'Download voter slip from voters.eci.gov.in (available ~2 weeks before election)', category: 'preparation', completed: false },
      { priority: 11, action: 'Locate your polling booth address from the voter slip or Voter Helpline App', category: 'preparation', completed: false },
      { priority: 12, action: 'Ensure your EPIC (Voter ID) or authorized photo ID is accessible and not expired', category: 'preparation', completed: false },
    ];
  }

  /** @private Generate voting day steps. */
  _votingDayActions() {
    return [
      { priority: 20, action: 'Carry your EPIC/Voter ID (or authorized photo ID) to the polling station', category: 'voting_day', completed: false },
      { priority: 21, action: 'Queue up, present your ID, receive ink mark, and cast your vote on the EVM', category: 'voting_day', completed: false },
      { priority: 22, action: 'Verify your vote on the VVPAT screen (displayed for ~7 seconds)', category: 'voting_day', completed: false },
    ];
  }

  /** @private Generate response for underage users. */
  _underageResponse(age) {
    const yearsLeft = 18 - age;
    return {
      actions: [
        { priority: 1, action: `You'll be eligible to vote in ${yearsLeft} year(s) when you turn 18`, category: 'info', completed: false },
        { priority: 2, action: 'Learn about the electoral process now to be a well-informed future voter', category: 'education', completed: false },
        { priority: 3, action: 'You can pre-register once you turn 17 in some states — check with your local ERO', category: 'preparation', completed: false },
      ],
      urgencyLevel: 'low',
      confidence: CONFIDENCE.HIGH,
      totalSteps: 3,
    };
  }

  /** @private Calculate urgency level from days remaining. */
  _calculateUrgency(daysRemaining) {
    if (daysRemaining === null || daysRemaining === undefined) {
      return 'unknown';
    }
    if (daysRemaining <= URGENCY_THRESHOLDS.CRITICAL) {
      return 'critical';
    }
    if (daysRemaining <= URGENCY_THRESHOLDS.HIGH) {
      return 'high';
    }
    if (daysRemaining <= URGENCY_THRESHOLDS.MEDIUM) {
      return 'medium';
    }
    return 'low';
  }

  /** @private Sort actions: urgent categories first when deadline is near. */
  _sortByUrgency(actions, urgencyLevel) {
    if (urgencyLevel === 'critical' || urgencyLevel === 'high') {
      return [...actions].sort((a, b) => {
        const priorityMap = { voting_day: -2, preparation: -1, registration: 0, nri: 0, info: 1, education: 1 };
        return (priorityMap[a.category] || 0) - (priorityMap[b.category] || 0) || a.priority - b.priority;
      });
    }
    return actions.sort((a, b) => a.priority - b.priority);
  }
}

module.exports = new ChecklistGenerator();
