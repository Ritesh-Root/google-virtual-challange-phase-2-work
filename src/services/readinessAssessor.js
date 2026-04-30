'use strict';
const { CONFIDENCE, VOTER_STATUS } = require('../utils/constants');

/**
 * Deterministic voter readiness scoring.
 * Converts known session slots into a simple 0-100 action-readiness score.
 *
 * @class ReadinessAssessor
 */
class ReadinessAssessor {
  /**
   * Assess how ready the user is to vote.
   *
   * @param {Object} context - Session slots
   * @returns {Object} Readiness score, blockers, verified factors, and next actions
   */
  assess(context) {
    const slots = context || {};
    const blockers = [];
    const hardBlockers = [];
    const recommendations = [];
    const verified = [];
    let score = 0;

    const age = slots.age;
    if (typeof age === 'number') {
      if (age >= 18) {
        score += 25;
        verified.push('Age requirement confirmed: 18 or older.');
      } else {
        const blocker = `You need to wait ${18 - age} more year(s) before voter registration.`;
        hardBlockers.push(blocker);
        blockers.push(blocker);
      }
    } else {
      recommendations.push('Confirm your age against the 18+ voter eligibility requirement.');
      score += 10;
    }

    if (slots.voterStatus === VOTER_STATUS.REGISTERED) {
      score += 30;
      verified.push('Registration status: already registered.');
    } else if (slots.voterStatus === VOTER_STATUS.FIRST_TIME) {
      score += 12;
      blockers.push('Complete Form 6 registration before the electoral roll deadline.');
    } else if (slots.voterStatus === VOTER_STATUS.NRI) {
      score += 15;
      blockers.push('Complete Form 6A as an overseas elector and verify passport details.');
    } else {
      recommendations.push('Check whether your name already appears in the electoral roll.');
      score += 8;
    }

    if (slots.location?.state) {
      score += 15;
      verified.push(`State context captured: ${slots.location.state}.`);
    } else {
      recommendations.push('Add your state so polling booth and timeline guidance can be localized.');
      score += 5;
    }

    if (typeof slots.daysUntilElection === 'number') {
      if (slots.daysUntilElection <= 7 && slots.voterStatus !== VOTER_STATUS.REGISTERED) {
        blockers.push('Election is very close; prioritize checking your roll status and booth details immediately.');
        score += 5;
      } else if (slots.daysUntilElection <= 14) {
        score += 10;
        recommendations.push('Download your voter slip and confirm polling booth details now.');
      } else {
        score += 15;
        verified.push('There is enough time to complete remaining preparation steps.');
      }
    } else {
      recommendations.push('Add the election date or days remaining to calculate urgency.');
      score += 7;
    }

    score = Math.max(0, Math.min(100, score));
    if (hardBlockers.length > 0) {
      score = Math.min(score, 35);
    }

    return {
      readinessScore: score,
      statusLabel: this._statusLabel(score, blockers, hardBlockers),
      blockers,
      verified,
      recommendations,
      nextActions: this._nextActions(blockers, recommendations),
      confidence: this._confidence(slots, hardBlockers),
    };
  }

  /**
   * Convert score into a short status label.
   *
   * @private
   * @param {number} score - Readiness score
   * @param {string[]} blockers - Blocking issues
   * @param {string[]} hardBlockers - Blocking issues that make voting impossible now
   * @returns {string} Status label
   */
  _statusLabel(score, blockers, hardBlockers) {
    if (hardBlockers.length > 0) {
      return 'Not ready yet';
    }
    if (blockers.length > 0 && score < 70) {
      return 'Needs action';
    }
    if (score >= 85) {
      return 'Ready';
    }
    if (score >= 65) {
      return 'Almost ready';
    }
    if (score >= 40) {
      return 'Needs action';
    }
    return 'Not ready yet';
  }

  /**
   * Pick the highest-value next actions.
   *
   * @private
   * @param {string[]} blockers - Blocking issues
   * @param {string[]} recommendations - Non-blocking recommendations
   * @returns {string[]} Up to three next actions
   */
  _nextActions(blockers, recommendations) {
    const actions = [...blockers, ...recommendations].slice(0, 3);
    if (actions.length > 0) {
      return actions;
    }
    return [
      'Download your voter slip when available.',
      'Confirm your polling booth before election day.',
      'Carry EPIC or another accepted photo ID to the polling station.',
    ];
  }

  /**
   * Estimate confidence from provided context.
   *
   * @private
   * @param {Object} slots - Session slots
   * @param {string[]} hardBlockers - Blocking issues that make voting impossible now
   * @returns {string} Confidence level
   */
  _confidence(slots, hardBlockers) {
    if (hardBlockers.length > 0) {
      return CONFIDENCE.HIGH;
    }
    if (typeof slots.age === 'number' && slots.voterStatus !== VOTER_STATUS.UNKNOWN && slots.location?.state) {
      return CONFIDENCE.HIGH;
    }
    return CONFIDENCE.MEDIUM;
  }
}

module.exports = new ReadinessAssessor();
