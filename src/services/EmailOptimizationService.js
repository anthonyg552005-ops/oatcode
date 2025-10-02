/**
 * EMAIL OPTIMIZATION SERVICE
 *
 * Optimizes email subject lines, content, and send times to maximize open and click rates
 */

class EmailOptimizationService {
  constructor(logger) {
    this.logger = logger;

    // Best performing subject line templates
    this.subjectLineTemplates = [
      'Quick question about {businessName}',
      '{businessName} - I built you a free website',
      'Free website demo for {businessName}',
      '{businessName}: Professional website ready in 5 minutes',
      'I noticed {businessName} doesn\'t have a website...',
      '{ownerName}, here\'s what your website could look like'
    ];

    // Optimal send times (in UTC hours)
    this.optimalSendTimes = {
      monday: [9, 14],
      tuesday: [9, 10, 14],
      wednesday: [9, 14],
      thursday: [9, 10, 14],
      friday: [9, 11],
      saturday: [],
      sunday: []
    };

    // Performance tracking
    this.emailPerformance = [];
  }

  /**
   * Get optimal subject line for business
   */
  getOptimalSubjectLine(business) {
    // Randomly select a template (could be weighted by past performance)
    const template = this.subjectLineTemplates[
      Math.floor(Math.random() * this.subjectLineTemplates.length)
    ];

    return template
      .replace('{businessName}', business.name)
      .replace('{ownerName}', business.ownerName || 'there');
  }

  /**
   * Get optimal send time for current day
   */
  getOptimalSendTime() {
    const now = new Date();
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];

    const optimalHours = this.optimalSendTimes[dayOfWeek];

    if (optimalHours.length === 0) {
      // No good send times today, suggest Monday 9 AM
      return null;
    }

    const currentHour = now.getUTCHours();

    // Find next optimal hour
    const nextOptimalHour = optimalHours.find(h => h > currentHour);

    if (nextOptimalHour) {
      const sendTime = new Date();
      sendTime.setUTCHours(nextOptimalHour, 0, 0, 0);
      return sendTime;
    }

    // No more optimal times today, return first optimal time tomorrow
    return null;
  }

  /**
   * Track email performance
   */
  trackEmailPerformance(emailId, metrics) {
    this.emailPerformance.push({
      emailId,
      sentAt: new Date(),
      ...metrics
    });

    // Keep only last 1000 emails
    if (this.emailPerformance.length > 1000) {
      this.emailPerformance = this.emailPerformance.slice(-1000);
    }

    if (this.logger) {
      this.logger.info(`Tracked email performance: ${JSON.stringify(metrics)}`);
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    if (this.emailPerformance.length === 0) {
      return {
        totalSent: 0,
        avgOpenRate: 0,
        avgClickRate: 0,
        avgConversionRate: 0
      };
    }

    const total = this.emailPerformance.length;
    const totalOpens = this.emailPerformance.filter(e => e.opened).length;
    const totalClicks = this.emailPerformance.filter(e => e.clicked).length;
    const totalConversions = this.emailPerformance.filter(e => e.converted).length;

    return {
      totalSent: total,
      avgOpenRate: (totalOpens / total * 100).toFixed(2),
      avgClickRate: (totalClicks / total * 100).toFixed(2),
      avgConversionRate: (totalConversions / total * 100).toFixed(2)
    };
  }

  /**
   * Optimize email content based on past performance
   */
  optimizeContent(emailContent) {
    // Simple optimizations
    // - Add personalization
    // - Keep subject line under 50 characters
    // - Include clear call-to-action
    // - Use power words

    const optimized = {
      ...emailContent,
      subject: emailContent.subject.substring(0, 50),
      hasPersonalization: emailContent.subject.includes('{') || emailContent.body.includes('{'),
      hasCTA: emailContent.body.includes('click') || emailContent.body.includes('view') || emailContent.body.includes('check out'),
      scorePercent: 0
    };

    // Calculate optimization score
    let score = 0;
    if (optimized.subject.length <= 50) score += 25;
    if (optimized.hasPersonalization) score += 25;
    if (optimized.hasCTA) score += 25;
    if (emailContent.body.length >= 100 && emailContent.body.length <= 500) score += 25;

    optimized.scorePercent = score;

    return optimized;
  }
}

module.exports = EmailOptimizationService;
