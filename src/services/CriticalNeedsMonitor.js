/**
 * CRITICAL NEEDS MONITOR
 *
 * This service identifies when the AI needs Anthony's intervention to succeed.
 *
 * The AI is autonomous, but sometimes needs resources that only a human can provide:
 * - Domain name (for professional appearance)
 * - Increased email limits (when hitting SendGrid limits)
 * - Additional API credits (when running out)
 * - Payment processor setup (Stripe)
 * - Phone number verification (Twilio)
 * - Business registration documents
 *
 * When a critical need is detected, it immediately notifies Anthony.
 */

const OpenAI = require('openai');

class CriticalNeedsMonitor {
  constructor(logger) {
    this.logger = logger;
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Track critical needs
    this.criticalNeeds = {
      domain: { needed: false, urgency: 'medium', notified: false },
      emailLimit: { needed: false, urgency: 'high', notified: false },
      apiQuota: { needed: false, urgency: 'high', notified: false },
      stripeSetup: { needed: false, urgency: 'high', notified: false },
      twilioVerification: { needed: false, urgency: 'medium', notified: false },
      hostingUpgrade: { needed: false, urgency: 'medium', notified: false }
    };

    // Usage tracking
    this.usage = {
      emailsSentToday: 0,
      emailDailyLimit: parseInt(process.env.MAX_EMAILS_PER_DAY) || 50,
      openaiCreditsUsed: 0,
      openaiMonthlyBudget: 100, // $100/month default
      demosServed: 0,
      customersOnboarded: 0
    };

    // Notification cooldown
    this.lastNotificationTime = {};
    this.notificationCooldownHours = 6; // Don't spam, but be urgent
  }

  /**
   * CHECK ALL CRITICAL NEEDS
   * Runs every hour to detect blocking issues
   */
  async checkCriticalNeeds() {
    this.logger.info('🚨 Critical Needs Monitor: Checking for blocking issues...');

    const needs = [];

    // Check each critical need
    needs.push(...await this.checkDomainNeed());
    needs.push(...await this.checkEmailLimitNeed());
    needs.push(...await this.checkAPIQuotaNeed());
    needs.push(...await this.checkStripeSetupNeed());
    needs.push(...await this.checkTwilioVerificationNeed());
    needs.push(...await this.checkHostingUpgradeNeed());

    // Notify for high-urgency needs immediately
    for (const need of needs) {
      if (need.urgency === 'CRITICAL' || need.urgency === 'HIGH') {
        if (this.shouldNotify(need.id)) {
          await this.sendCriticalNeedEmail(need);
          await this.logToDashboard(need);
          this.lastNotificationTime[need.id] = Date.now();
        }
      }
    }

    if (needs.length > 0) {
      this.logger.warn(`   ⚠️  ${needs.length} critical needs detected`);
    } else {
      this.logger.info('   ✓ No critical needs - all systems operational');
    }

    return needs;
  }

  /**
   * DOMAIN NAME NEEDED
   * localhost:3000 looks unprofessional in emails
   */
  async checkDomainNeed() {
    const domain = process.env.DOMAIN || 'http://localhost:3000';

    // If using localhost and have sent demos to real customers
    if (domain.includes('localhost') && this.usage.demosServed > 10) {
      return [{
        id: 'domain',
        title: '🌐 Professional Domain Needed',
        urgency: 'HIGH',
        description: `You've sent ${this.usage.demosServed} demo websites using "localhost:3000" links.`,
        impact: 'Demo links look unprofessional and may not work for prospects (localhost only works on your computer)',
        solution: 'Buy a domain name (e.g., tgwebmarketing.com)',
        cost: '$12/year (e.g., Namecheap, Google Domains)',
        blocksProgress: false,
        reducesConversion: true,
        recommendedAction: [
          '1. Buy domain: https://www.namecheap.com/',
          '2. Point to hosting (Railway, Vercel, etc.)',
          '3. Update DOMAIN in .env file',
          '4. Restart AI - it will use new domain automatically'
        ],
        urgencyReason: 'Prospects see "localhost:3000" and may not trust it',
        estimatedImpact: '+30-50% conversion (professional domain vs localhost)'
      }];
    }

    return [];
  }

