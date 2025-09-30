const moment = require('moment-timezone');
const EmailTemplateService = require('./EmailTemplateService');
const OutreachService = require('./OutreachService');
const { Business } = require('../models');
const { Op } = require('sequelize');

/**
 * Email Sequence Service
 * Manages multi-touch email campaigns for prospects who haven't converted
 * Sends strategically-timed emails over 30-60 days without appearing spammy
 *
 * Sequence Strategy:
 * - Email 1: Initial outreach (Day 0)
 * - Email 2: Gentle follow-up (Day 3)
 * - Email 3: Value reminder (Day 7)
 * - Email 4: Case study/testimonial (Day 14)
 * - Email 5: Last chance/urgency (Day 21)
 * - Email 6: Final touchpoint (Day 30)
 */
class EmailSequenceService {
  constructor() {
    this.outreach = new OutreachService();

    // Email sequence configuration
    this.sequences = {
      // Standard sequence for prospects
      prospect: [
        { day: 0, type: 'initial', subject: 'Your New Autonomous Website is Ready 🚀' },
        { day: 3, type: 'gentle_follow_up', subject: 'Did You Check Your New Website?' },
        { day: 7, type: 'value_reminder', subject: 'Boost Your Business with Our Autonomous Website' },
        { day: 14, type: 'case_study', subject: 'How Businesses Grew 45% with Our Autonomous Website' },
        { day: 21, type: 'urgency', subject: 'Your Website Demo Expires Soon - Still Interested?' },
        { day: 30, type: 'final_touch', subject: 'Last Check-In About Your Autonomous Website' }
      ]
    };

    // Timing optimization to avoid spam filters
    this.bestSendTimes = {
      // Best days: Tue, Wed, Thu (avoid Mon and Fri)
      preferredDays: [2, 3, 4], // 0=Sun, 1=Mon, 2=Tue, etc.

      // Best hours: 10-11 AM, 2-3 PM (local business time)
      preferredHours: [10, 14],

      // Avoid these hours (early morning, late evening, lunch)
      avoidHours: [0, 1, 2, 3, 4, 5, 6, 7, 8, 12, 18, 19, 20, 21, 22, 23]
    };
  }

  // ... Rest of the code remains the same ...
}

module.exports = EmailSequenceService;