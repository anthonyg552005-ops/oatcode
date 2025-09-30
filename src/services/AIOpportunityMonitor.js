/**
 * AI OPPORTUNITY MONITOR
 *
 * This service monitors business performance and proactively identifies
 * opportunities to enhance the business with additional AI capabilities.
 *
 * When a clear ROI opportunity is detected, it emails anthonyg552005@gmail.com
 * with specific recommendations and API keys needed.
 */

const OpenAI = require('openai');

class AIOpportunityMonitor {
  constructor(logger) {
    this.logger = logger;
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Opportunity thresholds
    this.thresholds = {
      leadScoring: { minLeads: 100, implemented: false },
      abTesting: { minWebsites: 50, implemented: false },
      voiceAI: { minCustomers: 10, minMRR: 2000, implemented: false },
      videoDemos: { minMRR: 5000, implemented: false },
      semanticAnalysis: { minConversations: 500, implemented: false },
      churnPrevention: { minCustomers: 20, implemented: false },
      chatWidget: { minDemos: 100, implemented: false },
      advancedAnalytics: { minDays: 14, implemented: false },
      competitorIntel: { minDays: 30, implemented: false },
      advancedImages: { minWebsites: 500, implemented: false }
    };

    // Track metrics
    this.metrics = {
      leadsContacted: 0,
      websitesGenerated: 0,
      conversationsHad: 0,
      payingCustomers: 0,
      monthlyRecurringRevenue: 0,
      daysRunning: 0,
      demosGenerated: 0,
      conversionRate: 0,
      churnRate: 0
    };

    // Notification cooldown (don't spam)
    this.lastNotificationTime = {};
    this.notificationCooldownHours = 24;
  }

  /**
   * Update metrics (called by main engine)
   */
  updateMetrics(newMetrics) {
    this.metrics = { ...this.metrics, ...newMetrics };
  }

  /**
   * Check for opportunities (runs every 6 hours)
   */
  async checkOpportunities() {
    this.logger.info('🔍 AI Opportunity Monitor: Checking for enhancement opportunities...');

    const opportunities = [];

    // Check each opportunity
    opportunities.push(...await this.checkLeadScoringOpportunity());
    opportunities.push(...await this.checkABTestingOpportunity());
    opportunities.push(...await this.checkVoiceAIOpportunity());
    opportunities.push(...await this.checkVideoDemosOpportunity());
    opportunities.push(...await this.checkSemanticAnalysisOpportunity());
    opportunities.push(...await this.checkChurnPreventionOpportunity());
    opportunities.push(...await this.checkChatWidgetOpportunity());
    opportunities.push(...await this.checkAdvancedAnalyticsOpportunity());
    opportunities.push(...await this.checkCompetitorIntelOpportunity());

    // Check for performance issues
    opportunities.push(...await this.checkPerformanceIssues());

    // Send notifications for high-priority opportunities
    for (const opp of opportunities) {
      if (opp.priority === 'HIGH' && this.shouldNotify(opp.id)) {
        await this.sendOpportunityEmail(opp);
        this.lastNotificationTime[opp.id] = Date.now();
      }
    }

    if (opportunities.length > 0) {
      this.logger.info(`   ✓ ${opportunities.length} opportunities detected`);
    } else {
      this.logger.info('   ✓ No new opportunities detected');
    }

    return opportunities;
  }

  /**
   * OPPORTUNITY CHECKERS
   */

  async checkLeadScoringOpportunity() {
    if (this.thresholds.leadScoring.implemented) return [];

    if (this.metrics.leadsContacted >= this.thresholds.leadScoring.minLeads) {
      const estimatedImpact = this.metrics.monthlyRecurringRevenue * 2.5; // 2.5x improvement

      return [{
        id: 'lead-scoring',
        title: '🎯 Lead Scoring AI Ready',
        priority: 'HIGH',
        description: `You've contacted ${this.metrics.leadsContacted} leads - enough data to implement AI lead scoring.`,
        impact: `Expected: 2-3x conversion rate improvement (+$${Math.round(estimatedImpact)}/month)`,
        apiKeysNeeded: ['None - uses existing OpenAI + Anthropic'],
        cost: '$0/month (uses existing APIs)',
        implementation: 'Automated - AI can self-implement',
        readyToImplement: true,
        estimatedROI: estimatedImpact
      }];
    }

    return [];
  }

