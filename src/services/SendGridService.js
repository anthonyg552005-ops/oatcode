/**
 * SendGrid Email Service
 * Wrapper for SendGrid API with deliverability best practices
 */

const sgMail = require('@sendgrid/mail');

class SendGridService {
  constructor() {
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.enabled = true;
    } else {
      this.enabled = false;
      console.warn('⚠️  SendGrid API key not configured');
    }
  }

  /**
   * Send email via SendGrid with anti-spam best practices
   */
  async send(options) {
    if (!this.enabled) {
      console.log('📧 [SIMULATION] Would send email:', options.to);
      return { success: true, simulated: true };
    }

    try {
      // Build message with deliverability best practices
      const msg = {
        to: options.to,
        from: {
          email: options.from || process.env.FROM_EMAIL || 'noreply@oatcode.com',
          name: options.fromName || 'OatCode'
        },
        replyTo: {
          email: process.env.NOTIFICATION_EMAIL || 'anthonyg552005@gmail.com',
          name: 'Anthony at OatCode'
        },
        subject: options.subject,
        text: options.text,
        html: options.html,
        headers: {
          'X-Priority': '3',
          'X-MSMail-Priority': 'Normal',
          'Importance': 'Normal',
          'List-Unsubscribe': `<mailto:unsubscribe@oatcode.com?subject=Unsubscribe>, <https://oatcode.com/unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        },
        trackingSettings: {
          clickTracking: {
            enable: true,
            enableText: false
          },
          openTracking: {
            enable: true
          },
          subscriptionTracking: {
            enable: false
          }
        }
      };

      // Add personalization if provided
      if (options.recipientName) {
        msg.personalizations = [{
          to: [{ email: options.to }],
          substitutions: {
            '-recipientName-': options.recipientName,
            '-businessName-': options.businessName || 'your business'
          }
        }];
      }

      await sgMail.send(msg);

      return { success: true, messageId: 'sent' };
    } catch (error) {
      console.error('SendGrid error:', error.message);
      throw error;
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulk(emails) {
    if (!this.enabled) {
      console.log(`📧 [SIMULATION] Would send ${emails.length} bulk emails`);
      return { success: true, simulated: true, count: emails.length };
    }

    try {
      const messages = emails.map(email => ({
        to: email.to,
        from: email.from || process.env.FROM_EMAIL,
        subject: email.subject,
        text: email.text,
        html: email.html
      }));

      await sgMail.send(messages);

      return { success: true, count: messages.length };
    } catch (error) {
      console.error('SendGrid bulk error:', error.message);
      throw error;
    }
  }
}

module.exports = SendGridService;