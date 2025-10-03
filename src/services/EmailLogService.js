/**
 * EMAIL LOG SERVICE
 *
 * Tracks and stores every email sent to prospects and clients:
 * - Complete email history with content
 * - Timestamps and recipient details
 * - Email type (outreach, follow-up, customization, etc.)
 * - Dashboard API for viewing all emails
 */

const fs = require('fs').promises;
const path = require('path');

class EmailLogService {
  constructor(logger = console) {
    this.logger = logger;
    this.emailLogPath = path.join(process.cwd(), 'data', 'email-logs');
    this.emailIndexPath = path.join(this.emailLogPath, 'email-index.json');
  }

  /**
   * Initialize email log directory
   */
  async initialize() {
    try {
      await fs.mkdir(this.emailLogPath, { recursive: true });

      // Create index file if doesn't exist
      try {
        await fs.access(this.emailIndexPath);
      } catch {
        await fs.writeFile(this.emailIndexPath, JSON.stringify({ emails: [] }, null, 2));
      }

      this.logger.info('✅ EmailLogService initialized');
    } catch (error) {
      this.logger.error(`Failed to initialize EmailLogService: ${error.message}`);
    }
  }

  /**
   * LOG AN OUTREACH EMAIL
   */
  async logEmail(emailData) {
    try {
      const email = {
        id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: emailData.type || 'outreach',
        sentAt: new Date().toISOString(),
        recipient: {
          email: emailData.to,
          name: emailData.recipientName || 'Unknown',
          businessName: emailData.businessName || 'Unknown Business'
        },
        subject: emailData.subject,
        content: {
          text: emailData.text,
          html: emailData.html
        },
        metadata: {
          demoUrl: emailData.demoUrl || null,
          leadId: emailData.leadId || null,
          customerId: emailData.customerId || null,
          industry: emailData.industry || null,
          city: emailData.city || null,
          state: emailData.state || null
        },
        status: 'sent',
        opens: 0,
        clicks: 0,
        replies: []
      };

      // Save individual email file
      const emailFilePath = path.join(this.emailLogPath, `${email.id}.json`);
      await fs.writeFile(emailFilePath, JSON.stringify(email, null, 2));

      // Update index
      const index = await this.getEmailIndex();
      index.emails.unshift({
        id: email.id,
        type: email.type,
        sentAt: email.sentAt,
        recipient: email.recipient,
        subject: email.subject,
        demoUrl: email.metadata.demoUrl
      });

      // Keep only last 10,000 emails in index for performance
      if (index.emails.length > 10000) {
        index.emails = index.emails.slice(0, 10000);
      }

      await fs.writeFile(this.emailIndexPath, JSON.stringify(index, null, 2));

      this.logger.info(`📧 Email logged: ${email.id} to ${email.recipient.email}`);
      return email;

    } catch (error) {
      this.logger.error(`Failed to log email: ${error.message}`);
      return null;
    }
  }

