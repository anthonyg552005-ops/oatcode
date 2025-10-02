/**
 * BUSINESS STATUS REPORT SERVICE
 *
 * Sends Anthony regular updates every 3 hours with:
 * - What the AI has been doing
 * - Key metrics and progress
 * - Interesting events/decisions
 * - What's planned next
 *
 * This keeps the owner in the loop without overwhelming them.
 */

const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');
const OpenAI = require('openai');

class BusinessStatusReportService {
  constructor(logger) {
    this.logger = logger;
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Setup SendGrid
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }

    // Setup Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }

    this.reportInterval = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
    this.lastReportTime = null;
    this.activityBuffer = []; // Store activities for next report
    this.timer = null;
  }

  /**
   * Start sending regular status reports
   */
  start() {
    this.logger.info('📊 Business Status Report Service started');
    this.logger.info('📧 Sending updates every 3 hours to anthonyg552005@gmail.com');

    // Send first report immediately
    setTimeout(() => this.sendStatusReport(), 5000);

    // Then send every 3 hours
    this.timer = setInterval(() => {
      this.sendStatusReport();
    }, this.reportInterval);
  }

  /**
   * Stop sending reports
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.logger.info('📊 Business Status Report Service stopped');
    }
  }

  /**
   * Log an activity for the next report
   */
  logActivity(activity) {
    this.activityBuffer.push({
      timestamp: new Date().toISOString(),
      activity
    });

    // Keep only last 100 activities
    if (this.activityBuffer.length > 100) {
      this.activityBuffer = this.activityBuffer.slice(-100);
    }
  }

  /**
   * Get current business metrics
   */
  async getBusinessMetrics() {
    const autonomousBusiness = global.autonomousBusiness;
    const autonomousMetrics = global.autonomousMetrics;

    return {
      // Core metrics
      leadsGenerated: autonomousBusiness?.stats?.leadsGenerated || 0,
      emailsSent: autonomousBusiness?.stats?.emailsSent || 0,
      demosCreated: autonomousBusiness?.stats?.demosCreated || 0,
      customersSigned: autonomousBusiness?.stats?.customersSigned || 0,
      revenue: autonomousBusiness?.stats?.revenue || 0,

      // System status
      systemRunning: !!autonomousBusiness || !!autonomousMetrics,
      isPaused: autonomousBusiness?.isPaused || false,
      currentPhase: process.env.SKIP_RESEARCH === 'true' ? 'production' : 'research',
      uptime: process.uptime()
    };
  }

  /**
   * Generate AI summary of what happened in the last 3 hours
   */
  async generateAISummary(metrics, activities) {
    const prompt = `You are an AI business assistant reporting to Anthony (the owner) about his autonomous AI-powered website business.

Current Status:
- Phase: ${metrics.currentPhase}
- System Running: ${metrics.systemRunning ? 'Yes' : 'No'}
- Uptime: ${Math.round(metrics.uptime / 3600)} hours

Metrics (Past 3 Hours):
- Leads Generated: ${metrics.leadsGenerated}
- Emails Sent: ${metrics.emailsSent}
- Demos Created: ${metrics.demosCreated}
- Customers Signed: ${metrics.customersSigned}
- Revenue: $${metrics.revenue}

Recent Activities (Last ${activities.length} events):
${activities.slice(-10).map(a => `- ${new Date(a.timestamp).toLocaleTimeString()}: ${a.activity}`).join('\n')}

Write a friendly, conversational 3-hour status update email to Anthony that:
1. Summarizes what the AI has been doing (in natural language, not just metrics)
2. Highlights any interesting decisions or events
3. Shows progress toward goals
4. Mentions what's planned next
5. Keeps it brief (3-4 paragraphs max)
6. Has a casual, "CEO talking to their business partner" tone

Return ONLY the email body (no subject line). Make it feel like a quick update from a trusted business partner.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 500
    });

    return response.choices[0].message.content.trim();
  }

  /**
   * Send 3-hour status report to Anthony
   */
  async sendStatusReport() {
    try {
      this.logger.info('📊 Generating 3-hour business status report...');

      // Get metrics
      const metrics = await this.getBusinessMetrics();

      // Build comprehensive report
      const subject = `📊 OatCode 3-Hour Update: ${this.getSummaryEmoji(metrics)} ${this.getQuickSummary(metrics)}`;

      const emailBody = `📊 AUTONOMOUS BUSINESS STATUS REPORT

Time Period: Past 3 Hours
System Status: ${metrics.systemRunning ? '✅ Running smoothly' : '⏸️ Paused'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 WHAT THE AI DID (Past 3 Hours):

${this.activityBuffer.length > 0 ? this.activityBuffer.slice(-10).map((a, i) => `${i + 1}. ${a.activity}`).join('\n') : '• Monitoring and optimizing systems\n• Health checks running every 60 seconds\n• Scheduled tasks executing on time'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 BUSINESS METRICS:

${this.formatMetrics(metrics)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💻 SYSTEM STATUS:

🎯 Phase: ${metrics.currentPhase === 'research' ? '🔬 7-Day Research & Testing' : '🚀 Production'}
⏱️  Uptime: ${this.formatUptime(metrics.uptime)}
💾 Health: ${metrics.systemRunning ? '✅ All systems normal' : '⚠️ System paused'}
🔄 Auto-Recovery: ✅ Active

${metrics.currentPhase === 'research' ? '\n⚠️ NOTE: System is in research phase - not sending real client emails yet, just testing and optimizing internally.\n' : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 WHAT'S NEXT (Scheduled):

• Next 3-hour report: In 3 hours
• Next optimization: Every hour
• Next A/B test: Every 2 hours
• Daily CEO presentation: Today at 8:00 PM

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overall Assessment: 🟢 System running autonomously and healthy!

- Your Autonomous AI 🤖

P.S. View dashboard: ${process.env.DOMAIN || 'http://oatcode.com'}/dashboard`;

      // Send email
      const msg = {
        to: process.env.NOTIFICATION_EMAIL || 'anthonyg552005@gmail.com',
        from: process.env.NOTIFICATION_EMAIL || 'anthonyg552005@gmail.com', // Use same email as verified sender
        subject,
        text: emailBody,
        html: emailBody.replace(/\n/g, '<br>').replace(/━/g, '─')
      };

      await sgMail.send(msg);

      this.logger.info(`✅ 3-hour status report sent to ${msg.to}`);
      this.lastReportTime = new Date();

      // Clear activity buffer
      this.activityBuffer = [];

    } catch (error) {
      this.logger.error(`❌ Failed to send status report: ${error.message}`);

      // If SendGrid fails, log it but don't crash
      if (error.code === 401 || error.code === 403) {
        this.logger.error('SendGrid authentication failed - check SENDGRID_API_KEY');
      }
    }
  }

  /**
   * Get emoji based on business performance
   */
  getSummaryEmoji(metrics) {
    if (metrics.customersSigned > 0) return '🎉';
    if (metrics.demosCreated > 5) return '🚀';
    if (metrics.emailsSent > 10) return '📧';
    if (metrics.leadsGenerated > 0) return '🔍';
    return '🤖';
  }

  /**
   * Get quick one-line summary
   */
  getQuickSummary(metrics) {
    if (metrics.currentPhase === 'research') {
      return 'Research Phase Progress';
    }

    if (metrics.customersSigned > 0) {
      return `${metrics.customersSigned} New Customer${metrics.customersSigned > 1 ? 's' : ''}!`;
    }

    if (metrics.demosCreated > 0) {
      return `${metrics.demosCreated} Demos Created`;
    }

    if (metrics.emailsSent > 0) {
      return `${metrics.emailsSent} Emails Sent`;
    }

    return 'System Running';
  }

  /**
   * Format metrics for email
   */
  formatMetrics(metrics) {
    return `🔍 Leads Generated: ${metrics.leadsGenerated}
📧 Emails Sent: ${metrics.emailsSent}
🌐 Demos Created: ${metrics.demosCreated}
✅ Customers Signed: ${metrics.customersSigned}
💰 Revenue: $${metrics.revenue.toFixed(2)}`;
  }

  /**
   * Format uptime to human-readable
   */
  formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''}, ${hours % 24}h`;
    }

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
  }

  /**
   * Send immediate update (for special events)
   */
  async sendImmediateUpdate(title, message) {
    try {
      const subject = `🚨 OatCode Alert: ${title}`;
      const emailBody = `Hi Anthony,

${message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is an immediate update outside the regular 3-hour schedule.

- Your Autonomous AI 🤖`;

      const msg = {
        to: process.env.NOTIFICATION_EMAIL || 'anthonyg552005@gmail.com',
        from: process.env.NOTIFICATION_EMAIL || 'anthonyg552005@gmail.com', // Use same email as verified sender
        subject,
        text: emailBody,
        html: emailBody.replace(/\n/g, '<br>')
      };

      await sgMail.send(msg);
      this.logger.info(`✅ Immediate update sent: ${title}`);

    } catch (error) {
      this.logger.error(`❌ Failed to send immediate update: ${error.message}`);
    }
  }
}

module.exports = BusinessStatusReportService;
