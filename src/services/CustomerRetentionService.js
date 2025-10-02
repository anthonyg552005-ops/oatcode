/**
 * CUSTOMER RETENTION SERVICE
 *
 * Autonomous post-purchase customer care system:
 * - Sends check-in emails asking if they're happy with website
 * - Collects feedback and requests for changes
 * - Triggers autonomous website updates based on their requests
 * - Goal: Keep customers happy so they keep paying monthly subscription
 *
 * Timeline:
 * - Day 3 after purchase: First check-in "How's your new website?"
 * - Day 14: Second check-in "Need any updates?"
 * - Every 30 days after: Regular check-ins "Any changes you'd like?"
 */

const fs = require('fs').promises;
const path = require('path');
const sgMail = require('@sendgrid/mail');

class CustomerRetentionService {
  constructor(logger) {
    this.logger = logger || console;
    this.customersFile = path.join(__dirname, '../../data/customers.json');
    this.customers = [];

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    // Check-in schedule (days after purchase)
    this.checkInSchedule = [3, 14, 30, 60, 90, 120]; // Then every 30 days after 120
  }

  /**
   * Initialize - load customer data
   */
  async initialize() {
    try {
      const data = await fs.readFile(this.customersFile, 'utf-8');
      this.customers = JSON.parse(data);
      this.logger.info(`📊 Loaded ${this.customers.length} customers for retention tracking`);
    } catch (error) {
      // File doesn't exist yet
      this.customers = [];
      await this.save();
      this.logger.info('✨ Initialized customer retention tracking');
    }
  }

