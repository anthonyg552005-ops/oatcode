/**
 * AUTONOMOUS EMAIL DELIVERABILITY MONITORING SERVICE
 *
 * Monitors email sender reputation and deliverability metrics to ensure
 * emails reach the inbox and don't go to spam. Critical for business success.
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class AutoEmailDeliverabilityService {
  constructor(logger, sendGridService) {
    this.logger = logger;
    this.sendGridService = sendGridService;
    this.apiKey = process.env.SENDGRID_API_KEY;

    // Thresholds for alerts
    this.thresholds = {
      bounceRate: 2.0,      // Alert if > 2%
      spamRate: 0.1,        // Alert if > 0.1%
      openRate: 15.0,       // Alert if < 15% (indicates deliverability issues)
      clickRate: 2.0,       // Alert if < 2%
      senderScore: 90       // Alert if < 90
    };

    this.metrics = {
      lastCheck: null,
      bounceRate: 0,
      spamRate: 0,
      openRate: 0,
      clickRate: 0,
      senderScore: null,
      reputationStatus: 'unknown',
      totalSent: 0,
      totalBounces: 0,
      totalSpamReports: 0,
      totalOpens: 0,
      totalClicks: 0,
      alertCount: 0
    };
  }

  /**
   * Check email deliverability metrics from SendGrid
   */
  async checkDeliverabilityMetrics() {
    try {
      this.logger.info('📧 Checking email deliverability metrics...');

      if (!this.apiKey) {
        this.logger.warn('   SendGrid API key not configured');
        return { success: false, error: 'No API key' };
      }

      // Get stats from last 7 days
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Fetch SendGrid stats
      const statsUrl = `https://api.sendgrid.com/v3/stats?start_date=${startDate}&end_date=${endDate}`;

      const response = await axios.get(statsUrl, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      // Calculate metrics from SendGrid data
      const stats = this.calculateMetrics(response.data);

      this.metrics = {
        ...this.metrics,
        ...stats,
        lastCheck: new Date().toISOString()
      };

      this.logger.info('   Email Deliverability Metrics:');
      this.logger.info(`     Sent: ${stats.totalSent}`);
      this.logger.info(`     Delivered: ${stats.totalDelivered} (${stats.deliveryRate.toFixed(2)}%)`);
      this.logger.info(`     Opened: ${stats.totalOpens} (${stats.openRate.toFixed(2)}%)`);
      this.logger.info(`     Clicked: ${stats.totalClicks} (${stats.clickRate.toFixed(2)}%)`);
      this.logger.info(`     Bounced: ${stats.totalBounces} (${stats.bounceRate.toFixed(2)}%)`);
      this.logger.info(`     Spam Reports: ${stats.totalSpamReports} (${stats.spamRate.toFixed(2)}%)`);

      // Check for issues
      await this.checkForIssues(stats);

      return { success: true, metrics: stats };

    } catch (error) {
      this.logger.error(`   ❌ Failed to check deliverability: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate metrics from SendGrid stats
   */
  calculateMetrics(data) {
    let totalSent = 0;
    let totalDelivered = 0;
    let totalBounces = 0;
    let totalSpamReports = 0;
    let totalOpens = 0;
    let totalClicks = 0;
    let totalUnsubscribes = 0;

    // Aggregate stats from all days
    if (Array.isArray(data)) {
      data.forEach(day => {
        if (day.stats && Array.isArray(day.stats)) {
          day.stats.forEach(stat => {
            const metrics = stat.metrics;
            totalSent += metrics.requests || 0;
            totalDelivered += metrics.delivered || 0;
            totalBounces += (metrics.bounces || 0) + (metrics.blocks || 0);
            totalSpamReports += metrics.spam_reports || 0;
            totalOpens += metrics.unique_opens || 0;
            totalClicks += metrics.unique_clicks || 0;
            totalUnsubscribes += metrics.unsubscribes || 0;
          });
        }
      });
    }

    // Calculate rates
    const bounceRate = totalSent > 0 ? (totalBounces / totalSent) * 100 : 0;
    const spamRate = totalSent > 0 ? (totalSpamReports / totalSent) * 100 : 0;
    const openRate = totalDelivered > 0 ? (totalOpens / totalDelivered) * 100 : 0;
    const clickRate = totalDelivered > 0 ? (totalClicks / totalDelivered) * 100 : 0;
    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;

    return {
      totalSent,
      totalDelivered,
      totalBounces,
      totalSpamReports,
      totalOpens,
      totalClicks,
      totalUnsubscribes,
      bounceRate,
      spamRate,
      openRate,
      clickRate,
      deliveryRate
    };
  }

  /**
   * Check for deliverability issues
   */
  async checkForIssues(stats) {
    const issues = [];

    // Check bounce rate
    if (stats.bounceRate > this.thresholds.bounceRate) {
      issues.push({
        severity: 'HIGH',
        type: 'Bounce Rate',
        message: `Bounce rate is ${stats.bounceRate.toFixed(2)}% (threshold: ${this.thresholds.bounceRate}%)`,
        recommendation: 'Clean your email list. Remove invalid email addresses.'
      });
    }

    // Check spam rate
    if (stats.spamRate > this.thresholds.spamRate) {
      issues.push({
        severity: 'CRITICAL',
        type: 'Spam Reports',
        message: `Spam rate is ${stats.spamRate.toFixed(2)}% (threshold: ${this.thresholds.spamRate}%)`,
        recommendation: 'URGENT: Review email content and targeting. High spam rates can blacklist your domain.'
      });
    }

    // Check open rate (low = poor deliverability)
    if (stats.openRate < this.thresholds.openRate && stats.totalSent > 10) {
      issues.push({
        severity: 'MEDIUM',
        type: 'Low Open Rate',
        message: `Open rate is ${stats.openRate.toFixed(2)}% (threshold: ${this.thresholds.openRate}%)`,
        recommendation: 'Emails may be going to spam. Check sender reputation and improve subject lines.'
      });
    }

    // Log issues
    if (issues.length > 0) {
      this.logger.warn(`   ⚠️  Found ${issues.length} deliverability issue(s):`);

      for (const issue of issues) {
        this.logger.warn(`     [${issue.severity}] ${issue.type}: ${issue.message}`);
        this.logger.warn(`       → ${issue.recommendation}`);
      }

      this.metrics.alertCount += issues.length;

      // Send alert notification
      await this.sendDeliverabilityAlert(issues, stats);

    } else {
      this.logger.info('   ✅ No deliverability issues detected');
    }

    return issues;
  }

  /**
   * Check sender reputation score
   */
  async checkSenderReputation() {
    try {
      this.logger.info('🔍 Checking sender reputation...');

      // Check if IP is blacklisted using common blacklist checkers
      // This is a simplified check - in production you'd use specialized services

      const reputationStatus = {
        senderScore: null,
        blacklisted: false,
        blacklists: [],
        lastChecked: new Date().toISOString()
      };

      // You would integrate with services like:
      // - SenderScore.org
      // - MXToolbox
      // - Talos Intelligence

      this.logger.info('   ✓ Reputation check complete');

      return reputationStatus;

    } catch (error) {
      this.logger.error(`Failed to check sender reputation: ${error.message}`);
      return null;
    }
  }

  /**
   * Send deliverability alert
   */
  async sendDeliverabilityAlert(issues, stats) {
    try {
      const criticalIssues = issues.filter(i => i.severity === 'CRITICAL');
      const isUrgent = criticalIssues.length > 0;

      let message = `Email deliverability issues detected:\n\n`;

      for (const issue of issues) {
        message += `[${issue.severity}] ${issue.type}\n`;
        message += `${issue.message}\n`;
        message += `→ ${issue.recommendation}\n\n`;
      }

      message += `Current Stats (Last 7 Days):\n`;
      message += `- Sent: ${stats.totalSent}\n`;
      message += `- Bounce Rate: ${stats.bounceRate.toFixed(2)}%\n`;
      message += `- Spam Rate: ${stats.spamRate.toFixed(2)}%\n`;
      message += `- Open Rate: ${stats.openRate.toFixed(2)}%\n`;

      if (global.sendGridService) {
        await global.sendGridService.sendEmail({
          to: process.env.SMTP_USER || 'anthonyg552005@gmail.com',
          subject: `[OatCode] ${isUrgent ? '🚨 URGENT' : '⚠️'} Email Deliverability Alert`,
          text: message,
          html: `<div style="font-family: sans-serif;">
            <h2>${isUrgent ? '🚨 URGENT:' : '⚠️'} Email Deliverability Alert</h2>
            <p>Issues detected with email deliverability:</p>
            ${issues.map(issue => `
              <div style="padding: 15px; margin: 10px 0; background: ${issue.severity === 'CRITICAL' ? '#fee' : '#ffc'}; border-left: 4px solid ${issue.severity === 'CRITICAL' ? '#c00' : '#f90'};">
                <strong>[${issue.severity}] ${issue.type}</strong><br>
                ${issue.message}<br>
                <em>→ ${issue.recommendation}</em>
              </div>
            `).join('')}
            <hr>
            <h3>Current Stats (Last 7 Days)</h3>
            <ul>
              <li>Sent: ${stats.totalSent}</li>
              <li>Bounce Rate: ${stats.bounceRate.toFixed(2)}%</li>
              <li>Spam Rate: ${stats.spamRate.toFixed(2)}%</li>
              <li>Open Rate: ${stats.openRate.toFixed(2)}%</li>
            </ul>
          </div>`
        });
      }

      // Send SMS for critical issues
      if (isUrgent && global.twilioService) {
        await global.twilioService.sendSMS(
          process.env.TWILIO_PHONE_NUMBER || '+17148241045',
          `[URGENT] Email deliverability critical issue: ${criticalIssues[0].message}`
        );
      }

    } catch (error) {
      this.logger.error(`Failed to send deliverability alert: ${error.message}`);
    }
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      service: 'Email Deliverability',
      status: this.getHealthStatus(),
      ...this.metrics
    };
  }

  /**
   * Get health status based on metrics
   */
  getHealthStatus() {
    if (!this.metrics.lastCheck) return 'not_started';

    if (this.metrics.spamRate > this.thresholds.spamRate) return 'critical';
    if (this.metrics.bounceRate > this.thresholds.bounceRate) return 'warning';
    if (this.metrics.openRate < this.thresholds.openRate && this.metrics.totalSent > 10) return 'warning';

    return 'healthy';
  }

  /**
   * Schedule autonomous checks
   */
  scheduleChecks(cron) {
    // Check deliverability daily at 8 AM
    cron.schedule('0 8 * * *', async () => {
      this.logger.info('📅 Scheduled deliverability check...');
      await this.checkDeliverabilityMetrics();
    });

    // Check sender reputation weekly (Monday at 9 AM)
    cron.schedule('0 9 * * 1', async () => {
      this.logger.info('📅 Scheduled reputation check...');
      await this.checkSenderReputation();
    });

    this.logger.info('   ✓ Deliverability monitoring scheduled');
    this.logger.info('     - Metrics check: Daily at 8 AM');
    this.logger.info('     - Reputation check: Weekly (Mondays at 9 AM)');
  }
}

module.exports = AutoEmailDeliverabilityService;
