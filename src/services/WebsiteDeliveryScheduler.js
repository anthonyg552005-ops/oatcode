/**
 * WEBSITE DELIVERY SCHEDULER
 *
 * Checks for customers with pending_delivery status
 * Generates their website after 24-48 hours
 * Sends delivery email with website URL
 *
 * Runs every hour to process scheduled deliveries
 */

const db = require('../database/DatabaseService');
const sgMail = require('@sendgrid/mail');
const fs = require('fs').promises;
const path = require('path');

class WebsiteDeliveryScheduler {
  constructor(logger) {
    this.logger = logger || console;
    this.isRunning = false;
    this.checkInterval = 60 * 60 * 1000; // Check every hour
  }

  /**
   * Start the scheduler
   */
  async start() {
    this.logger.info('📅 Website Delivery Scheduler started');
    this.logger.info(`   Checking every hour for pending deliveries`);

    // Run immediately on start
    await this.checkPendingDeliveries();

    // Then run every hour
    this.intervalId = setInterval(async () => {
      await this.checkPendingDeliveries();
    }, this.checkInterval);

    this.isRunning = true;
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.isRunning = false;
      this.logger.info('📅 Website Delivery Scheduler stopped');
    }
  }

  /**
   * Check for pending deliveries that are ready
   */
  async checkPendingDeliveries() {
    if (!db.db) await db.connect();

    try {
      // Find customers with pending_delivery status whose delivery time has passed
      const now = new Date().toISOString();
      const pendingCustomers = await db.all(
        `SELECT * FROM customers
         WHERE status = 'pending_delivery'
         AND delivery_scheduled_for <= ?
         ORDER BY delivery_scheduled_for ASC`,
        [now]
      );

      if (pendingCustomers.length === 0) {
        this.logger.info(`📅 No pending deliveries at this time`);
        return;
      }

      this.logger.info(`📅 Found ${pendingCustomers.length} pending deliveries to process`);

      // Process each customer
      for (const customer of pendingCustomers) {
        try {
          await this.deliverWebsite(customer);
        } catch (error) {
          this.logger.error(`❌ Failed to deliver website for ${customer.email}: ${error.message}`);
        }
      }

    } catch (error) {
      this.logger.error(`❌ Error checking pending deliveries: ${error.message}`);
    }
  }

  /**
   * Generate and deliver website for a customer
   */
  async deliverWebsite(customer) {
    this.logger.info(`🎨 Delivering website for ${customer.business_name} (${customer.email})`);

    // Generate website
    const AIWebsiteGenerationService = require('./AIWebsiteGenerationService');
    const websiteGenerator = new AIWebsiteGenerationService(this.logger);

    const business = {
      name: customer.business_name,
      businessName: customer.business_name,
      industry: 'General Business',
      location: 'United States',
      city: 'Local Area',
      email: customer.email,
      phone: '(555) 123-4567',
      description: `Professional services provided by ${customer.business_name}`,
      tier: customer.tier
    };

    const strategy = {
      tier: customer.tier,
      colorDetails: {
        primary: '#667eea',
        secondary: '#764ba2',
        accent: '#10b981'
      }
    };

    const result = await websiteGenerator.generateCompleteWebsite(business, strategy);

    if (!result.success) {
      throw new Error(result.error || 'Website generation failed');
    }

    // Save website to demos folder
    const websiteId = `customer_${customer.stripe_customer_id}_${Date.now()}`;
    const websiteFile = path.join(__dirname, '../../public/demos', `${websiteId}.html`);
    const demosDir = path.dirname(websiteFile);

    await fs.mkdir(demosDir, { recursive: true });
    await fs.writeFile(websiteFile, result.files['index.html'], 'utf-8');

    const websiteUrl = `${process.env.DOMAIN || 'https://oatcode.com'}/demos/${websiteId}.html`;

    this.logger.info(`   ✅ Website generated: ${websiteUrl}`);

    // Update customer in database
    await db.updateCustomer(customer.id, {
      status: 'active',
      websiteUrl: websiteUrl
    });

    // Send delivery email
    await this.sendDeliveryEmail(customer, websiteUrl);

    this.logger.info(`   🎉 Website delivered to ${customer.email}!`);
  }

  /**
   * Send website delivery email
   */
  async sendDeliveryEmail(customer, websiteUrl) {
    if (!process.env.SENDGRID_API_KEY) {
      this.logger.warn(`   ⚠️  SendGrid not configured, skipping delivery email`);
      return;
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to: customer.email,
      from: {
        email: process.env.NOTIFICATION_EMAIL || 'hello@oatcode.com',
        name: 'OatCode'
      },
      subject: `🎉 Your Website is Ready!`,
      html: `
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
            padding: 40px 20px;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 30px;
        }
        .cta-button {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 Your Website is Ready!</h1>
        <p>Your ${customer.tier === 'premium' ? 'Premium' : 'Standard'} website is now live</p>
    </div>

    <h2>Hi ${customer.business_name}!</h2>

    <p>Great news! Your professional website is ready and live on the internet.</p>

    <p><strong>Your website is now live:</strong></p>

    <div style="text-align: center;">
        <a href="${websiteUrl}" class="cta-button">
            🌐 View Your Website
        </a>
    </div>

    <h3>What's included in your ${customer.tier === 'premium' ? 'Premium' : 'Standard'} plan:</h3>
    <ul>
        <li>✅ Professional modern design</li>
        <li>✅ Mobile-responsive (looks great on all devices)</li>
        <li>✅ SEO optimized for Google</li>
        <li>✅ Free hosting & SSL certificate</li>
        ${customer.tier === 'premium' ? `
        <li>✅ AI-generated custom images</li>
        <li>✅ Premium branding & design</li>
        ` : ''}
        <li>✅ 24/7 AI customer support</li>
        <li>✅ Automatic updates when you request changes</li>
    </ul>

    <h3>Need changes?</h3>
    <p>Simply reply to any of our check-in emails and tell us what you'd like changed. Our AI will update your website automatically within 24 hours!</p>

    <p>We'll check in with you in a few days to make sure everything is perfect.</p>

    <p>
        Best,<br>
        The OatCode Team<br>
        <em>Automated Website Management</em>
    </p>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">

    <p style="color: #64748b; font-size: 0.9em;">
        Questions? Just reply to this email.<br>
        Billing: $${customer.tier === 'premium' ? '297' : '197'}/month
    </p>
</body>
</html>
      `
    };

    await sgMail.send(msg);
    this.logger.info(`   ✅ Delivery email sent to ${customer.email}`);
  }
}

module.exports = WebsiteDeliveryScheduler;