  async checkABTestingOpportunity() {
    if (this.thresholds.abTesting.implemented) return [];

    if (this.metrics.websitesGenerated >= this.thresholds.abTesting.minWebsites) {
      const estimatedImpact = this.metrics.monthlyRecurringRevenue * 1.4; // 40% improvement

      return [{
        id: 'ab-testing',
        title: '🎨 A/B Testing Infrastructure Ready',
        priority: 'HIGH',
        description: `${this.metrics.websitesGenerated} websites generated - ready to implement A/B testing.`,
        impact: `Expected: 30-50% conversion improvement over time (+$${Math.round(estimatedImpact)}/month)`,
        apiKeysNeeded: ['PostHog API (free tier available)'],
        cost: '$0-100/month (free tier sufficient initially)',
        implementation: 'Requires PostHog API key',
        readyToImplement: true,
        estimatedROI: estimatedImpact
      }];
    }

    return [];
  }

  async checkVoiceAIOpportunity() {
    if (this.thresholds.voiceAI.implemented) return [];

    const ready = this.metrics.payingCustomers >= this.thresholds.voiceAI.minCustomers &&
                  this.metrics.monthlyRecurringRevenue >= this.thresholds.voiceAI.minMRR;

    if (ready) {
      const estimatedImpact = this.metrics.leadsContacted * 0.25 * 197; // 25% of leads might prefer phone

      return [{
        id: 'voice-ai',
        title: '📞 Voice AI Ready for Phone Outreach',
        priority: 'HIGH',
        description: `You've proven the email model works. Voice AI could capture 70% of businesses who prefer phone calls.`,
        impact: `Expected: 3-5x response rate on phone vs email (+$${Math.round(estimatedImpact)}/month potential)`,
        apiKeysNeeded: ['ElevenLabs API', 'Deepgram API'],
        cost: '~$0.35 per call (but 3-5x better conversion)',
        implementation: 'Requires ElevenLabs + Deepgram API keys',
        readyToImplement: true,
        estimatedROI: estimatedImpact
      }];
    }

    return [];
  }

  async checkVideoDemosOpportunity() {
    if (this.thresholds.videoDemos.implemented) return [];

    if (this.metrics.monthlyRecurringRevenue >= this.thresholds.videoDemos.minMRR) {
      return [{
        id: 'video-demos',
        title: '🎥 AI Video Demos Ready (High-Value Leads)',
        priority: 'MEDIUM',
        description: `At $${this.metrics.monthlyRecurringRevenue} MRR, you can afford AI video demos for high-value leads.`,
        impact: `Expected: 50-100% higher engagement, 2-3x conversions on video leads`,
        apiKeysNeeded: ['Synthesia or HeyGen API', 'ElevenLabs API'],
        cost: '~$25 per video (use for qualified leads only)',
        implementation: 'Requires Synthesia/HeyGen API key',
        readyToImplement: true,
        estimatedROI: this.metrics.monthlyRecurringRevenue * 0.3
      }];
    }

    return [];
  }

  async checkSemanticAnalysisOpportunity() {
    if (this.thresholds.semanticAnalysis.implemented) return [];

    if (this.metrics.conversationsHad >= this.thresholds.semanticAnalysis.minConversations) {
      return [{
        id: 'semantic-analysis',
        title: '🧠 Semantic Email Analysis Ready',
        priority: 'HIGH',
        description: `${this.metrics.conversationsHad} conversations - enough data to enable advanced semantic analysis.`,
        impact: `Expected: 15-25% better email response handling`,
        apiKeysNeeded: ['None - uses existing Anthropic Claude'],
        cost: '$0/month extra',
        implementation: 'Automated - AI can self-implement',
        readyToImplement: true,
        estimatedROI: this.metrics.monthlyRecurringRevenue * 0.2
      }];
    }

    return [];
  }

