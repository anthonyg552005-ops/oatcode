/**
 * AUTO-DEPLOYMENT MONITOR SERVICE
 *
 * Monitors the autonomous engine for crashes and automatically:
 * 1. Detects when services are down or crashing
 * 2. Analyzes PM2 logs to find the error
 * 3. Attempts automated fixes (git pull, npm install, restart)
 * 4. NEVER GIVES UP - keeps trying different recovery strategies
 * 5. Only notifies you after exhausting ALL options
 *
 * PERSISTENCE MODE: Will try indefinitely until service is healthy
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
    this.maxRecoveryAttempts = 10; // Increased from 3 to 10 - be persistent!
    this.isRecovering = false;
    this.recoveryStrategies = []; // Track which strategies we've tried
    this.consecutiveFailures = 0;

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
   * NEVER GIVES UP - tries all possible recovery strategies
   */
  async handleUnhealthyService(serviceName) {
    this.logger.info(`🔧 Recovery attempt #${this.recoveryAttempts + 1} for ${serviceName}...`);
    this.isRecovering = true;

    try {
      // Step 1: Get logs to understand the issue
      this.logger.info('   Step 1: Analyzing logs...');
      const logs = await this.getServiceLogs(serviceName, 100);
      const errorAnalysis = this.analyzeError(logs);

      this.logger.info(`   Error detected: ${errorAnalysis.type}`);
      this.logger.info(`   Details: ${errorAnalysis.details}`);

      // Step 2: Try recovery strategies in order of likelihood to succeed
      let recoverySuccess = false;
      const strategies = this.getRecoveryStrategies(errorAnalysis.type);

      for (let i = 0; i < strategies.length && !recoverySuccess; i++) {
        const strategy = strategies[i];

        // Skip if we already tried this strategy recently
        if (this.recoveryStrategies.includes(strategy.name)) {
          this.logger.info(`   ⏭️  Skipping ${strategy.name} (already tried)`);
          continue;
        }

        this.logger.info(`   🔄 Trying: ${strategy.name}...`);
        this.recoveryStrategies.push(strategy.name);

        recoverySuccess = await strategy.execute(serviceName, errorAnalysis);

        if (recoverySuccess) {
          this.logger.info(`   ✅ ${strategy.name} worked!`);
        } else {
          this.logger.warn(`   ❌ ${strategy.name} didn't work, trying next...`);
        }
      }

      // Step 3: If all targeted strategies failed, try aggressive recovery
      if (!recoverySuccess && this.recoveryAttempts < this.maxRecoveryAttempts) {
        this.logger.warn('   🚨 All standard strategies failed. Trying aggressive recovery...');
        recoverySuccess = await this.aggressiveRecovery(serviceName);
      }

      // Step 4: Handle outcome
      if (recoverySuccess) {
        this.logger.info(`✅ Successfully recovered ${serviceName}!`);
        this.recoveryAttempts = 0;
        this.recoveryStrategies = [];
        this.consecutiveFailures = 0;
        await this.notifySuccess(serviceName, errorAnalysis.type);
      } else {
        this.recoveryAttempts++;
        this.consecutiveFailures++;
        this.logger.error(`❌ Recovery attempt #${this.recoveryAttempts} failed`);

        // Reset recovery strategies every 3 attempts to try them again
        if (this.recoveryAttempts % 3 === 0) {
          this.logger.info('   🔄 Resetting recovery strategies to try again...');
          this.recoveryStrategies = [];
        }

        // Only notify after many failures - keep trying!
        if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
          this.logger.error(`   📧 Notifying user after ${this.recoveryAttempts} failed attempts...`);
          await this.notifyFailure(serviceName, errorAnalysis, logs);

          // Still don't give up! Keep trying but less frequently
          this.recoveryAttempts = Math.floor(this.maxRecoveryAttempts / 2);
        }
      }

    } catch (error) {
      this.logger.error(`Recovery error: ${error.message}`);
      this.logger.error(`Stack: ${error.stack}`);
      this.recoveryAttempts++;

      // Don't stop - keep trying!
      if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
        await this.notifyFailure(serviceName, { type: 'RECOVERY_ERROR', details: error.message }, error.stack);
      }
    } finally {
      this.isRecovering = false;
    }
  }

  /**
   * Get recovery strategies based on error type
   */
  getRecoveryStrategies(errorType) {
    const allStrategies = [
      {
        name: 'Fix Port Conflict',
        execute: (serviceName) => this.fixPortConflict(serviceName),
        relevantFor: ['EADDRINUSE']
      },
      {
        name: 'Install Missing Modules',
        execute: (serviceName) => this.fixMissingModules(serviceName),
        relevantFor: ['MODULE_NOT_FOUND']
      },
      {
        name: 'Pull Latest Code',
        execute: (serviceName) => this.fixSyntaxError(serviceName),
        relevantFor: ['SYNTAX_ERROR']
      },
      {
        name: 'Generic Recovery (Pull + Install + Restart)',
        execute: (serviceName) => this.genericRecovery(serviceName),
        relevantFor: ['UNKNOWN', 'SYNTAX_ERROR', 'MODULE_NOT_FOUND']
      },
      {
        name: 'Simple Restart',
        execute: (serviceName) => this.simpleRestart(serviceName),
        relevantFor: ['UNKNOWN']
      },
      {
        name: 'Clear PM2 and Restart',
        execute: (serviceName) => this.clearAndRestart(serviceName),
        relevantFor: ['UNKNOWN']
      }
    ];

    // Get strategies relevant to this error type, plus generic ones
    const relevant = allStrategies.filter(s =>
      s.relevantFor.includes(errorType) || s.relevantFor.includes('UNKNOWN')
    );

    return relevant;
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
   * Simple restart - just restart the service
   */
  async simpleRestart(serviceName) {
    this.logger.info('   Fix: Simple restart');

    try {
      await execPromise(
        `ssh -i ~/.ssh/droplet_key root@24.144.89.17 'pm2 restart ${serviceName}'`
      );

      await this.sleep(5000);
      return await this.verifyServiceHealthy(serviceName);
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear PM2 and restart
   */
  async clearAndRestart(serviceName) {
    this.logger.info('   Fix: Clear PM2 logs and restart');

    try {
      await execPromise(
        `ssh -i ~/.ssh/droplet_key root@24.144.89.17 'pm2 flush && pm2 restart ${serviceName}'`
      );

      await this.sleep(5000);
      return await this.verifyServiceHealthy(serviceName);
    } catch (error) {
      return false;
    }
  }

  /**
   * Aggressive recovery - nuclear option
   * Stops everything, cleans up, pulls fresh code, reinstalls, restarts
   */
  async aggressiveRecovery(serviceName) {
    this.logger.warn('   ☢️  AGGRESSIVE RECOVERY: Stopping all services, cleaning, fresh install...');

    try {
      await execPromise(
        `ssh -i ~/.ssh/droplet_key root@24.144.89.17 'cd /var/www/automatedwebsitescraper && pm2 stop all && pm2 delete all && git reset --hard HEAD && git clean -fd && git pull origin main && npm ci --production && pm2 start src/app.js --name oatcode-web && pm2 start src/autonomous-engine.js --name oatcode-engine'`
      );

      this.logger.info('   ⏳ Waiting 20 seconds for services to stabilize...');
      await this.sleep(20000);

      const isHealthy = await this.verifyServiceHealthy(serviceName);

      if (isHealthy) {
        this.logger.info('   ✅ Aggressive recovery succeeded!');
      }

      return isHealthy;
    } catch (error) {
      this.logger.error(`   ❌ Aggressive recovery failed: ${error.message}`);
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
