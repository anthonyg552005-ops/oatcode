/**
 * AUTO-DEPLOYMENT MONITOR SERVICE
 *
 * Monitors the autonomous engine for crashes and automatically:
 * 1. Detects when services are down or crashing
 * 2. Analyzes PM2 logs to find the error
 * 3. Attempts automated fixes (git pull, npm install, restart)
 * 4. If fix fails, notifies you via email/SMS
 *
 * This ensures the business keeps running even when you're away.
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs').promises;
const path = require('path');

class AutoDeploymentMonitorService {
  constructor(logger, notificationService) {
    this.logger = logger;
    this.notificationService = notificationService;
    this.checkInterval = null;
    this.crashCount = 0;
    this.lastRestartTime = Date.now();
    this.recoveryAttempts = 0;
    this.maxRecoveryAttempts = 3;
    this.isRecovering = false;

    // Track service health
    this.serviceHealth = {
      'oatcode-engine': { status: 'unknown', restarts: 0, lastCheck: null },
      'oatcode-web': { status: 'unknown', restarts: 0, lastCheck: null }
    };
  }

  /**
   * Start monitoring deployments every 60 seconds
   */
  start() {
    this.logger.info('🔍 Auto-Deployment Monitor starting...');
    this.logger.info('   Checking service health every 60 seconds');

    // Initial check
    this.checkServiceHealth();

    // Check every 60 seconds
    this.checkInterval = setInterval(() => {
      this.checkServiceHealth();
    }, 60000);
  }

  /**
   * Check if PM2 services are healthy
   */
  async checkServiceHealth() {
    if (this.isRecovering) {
      this.logger.info('⏳ Recovery in progress, skipping health check...');
      return;
    }

    try {
      // Get PM2 status via SSH
      const { stdout } = await execPromise(
        `ssh -i ~/.ssh/droplet_key -o StrictHostKeyChecking=no root@24.144.89.17 'pm2 jlist'`
      );

      const services = JSON.parse(stdout);

      for (const service of services) {
        const serviceName = service.name;
        const previousHealth = this.serviceHealth[serviceName];

        // Update health tracking
        this.serviceHealth[serviceName] = {
          status: service.pm2_env.status,
          restarts: service.pm2_env.restart_time,
          lastCheck: new Date().toISOString(),
          uptime: service.pm2_env.pm_uptime,
          memory: service.monit.memory
        };

        // Check if service is unhealthy
        if (service.pm2_env.status === 'errored' || service.pm2_env.status === 'stopped') {
          this.logger.error(`❌ ${serviceName} is ${service.pm2_env.status}!`);
          await this.handleUnhealthyService(serviceName);
        }

        // Check if service is crash-looping (many restarts in short time)
        else if (previousHealth && service.pm2_env.restart_time > previousHealth.restarts + 10) {
          this.logger.warn(`⚠️  ${serviceName} has restarted ${service.pm2_env.restart_time - previousHealth.restarts} times since last check`);
          await this.handleCrashLoop(serviceName, service);
        }

        // Service is healthy
        else if (service.pm2_env.status === 'online') {
          this.logger.info(`✅ ${serviceName}: Healthy (${service.pm2_env.restart_time} total restarts)`);
        }
      }

    } catch (error) {
      this.logger.error(`Error checking service health: ${error.message}`);
    }
  }

  /**
   * Handle a service that is stopped or errored
   */
  async handleUnhealthyService(serviceName) {
    this.logger.info(`🔧 Attempting to recover ${serviceName}...`);
    this.isRecovering = true;

    try {
      // Step 1: Get logs to understand the issue
      this.logger.info('   Step 1: Analyzing logs...');
      const logs = await this.getServiceLogs(serviceName, 50);
      const errorAnalysis = this.analyzeError(logs);

      this.logger.info(`   Error detected: ${errorAnalysis.type}`);

      // Step 2: Attempt automated recovery based on error type
      let recoverySuccess = false;

      if (errorAnalysis.type === 'EADDRINUSE') {
        recoverySuccess = await this.fixPortConflict(serviceName);
      } else if (errorAnalysis.type === 'MODULE_NOT_FOUND') {
        recoverySuccess = await this.fixMissingModules(serviceName);
      } else if (errorAnalysis.type === 'SYNTAX_ERROR') {
        recoverySuccess = await this.fixSyntaxError(serviceName, errorAnalysis.details);
      } else if (errorAnalysis.type === 'ENV_MISSING') {
        recoverySuccess = await this.fixMissingEnvVars(serviceName, errorAnalysis.details);
      } else {
        // Generic recovery: pull latest code and restart
        recoverySuccess = await this.genericRecovery(serviceName);
      }

      if (recoverySuccess) {
        this.logger.info(`✅ Successfully recovered ${serviceName}`);
        this.recoveryAttempts = 0;
        await this.notifySuccess(serviceName, errorAnalysis.type);
      } else {
        this.logger.error(`❌ Failed to recover ${serviceName} automatically`);
        this.recoveryAttempts++;

        if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
          await this.notifyFailure(serviceName, errorAnalysis, logs);
        }
      }

    } catch (error) {
      this.logger.error(`Recovery failed: ${error.message}`);
      await this.notifyFailure(serviceName, { type: 'UNKNOWN', details: error.message });
    } finally {
      this.isRecovering = false;
    }
  }

  /**
   * Handle a service that is crash-looping
   */
  async handleCrashLoop(serviceName, serviceData) {
    this.logger.warn(`🔄 ${serviceName} is crash-looping. Investigating...`);

    // Get recent logs
    const logs = await this.getServiceLogs(serviceName, 30);
    const errorAnalysis = this.analyzeError(logs);

    // If it's a known issue, attempt recovery
    if (errorAnalysis.type !== 'UNKNOWN') {
      await this.handleUnhealthyService(serviceName);
    } else {
      // Just alert for now
      this.logger.warn(`   Unable to automatically diagnose crash loop`);
      await this.notifyWarning(serviceName, 'Crash loop detected', logs);
    }
  }

  /**
   * Get service logs from Droplet
   */
  async getServiceLogs(serviceName, lines = 50) {
    try {
      const { stdout } = await execPromise(
        `ssh -i ~/.ssh/droplet_key root@24.144.89.17 'pm2 logs ${serviceName} --lines ${lines} --nostream'`
      );
      return stdout;
    } catch (error) {
      return '';
    }
  }

  /**
   * Analyze error logs to determine issue type
   */
  analyzeError(logs) {
    if (logs.includes('EADDRINUSE')) {
      return { type: 'EADDRINUSE', details: 'Port already in use' };
    }
    if (logs.includes('MODULE_NOT_FOUND') || logs.includes('Cannot find module')) {
      const match = logs.match(/Cannot find module '([^']+)'/);
      return { type: 'MODULE_NOT_FOUND', details: match ? match[1] : 'unknown module' };
    }
    if (logs.includes('SyntaxError')) {
      return { type: 'SYNTAX_ERROR', details: logs.split('SyntaxError')[1]?.split('\n')[0] || 'unknown' };
    }
    if (logs.includes('Missing required environment') || logs.includes('MISSING')) {
      return { type: 'ENV_MISSING', details: 'Environment variable missing' };
    }
    return { type: 'UNKNOWN', details: 'Could not determine error type' };
  }

  /**
   * Fix port conflict (EADDRINUSE)
   */
  async fixPortConflict(serviceName) {
    this.logger.info('   Fix: Setting ENABLE_WEB_SERVER=false');

    try {
      await execPromise(
        `ssh -i ~/.ssh/droplet_key root@24.144.89.17 'cd /var/www/automatedwebsitescraper && grep -q "ENABLE_WEB_SERVER" .env || echo "ENABLE_WEB_SERVER=false" >> .env && pm2 restart ${serviceName} --update-env'`
      );

      // Wait and verify
      await this.sleep(5000);
      return await this.verifyServiceHealthy(serviceName);
    } catch (error) {
      return false;
    }
  }

  /**
   * Fix missing modules
   */
  async fixMissingModules(serviceName) {
    this.logger.info('   Fix: Running npm install');

    try {
      await execPromise(
        `ssh -i ~/.ssh/droplet_key root@24.144.89.17 'cd /var/www/automatedwebsitescraper && npm install --production && pm2 restart ${serviceName}'`
      );

      await this.sleep(10000);
      return await this.verifyServiceHealthy(serviceName);
    } catch (error) {
      return false;
    }
  }

  /**
   * Fix syntax errors (pull latest code from GitHub)
   */
  async fixSyntaxError(serviceName, details) {
    this.logger.info('   Fix: Pulling latest code from GitHub');

    try {
      await execPromise(
        `ssh -i ~/.ssh/droplet_key root@24.144.89.17 'cd /var/www/automatedwebsitescraper && git reset --hard HEAD && git pull origin main && pm2 restart ${serviceName}'`
      );

      await this.sleep(10000);
      return await this.verifyServiceHealthy(serviceName);
    } catch (error) {
      return false;
    }
  }

  /**
   * Fix missing environment variables
   */
  async fixMissingEnvVars(serviceName, details) {
    this.logger.info('   Fix: Environment variables - notifying user');

    // Can't automatically fix missing env vars - need user input
    await this.notifyFailure(serviceName, { type: 'ENV_MISSING', details }, 'Missing environment variables require manual configuration');
    return false;
  }

  /**
   * Generic recovery: pull, install, restart
   */
  async genericRecovery(serviceName) {
    this.logger.info('   Fix: Generic recovery (pull + install + restart)');

    try {
      await execPromise(
        `ssh -i ~/.ssh/droplet_key root@24.144.89.17 'cd /var/www/automatedwebsitescraper && git reset --hard HEAD && git pull origin main && npm install --production && pm2 restart ${serviceName}'`
      );

      await this.sleep(10000);
      return await this.verifyServiceHealthy(serviceName);
    } catch (error) {
      return false;
    }
  }

  /**
   * Verify service is now healthy
   */
  async verifyServiceHealthy(serviceName) {
    try {
      const { stdout } = await execPromise(
        `ssh -i ~/.ssh/droplet_key root@24.144.89.17 'pm2 jlist'`
      );

      const services = JSON.parse(stdout);
      const service = services.find(s => s.name === serviceName);

      return service && service.pm2_env.status === 'online';
    } catch (error) {
      return false;
    }
  }

  /**
   * Notify success
   */
  async notifySuccess(serviceName, errorType) {
    const message = `✅ Auto-Recovery Success!\n\nService: ${serviceName}\nIssue: ${errorType}\nStatus: Fixed automatically\n\nNo action needed.`;

    this.logger.info(message);

    if (this.notificationService) {
      await this.notificationService.sendNotification({
        subject: '✅ OatCode Auto-Recovery: Success',
        message,
        priority: 'low'
      });
    }
  }

  /**
   * Notify warning
   */
  async notifyWarning(serviceName, issue, logs) {
    const message = `⚠️  Service Warning\n\nService: ${serviceName}\nIssue: ${issue}\n\nMonitoring situation...`;

    this.logger.warn(message);

    if (this.notificationService) {
      await this.notificationService.sendNotification({
        subject: '⚠️  OatCode: Service Warning',
        message,
        priority: 'medium'
      });
    }
  }

  /**
   * Notify failure - requires user intervention
   */
  async notifyFailure(serviceName, errorAnalysis, logs = '') {
    const message = `🚨 AUTO-RECOVERY FAILED - Action Required!\n\nService: ${serviceName}\nError Type: ${errorAnalysis.type}\nDetails: ${errorAnalysis.details}\n\nAttempted ${this.recoveryAttempts} recovery attempts.\n\nPlease check the Droplet and fix manually.\n\nSSH: ssh root@24.144.89.17\nLogs: pm2 logs ${serviceName}`;

    this.logger.error(message);

    if (this.notificationService) {
      await this.notificationService.sendNotification({
        subject: '🚨 OatCode: Manual Intervention Required',
        message,
        priority: 'high'
      });
    }
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.logger.info('🛑 Auto-Deployment Monitor stopped');
    }
  }
}

module.exports = AutoDeploymentMonitorService;
