/**
 * SendGrid Email Service
 * Wrapper for SendGrid API
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
   * Send email via SendGrid
   */
  async send(options) {
    if (!this.enabled) {
      console.log('📧 [SIMULATION] Would send email:', options.to);
      return { success: true, simulated: true };
    }

    try {
      const msg = {
        to: options.to,
        from: options.from || process.env.FROM_EMAIL,
        subject: options.subject,
        text: options.text,
        html: options.html
      };

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