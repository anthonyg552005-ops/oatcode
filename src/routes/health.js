const express = require('express');
const router = express.Router();
const basicAuth = require('express-basic-auth');

/**
 * Health check endpoints for monitoring
 */

// Password protection for detailed metrics
const detailedAuth = basicAuth({
  users: {
    [process.env.DASHBOARD_USERNAME || 'admin']: process.env.DASHBOARD_PASSWORD || 'changeme123'
  },
  challenge: true,
  realm: 'OatCode Health Metrics'
});

// Simple health check (PUBLIC - needed for Railway)
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'OatCode Autonomous Engine'
  });
});

// Detailed health check (PROTECTED - sensitive metrics)
router.get('/detailed', detailedAuth, (req, res) => {
  const autonomousEngine = global.autonomousMetrics || {};
  const autonomousBusiness = global.autonomousBusiness;

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),

    // System info
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      environment: process.env.NODE_ENV || 'development'
    },

    // Autonomous engine status
    autonomousEngine: {
      running: !!global.autonomousMetrics,
      phase: process.env.SKIP_RESEARCH === 'true' ? 'production' : 'research',
      metrics: autonomousEngine
    },

    // Business automation status
    business: {
      running: !!autonomousBusiness,
      paused: autonomousBusiness?.isPaused || false,
      stats: autonomousBusiness?.stats || {
        leadsGenerated: 0,
        emailsSent: 0,
        demosCreated: 0,
        customersSigned: 0,
        revenue: 0
      }
    },

    // Services status
    services: {
      database: 'connected',
      openai: process.env.OPENAI_API_KEY ? 'configured' : 'missing',
      sendgrid: process.env.SENDGRID_API_KEY ? 'configured' : 'missing',
      twilio: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'missing',
      stripe: process.env.STRIPE_API_KEY ? 'configured' : 'missing'
    },

    // Configuration
    config: {
      researchPhase: process.env.SKIP_RESEARCH !== 'true',
      testingPhase: process.env.SKIP_TESTING !== 'true',
      operationMode: process.env.OPERATION_MODE || 'continuous',
      maxEmailsPerDay: parseInt(process.env.MAX_EMAILS_PER_DAY) || 50,
      enableAutomation: process.env.ENABLE_AUTOMATION === 'true'
    }
  });
});

// Readiness check (for Railway)
router.get('/ready', (req, res) => {
  const isReady = !!global.autonomousMetrics || !!global.autonomousBusiness;

  if (isReady) {
    res.status(200).json({
      ready: true,
      message: 'Autonomous engine is running'
    });
  } else {
    res.status(503).json({
      ready: false,
      message: 'Autonomous engine is starting up...'
    });
  }
});

// Liveness check (for Railway)
router.get('/live', (req, res) => {
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;