  async checkChurnPreventionOpportunity() {
    if (this.thresholds.churnPrevention.implemented) return [];

    if (this.metrics.payingCustomers >= this.thresholds.churnPrevention.minCustomers) {
      const potentialChurnSavings = this.metrics.payingCustomers * 197 * 0.5; // Prevent 50% of churn

      return [{
        id: 'churn-prevention',
        title: '📊 Churn Prevention AI Ready',
        priority: 'HIGH',
        description: `${this.metrics.payingCustomers} customers - can now implement predictive churn prevention.`,
        impact: `Expected: 50-70% churn reduction (saves ~$${Math.round(potentialChurnSavings)}/month)`,
        apiKeysNeeded: ['None - uses existing OpenAI + Anthropic'],
        cost: '$0/month extra',
        implementation: 'Automated - AI can self-implement',
        readyToImplement: true,
        estimatedROI: potentialChurnSavings
      }];
    }

    return [];
  }

  async checkChatWidgetOpportunity() {
    if (this.thresholds.chatWidget.implemented) return [];

    if (this.metrics.demosGenerated >= this.thresholds.chatWidget.minDemos) {
      const impactEstimate = this.metrics.demosGenerated * 0.2 * 197; // 20% conversion boost

      return [{
        id: 'chat-widget',
        title: '💬 Chat Widget Ready for Demo Sites',
        priority: 'HIGH',
        description: `${this.metrics.demosGenerated} demos generated - adding chat widget could boost conversions 15-30%.`,
        impact: `Expected: 15-30% conversion increase (+$${Math.round(impactEstimate)}/month)`,
        apiKeysNeeded: ['None - uses existing OpenAI'],
        cost: '~$50/month for chat infrastructure',
        implementation: 'Requires chat platform setup',
        readyToImplement: true,
        estimatedROI: impactEstimate
      }];
    }

    return [];
  }

  async checkAdvancedAnalyticsOpportunity() {
    if (this.thresholds.advancedAnalytics.implemented) return [];

    if (this.metrics.daysRunning >= this.thresholds.advancedAnalytics.minDays) {
      return [{
        id: 'advanced-analytics',
        title: '📈 Advanced Analytics & Forecasting Ready',
        priority: 'MEDIUM',
        description: `After ${this.metrics.daysRunning} days, there's enough data for predictive analytics.`,
        impact: `Proactive issue detection, better decisions, optimization recommendations`,
        apiKeysNeeded: ['None - uses existing OpenAI + Anthropic'],
        cost: '$0/month extra',
        implementation: 'Automated - AI can self-implement',
        readyToImplement: true,
        estimatedROI: this.metrics.monthlyRecurringRevenue * 0.15
      }];
    }

    return [];
  }

  async checkCompetitorIntelOpportunity() {
    if (this.thresholds.competitorIntel.implemented) return [];

    if (this.metrics.daysRunning >= this.thresholds.competitorIntel.minDays) {
      return [{
        id: 'competitor-intel',
        title: '🤝 Competitor Intelligence 2.0 Ready',
        priority: 'MEDIUM',
        description: `After ${this.metrics.daysRunning} days of operation, deep competitor analysis would be valuable.`,
        impact: `Stay ahead of competition, identify market gaps, discover opportunities`,
        apiKeysNeeded: ['Apify API', 'Perplexity API'],
        cost: '~$70/month total',
        implementation: 'Requires Apify + Perplexity API keys',
        readyToImplement: true,
        estimatedROI: 'Strategic value - hard to quantify'
      }];
    }

    return [];
  }

  /**
   * Check for performance issues that AI could solve
   */
  async checkPerformanceIssues() {
    const issues = [];

    // Low conversion rate
    if (this.metrics.conversionRate < 0.10 && this.metrics.leadsContacted > 50) {
      issues.push({
        id: 'low-conversion',
        title: '⚠️ Low Conversion Rate Detected',
        priority: 'HIGH',
        description: `Conversion rate is ${(this.metrics.conversionRate * 100).toFixed(1)}% (below 10% target).`,
        impact: `AI enhancements could improve this significantly`,
        recommendation: 'Consider: Lead Scoring, A/B Testing, or Chat Widget',
        readyToImplement: false
      });
    }

    // High churn rate
    if (this.metrics.churnRate > 0.05 && this.metrics.payingCustomers > 10) {
      issues.push({
        id: 'high-churn',
        title: '⚠️ High Churn Rate Detected',
        priority: 'HIGH',
        description: `Churn rate is ${(this.metrics.churnRate * 100).toFixed(1)}% (above 5% target).`,
        impact: `Churn Prevention AI could reduce this 50-70%`,
        recommendation: 'Implement: Predictive Churn Prevention',
        readyToImplement: this.metrics.payingCustomers >= 20
      });
    }

    return issues;
  }

