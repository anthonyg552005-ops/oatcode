const moment = require('moment-timezone');

class EmailSchedulingService {
  constructor() {
    this.optimalSchedule = this.initializeOptimalSchedule();
    this.industrySchedules = this.initializeIndustrySchedules();
    this.avoidDates = this.initializeAvoidDates();
  }

  /**
   * Initialize optimal email sending schedule based on industry data
   */
  initializeOptimalSchedule() {
    return {
      // Best performing days (1 = Monday, 7 = Sunday)
      highPerformanceDays: [2, 3, 4], // Tuesday, Wednesday, Thursday
      moderatePerformanceDays: [1, 5], // Monday, Friday
      lowPerformanceDays: [6, 7], // Saturday, Sunday

      // Daily send volume multipliers
      volumeMultipliers: {
        1: 0.8,  // Monday - 80% of target (people catching up from weekend)
        2: 1.3,  // Tuesday - 130% of target (peak engagement)
        3: 1.4,  // Wednesday - 140% of target (highest engagement)
        4: 1.2,  // Thursday - 120% of target (still high engagement)
        5: 0.7,  // Friday - 70% of target (people preparing for weekend)
        6: 0.2,  // Saturday - 20% of target (emergency/urgent only)
        7: 0.1   // Sunday - 10% of target (emergency/urgent only)
      },

      // Optimal sending hours by day (Austin timezone)
      optimalHours: {
        1: [9, 10, 14], // Monday
        2: [8, 9, 10, 11, 14, 15], // Tuesday - extended hours
        3: [8, 9, 10, 11, 14, 15, 16], // Wednesday - peak day
        4: [9, 10, 11, 14, 15], // Thursday
        5: [9, 10, 11], // Friday - morning only
        6: [10], // Saturday - very limited
        7: [14] // Sunday - afternoon only
      }
    };
  }

  /**
   * Industry-specific scheduling patterns
   */
  initializeIndustrySchedules() {
    return {
      dental: {
        bestDays: [2, 3, 4], // Tue-Thu
        bestHours: [9, 10, 14, 15],
        avoidDays: [6, 7], // No weekends
        notes: "Dental practices check email during office hours"
      },
      legal: {
        bestDays: [2, 3, 4], // Tue-Thu
        bestHours: [8, 9, 15, 16],
        avoidDays: [6, 7], // No weekends
        notes: "Lawyers prefer early morning or late afternoon"
      },
      contractor: {
        bestDays: [1, 2, 3], // Mon-Wed
        bestHours: [7, 8, 17, 18],
        avoidDays: [7], // No Sundays
        notes: "Contractors check email early morning or after work"
      },
      medical: {
        bestDays: [2, 3, 4], // Tue-Thu
        bestHours: [10, 11, 14],
        avoidDays: [6, 7], // No weekends
        notes: "Medical practices prefer mid-morning or early afternoon"
      },
      restaurant: {
        bestDays: [1, 2, 3], // Mon-Wed
        bestHours: [10, 11, 15, 16],
        avoidDays: [5, 6, 7], // Avoid busy weekend prep
        notes: "Restaurants are busiest Thu-Sun"
      }
    };
  }

  /**
   * Dates to avoid sending emails
   */
  initializeAvoidDates() {
    const currentYear = new Date().getFullYear();
    return {
      // Major holidays (no emails)
      blackoutDates: [
        `${currentYear}-01-01`, // New Year's Day
        `${currentYear}-07-04`, // Independence Day
        `${currentYear}-11-28`, // Thanksgiving (varies)
        `${currentYear}-12-25`, // Christmas
        `${currentYear}-12-31`, // New Year's Eve
      ],

      // Reduced volume dates (50% volume)
      reducedVolumeDates: [
        `${currentYear}-01-02`, // Day after New Year
        `${currentYear}-11-29`, // Day after Thanksgiving
        `${currentYear}-12-24`, // Christmas Eve
        `${currentYear}-12-26`, // Day after Christmas
      ],

      // Holiday weeks (reduce volume by 30%)
      holidayWeeks: [
        { start: `${currentYear}-11-25`, end: `${currentYear}-11-29` }, // Thanksgiving week
        { start: `${currentYear}-12-23`, end: `${currentYear}-12-31` }, // Christmas/New Year week
        { start: `${currentYear}-07-01`, end: `${currentYear}-07-05` }   // July 4th week
      ]
    };
  }

