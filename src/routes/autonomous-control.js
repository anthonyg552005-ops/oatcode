/**
 * AUTONOMOUS CONTROL API
 *
 * Allows the autonomous system (or Claude) to deploy, restart, and manage
 * the Droplet without manual SSH access.
 */

const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Secret token for security (set in environment)
const CONTROL_TOKEN = process.env.AUTONOMOUS_CONTROL_TOKEN || 'change-me-in-production';

/**
 * Middleware: Verify control token
 */
function verifyToken(req, res, next) {
  const token = req.headers['x-control-token'] || req.query.token;

  if (token !== CONTROL_TOKEN) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - Invalid control token'
    });
  }

  next();
}

/**
 * Deploy latest code from GitHub
 * POST /api/autonomous-control/deploy
 */
router.post('/deploy', verifyToken, async (req, res) => {
  try {
    console.log('🚀 Autonomous deployment initiated...');

    const results = {
      gitPull: null,
      npmInstall: null,
      pm2Restart: null,
      status: null
    };

    // Pull latest code
    try {
      const { stdout, stderr } = await execPromise('git pull origin main');
      results.gitPull = { success: true, stdout, stderr };
      console.log('✅ Git pull completed');
    } catch (error) {
      results.gitPull = { success: false, error: error.message };
      console.error('❌ Git pull failed:', error.message);
    }

    // Install dependencies
    try {
      const { stdout, stderr } = await execPromise('npm install --production');
      results.npmInstall = { success: true, stdout: 'Dependencies installed', stderr };
      console.log('✅ Dependencies installed');
    } catch (error) {
      results.npmInstall = { success: false, error: error.message };
      console.error('❌ npm install failed:', error.message);
    }

    // Restart PM2 services
    try {
      const { stdout, stderr } = await execPromise('pm2 restart all');
      results.pm2Restart = { success: true, stdout, stderr };
      console.log('✅ PM2 services restarted');
    } catch (error) {
      results.pm2Restart = { success: false, error: error.message };
      console.error('❌ PM2 restart failed:', error.message);
    }

    // Get final status
    try {
      const { stdout } = await execPromise('pm2 jlist');
      results.status = JSON.parse(stdout);
    } catch (error) {
      results.status = { error: error.message };
    }

    res.json({
      success: true,
      message: 'Deployment completed',
      timestamp: new Date().toISOString(),
      results
    });

  } catch (error) {
    console.error('❌ Deployment failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Restart PM2 services
 * POST /api/autonomous-control/restart
 */
router.post('/restart', verifyToken, async (req, res) => {
  try {
    console.log('🔄 Restarting PM2 services...');

    const { stdout, stderr } = await execPromise('pm2 restart all');

    res.json({
      success: true,
      message: 'Services restarted',
      stdout,
      stderr
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get service status
 * GET /api/autonomous-control/status
 */
router.get('/status', verifyToken, async (req, res) => {
  try {
    const { stdout } = await execPromise('pm2 jlist');
    const services = JSON.parse(stdout);

    res.json({
      success: true,
      services,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get logs
 * GET /api/autonomous-control/logs?service=oatcode-engine&lines=50
 */
router.get('/logs', verifyToken, async (req, res) => {
  try {
    const service = req.query.service || 'all';
    const lines = req.query.lines || 50;

    const { stdout } = await execPromise(`pm2 logs ${service} --lines ${lines} --nostream`);

    res.json({
      success: true,
      logs: stdout
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Execute command (dangerous - use with caution)
 * POST /api/autonomous-control/exec
 * Body: { command: "pm2 list" }
 */
router.post('/exec', verifyToken, async (req, res) => {
  try {
    const { command } = req.body;

    if (!command) {
      return res.status(400).json({
        success: false,
        error: 'Command is required'
      });
    }

    // Whitelist of allowed commands for security
    const allowedCommands = [
      'pm2 list',
      'pm2 logs',
      'pm2 restart',
      'pm2 stop',
      'pm2 start',
      'git status',
      'git pull',
      'npm install',
      'npm audit',
      'df -h',
      'free -m',
      'uptime'
    ];

    const isAllowed = allowedCommands.some(cmd => command.startsWith(cmd));

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        error: 'Command not allowed. Security restriction.'
      });
    }

    console.log(`🔧 Executing command: ${command}`);
    const { stdout, stderr } = await execPromise(command);

    res.json({
      success: true,
      command,
      stdout,
      stderr,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Health check endpoint
 * GET /api/autonomous-control/health
 */
router.get('/health', verifyToken, async (req, res) => {
  try {
    const results = {
      pm2: null,
      git: null,
      disk: null,
      memory: null
    };

    // Check PM2
    try {
      const { stdout } = await execPromise('pm2 jlist');
      results.pm2 = JSON.parse(stdout);
    } catch (error) {
      results.pm2 = { error: error.message };
    }

    // Check git status
    try {
      const { stdout } = await execPromise('git status --short');
      results.git = {
        clean: stdout.trim() === '',
        changes: stdout
      };
    } catch (error) {
      results.git = { error: error.message };
    }

    // Check disk space
    try {
      const { stdout } = await execPromise('df -h /');
      results.disk = stdout;
    } catch (error) {
      results.disk = { error: error.message };
    }

    // Check memory
    try {
      const { stdout } = await execPromise('free -m');
      results.memory = stdout;
    } catch (error) {
      results.memory = { error: error.message };
    }

    res.json({
      success: true,
      health: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