  /**
   * EMAIL LIMIT REACHED
   * SendGrid free tier or daily limit being hit
   */
  async checkEmailLimitNeed() {
    const emailUsagePercent = (this.usage.emailsSentToday / this.usage.emailDailyLimit) * 100;

    // At 80% of daily limit
    if (emailUsagePercent >= 80 && emailUsagePercent < 100) {
      return [{
        id: 'email-limit-warning',
        title: '📧 Approaching Email Limit',
        urgency: 'MEDIUM',
        description: `Sent ${this.usage.emailsSentToday}/${this.usage.emailDailyLimit} emails today (${emailUsagePercent.toFixed(0)}% of limit).`,
        impact: 'Will stop sending emails soon, blocking lead generation and sales',
        solution: 'Increase SendGrid plan or daily limit',
        cost: '$20/month for 40K emails (SendGrid Essentials)',
        blocksProgress: false,
        reducesConversion: false,
        recommendedAction: [
          'Option 1: Upgrade SendGrid plan (https://sendgrid.com/pricing/)',
          'Option 2: Increase MAX_EMAILS_PER_DAY in .env',
          'Option 3: Add backup SMTP provider',
          '',
          'Current: FREE (100 emails/day)',
          'Recommended: ESSENTIALS ($20/month for 40K emails/month)'
        ],
        urgencyReason: 'Outreach will stop when limit hit',
        estimatedImpact: 'Unlimited growth potential vs capped at 50 leads/day'
      }];
    }

    // At 100% of daily limit - CRITICAL
    if (emailUsagePercent >= 100) {
      return [{
        id: 'email-limit-critical',
        title: '🚨 EMAIL LIMIT REACHED - BLOCKING PROGRESS',
        urgency: 'CRITICAL',
        description: `REACHED DAILY LIMIT: ${this.usage.emailsSentToday}/${this.usage.emailDailyLimit} emails sent.`,
        impact: '⚠️ AI CANNOT SEND MORE EMAILS TODAY - Lead generation STOPPED',
        solution: 'URGENT: Upgrade SendGrid plan immediately',
        cost: '$20/month for 40K emails',
        blocksProgress: true,
        reducesConversion: false,
        recommendedAction: [
          '🚨 IMMEDIATE ACTION REQUIRED:',
          '',
          '1. Go to https://sendgrid.com/pricing/',
          '2. Upgrade to Essentials ($20/month)',
          '3. Get new API key',
          '4. Update SENDGRID_API_KEY in .env',
          '5. AI will resume automatically',
          '',
          '⏰ Business is PAUSED until this is resolved'
        ],
        urgencyReason: 'Cannot send emails = cannot generate revenue',
        estimatedImpact: 'Business completely stopped until resolved'
      }];
    }

    return [];
  }

  /**
   * API QUOTA EXCEEDED
   * OpenAI rate limits or budget exceeded
   */
  async checkAPIQuotaNeed() {
    const quotaUsagePercent = (this.usage.openaiCreditsUsed / this.usage.openaiMonthlyBudget) * 100;

    // At 80% of OpenAI budget
    if (quotaUsagePercent >= 80 && quotaUsagePercent < 100) {
      return [{
        id: 'api-quota-warning',
        title: '🤖 AI API Quota Running Low',
        urgency: 'MEDIUM',
        description: `Used $${this.usage.openaiCreditsUsed.toFixed(2)}/$${this.usage.openaiMonthlyBudget} OpenAI credits this month (${quotaUsagePercent.toFixed(0)}%).`,
        impact: 'Will lose AI capabilities (website generation, content, support) when limit hit',
        solution: 'Increase OpenAI usage limit',
        cost: '$100-200/month for growing business',
        blocksProgress: false,
        reducesConversion: false,
        recommendedAction: [
          '1. Go to https://platform.openai.com/account/billing/limits',
          '2. Increase monthly usage limit',
          '3. Add payment method if needed',
          '',
          'Current: $100/month',
          'Recommended: $200-300/month (remove this bottleneck)'
        ],
        urgencyReason: 'AI will stop working when quota exceeded',
        estimatedImpact: 'Unlimited AI operations vs stopped business'
      }];
    }

    // At 100% - CRITICAL
    if (quotaUsagePercent >= 100) {
      return [{
        id: 'api-quota-critical',
        title: '🚨 AI API QUOTA EXCEEDED - BUSINESS STOPPED',
        urgency: 'CRITICAL',
        description: `OpenAI quota EXCEEDED: $${this.usage.openaiCreditsUsed.toFixed(2)}/$${this.usage.openaiMonthlyBudget} used.`,
        impact: '⚠️ ALL AI FEATURES DISABLED - Cannot generate websites, content, or provide support',
        solution: 'URGENT: Increase OpenAI usage limit immediately',
        cost: '$200/month minimum for active business',
        blocksProgress: true,
        reducesConversion: true,
        recommendedAction: [
          '🚨 CRITICAL - BUSINESS STOPPED:',
          '',
          '1. Go to https://platform.openai.com/account/billing/limits',
          '2. Increase monthly usage limit to at least $200',
          '3. AI will resume automatically',
          '',
          '⏰ ALL AI FEATURES ARE DISABLED until resolved'
        ],
        urgencyReason: 'No AI = no website generation = no business',
        estimatedImpact: 'Business completely stopped until resolved'
      }];
    }

    return [];
  }

