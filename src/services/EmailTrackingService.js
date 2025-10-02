/**
 * EMAIL TRACKING SERVICE
 *
 * Tracks every email sent and monitors engagement:
 * - Delivered
 * - Opened
 * - Clicked demo link
 * - Visited website
 * - Purchased
 *
 * Stores in data/email-logs.json for dashboard display
 */

const fs = require('fs').promises;
const path = require('path');

class EmailTrackingService {
  constructor(logger) {
    this.logger = logger || console;
    this.logFile = path.join(__dirname, '../../data/email-logs.json');
    this.emails = [];
  }

  /**
   * Initialize - load existing email logs
   */
  async initialize() {
    try {
      const data = await fs.readFile(this.logFile, 'utf-8');
      this.emails = JSON.parse(data);
      this.logger.info(`Loaded ${this.emails.length} email tracking records`);
    } catch (error) {
      // File doesn't exist yet, start fresh
      this.emails = [];
      await this.save();
    }
  }

  /**
   * Track new email sent
   */
  async trackEmailSent(emailData) {
    const emailLog = {
      id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      to: emailData.to,
      businessName: emailData.businessName || 'Unknown',
      subject: emailData.subject,
      demoUrls: emailData.demoUrls || {},

      // Tracking statuses
      status: {
        sent: true,
        delivered: false,
        opened: false,
        clickedDemo: false,
        visitedWebsite: false,
        purchased: false,
        replied: false
      },

      // Timestamps
      timestamps: {
        sent: new Date().toISOString(),
        delivered: null,
        opened: null,
        clickedDemo: null,
        visitedWebsite: null,
        purchased: null,
        replied: null
      },

      // Metadata
      sendgridMessageId: emailData.sendgridMessageId || null,
      tier: emailData.tier || 'standard',
      phase: process.env.SKIP_RESEARCH === 'true' ? 'production' : 'research'
    };

    this.emails.push(emailLog);
    await this.save();

    this.logger.info(`📧 Tracked email to ${emailData.businessName} (${emailData.to})`);

    return emailLog;
  }

  /**
   * Update email status
   */
  async updateStatus(emailId, statusType, additionalData = {}) {
    const email = this.emails.find(e => e.id === emailId);

    if (!email) {
      this.logger.warn(`Email ${emailId} not found for status update`);
      return null;
    }

    // Update status
    email.status[statusType] = true;
    email.timestamps[statusType] = new Date().toISOString();

    // Add any additional data
    Object.assign(email, additionalData);

    await this.save();

    this.logger.info(`📊 Email ${emailId} updated: ${statusType}`);

    return email;
  }

  /**
   * Track email delivered (from SendGrid webhook)
   */
  async trackDelivered(sendgridMessageId) {
    const email = this.emails.find(e => e.sendgridMessageId === sendgridMessageId);

    if (email) {
      return await this.updateStatus(email.id, 'delivered');
    }

    return null;
  }

  /**
   * Track email opened (from SendGrid webhook)
   */
  async trackOpened(sendgridMessageId) {
    const email = this.emails.find(e => e.sendgridMessageId === sendgridMessageId);

    if (email) {
      return await this.updateStatus(email.id, 'opened');
    }

    return null;
  }

  /**
   * Track demo link clicked
   */
  async trackDemoClicked(demoUrl) {
    // Find email with this demo URL
    const email = this.emails.find(e => {
      return e.demoUrls && (
        e.demoUrls.standard === demoUrl ||
        e.demoUrls.premium === demoUrl ||
        e.demoUrls.comparison === demoUrl
      );
    });

    if (email) {
      return await this.updateStatus(email.id, 'clickedDemo', {
        lastClickedUrl: demoUrl
      });
    }

    return null;
  }

  /**
   * Track website visit
   */
  async trackWebsiteVisit(businessEmail) {
    const email = this.emails.find(e => e.to === businessEmail);

    if (email) {
      return await this.updateStatus(email.id, 'visitedWebsite');
    }

    return null;
  }

  /**
   * Track purchase
   */
  async trackPurchase(businessEmail, tier, amount) {
    const email = this.emails.find(e => e.to === businessEmail);

    if (email) {
      return await this.updateStatus(email.id, 'purchased', {
        purchasedTier: tier,
        purchaseAmount: amount
      });
    }

    return null;
  }

  /**
   * Get all emails (for dashboard)
   */
  async getAllEmails(options = {}) {
    let emails = [...this.emails];

    // Sort by most recent first
    emails.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply filters
    if (options.phase) {
      emails = emails.filter(e => e.phase === options.phase);
    }

    if (options.status) {
      emails = emails.filter(e => e.status[options.status] === true);
    }

    if (options.limit) {
      emails = emails.slice(0, options.limit);
    }

    return emails;
  }

  /**
   * Get email statistics
   */
  async getStats() {
    const total = this.emails.length;
    const delivered = this.emails.filter(e => e.status.delivered).length;
    const opened = this.emails.filter(e => e.status.opened).length;
    const clickedDemo = this.emails.filter(e => e.status.clickedDemo).length;
    const visitedWebsite = this.emails.filter(e => e.status.visitedWebsite).length;
    const purchased = this.emails.filter(e => e.status.purchased).length;

    return {
      total,
      delivered,
      opened,
      clickedDemo,
      visitedWebsite,
      purchased,

      // Conversion rates
      deliveryRate: total > 0 ? (delivered / total * 100).toFixed(1) : 0,
      openRate: delivered > 0 ? (opened / delivered * 100).toFixed(1) : 0,
      clickRate: opened > 0 ? (clickedDemo / opened * 100).toFixed(1) : 0,
      conversionRate: total > 0 ? (purchased / total * 100).toFixed(1) : 0,

      // By phase
      research: this.emails.filter(e => e.phase === 'research').length,
      production: this.emails.filter(e => e.phase === 'production').length
    };
  }

  /**
   * Save to file
   */
  async save() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.logFile);
      await fs.mkdir(dataDir, { recursive: true });

      // Write to file
      await fs.writeFile(
        this.logFile,
        JSON.stringify(this.emails, null, 2),
        'utf-8'
      );
    } catch (error) {
      this.logger.error(`Failed to save email logs: ${error.message}`);
    }
  }

  /**
   * Clean up old emails (keep last 1000)
   */
  async cleanup() {
    if (this.emails.length > 1000) {
      this.emails = this.emails.slice(-1000);
      await this.save();
      this.logger.info('Cleaned up old email logs, kept last 1000');
    }
  }
}

module.exports = EmailTrackingService;