  /**
   * Check if we should notify (avoid spam)
   */
  shouldNotify(opportunityId) {
    const lastNotification = this.lastNotificationTime[opportunityId];
    if (!lastNotification) return true;

    const hoursSinceLastNotification = (Date.now() - lastNotification) / (1000 * 60 * 60);
    return hoursSinceLastNotification >= this.notificationCooldownHours;
  }

  /**
   * Send opportunity email to Anthony
   */
  async sendOpportunityEmail(opportunity) {
    this.logger.info(`📧 Sending opportunity email: ${opportunity.title}`);

    try {
      // Use SendGrid/SMTP to send email
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      const emailBody = `
Hi Anthony,

Your autonomous AI has detected a significant opportunity to enhance business performance:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${opportunity.title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${opportunity.description}

📊 EXPECTED IMPACT:
${opportunity.impact}

🔑 API KEYS NEEDED:
${opportunity.apiKeysNeeded.join('\n')}

💰 COST:
${opportunity.cost}

🚀 IMPLEMENTATION:
${opportunity.implementation}

${opportunity.estimatedROI ? `💵 ESTIMATED ROI: +$${Math.round(opportunity.estimatedROI)}/month\n` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${opportunity.readyToImplement ? `
✅ READY TO IMPLEMENT

If you have the required API keys, reply with them and I'll implement this automatically.

If you don't have the API keys yet, here's where to get them:
` : 'Data collection in progress - will notify when ready to implement.'}

${opportunity.apiKeysNeeded.map(key => {
  if (key === 'None - uses existing OpenAI + Anthropic') return '';
  if (key === 'None - uses existing OpenAI') return '';
  if (key.includes('PostHog')) return '- PostHog: https://posthog.com/signup (free tier)';
  if (key.includes('ElevenLabs')) return '- ElevenLabs: https://elevenlabs.io/api (paid)';
  if (key.includes('Deepgram')) return '- Deepgram: https://deepgram.com/product/api (paid)';
  if (key.includes('Synthesia')) return '- Synthesia: https://synthesia.io/api (expensive)';
  if (key.includes('HeyGen')) return '- HeyGen: https://heygen.com/api (expensive)';
  if (key.includes('Apify')) return '- Apify: https://apify.com/pricing (~$50/month)';
  if (key.includes('Perplexity')) return '- Perplexity: https://perplexity.ai/api (~$20/month)';
  return `- ${key}`;
}).filter(Boolean).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions? Just reply to this email.

Your Autonomous AI 🤖

P.S. See full AI enhancement opportunities: AI_OPPORTUNITIES.md
`;

      await sgMail.send({
        to: process.env.EMERGENCY_CONTACT_EMAIL,
        from: process.env.FROM_EMAIL || 'ai@yourdomain.com',
        subject: `🚀 AI Opportunity: ${opportunity.title}`,
        text: emailBody
      });

      this.logger.info(`   ✓ Opportunity email sent successfully`);

    } catch (error) {
      this.logger.error(`   ✗ Failed to send opportunity email: ${error.message}`);
    }
  }

  /**
   * Get summary of all opportunities
   */
  getOpportunitySummary() {
    return {
      metrics: this.metrics,
      thresholds: this.thresholds,
      readyToImplement: Object.entries(this.thresholds)
        .filter(([key, val]) => !val.implemented)
        .map(([key, val]) => ({
          name: key,
          threshold: val,
          currentMetric: this.getMetricForOpportunity(key)
        }))
    };
  }

  getMetricForOpportunity(opportunityKey) {
    const mapping = {
      leadScoring: this.metrics.leadsContacted,
      abTesting: this.metrics.websitesGenerated,
      voiceAI: this.metrics.payingCustomers,
      videoDemos: this.metrics.monthlyRecurringRevenue,
      semanticAnalysis: this.metrics.conversationsHad,
      churnPrevention: this.metrics.payingCustomers,
      chatWidget: this.metrics.demosGenerated,
      advancedAnalytics: this.metrics.daysRunning,
      competitorIntel: this.metrics.daysRunning,
      advancedImages: this.metrics.websitesGenerated
    };

    return mapping[opportunityKey] || 0;
  }
}

module.exports = AIOpportunityMonitor;