  /**
   * STRIPE PAYMENT SETUP NEEDED
   * Cannot collect payments without Stripe
   */
  async checkStripeSetupNeed() {
    const hasStripe = !!process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== '';

    // If we have paying customers but no Stripe setup
    if (this.usage.customersOnboarded > 0 && !hasStripe) {
      return [{
        id: 'stripe-setup',
        title: '💳 Payment Processing Setup Needed',
        urgency: 'CRITICAL',
        description: `${this.usage.customersOnboarded} customers signed up but CANNOT COLLECT PAYMENTS.`,
        impact: '⚠️ Closing sales but NOT GETTING PAID - losing revenue!',
        solution: 'Set up Stripe account and add API key',
        cost: 'FREE (2.9% + $0.30 per transaction)',
        blocksProgress: false,
        reducesConversion: false,
        recommendedAction: [
          '🚨 YOU ARE LOSING MONEY:',
          '',
          '1. Create Stripe account: https://stripe.com/register',
          '2. Get API keys (dashboard.stripe.com/apikeys)',
          '3. Add STRIPE_SECRET_KEY to .env',
          '4. AI will start collecting payments automatically',
          '',
          `⏰ ${this.usage.customersOnboarded} customers waiting to pay!`,
          `💰 Losing $${this.usage.customersOnboarded * 197}/month until resolved`
        ],
        urgencyReason: 'Customers ready to pay but cannot process payments',
        estimatedImpact: `+$${this.usage.customersOnboarded * 197}/month recurring revenue`
      }];
    }

    return [];
  }

  /**
   * TWILIO PHONE VERIFICATION NEEDED
   * Some features require verified numbers
   */
  async checkTwilioVerificationNeed() {
    const hasTwilio = !!process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID !== '';
    const hasPhone = !!process.env.TWILIO_PHONE_NUMBER && process.env.TWILIO_PHONE_NUMBER !== '';

    // If Twilio configured but no phone number
    if (hasTwilio && !hasPhone && this.usage.customersOnboarded > 5) {
      return [{
        id: 'twilio-phone',
        title: '📱 Business Phone Number Needed',
        urgency: 'MEDIUM',
        description: 'SMS outreach disabled - missing Twilio phone number.',
        impact: 'Cannot send SMS messages (30% of businesses prefer SMS)',
        solution: 'Get Twilio phone number',
        cost: '$1/month for phone number',
        blocksProgress: false,
        reducesConversion: true,
        recommendedAction: [
          '1. Login to Twilio: https://twilio.com/console',
          '2. Buy phone number ($1/month)',
          '3. Add TWILIO_PHONE_NUMBER to .env',
          '4. AI will start SMS outreach automatically',
          '',
          'Benefit: Reach 30% more prospects who prefer SMS'
        ],
        urgencyReason: 'Missing SMS channel = lower response rates',
        estimatedImpact: '+30% more leads reached'
      }];
    }

    return [];
  }

  /**
   * HOSTING UPGRADE NEEDED
   * Running locally or hitting hosting limits
   */
  async checkHostingUpgradeNeed() {
    const domain = process.env.DOMAIN || 'http://localhost:3000';
    const isLocal = domain.includes('localhost') || domain.includes('127.0.0.1');

    // If running locally and have customers
    if (isLocal && this.usage.customersOnboarded > 3) {
      return [{
        id: 'hosting-upgrade',
        title: '🌐 Cloud Hosting Needed',
        urgency: 'HIGH',
        description: `${this.usage.customersOnboarded} customers but still running on localhost.`,
        impact: 'Business stops when your computer sleeps/restarts. Not accessible 24/7.',
        solution: 'Deploy to cloud hosting (Railway, Vercel, Heroku)',
        cost: '$5-20/month',
        blocksProgress: false,
        reducesConversion: false,
        recommendedAction: [
          '🚨 RUNNING ON YOUR COMPUTER:',
          '',
          'Option 1 - Railway (Easiest):',
          '1. Install: npm install -g @railway/cli',
          '2. Deploy: railway login && railway init && railway up',
          '3. Add environment variables in Railway dashboard',
          '4. Cost: $5/month',
          '',
          'Option 2 - Vercel:',
          '1. vercel login',
          '2. vercel deploy',
          '3. Cost: Free tier available',
          '',
          'Benefit: Runs 24/7, customers always accessible'
        ],
        urgencyReason: 'Business stops when computer off = losing customers',
        estimatedImpact: '24/7 reliability vs downtime when computer off'
      }];
    }

    return [];
  }

