/**
 * AUTONOMOUS SSL CERTIFICATE RENEWAL SERVICE
 *
 * Monitors SSL certificate expiration and automatically renews before expiry.
 * Critical for maintaining HTTPS access and SendGrid webhook functionality.
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs').promises;
const path = require('path');

class AutoSSLRenewalService {
  constructor(logger) {
    this.logger = logger;
    this.domain = process.env.DOMAIN?.replace('https://', '') || 'oatcode.com';
    this.certPath = `/etc/letsencrypt/live/${this.domain}/cert.pem`;
    this.renewalThresholdDays = 30; // Renew if < 30 days remaining
    this.checkIntervalHours = 24; // Check daily

    this.metrics = {
      lastCheck: null,
      daysUntilExpiry: null,
      lastRenewal: null,
      renewalAttempts: 0,
      renewalSuccesses: 0,
      renewalFailures: 0
    };
  }

  /**
   * Check SSL certificate expiration date
   */
  async checkCertificateExpiration() {
    try {
      this.logger.info('🔒 Checking SSL certificate expiration...');

      // Check if running in production (on Droplet)
      const isProduction = process.env.NODE_ENV === 'production';
      if (!isProduction) {
        this.logger.info('   Not in production, skipping SSL check');
        return { needsRenewal: false, daysRemaining: 999 };
      }

      // Check if certificate exists
      try {
        await fs.access(this.certPath);
      } catch (error) {
        this.logger.warn('   ⚠️  SSL certificate not found - may need initial setup');
        return { needsRenewal: true, daysRemaining: 0, error: 'Certificate not found' };
      }

      // Get expiration date using openssl
      const { stdout } = await execPromise(
        `openssl x509 -enddate -noout -in ${this.certPath}`
      );

      // Parse expiration date
      // Format: "notAfter=Jan 15 12:00:00 2025 GMT"
      const match = stdout.match(/notAfter=(.+)/);
      if (!match) {
        throw new Error('Could not parse certificate expiration date');
      }

      const expiryDate = new Date(match[1]);
      const now = new Date();
      const daysRemaining = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));

      this.metrics.lastCheck = new Date().toISOString();
      this.metrics.daysUntilExpiry = daysRemaining;

      this.logger.info(`   ✓ Certificate expires in ${daysRemaining} days (${expiryDate.toLocaleDateString()})`);

      // Determine if renewal is needed
      const needsRenewal = daysRemaining <= this.renewalThresholdDays;

      if (needsRenewal) {
        this.logger.warn(`   ⚠️  Certificate renewal needed! Only ${daysRemaining} days remaining`);
      }

      return { needsRenewal, daysRemaining, expiryDate };

    } catch (error) {
      this.logger.error(`   ❌ Error checking SSL certificate: ${error.message}`);
      return { needsRenewal: false, daysRemaining: null, error: error.message };
    }
  }

  /**
   * Renew SSL certificate using certbot
   */
  async renewCertificate() {
    try {
      this.logger.info('🔄 Attempting to renew SSL certificate...');
      this.metrics.renewalAttempts++;

      // Stop web server temporarily to free port 80
      this.logger.info('   Stopping web server...');
      await execPromise('pm2 stop oatcode-web');

      // Wait a moment for port to be freed
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Renew certificate
      this.logger.info('   Running certbot renew...');
      const { stdout, stderr } = await execPromise(
        `certbot renew --standalone --non-interactive --agree-tos`,
        { timeout: 120000 } // 2 minute timeout
      );

      this.logger.info('   Certbot output:', stdout);
      if (stderr) {
        this.logger.warn('   Certbot stderr:', stderr);
      }

      // Restart nginx to use new certificate
      this.logger.info('   Restarting Nginx...');
      await execPromise('systemctl restart nginx');

      // Restart web server
      this.logger.info('   Restarting web server...');
      await execPromise('pm2 start oatcode-web');

      this.logger.info('   ✅ SSL certificate renewed successfully!');

      this.metrics.renewalSuccesses++;
      this.metrics.lastRenewal = new Date().toISOString();

      // Send success notification
      await this.sendNotification(
        'SSL Certificate Renewed Successfully',
        `SSL certificate for ${this.domain} has been renewed.\n\nNew expiration: 90 days from now`
      );

      return { success: true };

    } catch (error) {
      this.logger.error(`   ❌ SSL renewal failed: ${error.message}`);
      this.metrics.renewalFailures++;

      // Make sure web server is running even if renewal failed
      try {
        await execPromise('pm2 start oatcode-web');
      } catch (restartError) {
        this.logger.error(`   ❌ Failed to restart web server: ${restartError.message}`);
      }

      // Send failure notification
      await this.sendNotification(
        '⚠️ SSL Certificate Renewal Failed',
        `Failed to renew SSL certificate for ${this.domain}.\n\nError: ${error.message}\n\nManual intervention may be required.`,
        true // isAlert
      );

      return { success: false, error: error.message };
    }
  }

  /**
   * Perform SSL check and renew if needed
   */
  async performAutonomousCheck() {
    this.logger.info('🔒 Autonomous SSL Check...');

    const status = await this.checkCertificateExpiration();

    if (status.error) {
      // Error checking certificate - alert but don't fail
      this.logger.warn(`   ⚠️  Could not check certificate: ${status.error}`);
      return;
    }

    if (status.needsRenewal) {
      this.logger.warn(`   ⚠️  SSL renewal needed (${status.daysRemaining} days remaining)`);
      const result = await this.renewCertificate();

      if (!result.success) {
        this.logger.error('   ❌ SSL renewal failed - manual intervention needed');
      }
    } else {
      this.logger.info(`   ✓ SSL certificate is valid (${status.daysRemaining} days remaining)`);
    }

    return status;
  }

  /**
   * Send notification (email/SMS)
   */
  async sendNotification(subject, message, isAlert = false) {
    try {
      // Use existing notification system if available
      if (global.sendGridService) {
        await global.sendGridService.sendEmail({
          to: process.env.SMTP_USER || 'anthonyg552005@gmail.com',
          subject: `[OatCode] ${subject}`,
          text: message,
          html: `<div style="font-family: sans-serif;">
            <h2>${isAlert ? '⚠️' : '✅'} ${subject}</h2>
            <p>${message.replace(/\n/g, '<br>')}</p>
            <hr>
            <p><small>Automated notification from OatCode Autonomous Engine</small></p>
          </div>`
        });
      }

      // Also send SMS for critical alerts
      if (isAlert && global.twilioService) {
        await global.twilioService.sendSMS(
          process.env.TWILIO_PHONE_NUMBER || '+17148241045',
          `[OatCode Alert] ${subject}: ${message.substring(0, 100)}...`
        );
      }
    } catch (error) {
      this.logger.error(`Failed to send notification: ${error.message}`);
    }
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      service: 'SSL Certificate Renewal',
      status: this.metrics.daysUntilExpiry > this.renewalThresholdDays ? 'healthy' : 'needs_attention',
      ...this.metrics
    };
  }

  /**
   * Schedule autonomous checks
   */
  scheduleChecks(cron) {
    // Check daily at 3 AM
    cron.schedule('0 3 * * *', async () => {
      this.logger.info('🔒 Scheduled SSL certificate check...');
      await this.performAutonomousCheck();
    });

    this.logger.info('   ✓ SSL renewal checks scheduled (daily at 3 AM)');
  }
}

module.exports = AutoSSLRenewalService;