  /**
   * Calculate optimal send time for a business
   */
  calculateOptimalSendTime(business, baseVolumeTarget = 100) {
    const now = moment().tz('America/Chicago');
    const industry = business.industryCategory || 'professional';
    const industrySchedule = this.industrySchedules[industry] || this.industrySchedules.dental;

    // Find next optimal day
    let nextSendDay = this.findNextOptimalDay(now, industrySchedule);

    // Check for blackout dates
    while (this.isBlackoutDate(nextSendDay)) {
      nextSendDay.add(1, 'day');
      if (!industrySchedule.bestDays.includes(nextSendDay.day()) && !industrySchedule.bestDays.includes(0)) {
        nextSendDay = this.findNextOptimalDay(nextSendDay, industrySchedule);
      }
    }

    // Select optimal hour
    const dayOfWeek = nextSendDay.day();
    const availableHours = this.optimalSchedule.optimalHours[dayOfWeek] || [10];
    const industryHours = industrySchedule.bestHours;

    // Find intersection of general optimal hours and industry-specific hours
    const optimalHours = availableHours.filter(hour => industryHours.includes(hour));
    const selectedHour = optimalHours.length > 0 ?
      optimalHours[Math.floor(Math.random() * optimalHours.length)] :
      industryHours[Math.floor(Math.random() * industryHours.length)];

    nextSendDay.hour(selectedHour).minute(Math.floor(Math.random() * 60)).second(0);

    // Calculate volume adjustment
    const volumeAdjustment = this.calculateVolumeAdjustment(nextSendDay, baseVolumeTarget);

    return {
      datetime: nextSendDay.toDate(),
      dayOfWeek: nextSendDay.format('dddd'),
      hour: selectedHour,
      timezone: 'America/Chicago',
      volumeAdjustment: volumeAdjustment,
      recommendedVolume: Math.round(baseVolumeTarget * volumeAdjustment.multiplier),
      reason: this.getSchedulingReason(nextSendDay, industry, volumeAdjustment),
      performance: this.getExpectedPerformance(nextSendDay, industry)
    };
  }

  /**
   * Find next optimal day based on industry preferences
   */
  findNextOptimalDay(fromDate, industrySchedule) {
    let nextDay = fromDate.clone();

    // Look ahead up to 7 days to find optimal day
    for (let i = 0; i < 7; i++) {
      const dayOfWeek = nextDay.day();

      // Skip avoided days for this industry
      if (industrySchedule.avoidDays.includes(dayOfWeek)) {
        nextDay.add(1, 'day');
        continue;
      }

      // Prefer best days
      if (industrySchedule.bestDays.includes(dayOfWeek)) {
        return nextDay;
      }

      nextDay.add(1, 'day');
    }

    // If no optimal day found, return next business day
    return fromDate.clone().add(1, 'day');
  }

  /**
   * Check if date should be avoided
   */
  isBlackoutDate(date) {
    const dateString = date.format('YYYY-MM-DD');

    // Check blackout dates
    if (this.avoidDates.blackoutDates.includes(dateString)) {
      return true;
    }

    // Check holiday weeks
    for (const week of this.avoidDates.holidayWeeks) {
      if (date.isBetween(week.start, week.end, 'day', '[]')) {
        return false; // Reduced volume, not blackout
      }
    }

    return false;
  }

  /**
   * Calculate volume adjustment based on date and conditions
   */
  calculateVolumeAdjustment(sendDate, baseVolume) {
    const dayOfWeek = sendDate.day();
    const dateString = sendDate.format('YYYY-MM-DD');

    let multiplier = this.optimalSchedule.volumeMultipliers[dayOfWeek] || 0.5;
    let reason = `${sendDate.format('dddd')} optimal multiplier`;

    // Check for reduced volume dates
    if (this.avoidDates.reducedVolumeDates.includes(dateString)) {
      multiplier *= 0.5;
      reason += ' + holiday reduction';
    }

    // Check for holiday weeks
    for (const week of this.avoidDates.holidayWeeks) {
      if (sendDate.isBetween(week.start, week.end, 'day', '[]')) {
        multiplier *= 0.7;
        reason += ' + holiday week reduction';
        break;
      }
    }

    // End of month boost (businesses planning for next month)
    if (sendDate.date() >= 25) {
      multiplier *= 1.1;
      reason += ' + end-of-month planning boost';
    }

    // Beginning of month boost (new budget allocations)
    if (sendDate.date() <= 5) {
      multiplier *= 1.15;
      reason += ' + beginning-of-month budget boost';
    }

    return {
      multiplier: Math.max(0.05, Math.min(2.0, multiplier)), // Cap between 5% and 200%
      adjustedVolume: Math.round(baseVolume * multiplier),
      reason: reason
    };
  }

  /**
   * Get scheduling reason explanation
   */
  getSchedulingReason(sendDate, industry, volumeAdjustment) {
    const dayName = sendDate.format('dddd');
    const industrySchedule = this.industrySchedules[industry] || this.industrySchedules.dental;

    let reason = `${dayName} is optimal for ${industry} businesses. `;
    reason += `${industrySchedule.notes}. `;
    reason += `Volume adjusted to ${Math.round(volumeAdjustment.multiplier * 100)}% (${volumeAdjustment.reason}).`;

    return reason;
  }

