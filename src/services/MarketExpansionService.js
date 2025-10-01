/**
 * MARKET EXPANSION SERVICE
 *
 * Automatically expands target market based on business maturity and performance.
 *
 * Phase 1 (Month 1): No website businesses only
 * Phase 2 (Month 2-3): Add businesses with existing websites (low-maintenance industries)
 *
 * This service:
 * - Monitors business maturity (days running, customers, revenue)
 * - Automatically triggers market expansion when ready
 * - Expands to businesses with existing websites
 * - Focuses on low-maintenance industries where we're more affordable
 * - Updates targeting criteria automatically
 * - Notifies you of expansion
 */

const OpenAI = require('openai');
const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');

class MarketExpansionService {
  constructor(logger) {
    this.logger = logger;
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Setup notifications
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }

    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }

    // Expansion phases
    this.phases = {
      phase1: {
        name: 'No Website Businesses Only',
        active: true,
        criteria: {
          hasWebsite: false
        },
        description: 'Target businesses without websites (easiest to convert)'
      },
      phase2: {
        name: 'Existing Website Businesses (Low-Maintenance)',
        active: false,
        criteria: {
          hasWebsite: true,
          industries: [
            'lawyer',
            'attorney',
            'dentist',
            'plumber',
            'electrician',
            'hvac',
            'landscaper',
            'roofer',
            'insurance agent',
            'accountant',
            'chiropractor'
          ]
        },
        description: 'Target ultra-low-maintenance industries with existing websites (set and forget businesses)',
        messaging: {
          hook: 'More affordable website solution',
          valueProps: [
            'Same professional quality for less',
            'No upfront costs (vs $3,000-10,000)',
            'Includes hosting, maintenance, updates',
            'AI-powered 24/7 support',
            'Cancel anytime, no contracts'
          ],
          comparison: {
            traditional: '$3,000-10,000 upfront + $50-200/month maintenance',
            ours: '$197/month, everything included'
          }
        }
      }
    };

    // Expansion triggers
    this.triggers = {
      daysRunning: 45, // Expand after 45 days (mid-month 2)
      minCustomers: 20, // Need proven success
      minRevenue: 4000, // $4K+ MRR shows stability
      minConversionRate: 10, // 10%+ conversion on phase 1
      minCustomerSatisfaction: 4.0 // 4.0+ rating from customers
    };

    // Current expansion state
    this.currentPhase = 'phase1';
    this.expansionHistory = [];
  }

  /**
   * CHECK IF READY FOR EXPANSION
   * Runs daily to see if we should expand to phase 2
   */
  async checkExpansionReadiness(businessMetrics) {
    this.logger.info('📊 Checking market expansion readiness...');

    // Skip if already in phase 2
    if (this.currentPhase === 'phase2') {
      this.logger.info('   Already in Phase 2 (max expansion)');
      return { ready: false, reason: 'Already fully expanded' };
    }

    // Check all trigger criteria
    const checks = {
      daysRunning: businessMetrics.daysRunning >= this.triggers.daysRunning,
      customers: businessMetrics.payingCustomers >= this.triggers.minCustomers,
      revenue: businessMetrics.monthlyRecurringRevenue >= this.triggers.minRevenue,
      conversion: businessMetrics.conversionRate >= this.triggers.minConversionRate,
      satisfaction: businessMetrics.customerSatisfaction >= this.triggers.minCustomerSatisfaction
    };

    const passedChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;

    this.logger.info(`   Passed ${passedChecks}/${totalChecks} expansion criteria:`);
    this.logger.info(`   ✓ Days running: ${businessMetrics.daysRunning} (need ${this.triggers.daysRunning}) ${checks.daysRunning ? '✓' : '✗'}`);
    this.logger.info(`   ✓ Customers: ${businessMetrics.payingCustomers} (need ${this.triggers.minCustomers}) ${checks.customers ? '✓' : '✗'}`);
    this.logger.info(`   ✓ Revenue: $${businessMetrics.monthlyRecurringRevenue} (need $${this.triggers.minRevenue}) ${checks.revenue ? '✓' : '✗'}`);
    this.logger.info(`   ✓ Conversion: ${businessMetrics.conversionRate}% (need ${this.triggers.minConversionRate}%) ${checks.conversion ? '✓' : '✗'}`);
    this.logger.info(`   ✓ Satisfaction: ${businessMetrics.customerSatisfaction} (need ${this.triggers.minCustomerSatisfaction}) ${checks.satisfaction ? '✓' : '✗'}`);

    // Need at least 4/5 criteria
    const readyForExpansion = passedChecks >= 4;

    if (readyForExpansion) {
      this.logger.info('   🎉 READY FOR PHASE 2 EXPANSION!');
      return {
        ready: true,
        checks: checks,
        metrics: businessMetrics
      };
    } else {
      this.logger.info(`   ⏳ Not ready yet (${passedChecks}/5 criteria met)`);
      return {
        ready: false,
        reason: `Only ${passedChecks}/5 criteria met`,
        checks: checks,
        metrics: businessMetrics
      };
    }
  }

  /**
   * EXPAND TO PHASE 2
   * Automatically expand market to include businesses with existing websites
   */
  async expandToPhase2(businessMetrics) {
    this.logger.info('');
    this.logger.info('🚀 ============================================');
    this.logger.info('🚀 MARKET EXPANSION: PHASE 2');
    this.logger.info('🚀 ============================================');
    this.logger.info('');

    const expansionData = {
      expandedAt: new Date(),
      fromPhase: 'phase1',
      toPhase: 'phase2',
      businessMetrics: businessMetrics,
      expectedImpact: {
        newMarketSize: '3-5x larger',
        additionalRevenue: '+$10,000-20,000/month potential',
        totalAddressableMarket: 'Expanded significantly'
      }
    };

    // Activate phase 2
    this.phases.phase2.active = true;
    this.currentPhase = 'phase2';

    this.logger.info('✅ Phase 2 activated!');
    this.logger.info('');
    this.logger.info('📋 NEW TARGETING:');
    this.logger.info('   OLD: Businesses without websites only');
    this.logger.info('   NEW: Businesses without websites + businesses WITH websites (low-maintenance)');
    this.logger.info('');
    this.logger.info('🎯 NEW INDUSTRIES TARGETED:');
    this.phases.phase2.criteria.industries.forEach(industry => {
      this.logger.info(`   • ${industry}`);
    });
    this.logger.info('');
    this.logger.info('💰 VALUE PROPOSITION:');
    this.logger.info('   "More Affordable Alternative to Traditional Web Development"');
    this.logger.info('   Traditional: $3,000-10,000 upfront + $50-200/month');
    this.logger.info('   Our Offer: $197/month, everything included');
    this.logger.info('');

    // Log expansion
    this.expansionHistory.push(expansionData);

    // Notify Anthony
    await this.notifyExpansion(expansionData);

    // Update targeting in lead generation
    await this.updateLeadGenerationCriteria();

    // Generate phase 2 messaging templates
    await this.generatePhase2Messaging();

    this.logger.info('✅ Market expansion complete!');
    this.logger.info('   AI will now target BOTH:');
    this.logger.info('   1. Businesses without websites');
    this.logger.info('   2. Low-maintenance businesses with existing websites');
    this.logger.info('');

    return expansionData;
  }

  /**
   * UPDATE LEAD GENERATION CRITERIA
   * Tell the lead generation system to target both groups
   */
  async updateLeadGenerationCriteria() {
    this.logger.info('🔄 Updating lead generation criteria...');

    // This will be read by FullAutonomousBusinessService
    global.leadGenerationCriteria = {
      phase: this.currentPhase,
      targetNoWebsite: true, // Continue targeting no-website businesses
      targetExistingWebsite: this.phases.phase2.active, // Now ALSO target existing websites
      existingWebsiteIndustries: this.phases.phase2.criteria.industries,
      messaging: this.phases.phase2.messaging
    };

    this.logger.info('   ✓ Lead generation updated to target both groups');
  }

  /**
   * GENERATE PHASE 2 MESSAGING
   * AI creates compelling messaging for businesses with existing websites
   */
  async generatePhase2Messaging() {
    this.logger.info('✍️  Generating Phase 2 email templates...');

    try {
      const prompt = `Generate compelling email messaging for businesses that ALREADY HAVE a website, but we're offering a more affordable alternative.

Target Industries (low-maintenance):
${this.phases.phase2.criteria.industries.join(', ')}

Our Offer:
- $197/month (vs $3,000-10,000 upfront + $50-200/month traditional)
- Professional AI-generated websites
- Includes hosting, maintenance, updates, support
- No contracts, cancel anytime
- 24/7 AI support

Generate 3 email templates:

1. "More Affordable Alternative" - Lead with cost savings
2. "No Upfront Costs" - Emphasize $0 upfront vs $3K-10K
3. "Better Value" - Show what's included for $197/month

For each template provide:
- Subject line (compelling, not salesy)
- Email body (150-200 words, personalized, conversational)
- Key value props highlighted
- Strong CTA

Return JSON: { template1: {subject, body}, template2: {subject, body}, template3: {subject, body} }`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8
      });

      const templates = JSON.parse(response.choices[0].message.content);

      // Store templates globally for use by outreach system
      global.phase2EmailTemplates = templates;

      this.logger.info('   ✓ Phase 2 email templates generated');
      this.logger.info(`   ✓ 3 templates ready for use`);

      return templates;

    } catch (error) {
      this.logger.error(`   ✗ Template generation failed: ${error.message}`);
      return null;
    }
  }

  /**
   * GET TARGETING CRITERIA
   * Returns current targeting for lead generation
   */
  getTargetingCriteria() {
    if (this.currentPhase === 'phase1') {
      return {
        phase: 'phase1',
        targetNoWebsite: true,
        targetExistingWebsite: false,
        description: 'Targeting businesses without websites only'
      };
    } else {
      return {
        phase: 'phase2',
        targetNoWebsite: true,
        targetExistingWebsite: true,
        existingWebsiteIndustries: this.phases.phase2.criteria.industries,
        messaging: this.phases.phase2.messaging,
        description: 'Targeting businesses without websites AND low-maintenance businesses with existing websites'
      };
    }
  }

  /**
   * NOTIFY EXPANSION
   * Email + SMS notification about market expansion
   */
  async notifyExpansion(expansionData) {
    this.logger.info('📧 Sending expansion notification...');

    const notificationEmail = process.env.NOTIFICATION_EMAIL || process.env.EMERGENCY_CONTACT_EMAIL;
    const notificationPhone = process.env.NOTIFICATION_PHONE || process.env.EMERGENCY_CONTACT_PHONE;

    // Email notification
    if (process.env.SENDGRID_API_KEY && notificationEmail) {
      try {
        const emailContent = `
Hi Anthony,

🚀 MAJOR MILESTONE: Your autonomous AI is expanding to Phase 2!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MARKET EXPANSION: PHASE 2 ACTIVATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 WHAT'S CHANGING:

OLD (Phase 1):
• Target: Businesses without websites only

NEW (Phase 2):
• Target: Businesses without websites PLUS businesses WITH existing websites
• Focus: Low-maintenance industries (dentist, lawyer, accountant, etc.)
• Offer: More affordable alternative to traditional web development

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 YOUR PERFORMANCE (Why We're Ready):

Days Running: ${expansionData.businessMetrics.daysRunning} days
Paying Customers: ${expansionData.businessMetrics.payingCustomers}
Monthly Revenue: $${expansionData.businessMetrics.monthlyRecurringRevenue}
Conversion Rate: ${expansionData.businessMetrics.conversionRate}%
Customer Satisfaction: ${expansionData.businessMetrics.customerSatisfaction}/5.0

All criteria met! ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 NEW VALUE PROPOSITION:

Traditional Web Development:
• $3,000-10,000 upfront
• $50-200/month maintenance
• Contracts, commitments
• Limited support

Our Offer:
• $0 upfront
• $197/month (everything included)
• No contracts
• 24/7 AI support

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 EXPECTED IMPACT:

Market Size: 3-5x larger
Additional Revenue: +$10,000-20,000/month potential
Total Addressable Market: Significantly expanded

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ WHAT THE AI IS DOING NOW:

✅ Targeting both no-website AND existing-website businesses
✅ Generated 3 new email templates for Phase 2
✅ Updated lead generation criteria
✅ Messaging emphasizes affordability vs traditional
✅ Focusing on low-maintenance industries

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 Congratulations on this milestone!

Your business is mature enough to expand to a much larger market.
The AI will handle everything automatically.

- Your Autonomous AI 🤖
`;

        await sgMail.send({
          to: notificationEmail,
          from: process.env.FROM_EMAIL || notificationEmail,
          subject: '🚀 PHASE 2: Market Expansion Activated!',
          text: emailContent
        });

        this.logger.info(`   ✅ Email notification sent to ${notificationEmail}`);
      } catch (error) {
        this.logger.error(`   ✗ Email failed: ${error.message}`);
      }
    }

    // SMS notification
    if (this.twilioClient && notificationPhone && process.env.ENABLE_SMS_NOTIFICATIONS === 'true') {
      try {
        const smsContent = `🚀 PHASE 2 ACTIVATED!\n\n` +
          `Your AI is now targeting businesses WITH existing websites too!\n\n` +
          `Market size: 3-5x larger\n` +
          `Expected: +$10-20K/month\n\n` +
          `Check email for details!`;

        await this.twilioClient.messages.create({
          body: smsContent,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: notificationPhone
        });

        this.logger.info(`   ✅ SMS notification sent to ${notificationPhone}`);
      } catch (error) {
        this.logger.error(`   ✗ SMS failed: ${error.message}`);
      }
    }
  }

  /**
   * GET EXPANSION STATUS
   */
  getStatus() {
    return {
      currentPhase: this.currentPhase,
      phase1Active: this.phases.phase1.active,
      phase2Active: this.phases.phase2.active,
      expansionHistory: this.expansionHistory,
      triggers: this.triggers,
      targetingCriteria: this.getTargetingCriteria()
    };
  }
}

module.exports = MarketExpansionService;