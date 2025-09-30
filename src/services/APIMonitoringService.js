const sgMail = require('@sendgrid/mail');
const OpenAI = require('openai');
const twilio = require('twilio');

class APIMonitoringService {
  constructor() {
    this.notificationEmail = process.env.NOTIFICATION_EMAIL; // anthonyg552005@gmail.com
    this.notificationPhone = process.env.NOTIFICATION_PHONE; // +17148241045
    this.enableSMS = process.env.ENABLE_SMS_NOTIFICATIONS === 'true';

    this.thresholds = {
      openai: {
        critical: 5.00,    // $5 remaining
        warning: 20.00     // $20 remaining
      },
      sendgrid: {
        critical: 500,     // 500 emails remaining (from 40,000 free tier)
        warning: 2000      // 2000 emails remaining
      },
      twilio: {
        critical: 5.00,    // $5 remaining
        warning: 15.00     // $15 remaining
      }
    };

    // Setup SendGrid
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }

    // Setup Twilio for SMS alerts
    this.twilioClient = null;
    if (this.enableSMS && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    }

    // Check usage every hour
    this.monitoringInterval = setInterval(() => {
      this.checkAllAPIUsage();
    }, 60 * 60 * 1000); // 1 hour

    console.log('📊 API Monitoring Service initialized');
    console.log(`   Email alerts: ${this.notificationEmail}`);
    console.log(`   SMS alerts: ${this.enableSMS ? this.notificationPhone : 'Disabled'}`);
  }

  /**
   * Monitor all API usage and send alerts
   */
  async checkAllAPIUsage() {
    try {
      console.log('🔍 Checking API usage across all services...');

      const results = await Promise.allSettled([
        this.checkOpenAIUsage(),
        this.checkSendGridUsage(),
        this.checkTwilioUsage()
      ]);

      // Collect any alerts that need to be sent
      const alerts = [];
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.needsAlert) {
          alerts.push(result.value);
        }
      });

      if (alerts.length > 0) {
        await this.sendCombinedAlert(alerts);
      } else {
        console.log('✅ All API services have sufficient credits');
      }

    } catch (error) {
      console.error('Error monitoring API usage:', error);
      await this.sendErrorAlert('API monitoring system error', error.message);
    }
  }

  /**
   * Check OpenAI token usage and remaining balance
   */
  async checkOpenAIUsage() {
    try {
      // OpenAI doesn't provide direct balance API
      // We estimate based on tracked usage
      const usage = await this.estimateOpenAIUsage();
      const remaining = usage.limit - usage.used;

      let alertLevel = null;
      if (remaining <= this.thresholds.openai.critical) {
        alertLevel = 'CRITICAL';
      } else if (remaining <= this.thresholds.openai.warning) {
        alertLevel = 'WARNING';
      }

      return {
        service: 'OpenAI',
        remaining: `$${remaining.toFixed(2)}`,
        used: `$${usage.used.toFixed(2)}`,
        limit: `$${usage.limit.toFixed(2)}`,
        percentage: ((usage.used / usage.limit) * 100).toFixed(1),
        alertLevel,
        needsAlert: alertLevel !== null,
        upgradeAction: 'Add more credits at platform.openai.com/account/billing'
      };

    } catch (error) {
      console.error('Error checking OpenAI usage:', error);
      return {
        service: 'OpenAI',
        error: error.message,
        needsAlert: true,
        alertLevel: 'ERROR'
      };
    }
  }

  /**
   * Check SendGrid email credits
   */
  async checkSendGridUsage() {
    try {
      const usage = await this.estimateSendGridUsage();
      const remaining = usage.limit - usage.used;

      let alertLevel = null;
      if (remaining <= this.thresholds.sendgrid.critical) {
        alertLevel = 'CRITICAL';
      } else if (remaining <= this.thresholds.sendgrid.warning) {
        alertLevel = 'WARNING';
      }

      return {
        service: 'SendGrid',
        remaining: `${remaining.toLocaleString()} emails`,
        used: `${usage.used.toLocaleString()} emails`,
        limit: `${usage.limit.toLocaleString()} emails`,
        percentage: ((usage.used / usage.limit) * 100).toFixed(1),
        alertLevel,
        needsAlert: alertLevel !== null,
        upgradeAction: 'Upgrade plan at app.sendgrid.com/settings/billing'
      };

    } catch (error) {
      console.error('Error checking SendGrid usage:', error);
      return {
        service: 'SendGrid',
        error: error.message,
        needsAlert: true,
        alertLevel: 'ERROR'
      };
    }
  }

  /**
   * Check Twilio SMS credits
   */
  async checkTwilioUsage() {
    try {
      if (!this.twilioClient) {
        return { service: 'Twilio', needsAlert: false };
      }

      const account = await this.twilioClient.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      const balance = parseFloat(account.balance);

      let alertLevel = null;
      if (balance <= this.thresholds.twilio.critical) {
        alertLevel = 'CRITICAL';
      } else if (balance <= this.thresholds.twilio.warning) {
        alertLevel = 'WARNING';
      }

      return {
        service: 'Twilio SMS',
        remaining: `$${balance.toFixed(2)}`,
        used: 'See Twilio Console',
        limit: 'Pay-as-you-go',
        percentage: balance > 15 ? 'Healthy' : 'Low',
        alertLevel,
        needsAlert: alertLevel !== null,
        upgradeAction: 'Add funds at console.twilio.com/billing'
      };

    } catch (error) {
      console.error('Error checking Twilio usage:', error);
      return {
        service: 'Twilio',
        error: error.message,
        needsAlert: true,
        alertLevel: 'ERROR'
      };
    }
  }

  /**
   * Send combined alert via email AND SMS
   */
  async sendCombinedAlert(alerts) {
    const criticalAlerts = alerts.filter(a => a.alertLevel === 'CRITICAL');
    const warningAlerts = alerts.filter(a => a.alertLevel === 'WARNING');
    const errorAlerts = alerts.filter(a => a.alertLevel === 'ERROR');

    const priority = criticalAlerts.length > 0 ? 'CRITICAL' : warningAlerts.length > 0 ? 'WARNING' : 'ERROR';

    // Send email alert
    await this.sendEmailAlert(alerts, priority);

    // Send SMS for critical alerts only
    if (priority === 'CRITICAL' && this.enableSMS) {
      await this.sendSMSAlert(criticalAlerts);
    }
  }

  /**
   * Send email alert
   */
  async sendEmailAlert(alerts, priority) {
    const emailHTML = this.generateAlertEmailHTML(alerts, priority);

    const subject = priority === 'CRITICAL'
      ? '🚨 URGENT: OatCode API Credits Running Low - Business Interruption Risk'
      : priority === 'WARNING'
      ? '⚠️ WARNING: OatCode API Credits Getting Low - Upgrade Soon'
      : '❌ ERROR: OatCode API Monitoring Issues';

    try {
      await sgMail.send({
        from: process.env.FROM_EMAIL,
        to: this.notificationEmail,
        subject: subject,
        html: emailHTML
      });

      console.log(`📧 Email alert sent: ${priority} level for ${alerts.length} services`);

    } catch (error) {
      console.error('Error sending alert email:', error);
    }
  }

  /**
   * Send SMS alert for critical issues
   */
  async sendSMSAlert(criticalAlerts) {
    if (!this.twilioClient || !this.notificationPhone) {
      return;
    }

    const services = criticalAlerts.map(a => a.service).join(', ');
    const message = `🚨 URGENT: OatCode.com - ${services} credits critically low! Check email for details. Business operations may stop soon.`;

    try {
      await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: this.notificationPhone
      });

      console.log(`📱 SMS alert sent to ${this.notificationPhone}`);

    } catch (error) {
      console.error('Error sending SMS alert:', error);
    }
  }

  /**
   * Generate alert email HTML
   */
  generateAlertEmailHTML(alerts, priority) {
    const priorityColors = {
      CRITICAL: '#dc2626',
      WARNING: '#f59e0b',
      ERROR: '#ef4444'
    };

    const priorityIcons = {
      CRITICAL: '🚨',
      WARNING: '⚠️',
      ERROR: '❌'
    };

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
            .header { background: ${priorityColors[priority]}; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .alert-box { background: white; border: 2px solid ${priorityColors[priority]}; border-radius: 8px; padding: 20px; margin: 15px 0; }
            .service-name { font-size: 18px; font-weight: bold; color: ${priorityColors[priority]}; }
            .usage-stats { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0; }
            .action-button { background: ${priorityColors[priority]}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
            .critical-warning { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h2>${priorityIcons[priority]} OatCode API Usage Alert - ${priority}</h2>
            <p>Autonomous Website Business System</p>
        </div>

        <div class="content">
            ${priority === 'CRITICAL' ? `
            <div class="critical-warning">
                <h3>⚠️ IMMEDIATE ACTION REQUIRED</h3>
                <p>Your OatCode business operations will be interrupted if these services run out of credits. Please upgrade immediately to avoid downtime.</p>
            </div>
            ` : ''}

            <h3>Service Usage Summary:</h3>

            ${alerts.map(alert => `
            <div class="alert-box">
                <div class="service-name">${alert.service} - ${alert.alertLevel}</div>

                ${alert.error ? `
                    <p><strong>Error:</strong> ${alert.error}</p>
                ` : `
                    <div class="usage-stats">
                        <p><strong>Remaining:</strong> ${alert.remaining}</p>
                        <p><strong>Used:</strong> ${alert.used}</p>
                        <p><strong>Limit:</strong> ${alert.limit}</p>
                        <p><strong>Usage:</strong> ${alert.percentage}%</p>
                    </div>
                `}

                <p><strong>Action Needed:</strong> ${alert.upgradeAction}</p>

                ${alert.service === 'OpenAI' ? `
                    <a href="https://platform.openai.com/account/billing" class="action-button">Upgrade OpenAI</a>
                ` : alert.service === 'SendGrid' ? `
                    <a href="https://app.sendgrid.com/settings/billing" class="action-button">Upgrade SendGrid</a>
                ` : alert.service.includes('Twilio') ? `
                    <a href="https://console.twilio.com/billing" class="action-button">Add Twilio Funds</a>
                ` : ''}
            </div>
            `).join('')}

            <h4>Business Impact:</h4>
            <ul>
                <li><strong>OpenAI:</strong> AI website generation and customer support will stop</li>
                <li><strong>SendGrid:</strong> No customer emails or outreach campaigns</li>
                <li><strong>Twilio:</strong> No SMS notifications</li>
            </ul>

            <p><strong>Recommendation:</strong> Set up automatic top-ups on all services to prevent future interruptions.</p>

            <p>This alert was generated automatically by your OatCode monitoring system.</p>
        </div>
    </body>
    </html>`;
  }

  /**
   * Estimate OpenAI usage (tracked in database)
   */
  async estimateOpenAIUsage() {
    // TODO: Track actual usage in database
    // For now, return conservative estimates
    return {
      used: 10.00,   // Estimated current usage
      limit: 50.00   // Typical prepaid limit
    };
  }

  /**
   * Estimate SendGrid usage
   */
  async estimateSendGridUsage() {
    // TODO: Track emails sent in database
    return {
      used: 1200,    // Emails sent this month
      limit: 40000   // Free tier limit
    };
  }

  /**
   * Send error alert
   */
  async sendErrorAlert(title, error) {
    try {
      await sgMail.send({
        from: process.env.FROM_EMAIL,
        to: this.notificationEmail,
        subject: `❌ OatCode System Error: ${title}`,
        text: `Error in OatCode autonomous system:\n\n${title}\n\nDetails: ${error}\n\nPlease check your system immediately.`
      });
    } catch (emailError) {
      console.error('Failed to send error alert:', emailError);
    }
  }

  /**
   * Manual usage check (for dashboard)
   */
  async getUsageStatus() {
    const results = await Promise.allSettled([
      this.checkOpenAIUsage(),
      this.checkSendGridUsage(),
      this.checkTwilioUsage()
    ]);

    return results.map(result =>
      result.status === 'fulfilled' ? result.value : { error: result.reason.message }
    );
  }

  /**
   * Update alert thresholds
   */
  updateThresholds(service, critical, warning) {
    if (this.thresholds[service]) {
      this.thresholds[service].critical = critical;
      this.thresholds[service].warning = warning;
      console.log(`Updated thresholds for ${service}: Critical=$${critical}, Warning=$${warning}`);
    }
  }

  /**
   * Cleanup on shutdown
   */
  shutdown() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      console.log('📊 API Monitoring Service stopped');
    }
  }
}

module.exports = APIMonitoringService;