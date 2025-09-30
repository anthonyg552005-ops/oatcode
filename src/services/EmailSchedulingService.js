const moment = require('moment-timezone');

class WebsiteSellingService {
  constructor() {
    this.optimalSchedule = this.initializeOptimalSchedule();
    this.industrySchedules = this.initializeIndustrySchedules();
    this.avoidDates = this.initializeAvoidDates();
  }

  initializeOptimalSchedule() {
    return {
      highPerformanceDays: [2, 3, 4],
      moderatePerformanceDays: [1, 5],
      lowPerformanceDays: [6, 7],
      volumeMultipliers: {
        1: 0.8,
        2: 1.3,
        3: 1.4,
        4: 1.2,
        5: 0.7,
        6: 0.2,
        7: 0.1
      },
      optimalHours: {
        1: [9, 10, 14],
        2: [8, 9, 10, 11, 14, 15],
        3: [8, 9, 10, 11, 14, 15, 16],
        4: [9, 10, 11, 14, 15],
        5: [9, 10, 11],
        6: [10],
        7: [14]
      }
    };
  }

  initializeIndustrySchedules() {
    return {
      ecommerce: {
        bestDays: [2, 3, 4],
        bestHours: [9, 10, 14, 15],
        avoidDays: [6, 7],
        notes: "E-commerce businesses check email during office hours"
      },
      tech: {
        bestDays: [2, 3, 4],
        bestHours: [8, 9, 15, 16],
        avoidDays: [6, 7],
        notes: "Tech companies prefer early morning or late afternoon"
      },
      retail: {
        bestDays: [1, 2, 3],
        bestHours: [7, 8, 17, 18],
        avoidDays: [7],
        notes: "Retail businesses check email early morning or after work"
      },
      healthcare: {
        bestDays: [2, 3, 4],
        bestHours: [10, 11, 14],
        avoidDays: [6, 7],
        notes: "Healthcare businesses prefer mid-morning or early afternoon"
      },
      hospitality: {
        bestDays: [1, 2, 3],
        bestHours: [10, 11, 15, 16],
        avoidDays: [5, 6, 7],
        notes: "Hospitality businesses are busiest Thu-Sun"
      }
    };
  }

  initializeAvoidDates() {
    const currentYear = new Date().getFullYear();
    return {
      blackoutDates: [
        `${currentYear}-01-01`,
        `${currentYear}-07-04`,
        `${currentYear}-11-28`,
        `${currentYear}-12-25`,
        `${currentYear}-12-31`,
      ],
      reducedVolumeDates: [
        `${currentYear}-01-02`,
        `${currentYear}-11-29`,
        `${currentYear}-12-24`,
        `${currentYear}-12-26`,
      ],
      holidayWeeks: [
        { start: `${currentYear}-11-25`, end: `${currentYear}-11-29` },
        { start: `${currentYear}-12-23`, end: `${currentYear}-12-31` },
        { start: `${currentYear}-07-01`, end: `${currentYear}-07-05` }
      ]
    };
  }

  calculateOptimalSendTime(business, baseVolumeTarget = 100) {
    const now = moment().tz(business.timezone);
    const industry = business.industryCategory || 'ecommerce';
    const industrySchedule = this.industrySchedules[industry] || this.industrySchedules.ecommerce;

    let nextSendDay = this.findNextOptimalDay(now, industrySchedule);

    while (this.isBlackoutDate(nextSendDay)) {
      nextSendDay.add(1, 'day');
      if (!industrySchedule.bestDays.includes(nextSendDay.day()) && !industrySchedule.bestDays.includes(0)) {
        nextSendDay = this.findNextOptimalDay(nextSendDay, industrySchedule);
      }
    }

    const dayOfWeek = nextSendDay.day();
    const availableHours = this.optimalSchedule.optimalHours[dayOfWeek] || [10];
    const industryHours = industrySchedule.bestHours;

    const optimalHours = availableHours.filter(hour => industryHours.includes(hour));
    const selectedHour = optimalHours.length > 0 ?
      optimalHours[Math.floor(Math.random() * optimalHours.length)] :
      industryHours[Math.floor(Math.random() * industryHours.length)];

    nextSendDay.hour(selectedHour).minute(Math.floor(Math.random() * 60)).second(0);

    const volumeAdjustment = this.calculateVolumeAdjustment(nextSendDay, baseVolumeTarget);

    return {
      datetime: nextSendDay.toDate(),
      dayOfWeek: nextSendDay.format('dddd'),
      hour: selectedHour,
      timezone: business.timezone,
      volumeAdjustment: volumeAdjustment,
      recommendedVolume: Math.round(baseVolumeTarget * volumeAdjustment.multiplier),
      reason: this.getSchedulingReason(nextSendDay, industry, volumeAdjustment),
      performance: this.getExpectedPerformance(nextSendDay, industry)
    };
  }

