const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const EmailTrackingService = require('../services/EmailTrackingService');
const PhaseTrackingService = require('../services/PhaseTrackingService');

// Initialize services
const emailTracking = new EmailTrackingService(console);
const phaseTracking = new PhaseTrackingService(console);

// Initialize on startup
emailTracking.initialize().catch(err => console.error('Email tracking init failed:', err));
phaseTracking.initialize().catch(err => console.error('Phase tracking init failed:', err));

// Expose globally
global.emailTracking = emailTracking;
global.phaseTracking = phaseTracking;

/**
 * Dashboard API - Real-time stats for mobile/web dashboard
 */
router.get('/stats', async (req, res) => {
  try {
    // Check if system is running by reading health file
    let systemRunning = false;
    let healthStatus = null;

    try {
      const healthFile = path.join(__dirname, '../../data/health-status.json');
      const healthData = await fs.readFile(healthFile, 'utf-8');
      healthStatus = JSON.parse(healthData);

      // System is running if health file was updated within last 2 minutes
      const lastUpdate = new Date(healthStatus.timestamp);
      const minutesSinceUpdate = (Date.now() - lastUpdate) / 1000 / 60;
      systemRunning = minutesSinceUpdate < 2;
    } catch (error) {
      // Health file doesn't exist = engine not running
      systemRunning = false;
    }

    // Get stats from database (when models are ready)
    // For now, return mock data structure
    const stats = {
      systemRunning,

      // Revenue metrics
      mrr: 0, // Monthly Recurring Revenue
      activeSubscriptions: 0,

      // Customer metrics
      totalCustomers: 0,
      newCustomers: 0, // This month

      // Email campaign metrics
      emailsSent: 0, // Today
      emailLimit: parseInt(process.env.MAX_EMAILS_PER_DAY) || 50,

      // Business discovery metrics
      businessesDiscovered: 0,
      qualifiedLeads: 0,

      // Conversion metrics
      conversionRate: 0, // Email → Customer
      openRate: 0, // Email open rate

      // Website generation metrics
      websitesGenerated: 0,
      websitesThisMonth: 0,

      // Alerts
      alerts: [],

      // Recent activity - pull from autonomous engine if running
      recentActivity: global.autonomousBusiness?.recentActivity || global.autonomousMetrics?.recentActivity || [
        {
          timestamp: new Date().toISOString(),
          message: systemRunning ?
            '🤖 Autonomous engine running - 7-day research phase in progress' :
            'System in preview mode - no autonomous operations yet'
        }
      ]
    };

    // Add alerts if needed
    if (!systemRunning) {
      stats.alerts.push({
        title: 'System Not Running',
        message: 'The autonomous engine is currently stopped. Check the DigitalOcean Droplet to ensure PM2 services are running.'
      });
    } else {
      // System is running - check if we're in research phase
      if (process.env.SKIP_RESEARCH !== 'true') {
        stats.alerts.push({
          title: '🔬 Research Phase Active',
          message: '7-day testing phase in progress. Testing full business pipeline before production launch.'
        });
      }
    }

    res.json(stats);

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard stats',
      message: error.message
    });
  }
});

/**
 * Real-time metrics (for live updates)
 */
router.get('/realtime', async (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      systemStatus: process.env.ENABLE_AUTOMATION === 'true' ? 'running' : 'stopped',
      uptime: process.uptime(),
      memory: process.memoryUsage(),

      // Live counters
      activeProcesses: {
        discovery: 0,
        emailSending: 0,
        websiteGeneration: 0,
        customerSupport: 0
      }
    };

    res.json(metrics);

  } catch (error) {
    console.error('Error fetching realtime metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch realtime metrics'
    });
  }
});

/**
 * System health check
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        express: 'up',
        database: 'not_configured', // Will be 'up' when DB is connected
        openai: process.env.OPENAI_API_KEY ? 'configured' : 'missing',
        sendgrid: process.env.SENDGRID_API_KEY ? 'configured' : 'missing',
        twilio: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'missing',
        stripe: process.env.STRIPE_API_KEY ? 'configured' : 'missing'
      },
      environment: process.env.NODE_ENV || 'development',
      domain: process.env.DOMAIN || 'http://localhost:3000'
    };

    res.json(health);

  } catch (error) {
    console.error('Error checking system health:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * Get current phase info
 */
router.get('/phase', async (req, res) => {
  try {
    const phaseInfo = await phaseTracking.getPhaseInfo();
    res.json(phaseInfo);
  } catch (error) {
    console.error('Error fetching phase info:', error);
    res.status(500).json({
      error: 'Failed to fetch phase info',
      message: error.message
    });
  }
});

/**
 * Get email logs
 */
router.get('/emails', async (req, res) => {
  try {
    const { limit, status, phase } = req.query;

    const emails = await emailTracking.getAllEmails({
      limit: limit ? parseInt(limit) : 50,
      status,
      phase
    });

    const stats = await emailTracking.getStats();

    res.json({
      emails,
      stats,
      total: emails.length
    });
  } catch (error) {
    console.error('Error fetching email logs:', error);
    res.status(500).json({
      error: 'Failed to fetch email logs',
      message: error.message
    });
  }
});

/**
 * Get email statistics
 */
router.get('/emails/stats', async (req, res) => {
  try {
    const stats = await emailTracking.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching email stats:', error);
    res.status(500).json({
      error: 'Failed to fetch email stats',
      message: error.message
    });
  }
});

module.exports = router;