  /**
   * Get expected performance for the scheduled time
   */
  getExpectedPerformance(sendDate, industry) {
    const dayOfWeek = sendDate.day();
    const industrySchedule = this.industrySchedules[industry] || this.industrySchedules.dental;

    let baseOpenRate = 35; // Our optimized baseline
    let baseClickRate = 8;

    // Day of week adjustment
    if (industrySchedule.bestDays.includes(dayOfWeek)) {
      baseOpenRate += 5;
      baseClickRate += 2;
    } else if (this.optimalSchedule.lowPerformanceDays.includes(dayOfWeek)) {
      baseOpenRate -= 8;
      baseClickRate -= 3;
    }

    // Hour adjustment (simplified)
    const hour = sendDate.hour();
    if (industrySchedule.bestHours.includes(hour)) {
      baseOpenRate += 3;
      baseClickRate += 1;
    }

    return {
      expectedOpenRate: Math.max(15, Math.min(50, baseOpenRate)),
      expectedClickRate: Math.max(3, Math.min(15, baseClickRate)),
      confidence: industrySchedule.bestDays.includes(dayOfWeek) ? 'high' : 'medium'
    };
  }

  /**
   * Generate weekly schedule plan
   */
  generateWeeklySchedule(baseVolumeTarget = 100, industry = 'professional') {
    const schedule = [];
    const startOfWeek = moment().tz('America/Chicago').startOf('week');

    for (let i = 0; i < 7; i++) {
      const day = startOfWeek.clone().add(i, 'days');
      const dayOfWeek = day.day();
      const volumeAdjustment = this.calculateVolumeAdjustment(day, baseVolumeTarget);

      schedule.push({
        date: day.format('YYYY-MM-DD'),
        dayName: day.format('dddd'),
        recommendedVolume: volumeAdjustment.adjustedVolume,
        multiplier: volumeAdjustment.multiplier,
        status: this.getDayStatus(day),
        optimalHours: this.optimalSchedule.optimalHours[dayOfWeek] || [],
        note: this.getDayNote(day, industry)
      });
    }

    return schedule;
  }

  /**
   * Get day status (optimal, moderate, avoid, blackout)
   */
  getDayStatus(date) {
    if (this.isBlackoutDate(date)) {
      return 'blackout';
    }

    const dayOfWeek = date.day();
    if (this.optimalSchedule.highPerformanceDays.includes(dayOfWeek)) {
      return 'optimal';
    } else if (this.optimalSchedule.moderatePerformanceDays.includes(dayOfWeek)) {
      return 'moderate';
    } else {
      return 'avoid';
    }
  }

  /**
   * Get day-specific note
   */
  getDayNote(date, industry) {
    const dayOfWeek = date.day();
    const industrySchedule = this.industrySchedules[industry] || this.industrySchedules.dental;

    if (industrySchedule.avoidDays.includes(dayOfWeek)) {
      return `Avoid - ${industry} businesses typically don't check email`;
    }

    if (industrySchedule.bestDays.includes(dayOfWeek)) {
      return `Peak day for ${industry} - high engagement expected`;
    }

    return `Standard day - moderate engagement expected`;
  }

  /**
   * Get smart sending recommendations
   */
  getSmartSendingRecommendations(weeklyVolumeTarget = 700) {
    return {
      strategy: {
        tuesday: Math.round(weeklyVolumeTarget * 0.22), // 22% - Peak day
        wednesday: Math.round(weeklyVolumeTarget * 0.25), // 25% - Best day
        thursday: Math.round(weeklyVolumeTarget * 0.20), // 20% - Good day
        monday: Math.round(weeklyVolumeTarget * 0.15), // 15% - Moderate
        friday: Math.round(weeklyVolumeTarget * 0.13), // 13% - Light
        saturday: Math.round(weeklyVolumeTarget * 0.03), // 3% - Minimal
        sunday: Math.round(weeklyVolumeTarget * 0.02) // 2% - Emergency only
      },

      timing: {
        peakHours: '9:00 AM - 11:00 AM and 2:00 PM - 4:00 PM',
        avoidHours: 'Before 8:00 AM, after 6:00 PM, and lunch (12:00-1:00 PM)',
        timezone: 'America/Chicago (Austin)'
      },

      volumeDistribution: {
        mondayToThursday: '77% of weekly volume',
        friday: '13% of weekly volume',
        weekend: '5% of weekly volume (urgent/high-priority only)'
      },

      expectedResults: {
        averageOpenRate: '37-42% (vs 25% baseline)',
        averageClickRate: '9-12% (vs 5% baseline)',
        bestPerformingDay: 'Wednesday (40%+ open rates)',
        worstPerformingDay: 'Sunday (15-20% open rates)'
      }
    };
  }
}

module.exports = EmailSchedulingService;