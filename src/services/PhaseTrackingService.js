/**
 * PHASE TRACKING SERVICE
 *
 * Tracks which phase the business is in:
 * - Research Phase: Day 1-7 of testing
 * - Production Phase: Live outreach to customers
 *
 * Stores phase data in data/phase-tracking.json
 */

const fs = require('fs').promises;
const path = require('path');

class PhaseTrackingService {
  constructor(logger) {
    this.logger = logger || console;
    this.trackingFile = path.join(__dirname, '../../data/phase-tracking.json');
    this.phaseData = null;
  }

  /**
   * Initialize - load or create phase tracking
   */
  async initialize() {
    try {
      const data = await fs.readFile(this.trackingFile, 'utf-8');
      this.phaseData = JSON.parse(data);
      this.logger.info(`Phase tracking loaded: ${this.phaseData.currentPhase}`);
    } catch (error) {
      // File doesn't exist, create initial phase data
      this.phaseData = {
        currentPhase: 'research',
        researchStartDate: new Date().toISOString(),
        researchEndDate: null,
        productionStartDate: null,
        currentDay: 1,
        totalResearchDays: 7,
        milestones: []
      };

      await this.save();
      this.logger.info('Initialized phase tracking - starting research phase');
    }
  }

  /**
   * Get current phase info
   */
  async getPhaseInfo() {
    if (!this.phaseData) {
      await this.initialize();
    }

    // Calculate current day if in research phase
    if (this.phaseData.currentPhase === 'research') {
      const startDate = new Date(this.phaseData.researchStartDate);
      const now = new Date();
      const daysSinceStart = Math.floor((now - startDate) / (1000 * 60 * 60 * 24)) + 1;

      this.phaseData.currentDay = Math.min(daysSinceStart, this.phaseData.totalResearchDays);

      // Check if research phase is complete
      if (daysSinceStart > this.phaseData.totalResearchDays) {
        await this.transitionToProduction();
      }
    }

    // Calculate days in production
    let daysInProduction = 0;
    if (this.phaseData.currentPhase === 'production' && this.phaseData.productionStartDate) {
      const startDate = new Date(this.phaseData.productionStartDate);
      const now = new Date();
      daysInProduction = Math.floor((now - startDate) / (1000 * 60 * 60 * 24)) + 1;
    }

    return {
      phase: this.phaseData.currentPhase,
      displayName: this.phaseData.currentPhase === 'research' ?
        `Research Phase - Day ${this.phaseData.currentDay} of ${this.phaseData.totalResearchDays}` :
        `Production Phase - Day ${daysInProduction}`,
      currentDay: this.phaseData.currentDay,
      totalDays: this.phaseData.totalResearchDays,
      daysRemaining: this.phaseData.currentPhase === 'research' ?
        this.phaseData.totalResearchDays - this.phaseData.currentDay : 0,
      daysInProduction,
      startDate: this.phaseData.currentPhase === 'research' ?
        this.phaseData.researchStartDate : this.phaseData.productionStartDate,
      milestones: this.phaseData.milestones || [],
      progress: this.phaseData.currentPhase === 'research' ?
        (this.phaseData.currentDay / this.phaseData.totalResearchDays * 100).toFixed(1) : 100
    };
  }

  /**
   * Transition from research to production
   */
  async transitionToProduction() {
    this.phaseData.currentPhase = 'production';
    this.phaseData.researchEndDate = new Date().toISOString();
    this.phaseData.productionStartDate = new Date().toISOString();

    this.phaseData.milestones.push({
      type: 'phase_transition',
      from: 'research',
      to: 'production',
      timestamp: new Date().toISOString(),
      message: 'Completed 7-day research phase, entering production'
    });

    await this.save();

    this.logger.info('🚀 Transitioned to PRODUCTION PHASE');

    return this.phaseData;
  }

  /**
   * Add milestone
   */
  async addMilestone(type, message) {
    this.phaseData.milestones.push({
      type,
      timestamp: new Date().toISOString(),
      message,
      phase: this.phaseData.currentPhase,
      day: this.phaseData.currentDay
    });

    await this.save();

    this.logger.info(`Milestone: ${message}`);
  }

  /**
   * Force phase change (for testing)
   */
  async setPhase(phase) {
    const oldPhase = this.phaseData.currentPhase;
    this.phaseData.currentPhase = phase;

    if (phase === 'production' && oldPhase === 'research') {
      await this.transitionToProduction();
    }

    await this.save();

    this.logger.info(`Force changed phase from ${oldPhase} to ${phase}`);
  }

  /**
   * Save to file
   */
  async save() {
    try {
      const dataDir = path.dirname(this.trackingFile);
      await fs.mkdir(dataDir, { recursive: true });

      await fs.writeFile(
        this.trackingFile,
        JSON.stringify(this.phaseData, null, 2),
        'utf-8'
      );
    } catch (error) {
      this.logger.error(`Failed to save phase tracking: ${error.message}`);
    }
  }
}

module.exports = PhaseTrackingService;