  findNextOptimalDay(fromDate, industrySchedule) {
    let nextDay = fromDate.clone();

    for (let i = 0; i < 7; i++) {
      const dayOfWeek = nextDay.day();

      if (industrySchedule.avoidDays.includes(dayOfWeek)) {
        nextDay.add(1, 'day');
        continue;
      }

      if (industrySchedule.bestDays.includes(dayOfWeek)) {
        return nextDay;
      }

      nextDay.add(1, 'day');
    }

    return fromDate.clone().add(1, 'day');
  }

  isBlackoutDate(date) {
    const dateString = date.format('YYYY-MM-DD');

    if (this.avoidDates.blackoutDates.includes(dateString)) {
      return true;
    }

    for (const week of this.avoidDates.holidayWeeks) {
      if (date.isBetween(week.start, week.end, 'day', '[]')) {
        return false;
      }
    }

    return false;
  }

  calculateVolumeAdjustment(sendDate, baseVolume) {
    const dayOfWeek = sendDate.day();
    const dateString = sendDate.format('YYYY-MM-DD');

    let multiplier = this.optimalSchedule.volumeMultipliers[dayOfWeek] || 0.5;
    let reason = `${sendDate.format('dddd')} optimal multiplier`;

    if (this.avoidDates.reducedVolumeDates.includes(dateString)) {
      multiplier *= 0.5;
      reason += ' + holiday reduction';
    }

    for (const week of this.avoidDates.holidayWeeks) {
      if (sendDate.isBetween(week.start, week.end, 'day', '[]')) {
        multiplier *= 0.7;
        reason += ' + holiday week reduction';
        break;
      }
    }

    if (sendDate.date() >= 25) {
      multiplier *= 1.1;
      reason += ' + end-of-month planning boost';
    }

    if (sendDate.date() <= 5) {
      multiplier *= 1.15;
      reason += ' + beginning-of-month budget boost';
    }

    return {
      multiplier: Math.max(0.05, Math.min(2.0, multiplier)),
      adjustedVolume: Math.round(baseVolume * multiplier),
      reason: reason
    };
  }

  getSchedulingReason(sendDate, industry, volumeAdjustment) {
    const dayName = sendDate.format('dddd');
    const industrySchedule = this.industrySchedules[industry] || this.industrySchedules.ecommerce;

    let reason = `${dayName} is optimal for ${industry} businesses. `;
    reason += `${industrySchedule.notes}. `;
    reason += `Volume adjusted to ${Math.round(volumeAdjustment.multiplier * 100)}% (${volumeAdjustment.reason}).`;

    return reason;
  }

  getExpectedPerformance(sendDate, industry) {
    const dayOfWeek = sendDate.day();
    const industrySchedule = this.industrySchedules[industry] || this.industrySchedules.ecommerce;

    let baseOpenRate = 35;
    let baseClickRate = 8;

    if (industrySchedule.bestDays.includes(dayOfWeek)) {
      baseOpenRate += 5;
      baseClickRate += 2;
    } else if (this.optimalSchedule.lowPerformanceDays.includes(dayOfWeek)) {
      baseOpenRate -= 8;
      baseClickRate -= 3;
    }

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

  generateWeeklySchedule(baseVolumeTarget = 100, industry = 'ecommerce') {
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

  getDayNote(date, industry) {
    const dayOfWeek = date.day();
    const industrySchedule = this.industrySchedules[industry] || this.industrySchedules.ecommerce;

    if (industrySchedule.avoidDays.includes(dayOfWeek)) {
      return `Avoid - ${industry} businesses typically don't check email`;
    }

    if (industrySchedule.bestDays.includes(dayOfWeek)) {
      return `Peak day for ${industry} - high engagement expected`;
    }

    return `Standard day - moderate engagement expected`;
  }

  getSmartSendingRecommendations(weeklyVolumeTarget = 700) {
    return {
      strategy: {
        tuesday: Math.round(weeklyVolumeTarget * 0.22),
        wednesday: Math.round(weeklyVolumeTarget * 0.25),
        thursday: Math.round(weeklyVolumeTarget * 0.20),
        monday: Math.round(weeklyVolumeTarget * 0.15),
        friday: Math.round(weeklyVolumeTarget * 0.13),
        saturday: Math.round(weeklyVolumeTarget * 0.03),
        sunday: Math.round(weeklyVolumeTarget * 0.02)
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

module.exports = WebsiteSellingService;