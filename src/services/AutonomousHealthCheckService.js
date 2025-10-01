/**
 * AUTONOMOUS HEALTH CHECK SERVICE
 *
 * Writes health status to a file that both the engine and dashboard can read.
 * This solves the issue of the dashboard not knowing if the engine is running.
 */

const fs = require('fs').promises;
const path = require('path');

class AutonomousHealthCheckService {
  constructor(logger) {
    this.logger = logger;
    this.healthFile = path.join(__dirname, '../../data/health-status.json');
    this.lastHeartbeat = null;
  }

  /**
   * Write health status (called by autonomous engine)
   */
  async writeHealthStatus(status = {}) {
    try {
      const healthData = {
        status: 'running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        pid: process.pid,
        version: '2.0.0',
        services: {
          autonomousEngine: true,
          sslRenewal: true,
          databaseBackup: true,
          emailDeliverability: true,
          ...status
        }
      };

      await fs.mkdir(path.dirname(this.healthFile), { recursive: true });
      await fs.writeFile(this.healthFile, JSON.stringify(healthData, null, 2));

      this.lastHeartbeat = new Date();
    } catch (error) {
      this.logger?.error(`Failed to write health status: ${error.message}`);
    }
  }

  /**
   * Read health status (called by dashboard)
   */
  async readHealthStatus() {
    try {
      const data = await fs.readFile(this.healthFile, 'utf-8');
      const health = JSON.parse(data);

      // Check if heartbeat is recent (within last 2 minutes)
      const lastUpdate = new Date(health.timestamp);
      const now = new Date();
      const minutesSinceUpdate = (now - lastUpdate) / 1000 / 60;

      return {
        ...health,
        isHealthy: minutesSinceUpdate < 2,
        minutesSinceUpdate: minutesSinceUpdate.toFixed(1)
      };
    } catch (error) {
      // File doesn't exist or can't be read = engine not running
      return {
        status: 'stopped',
        isHealthy: false,
        error: error.message
      };
    }
  }

  /**
   * Start heartbeat (writes status every 30 seconds)
   */
  startHeartbeat(cron) {
    // Write health status every 30 seconds
    setInterval(async () => {
      await this.writeHealthStatus();
    }, 30000);

    this.logger?.info('   ✓ Health heartbeat started (every 30 seconds)');
  }
}

module.exports = AutonomousHealthCheckService;