  /**
   * GET EMAIL INDEX (all emails summary)
   */
  async getEmailIndex() {
    try {
      const data = await fs.readFile(this.emailIndexPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return { emails: [] };
    }
  }

  /**
   * GET FULL EMAIL BY ID
   */
  async getEmailById(emailId) {
    try {
      const emailFilePath = path.join(this.emailLogPath, `${emailId}.json`);
      const data = await fs.readFile(emailFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      this.logger.error(`Email not found: ${emailId}`);
      return null;
    }
  }

  /**
   * GET ALL EMAILS (paginated)
   */
  async getAllEmails(options = {}) {
    const {
      limit = 50,
      offset = 0,
      type = null,
      recipient = null,
      dateFrom = null,
      dateTo = null
    } = options;

    const index = await this.getEmailIndex();
    let emails = [...index.emails];

    // Filter by type
    if (type) {
      emails = emails.filter(e => e.type === type);
    }

    // Filter by recipient
    if (recipient) {
      emails = emails.filter(e =>
        e.recipient.email.toLowerCase().includes(recipient.toLowerCase()) ||
        e.recipient.businessName.toLowerCase().includes(recipient.toLowerCase())
      );
    }

    // Filter by date range
    if (dateFrom) {
      emails = emails.filter(e => new Date(e.sentAt) >= new Date(dateFrom));
    }
    if (dateTo) {
      emails = emails.filter(e => new Date(e.sentAt) <= new Date(dateTo));
    }

    // Paginate
    const total = emails.length;
    const paginated = emails.slice(offset, offset + limit);

    return {
      emails: paginated,
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    };
  }

  /**
   * GET EMAILS BY BUSINESS/PROSPECT
   */
  async getEmailsByBusiness(businessName) {
    const index = await this.getEmailIndex();
    return index.emails.filter(e =>
      e.recipient.businessName.toLowerCase().includes(businessName.toLowerCase())
    );
  }

  /**
   * GET EMAILS BY TYPE
   */
  async getEmailsByType(type) {
    const index = await this.getEmailIndex();
    return index.emails.filter(e => e.type === type);
  }

  /**
   * GET RECENT EMAILS
   */
  async getRecentEmails(count = 20) {
    const index = await this.getEmailIndex();
    return index.emails.slice(0, count);
  }

  /**
   * SEARCH EMAILS
   */
  async searchEmails(query) {
    const index = await this.getEmailIndex();
    const lowerQuery = query.toLowerCase();

    return index.emails.filter(e =>
      e.subject.toLowerCase().includes(lowerQuery) ||
      e.recipient.email.toLowerCase().includes(lowerQuery) ||
      e.recipient.businessName.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * GET EMAIL STATISTICS
   */
  async getEmailStats() {
    const index = await this.getEmailIndex();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      total: index.emails.length,
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      byType: {},
      recentActivity: []
    };

    index.emails.forEach(email => {
      const sentDate = new Date(email.sentAt);

      // Count by date
      if (sentDate >= today) stats.today++;
      if (sentDate >= thisWeek) stats.thisWeek++;
      if (sentDate >= thisMonth) stats.thisMonth++;

      // Count by type
      stats.byType[email.type] = (stats.byType[email.type] || 0) + 1;
    });

    // Recent activity (last 10)
    stats.recentActivity = index.emails.slice(0, 10).map(e => ({
      type: e.type,
      recipient: e.recipient.businessName,
      subject: e.subject,
      sentAt: e.sentAt
    }));

    return stats;
  }

  /**
   * TRACK EMAIL OPEN
   */
  async trackEmailOpen(emailId) {
    try {
      const email = await this.getEmailById(emailId);
      if (!email) return false;

      email.opens++;
      email.lastOpenedAt = new Date().toISOString();

      const emailFilePath = path.join(this.emailLogPath, `${emailId}.json`);
      await fs.writeFile(emailFilePath, JSON.stringify(email, null, 2));

      return true;
    } catch (error) {
      this.logger.error(`Failed to track email open: ${error.message}`);
      return false;
    }
  }

  /**
   * TRACK EMAIL CLICK
   */
  async trackEmailClick(emailId, linkUrl) {
    try {
      const email = await this.getEmailById(emailId);
      if (!email) return false;

      email.clicks++;
      email.lastClickedAt = new Date().toISOString();
      email.clickedLinks = email.clickedLinks || [];
      email.clickedLinks.push({
        url: linkUrl,
        clickedAt: new Date().toISOString()
      });

      const emailFilePath = path.join(this.emailLogPath, `${emailId}.json`);
      await fs.writeFile(emailFilePath, JSON.stringify(email, null, 2));

      return true;
    } catch (error) {
      this.logger.error(`Failed to track email click: ${error.message}`);
      return false;
    }
  }

  /**
   * ADD EMAIL REPLY
   */
  async addEmailReply(emailId, replyContent) {
    try {
      const email = await this.getEmailById(emailId);
      if (!email) return false;

      email.replies.push({
        content: replyContent,
        receivedAt: new Date().toISOString()
      });
      email.lastRepliedAt = new Date().toISOString();

      const emailFilePath = path.join(this.emailLogPath, `${emailId}.json`);
      await fs.writeFile(emailFilePath, JSON.stringify(email, null, 2));

      return true;
    } catch (error) {
      this.logger.error(`Failed to add email reply: ${error.message}`);
      return false;
    }
  }
}

module.exports = EmailLogService;
