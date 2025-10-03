const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const EmailTrackingService = require('../services/EmailTrackingService');
const PhaseTrackingService = require('../services/PhaseTrackingService');
const EmailLogService = require('../services/EmailLogService');
const DemoGalleryService = require('../services/DemoGalleryService');
const db = require('../database/DatabaseService');

// Initialize services
const emailTracking = new EmailTrackingService(console);
const phaseTracking = new PhaseTrackingService(console);
const emailLog = new EmailLogService(console);
const demoGallery = new DemoGalleryService(console);

// Initialize on startup
emailTracking.initialize().catch(err => console.error('Email tracking init failed:', err));
phaseTracking.initialize().catch(err => console.error('Phase tracking init failed:', err));
emailLog.initialize().catch(err => console.error('Email log init failed:', err));
demoGallery.initialize().catch(err => console.error('Demo gallery init failed:', err));

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

    // Get stats from SQLite database
    let dbStats = {
      totalCustomers: 0,
      totalLeads: 0,
      totalRevenue: 0,
      totalDemos: 0,
      activeCustomers: 0,
      premiumCustomers: 0,
      standardCustomers: 0,
      domainsPurchased: 0
    };

    try {
      // Connect to database if needed
      if (!db.db) await db.connect();

      // Get overall stats
      dbStats = await db.getStats();

      // Get active customers by status
      const activeCustomers = await db.all('SELECT COUNT(*) as count FROM customers WHERE status = "active"');
      dbStats.activeCustomers = activeCustomers[0]?.count || 0;

      // Get customers by tier
      const premiumCustomers = await db.all('SELECT COUNT(*) as count FROM customers WHERE tier = "premium"');
      const standardCustomers = await db.all('SELECT COUNT(*) as count FROM customers WHERE tier = "standard"');
      dbStats.premiumCustomers = premiumCustomers[0]?.count || 0;
      dbStats.standardCustomers = standardCustomers[0]?.count || 0;

      // Get domain purchases
      const domainsPurchased = await db.all('SELECT COUNT(*) as count FROM domain_purchases WHERE status = "active"');
      dbStats.domainsPurchased = domainsPurchased[0]?.count || 0;

      // Get this month's customers
      const thisMonthCustomers = await db.all(`
        SELECT COUNT(*) as count FROM customers
        WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
      `);
      dbStats.newCustomersThisMonth = thisMonthCustomers[0]?.count || 0;

      // Get successful payments this month for MRR
      const thisMonthRevenue = await db.all(`
        SELECT SUM(amount) as total FROM payments
        WHERE status = "succeeded"
        AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
      `);
      dbStats.revenueThisMonth = thisMonthRevenue[0]?.total || 0;

    } catch (error) {
      console.error('Error fetching database stats:', error);
      // Continue with zeros if DB fails
    }

    const stats = {
      systemRunning,

      // Revenue metrics
      mrr: (dbStats.activeCustomers * 197) + ((dbStats.premiumCustomers - dbStats.standardCustomers) * 100), // Approx MRR
      activeSubscriptions: dbStats.activeCustomers,
      totalRevenue: dbStats.totalRevenue || 0,
      revenueThisMonth: dbStats.revenueThisMonth || 0,

      // Customer metrics
      totalCustomers: dbStats.totalCustomers || 0,
      newCustomers: dbStats.newCustomersThisMonth || 0,
      activeCustomers: dbStats.activeCustomers || 0,
      premiumCustomers: dbStats.premiumCustomers || 0,
      standardCustomers: dbStats.standardCustomers || 0,

      // Email campaign metrics
      emailsSent: 0, // Today - from EmailLogService
      emailLimit: parseInt(process.env.MAX_EMAILS_PER_DAY) || 50,

      // Business discovery metrics
      businessesDiscovered: dbStats.totalLeads || 0,
      qualifiedLeads: dbStats.totalLeads || 0,

      // Conversion metrics
      conversionRate: dbStats.totalLeads > 0 ? ((dbStats.totalCustomers / dbStats.totalLeads) * 100).toFixed(1) : 0,
      openRate: 0, // Email open rate - from EmailLogService

      // Website generation metrics
      websitesGenerated: dbStats.totalDemos || 0,
      websitesThisMonth: dbStats.totalDemos || 0,

      // Domain metrics
      domainsPurchased: dbStats.domainsPurchased || 0,

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
    // Check database connection
    let databaseStatus = 'down';
    try {
      if (!db.db) await db.connect();
      const testQuery = await db.get('SELECT 1 as test');
      databaseStatus = testQuery ? 'up' : 'down';
    } catch (error) {
      databaseStatus = 'down';
    }

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        express: 'up',
        database: databaseStatus,
        openai: process.env.OPENAI_API_KEY ? 'configured' : 'missing',
        sendgrid: process.env.SENDGRID_API_KEY ? 'configured' : 'missing',
        twilio: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'missing',
        stripe: process.env.STRIPE_API_KEY ? 'configured' : 'missing',
        namecheap: process.env.NAMECHEAP_API_KEY ? 'configured' : 'missing'
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
 * Get email logs (EmailLogService)
 */
router.get('/emails', async (req, res) => {
  try {
    const { limit, offset, type, recipient, dateFrom, dateTo } = req.query;

    const result = await emailLog.getAllEmails({
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
      type,
      recipient,
      dateFrom,
      dateTo
    });

    const stats = await emailLog.getEmailStats();

    res.json({
      emails: result.emails,
      stats,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore
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
    const stats = await emailLog.getEmailStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching email stats:', error);
    res.status(500).json({
      error: 'Failed to fetch email stats',
      message: error.message
    });
  }
});

/**
 * Get specific email by ID
 */
router.get('/emails/:id', async (req, res) => {
  try {
    const email = await emailLog.getEmailById(req.params.id);
    if (!email) {
      return res.status(404).json({
        error: 'Email not found'
      });
    }
    res.json(email);
  } catch (error) {
    console.error('Error fetching email:', error);
    res.status(500).json({
      error: 'Failed to fetch email',
      message: error.message
    });
  }
});

/**
 * Search emails
 */
router.get('/emails/search/:query', async (req, res) => {
  try {
    const emails = await emailLog.searchEmails(req.params.query);
    res.json({
      emails,
      total: emails.length,
      query: req.params.query
    });
  } catch (error) {
    console.error('Error searching emails:', error);
    res.status(500).json({
      error: 'Failed to search emails',
      message: error.message
    });
  }
});

/**
 * Get all demos
 */
router.get('/demos', async (req, res) => {
  try {
    const { limit, offset, type, status, industry } = req.query;

    const result = await demoGallery.getAllDemos({
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
      type,
      status,
      industry
    });

    const stats = await demoGallery.getDemoStats();

    res.json({
      demos: result.demos,
      stats,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore
    });
  } catch (error) {
    console.error('Error fetching demos:', error);
    res.status(500).json({
      error: 'Failed to fetch demos',
      message: error.message
    });
  }
});

/**
 * Get specific demo by ID
 */
router.get('/demos/:id', async (req, res) => {
  try {
    const demo = await demoGallery.getDemoById(req.params.id);
    if (!demo) {
      return res.status(404).json({
        error: 'Demo not found'
      });
    }
    res.json(demo);
  } catch (error) {
    console.error('Error fetching demo:', error);
    res.status(500).json({
      error: 'Failed to fetch demo',
      message: error.message
    });
  }
});

/**
 * Get demos by type (standard/premium)
 */
router.get('/demos/type/:type', async (req, res) => {
  try {
    const demos = await demoGallery.getDemosByType(req.params.type);
    res.json({
      demos,
      total: demos.length,
      type: req.params.type
    });
  } catch (error) {
    console.error('Error fetching demos by type:', error);
    res.status(500).json({
      error: 'Failed to fetch demos by type',
      message: error.message
    });
  }
});

/**
 * Get client websites (converted demos)
 */
router.get('/clients', async (req, res) => {
  try {
    const websites = await demoGallery.getClientWebsites();
    res.json({
      websites,
      total: websites.length
    });
  } catch (error) {
    console.error('Error fetching client websites:', error);
    res.status(500).json({
      error: 'Failed to fetch client websites',
      message: error.message
    });
  }
});

/**
 * Get pending customization requests
 */
router.get('/customizations', async (req, res) => {
  try {
    const requests = await demoGallery.getPendingCustomizations();
    res.json({
      requests,
      total: requests.length
    });
  } catch (error) {
    console.error('Error fetching customization requests:', error);
    res.status(500).json({
      error: 'Failed to fetch customization requests',
      message: error.message
    });
  }
});

/**
 * Submit demo customization request
 */
router.post('/demos/:id/customize', async (req, res) => {
  try {
    const result = await demoGallery.requestCustomization(req.params.id, req.body);

    if (!result.success) {
      return res.status(400).json({
        error: result.error || 'Failed to submit customization request'
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error submitting customization request:', error);
    res.status(500).json({
      error: 'Failed to submit customization request',
      message: error.message
    });
  }
});

/**
 * Complete customization request
 */
router.post('/customizations/:id/complete', async (req, res) => {
  try {
    const { newDemoUrl } = req.body;

    if (!newDemoUrl) {
      return res.status(400).json({
        error: 'newDemoUrl is required'
      });
    }

    const result = await demoGallery.completeCustomization(req.params.id, newDemoUrl);

    if (!result.success) {
      return res.status(400).json({
        error: result.error || 'Failed to complete customization'
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error completing customization:', error);
    res.status(500).json({
      error: 'Failed to complete customization',
      message: error.message
    });
  }
});

/**
 * Get all customers from database
 */
router.get('/customers', async (req, res) => {
  try {
    if (!db.db) await db.connect();

    const { status, tier, limit, offset } = req.query;

    let customers;
    if (status) {
      customers = await db.getAllCustomers(status);
    } else {
      customers = await db.getAllCustomers();
    }

    // Filter by tier if specified
    if (tier) {
      customers = customers.filter(c => c.tier === tier);
    }

    // Apply pagination
    const limitNum = limit ? parseInt(limit) : 50;
    const offsetNum = offset ? parseInt(offset) : 0;
    const paginatedCustomers = customers.slice(offsetNum, offsetNum + limitNum);

    res.json({
      customers: paginatedCustomers,
      total: customers.length,
      limit: limitNum,
      offset: offsetNum,
      hasMore: (offsetNum + limitNum) < customers.length
    });

  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      error: 'Failed to fetch customers',
      message: error.message
    });
  }
});

/**
 * Get specific customer by ID
 */
router.get('/customers/:id', async (req, res) => {
  try {
    if (!db.db) await db.connect();

    const customer = await db.getCustomer(req.params.id);

    if (!customer) {
      return res.status(404).json({
        error: 'Customer not found'
      });
    }

    // Get customer's payments
    const payments = await db.getPaymentsByCustomer(req.params.id);

    // Get customer's domain purchases
    const domains = await db.all(
      'SELECT * FROM domain_purchases WHERE customer_id = ?',
      [req.params.id]
    );

    res.json({
      customer,
      payments,
      domains
    });

  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({
      error: 'Failed to fetch customer',
      message: error.message
    });
  }
});

/**
 * Get all leads from database
 */
router.get('/leads', async (req, res) => {
  try {
    if (!db.db) await db.connect();

    const { status, limit, offset } = req.query;

    let leads;
    if (status) {
      leads = await db.all('SELECT * FROM leads WHERE status = ? ORDER BY created_at DESC', [status]);
    } else {
      leads = await db.all('SELECT * FROM leads ORDER BY created_at DESC');
    }

    // Apply pagination
    const limitNum = limit ? parseInt(limit) : 50;
    const offsetNum = offset ? parseInt(offset) : 0;
    const paginatedLeads = leads.slice(offsetNum, offsetNum + limitNum);

    res.json({
      leads: paginatedLeads,
      total: leads.length,
      limit: limitNum,
      offset: offsetNum,
      hasMore: (offsetNum + limitNum) < leads.length
    });

  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({
      error: 'Failed to fetch leads',
      message: error.message
    });
  }
});

/**
 * Get all payments from database
 */
router.get('/payments', async (req, res) => {
  try {
    if (!db.db) await db.connect();

    const { status, customerId, limit, offset } = req.query;

    let query = 'SELECT * FROM payments';
    const params = [];
    const conditions = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (customerId) {
      conditions.push('customer_id = ?');
      params.push(customerId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const payments = await db.all(query, params);

    // Apply pagination
    const limitNum = limit ? parseInt(limit) : 50;
    const offsetNum = offset ? parseInt(offset) : 0;
    const paginatedPayments = payments.slice(offsetNum, offsetNum + limitNum);

    res.json({
      payments: paginatedPayments,
      total: payments.length,
      limit: limitNum,
      offset: offsetNum,
      hasMore: (offsetNum + limitNum) < payments.length
    });

  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      error: 'Failed to fetch payments',
      message: error.message
    });
  }
});

/**
 * Get recent activity (combined emails and demos)
 */
router.get('/recent', async (req, res) => {
  try {
    const recentEmails = await emailLog.getRecentEmails(10);
    const recentDemos = await demoGallery.getRecentDemos(10);

    // Combine and sort by timestamp
    const activity = [
      ...recentEmails.map(e => ({
        type: 'email',
        id: e.id,
        timestamp: e.sentAt,
        description: `Email sent to ${e.recipient.businessName}`,
        subject: e.subject,
        recipient: e.recipient
      })),
      ...recentDemos.map(d => ({
        type: 'demo',
        id: d.id,
        timestamp: d.createdAt,
        description: `${d.type === 'premium' ? 'Premium' : 'Standard'} demo created for ${d.businessName}`,
        demoUrl: d.demoUrl,
        businessName: d.businessName
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 20);

    res.json({
      activity,
      total: activity.length
    });
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({
      error: 'Failed to fetch recent activity',
      message: error.message
    });
  }
});

module.exports = router;