  /**
   * Update usage metrics
   */
  updateUsage(metrics) {
    this.usage = { ...this.usage, ...metrics };
  }

  /**
   * Check if we should notify (avoid spam)
   */
  shouldNotify(needId) {
    const lastNotification = this.lastNotificationTime[needId];
    if (!lastNotification) return true;

    const hoursSinceLastNotification = (Date.now() - lastNotification) / (1000 * 60 * 60);
    return hoursSinceLastNotification >= this.notificationCooldownHours;
  }

  /**
   * Send critical need email
   */
  async sendCriticalNeedEmail(need) {
    this.logger.warn(`📧 Sending CRITICAL NEED email: ${need.title}`);

    try {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      const urgencyEmoji = {
        'CRITICAL': '🚨🚨🚨',
        'HIGH': '⚠️',
        'MEDIUM': '📋',
        'LOW': 'ℹ️'
      };

      const emailBody = `
Hi Anthony,

${urgencyEmoji[need.urgency]} Your autonomous AI needs your help to continue succeeding.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${need.urgency === 'CRITICAL' ? '🚨 CRITICAL - IMMEDIATE ACTION REQUIRED' : ''}
${need.title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${need.description}

${need.blocksProgress ? '🛑 BLOCKING PROGRESS: AI cannot continue without this' : ''}
${need.reducesConversion ? '📉 REDUCING CONVERSIONS: Hurting business performance' : ''}

💥 IMPACT:
${need.impact}

💡 SOLUTION:
${need.solution}

💰 COST:
${need.cost}

📋 WHAT TO DO:
${need.recommendedAction.join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${need.urgency === 'CRITICAL' ? `
⏰ THIS IS URGENT

The business is currently ${need.blocksProgress ? 'STOPPED' : 'IMPACTED'} until this is resolved.

Please take action as soon as possible.
` : `
⏰ URGENCY LEVEL: ${need.urgency}

Reason: ${need.urgencyReason}

Expected Impact: ${need.estimatedImpact}
`}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Need help? Just reply to this email.

Your Autonomous AI 🤖

P.S. I can do everything autonomously, but I need these resources from you to succeed!
`;

      await sgMail.send({
        to: process.env.EMERGENCY_CONTACT_EMAIL,
        from: process.env.FROM_EMAIL || 'ai@yourdomain.com',
        subject: `${urgencyEmoji[need.urgency]} ${need.urgency}: ${need.title}`,
        text: emailBody
      });

      this.logger.warn(`   ✓ Critical need email sent`);

      // Send SMS notification for CRITICAL needs
      if ((need.urgency === 'CRITICAL' || need.urgency === 'HIGH') && process.env.ENABLE_SMS_NOTIFICATIONS === 'true') {
        await this.sendCriticalNeedSMS(need);
      }

    } catch (error) {
      this.logger.error(`   ✗ Failed to send critical need email: ${error.message}`);
    }
  }

  /**
   * Send critical need SMS
   */
  async sendCriticalNeedSMS(need) {
    try {
      const twilio = require('twilio');
      const twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      const notificationPhone = process.env.NOTIFICATION_PHONE || process.env.EMERGENCY_CONTACT_PHONE;

      if (!notificationPhone) {
        return;
      }

      const urgencyEmoji = need.urgency === 'CRITICAL' ? '🚨🚨🚨' : '⚠️';

      const smsContent = `${urgencyEmoji} AI NEEDS HELP\n\n` +
        `${need.title}\n\n` +
        `${need.blocksProgress ? '🛑 BLOCKING: ' : ''}${need.description}\n\n` +
        `Check email for details.`;

      await twilioClient.messages.create({
        body: smsContent.substring(0, 160), // SMS limit
        from: process.env.TWILIO_PHONE_NUMBER,
        to: notificationPhone
      });

      this.logger.warn(`   ✓ Critical need SMS sent to ${notificationPhone}`);

    } catch (error) {
      this.logger.error(`   ✗ Failed to send SMS: ${error.message}`);
    }
  }

  /**
   * Log to dashboard for visibility
   */
  async logToDashboard(need) {
    // Store critical needs for dashboard display
    if (!global.criticalNeeds) {
      global.criticalNeeds = [];
    }

    global.criticalNeeds.unshift({
      ...need,
      timestamp: new Date().toISOString()
    });

    // Keep only last 10
    global.criticalNeeds = global.criticalNeeds.slice(0, 10);
  }

  /**
   * Get current critical needs
   */
  getCurrentNeeds() {
    return global.criticalNeeds || [];
  }
}

module.exports = CriticalNeedsMonitor;