  /**
   * Add new customer (called when purchase happens)
   */
  async addCustomer(customerData) {
    const customer = {
      id: `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: customerData.email,
      businessName: customerData.businessName,
      tier: customerData.tier, // 'standard' or 'premium'
      purchaseDate: new Date().toISOString(),
      websiteUrl: customerData.websiteUrl,
      websiteData: customerData.websiteData, // Original generated website data

      // Retention tracking
      checkIns: [],
      lastCheckIn: null,
      feedbackCount: 0,
      updatesRequested: 0,
      updatesCompleted: 0,
      satisfactionScore: null,

      // Subscription status
      subscriptionActive: true,
      lastPaymentDate: new Date().toISOString(),
      churnRisk: 'low' // low, medium, high
    };

    this.customers.push(customer);
    await this.save();

    this.logger.info(`✅ Added customer: ${customerData.businessName} - first check-in scheduled for Day 3`);

    return customer;
  }

  /**
   * Process daily check-ins (runs every day)
   */
  async processDailyCheckIns() {
    this.logger.info('🔍 Checking for customers due for check-in emails...');

    const now = new Date();
    let checkInsSent = 0;

    for (const customer of this.customers) {
      if (!customer.subscriptionActive) continue;

      const daysSincePurchase = this.getDaysSince(customer.purchaseDate);
      const daysSinceLastCheckIn = customer.lastCheckIn ? this.getDaysSince(customer.lastCheckIn) : daysSincePurchase;

      // Determine if check-in is due
      let shouldCheckIn = false;

      if (this.checkInSchedule.includes(daysSincePurchase)) {
        // Scheduled check-in
        shouldCheckIn = true;
      } else if (daysSincePurchase > 120 && daysSinceLastCheckIn >= 30) {
        // After day 120, check in every 30 days
        shouldCheckIn = true;
      }

      if (shouldCheckIn) {
        await this.sendCheckInEmail(customer, daysSincePurchase);
        checkInsSent++;
      }
    }

    if (checkInsSent > 0) {
      this.logger.info(`📧 Sent ${checkInsSent} customer check-in emails`);
    } else {
      this.logger.info('✓ No check-ins due today');
    }

    return checkInsSent;
  }

  /**
   * Send check-in email to customer
   */
  async sendCheckInEmail(customer, daysSincePurchase) {
    try {
      const checkInType = this.getCheckInType(daysSincePurchase);
      const subject = this.getCheckInSubject(customer, checkInType);
      const body = this.buildCheckInEmail(customer, checkInType);

      const msg = {
        to: customer.email,
        from: {
          email: process.env.NOTIFICATION_EMAIL || 'anthonyg552005@gmail.com',
          name: 'OatCode Support'
        },
        subject,
        html: body,
        replyTo: process.env.NOTIFICATION_EMAIL || 'anthonyg552005@gmail.com'
      };

      await sgMail.send(msg);

      // Track check-in
      customer.checkIns.push({
        date: new Date().toISOString(),
        daysSincePurchase,
        type: checkInType,
        emailSubject: subject,
        responded: false
      });
      customer.lastCheckIn = new Date().toISOString();

      await this.save();

      this.logger.info(`📧 Check-in sent to ${customer.businessName} (Day ${daysSincePurchase})`);

      // Track in global email tracking
      if (global.emailTracking) {
        await global.emailTracking.trackEmailSent({
          to: customer.email,
          businessName: customer.businessName,
          subject,
          type: 'retention_checkin'
        });
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`❌ Failed to send check-in to ${customer.email}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get check-in type based on days since purchase
   */
  getCheckInType(days) {
    if (days <= 3) return 'first_impression';
    if (days <= 14) return 'early_feedback';
    if (days <= 30) return 'first_month';
    if (days <= 60) return 'two_month';
    return 'regular_checkin';
  }

  /**
   * Get personalized subject line
   */
  getCheckInSubject(customer, type) {
    const subjects = {
      first_impression: `How's your new website, ${customer.businessName}?`,
      early_feedback: `${customer.businessName} - Any updates you'd like?`,
      first_month: `Quick check-in about your ${customer.businessName} website`,
      two_month: `${customer.businessName} - Time for a refresh?`,
      regular_checkin: `Keeping ${customer.businessName} looking fresh 🎨`
    };

    return subjects[type] || `Quick check-in from OatCode`;
  }

  /**
   * Build check-in email HTML
   */
  buildCheckInEmail(customer, type) {
    const domain = process.env.DOMAIN || 'http://oatcode.com';
    const feedbackUrl = `${domain}/api/feedback/${customer.id}`;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1e293b;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 30px;
        }
        .content {
            background: #f8fafc;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 20px;
        }
        .cta-button {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 10px 5px;
        }
        .quick-reply {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
        }
        .emoji-option {
            font-size: 2em;
            margin: 10px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>👋 Hey ${customer.businessName}!</h1>
        <p>Quick check-in from your OatCode team</p>
    </div>

    <div class="content">
        ${this.getCheckInMessage(type, customer)}

        <div class="quick-reply">
            <h3>How are you liking your website?</h3>
            <p style="color: #64748b; font-size: 0.9em;">Just reply to this email and let us know:</p>

            <ul style="list-style: none; padding: 0;">
                <li>✅ <strong>Love it!</strong> - Everything is perfect</li>
                <li>🔧 <strong>Need a tweak</strong> - Small changes you'd like</li>
                <li>🎨 <strong>Want an update</strong> - Fresh look or new content</li>
                <li>❓ <strong>Have questions</strong> - We're here to help</li>
            </ul>

            <p style="margin-top: 20px;">
                <strong>Need changes?</strong> Just describe what you want and our AI will update your website automatically.
                Things we can do:
            </p>
            <ul>
                <li>📝 Update text, hours, or contact info</li>
                <li>🎨 Change colors or layout</li>
                <li>📸 Add or update images</li>
                <li>✨ Add new sections or features</li>
                <li>📱 Optimize for mobile</li>
            </ul>
        </div>

        <div style="text-align: center; margin-top: 30px;">
            <p><strong>Simply reply to this email with what you'd like changed.</strong></p>
            <p style="color: #64748b; font-size: 0.9em;">
                We typically process updates within 24 hours, completely automated.
            </p>
        </div>
    </div>

    <div style="text-align: center; color: #64748b; font-size: 0.85em;">
        <p>
            Your website: <a href="${customer.websiteUrl}">${customer.websiteUrl}</a><br>
            Questions? Just reply to this email.
        </p>
        <p style="margin-top: 20px;">
            OatCode - Automated Website Management<br>
            Keeping your online presence fresh, automatically.
        </p>
    </div>
</body>
</html>
    `;
  }

  /**
   * Get personalized message based on check-in type
   */
  getCheckInMessage(type, customer) {
    const messages = {
      first_impression: `
        <p>It's been a few days since we launched your website. How's it working out for you?</p>
        <p>We want to make sure everything is exactly how you want it. If there's anything you'd like to change or update, just let us know!</p>
      `,
      early_feedback: `
        <p>We wanted to check in and see how your website is performing for you.</p>
        <p>Need any updates? Maybe new photos, updated hours, or fresh content? We can make it happen automatically.</p>
      `,
      first_month: `
        <p>It's been a month with your new website! Time flies when you're looking professional online 😊</p>
        <p>Is there anything you'd like to refresh or update? We're here to keep your site looking current.</p>
      `,
      two_month: `
        <p>Hope your website has been working great for ${customer.businessName}!</p>
        <p>Many of our customers like to refresh their content every couple months. Any updates you'd like to make?</p>
      `,
      regular_checkin: `
        <p>Just checking in to make sure your website is still serving you well!</p>
        <p>If you'd like any updates or changes, we're always here to help. Our AI can handle it automatically.</p>
      `
    };

    return messages[type] || messages.regular_checkin;
  }

  /**
   * Process customer feedback (called when they reply to check-in email)
   */
  async processFeedback(customerId, feedbackText) {
    const customer = this.customers.find(c => c.id === customerId);
    if (!customer) {
      this.logger.warn(`Customer ${customerId} not found for feedback processing`);
      return { success: false, error: 'Customer not found' };
    }

    this.logger.info(`📨 Processing feedback from ${customer.businessName}...`);

    // Use CustomerFeedbackService to analyze and process
    const feedbackService = require('./CustomerFeedbackService');
    const result = await feedbackService.processFeedback(customer, feedbackText);

    // Update customer record
    customer.feedbackCount++;
    if (result.updatesRequested) {
      customer.updatesRequested++;
    }

    // Mark last check-in as responded
    if (customer.checkIns.length > 0) {
      customer.checkIns[customer.checkIns.length - 1].responded = true;
      customer.checkIns[customer.checkIns.length - 1].feedbackText = feedbackText;
    }

    await this.save();

    return result;
  }

  /**
   * Calculate days since a date
   */
  getDaysSince(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    return Math.floor((now - date) / (1000 * 60 * 60 * 24));
  }

  /**
   * Update customer's churn risk based on engagement
   */
  async updateChurnRisk(customer) {
    const daysSinceLastCheckIn = customer.lastCheckIn ? this.getDaysSince(customer.lastCheckIn) : 999;
    const responseRate = customer.checkIns.length > 0 ?
      customer.checkIns.filter(c => c.responded).length / customer.checkIns.length : 0;

    let risk = 'low';

    if (daysSinceLastCheckIn > 60 && responseRate < 0.2) {
      risk = 'high';
    } else if (daysSinceLastCheckIn > 30 && responseRate < 0.5) {
      risk = 'medium';
    }

    customer.churnRisk = risk;
    await this.save();

    if (risk === 'high') {
      this.logger.warn(`⚠️ High churn risk: ${customer.businessName}`);
    }
  }

  /**
   * Get retention stats
   */
  async getStats() {
    const total = this.customers.length;
    const active = this.customers.filter(c => c.subscriptionActive).length;
    const totalCheckIns = this.customers.reduce((sum, c) => sum + c.checkIns.length, 0);
    const totalResponses = this.customers.reduce((sum, c) => sum + c.checkIns.filter(ci => ci.responded).length, 0);
    const totalUpdates = this.customers.reduce((sum, c) => sum + c.updatesCompleted, 0);

    return {
      totalCustomers: total,
      activeSubscriptions: active,
      churnedCustomers: total - active,
      checkInsSent: totalCheckIns,
      responseRate: totalCheckIns > 0 ? ((totalResponses / totalCheckIns) * 100).toFixed(1) : 0,
      updatesCompleted: totalUpdates,
      avgUpdatesPerCustomer: total > 0 ? (totalUpdates / total).toFixed(1) : 0,
      highChurnRisk: this.customers.filter(c => c.churnRisk === 'high').length
    };
  }

  /**
   * Save to file
   */
  async save() {
    try {
      const dataDir = path.dirname(this.customersFile);
      await fs.mkdir(dataDir, { recursive: true });

      await fs.writeFile(
        this.customersFile,
        JSON.stringify(this.customers, null, 2),
        'utf-8'
      );
    } catch (error) {
      this.logger.error(`Failed to save customer data: ${error.message}`);
    }
  }
}

module.exports = CustomerRetentionService;
