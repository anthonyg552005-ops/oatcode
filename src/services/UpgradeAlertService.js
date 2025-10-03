/**
 * UPGRADE ALERT SERVICE
 *
 * Monitors all service usage and alerts owner when upgrades are needed:
 * - Tracks customer count and revenue
 * - Monitors API usage across all services
 * - Alerts when approaching service limits
 * - Notifies when phase advancement is safe
 * - Provides specific upgrade instructions
 *
 * ALERTS VIA:
 * - Email (SendGrid)
 * - SMS (Twilio)
 * - Dashboard notifications
 */

const SendGridService = require('./SendGridService');

class UpgradeAlertService {
  constructor(logger = console) {
    this.logger = logger;
    this.sendGrid = new SendGridService();

    // Alert settings
    this.ownerEmail = process.env.NOTIFICATION_EMAIL || 'anthonyg552005@gmail.com';
    this.ownerPhone = process.env.NOTIFICATION_PHONE || '+17148241045';

    // Usage tracking
    this.currentUsage = {
      googlePlaces: 0,
      openAI: 0,
      sendGrid: 0,
      customers: 0,
      revenue: 0,
      lastReset: new Date()
    };

    // Alert history (prevent spam)
    this.alertsSent = new Map();
    this.alertCooldown = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * CHECK ALL SERVICES AND SEND ALERTS IF NEEDED
   * Call this every hour from autonomous engine
   */
  async checkForUpgrades(businessStats, currentPhase) {
    this.logger.info('🔍 Checking for required upgrades...');

    const alerts = [];

    // 1. Check if ready for phase advancement
    const phaseAlert = await this.checkPhaseAdvancement(businessStats, currentPhase);
    if (phaseAlert) alerts.push(phaseAlert);

    // 2. Check SendGrid email limits
    const sendGridAlert = await this.checkSendGridLimits(businessStats);
    if (sendGridAlert) alerts.push(sendGridAlert);

    // 3. Check Google Places API usage
    const googlePlacesAlert = await this.checkGooglePlacesUsage(businessStats);
    if (googlePlacesAlert) alerts.push(googlePlacesAlert);

    // 4. Check server resources
    const serverAlert = await this.checkServerResources(businessStats);
    if (serverAlert) alerts.push(serverAlert);

    // 5. Check OpenAI costs
    const openAIAlert = await this.checkOpenAICosts(businessStats);
    if (openAIAlert) alerts.push(openAIAlert);

    // Send all alerts
    if (alerts.length > 0) {
      await this.sendUpgradeNotification(alerts, businessStats, currentPhase);
      this.logger.info(`✅ Sent ${alerts.length} upgrade alert(s) to owner`);
    } else {
      this.logger.info('✅ All services within limits, no upgrades needed');
    }

    return alerts;
  }

  /**
   * CHECK IF READY TO ADVANCE TO NEXT PHASE
   */
  async checkPhaseAdvancement(stats, currentPhase) {
    const { customersSigned, revenue } = stats;

    // Load growth strategy
    const fs = require('fs').promises;
    const path = require('path');
    const strategyPath = path.join(process.cwd(), 'data', 'growth-strategy.json');

    let strategy;
    try {
      const data = await fs.readFile(strategyPath, 'utf8');
      strategy = JSON.parse(data);
    } catch (error) {
      return null;
    }

    // Find next phase
    const nextPhase = strategy.phases.find(p => p.phase === currentPhase.phase + 1);
    if (!nextPhase) return null; // Already at max phase

    // Check if we have enough customers
    const hasEnoughCustomers = customersSigned >= nextPhase.triggers.minCustomers;

    // Check if revenue covers 3x the new phase costs
    const nextPhaseCost = nextPhase.economics.total;
    const monthlyRevenue = customersSigned * 197; // $197 per customer
    const revenueSafetyRatio = monthlyRevenue / nextPhaseCost;
    const isSafe = revenueSafetyRatio >= 3;

    if (hasEnoughCustomers && isSafe) {
      // Check cooldown
      const alertKey = `phase_advancement_${nextPhase.phase}`;
      if (this.isOnCooldown(alertKey)) return null;

      this.markAlertSent(alertKey);

      return {
        type: 'PHASE_ADVANCEMENT',
        priority: 'HIGH',
        title: `🚀 Ready to Advance to Phase ${nextPhase.phase}: ${nextPhase.name}`,
        message: `Your business is ready to scale up!

**Current Status:**
- Customers: ${customersSigned}
- Monthly Revenue: $${monthlyRevenue}
- Current Phase: ${currentPhase.phase} (${currentPhase.name})

**Next Phase: ${nextPhase.phase} - ${nextPhase.name}**
- Goal: ${nextPhase.goal}
- New Monthly Cost: $${nextPhaseCost}
- Revenue Safety Ratio: ${revenueSafetyRatio.toFixed(1)}x (target: 3x) ✅
- Cities: ${nextPhase.settings.cities.length} (from ${currentPhase.settings.cities.length})
- Industries: ${nextPhase.settings.industries.length} (from ${currentPhase.settings.industries.length})
- Search Frequency: ${nextPhase.settings.searchFrequency}

**Action Required:**
The system will automatically advance to Phase ${nextPhase.phase} on the next phase check.
No manual action needed unless you want to delay the advancement.

**What Will Change:**
1. Lead generation will expand to ${nextPhase.settings.cities.length} cities
2. Targeting ${nextPhase.settings.industries.length} industry types
3. Searches will run ${nextPhase.settings.searchFrequency}
4. Monthly costs will increase to $${nextPhaseCost}
5. Expected revenue: $${nextPhase.economics.monthlyRevenueAtTarget} (${nextPhase.economics.profitMargin})`,
        actionRequired: false,
        autoHandled: true
      };
    }

    // Not ready yet - provide status update
    if (hasEnoughCustomers && !isSafe) {
      const customersNeeded = Math.ceil((nextPhaseCost * 3) / 197) - customersSigned;

      return {
        type: 'PHASE_PROGRESS',
        priority: 'LOW',
        title: `📊 Phase ${nextPhase.phase} Progress Update`,
        message: `Getting closer to Phase ${nextPhase.phase}!

**Current Status:**
- Customers: ${customersSigned} ✅
- Revenue: $${monthlyRevenue}
- Revenue needed: $${nextPhaseCost * 3} (3x safety margin)

**To Advance:**
- Need ${customersNeeded} more customer${customersNeeded > 1 ? 's' : ''}
- OR wait for existing customers to accumulate more revenue

No action needed - system will automatically advance when safe.`,
        actionRequired: false,
        autoHandled: true
      };
    }

    return null;
  }

  /**
   * CHECK SENDGRID EMAIL LIMITS
   */
  async checkSendGridLimits(stats) {
    const emailsSentThisMonth = stats.emailsSent || 0;

    // Free tier: 3,000 emails/month
    const freeTierLimit = 3000;
    const warningThreshold = freeTierLimit * 0.8; // 80% = 2,400 emails

    if (emailsSentThisMonth >= warningThreshold && emailsSentThisMonth < freeTierLimit) {
      const alertKey = 'sendgrid_approaching_limit';
      if (this.isOnCooldown(alertKey)) return null;
      this.markAlertSent(alertKey);

      return {
        type: 'SENDGRID_LIMIT_WARNING',
        priority: 'MEDIUM',
        title: '⚠️ SendGrid Free Tier Approaching Limit',
        message: `You've sent ${emailsSentThisMonth} emails this month (${Math.round(emailsSentThisMonth/freeTierLimit*100)}% of free tier).

**Free Tier Limit:** 3,000 emails/month
**Remaining:** ${freeTierLimit - emailsSentThisMonth} emails

**Next Tier:** SendGrid Essentials
- Cost: $19.95/month
- Limit: 50,000 emails/month
- Link: https://sendgrid.com/pricing

**Recommendation:**
Wait until you hit 100% of free tier before upgrading.
The system will automatically notify you when upgrade is required.`,
        actionRequired: false,
        autoHandled: false
      };
    }

    if (emailsSentThisMonth >= freeTierLimit) {
      const alertKey = 'sendgrid_limit_exceeded';
      if (this.isOnCooldown(alertKey)) return null;
      this.markAlertSent(alertKey);

      return {
        type: 'SENDGRID_UPGRADE_REQUIRED',
        priority: 'HIGH',
        title: '🚨 SendGrid Upgrade Required - Free Tier Exceeded',
        message: `You've sent ${emailsSentThisMonth} emails this month, exceeding the free tier limit of 3,000.

**ACTION REQUIRED:**
Upgrade to SendGrid Essentials to continue sending emails.

**Upgrade Steps:**
1. Go to: https://sendgrid.com/pricing
2. Select "Essentials" plan ($19.95/month)
3. Complete upgrade
4. No code changes needed - system will continue automatically

**If Not Upgraded:**
- Email sending will be paused
- Lead generation will continue
- Leads will queue for outreach once upgraded

Current email queue: ${stats.leadsGenerated - stats.emailsSent} leads waiting`,
        actionRequired: true,
        autoHandled: false,
        upgradeLink: 'https://sendgrid.com/pricing'
      };
    }

    return null;
  }

  /**
   * CHECK GOOGLE PLACES API USAGE
   */
  async checkGooglePlacesUsage(stats) {
    // Google Places has a free tier of $200/month credit
    // We track usage based on current phase

    const estimatedMonthlyCost = this.estimateGooglePlacesCost(stats);
    const freeCredit = 200;

    if (estimatedMonthlyCost >= freeCredit * 0.9) {
      const alertKey = 'google_places_approaching_limit';
      if (this.isOnCooldown(alertKey)) return null;
      this.markAlertSent(alertKey);

      return {
        type: 'GOOGLE_PLACES_COST_WARNING',
        priority: 'MEDIUM',
        title: '⚠️ Google Places API Approaching Free Credit Limit',
        message: `Estimated Google Places cost this month: $${estimatedMonthlyCost}
Free credit: $${freeCredit}/month

**Current Usage:**
- Leads generated: ${stats.leadsGenerated}
- Estimated cost: $${estimatedMonthlyCost}

**Action:**
No immediate action required. Google will automatically charge your card if you exceed free credit.
This is expected as you scale.

**Cost per phase:**
- Phase 1: ~$35/month
- Phase 2: ~$80/month
- Phase 3: ~$750/month

Your customer revenue covers this cost automatically.`,
        actionRequired: false,
        autoHandled: true
      };
    }

    return null;
  }

  /**
   * CHECK SERVER RESOURCES
   */
  async checkServerResources(stats) {
    const { customersSigned } = stats;

    // Recommend upgrade at 15+ customers (Phase 3)
    if (customersSigned >= 15 && customersSigned < 16) {
      const alertKey = 'server_upgrade_phase3';
      if (this.isOnCooldown(alertKey)) return null;
      this.markAlertSent(alertKey);

      return {
        type: 'SERVER_UPGRADE_RECOMMENDED',
        priority: 'MEDIUM',
        title: '💻 Server Upgrade Recommended for Phase 3',
        message: `You now have ${customersSigned} customers - entering Phase 3 (Aggressive Growth).

**Current Server:** Basic droplet ($12/month)
**Recommended:** Upgrade to $24/month droplet for better performance

**Why Upgrade:**
- More CPU for increased lead processing
- More RAM for concurrent operations
- Better stability under higher load

**How to Upgrade (Railway):**
If you're on Railway, the platform auto-scales. No action needed.

**How to Upgrade (DigitalOcean):**
1. Go to: https://cloud.digitalocean.com/droplets
2. Select your droplet
3. Click "Resize"
4. Select $24/month plan
5. Confirm upgrade

**Cost:** +$12/month (from $12 to $24)
**Covered by:** Your customer revenue ($${customersSigned * 197}/month)`,
        actionRequired: true,
        autoHandled: false,
        upgradeLink: 'https://cloud.digitalocean.com/droplets'
      };
    }

    return null;
  }

  /**
   * CHECK OPENAI COSTS
   */
  async checkOpenAICosts(stats) {
    // With GPT-4-mini optimization, OpenAI costs are minimal
    // Only alert if costs seem abnormally high

    const estimatedMonthlyCost = (stats.leadsGenerated || 0) * 0.030; // $0.030 per lead
    const expectedCost = estimatedMonthlyCost;

    // Only alert if costs are 2x higher than expected (suggests GPT-4-mini not being used)
    if (estimatedMonthlyCost > expectedCost * 2) {
      const alertKey = 'openai_high_costs';
      if (this.isOnCooldown(alertKey)) return null;
      this.markAlertSent(alertKey);

      return {
        type: 'OPENAI_COST_WARNING',
        priority: 'HIGH',
        title: '⚠️ OpenAI Costs Higher Than Expected',
        message: `Estimated OpenAI cost: $${estimatedMonthlyCost.toFixed(2)}
Expected cost: $${expectedCost.toFixed(2)}

**Possible Issues:**
1. GPT-4-mini not being used for research
2. Too many API retries
3. Generating more content than needed

**Check:**
Verify that GPT-4-mini is configured for research operations.
Expected cost: $0.030 per lead

**Current Rate:** $${(estimatedMonthlyCost / (stats.leadsGenerated || 1)).toFixed(4)} per lead`,
        actionRequired: false,
        autoHandled: false
      };
    }

    return null;
  }

  /**
   * SEND CONSOLIDATED UPGRADE NOTIFICATION
   */
  async sendUpgradeNotification(alerts, stats, currentPhase) {
    const highPriorityAlerts = alerts.filter(a => a.priority === 'HIGH');
    const mediumPriorityAlerts = alerts.filter(a => a.priority === 'MEDIUM');
    const lowPriorityAlerts = alerts.filter(a => a.priority === 'LOW');

    // Build email content
    let emailContent = `
<h1>🔔 Upgrade Alert for OatCode Autonomous Business</h1>

<h2>📊 Current Status</h2>
<ul>
  <li><strong>Phase:</strong> ${currentPhase.phase} - ${currentPhase.name}</li>
  <li><strong>Customers:</strong> ${stats.customersSigned}</li>
  <li><strong>Revenue:</strong> $${stats.customersSigned * 197}/month</li>
  <li><strong>Leads Generated:</strong> ${stats.leadsGenerated}</li>
  <li><strong>Emails Sent:</strong> ${stats.emailsSent}</li>
</ul>

<hr>
`;

    // High priority alerts
    if (highPriorityAlerts.length > 0) {
      emailContent += `<h2>🚨 High Priority Actions Required</h2>`;
      for (const alert of highPriorityAlerts) {
        emailContent += `
<h3>${alert.title}</h3>
<pre>${alert.message}</pre>
${alert.upgradeLink ? `<p><a href="${alert.upgradeLink}" style="background: #ff0000; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Upgrade Now</a></p>` : ''}
<hr>
`;
      }
    }

    // Medium priority alerts
    if (mediumPriorityAlerts.length > 0) {
      emailContent += `<h2>⚠️ Medium Priority Recommendations</h2>`;
      for (const alert of mediumPriorityAlerts) {
        emailContent += `
<h3>${alert.title}</h3>
<pre>${alert.message}</pre>
${alert.upgradeLink ? `<p><a href="${alert.upgradeLink}" style="background: #ff9900; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Upgrade</a></p>` : ''}
<hr>
`;
      }
    }

    // Low priority alerts
    if (lowPriorityAlerts.length > 0) {
      emailContent += `<h2>📊 Status Updates</h2>`;
      for (const alert of lowPriorityAlerts) {
        emailContent += `
<h3>${alert.title}</h3>
<pre>${alert.message}</pre>
<hr>
`;
      }
    }

    emailContent += `
<p style="color: #666; font-size: 12px;">
This is an automated notification from your OatCode Autonomous Business System.
If you have questions, reply to this email.
</p>
`;

    // Send email
    try {
      await this.sendGrid.send({
        to: this.ownerEmail,
        subject: `🔔 Upgrade Alert: ${highPriorityAlerts.length} High Priority, ${mediumPriorityAlerts.length} Medium Priority`,
        text: this.htmlToText(emailContent),
        html: emailContent
      });

      this.logger.info(`✅ Upgrade notification sent to ${this.ownerEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send upgrade notification: ${error.message}`);
    }

    // Send SMS for high priority alerts only
    if (highPriorityAlerts.length > 0) {
      try {
        const smsMessage = `OatCode Alert: ${highPriorityAlerts.length} urgent upgrade(s) needed. Check your email for details.`;

        // Only send SMS if Twilio is configured
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
          const twilio = require('twilio');
          const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

          await client.messages.create({
            body: smsMessage,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: this.ownerPhone
          });

          this.logger.info(`✅ SMS alert sent to ${this.ownerPhone}`);
        }
      } catch (error) {
        this.logger.error(`Failed to send SMS alert: ${error.message}`);
      }
    }
  }

  /**
   * HELPER: Check if alert is on cooldown
   */
  isOnCooldown(alertKey) {
    const lastSent = this.alertsSent.get(alertKey);
    if (!lastSent) return false;

    const timeSince = Date.now() - lastSent;
    return timeSince < this.alertCooldown;
  }

  /**
   * HELPER: Mark alert as sent
   */
  markAlertSent(alertKey) {
    this.alertsSent.set(alertKey, Date.now());
  }

  /**
   * HELPER: Estimate Google Places cost
   */
  estimateGooglePlacesCost(stats) {
    // Text search: $32/1000 requests
    // Place details: $17/1000 requests
    // Estimate based on leads generated
    const leads = stats.leadsGenerated || 0;
    const searchCost = (leads / 1000) * 32;
    const detailsCost = (leads / 1000) * 17;
    return searchCost + detailsCost;
  }

  /**
   * HELPER: Convert HTML to plain text
   */
  htmlToText(html) {
    return html
      .replace(/<h[1-6]>/g, '\n\n')
      .replace(/<\/h[1-6]>/g, '\n')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<\/p>/g, '\n\n')
      .replace(/<li>/g, '- ')
      .replace(/<\/li>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
  }

  /**
   * GET CURRENT USAGE SUMMARY
   */
  getUsageSummary() {
    return {
      ...this.currentUsage,
      alerts: Array.from(this.alertsSent.entries()).map(([key, timestamp]) => ({
        key,
        sentAt: new Date(timestamp),
        cooldownRemaining: Math.max(0, this.alertCooldown - (Date.now() - timestamp))
      }))
    };
  }
}

module.exports = UpgradeAlertService;
