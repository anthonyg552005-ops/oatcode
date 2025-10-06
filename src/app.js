/**
 * EXPRESS APPLICATION
 * Serves demo websites and provides dashboard
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const basicAuth = require('express-basic-auth');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const demoRoutes = require('./routes/demoRoutes');
const dashboardRoutes = require('./routes/dashboard');
const monitoringRoutes = require('./routes/monitoring');
const healthRoutes = require('./routes/health');
const webhookRoutes = require('./routes/sendgridWebhook');
const stripeWebhookRoutes = require('./routes/stripeWebhook');
const inboundEmailRoutes = require('./routes/inboundEmail');
const autonomousControlRoutes = require('./routes/autonomous-control');
const customerRoutes = require('./routes/customer');
const requestChangesRoutes = require('./routes/requestChanges');
const adminApprovalRoutes = require('./routes/adminApproval');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for rate limiting when behind nginx/cloudflare
app.set('trust proxy', true);

// Password protection for dashboard
const dashboardAuth = basicAuth({
  users: {
    [process.env.DASHBOARD_USERNAME || 'admin']: process.env.DASHBOARD_PASSWORD || 'changeme123'
  },
  challenge: true,
  realm: 'OatCode Dashboard'
});

// Middleware
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for demos
  crossOriginEmbedderPolicy: false
}));

// Stripe webhook needs raw body BEFORE express.json()
app.use('/webhook/stripe', express.raw({ type: 'application/json' }));

// Parse JSON for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting - protect against abuse
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  validate: false, // Disable trust proxy validation (we handle it ourselves)
  skip: (req) => {
    // Skip rate limiting for health checks, static files, admin routes, and dashboard
    return req.path === '/health' ||
           req.path.startsWith('/demos/') ||
           req.path.startsWith('/admin/') ||
           req.path.startsWith('/dashboard') ||
           req.path.startsWith('/api/public/') ||
           req.path.startsWith('/api/dashboard/');
  }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Stricter limit for API endpoints
  message: 'Too many API requests from this IP, please try again later.',
  validate: false // Disable trust proxy validation
});

const demoLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max 10 demo requests per hour per IP
  message: 'Too many demo requests, please try again later.',
  validate: false // Disable trust proxy validation
});

// Apply general rate limiting to all routes
app.use(generalLimiter);

// Serve static files (landing page, legal pages, demos)
app.use(express.static(path.join(__dirname, '../public')));
app.use('/demos', express.static(path.join(__dirname, '../demos')));

// CALCULATOR ROUTES - Explicitly serve calculator index.html files
app.get('/calculators', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/calculators/index.html'));
});
app.get('/calculators/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/calculators/index.html'));
});
app.get('/calculators/discord-boost', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/calculators/discord-boost/index.html'));
});
app.get('/calculators/discord-boost/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/calculators/discord-boost/index.html'));
});
app.get('/calculators/podcast-sponsorship', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/calculators/podcast-sponsorship/index.html'));
});
app.get('/calculators/podcast-sponsorship/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/calculators/podcast-sponsorship/index.html'));
});
app.get('/calculators/substack-pricing', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/calculators/substack-pricing/index.html'));
});
app.get('/calculators/substack-pricing/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/calculators/substack-pricing/index.html'));
});
app.get('/calculators/freelance-dev-rate', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/calculators/freelance-dev-rate/index.html'));
});
app.get('/calculators/freelance-dev-rate/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/calculators/freelance-dev-rate/index.html'));
});
app.get('/calculators/rideshare-tax', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/calculators/rideshare-tax/index.html'));
});
app.get('/calculators/rideshare-tax/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/calculators/rideshare-tax/index.html'));
});
app.get('/calculators/etsy-revenue', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/calculators/etsy-revenue/index.html'));
});
app.get('/calculators/etsy-revenue/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/calculators/etsy-revenue/index.html'));
});
app.get('/calculators/car-detailing-pricing', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/calculators/car-detailing-pricing/index.html'));
});
app.get('/calculators/car-detailing-pricing/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/calculators/car-detailing-pricing/index.html'));
});

// CUSTOM DOMAIN MIDDLEWARE - Routes premium customer domains to their websites
app.use(async (req, res, next) => {
  const hostname = req.hostname;

  // Skip oatcode.com, localhost, and direct IP access
  if (hostname.includes('oatcode.com') ||
      hostname.includes('localhost') ||
      hostname.includes('127.0.0.1') ||
      hostname.includes('24.144.89.17')) {
    return next();
  }

  // Check if this is a custom domain for a premium customer
  try {
    const db = require('./database/DatabaseService');
    if (!db.db) await db.connect();

    const customer = await db.get(
      'SELECT id, custom_domain, website_url, stripe_customer_id FROM customers WHERE custom_domain = ?',
      [hostname]
    );

    if (customer) {
      // Found premium customer with this custom domain
      console.log(`🌐 Custom domain request: ${hostname} → Customer ID ${customer.id}`);

      // Try to find their website file
      const glob = require('glob');
      const demoFiles = glob.sync(path.join(__dirname, '../public/demos', `${customer.id}.html`));

      if (demoFiles.length > 0) {
        console.log(`   ✅ Serving website: ${demoFiles[0]}`);
        return res.sendFile(demoFiles[0]);
      }

      // Try alternative naming pattern (customer_stripeid_timestamp.html)
      const altFiles = glob.sync(path.join(__dirname, '../public/demos', `customer_${customer.stripe_customer_id}*.html`));

      if (altFiles.length > 0) {
        console.log(`   ✅ Serving website: ${altFiles[0]}`);
        return res.sendFile(altFiles[0]);
      }

      console.log(`   ⚠️  Custom domain ${hostname} found but no website file exists`);
    }
  } catch (error) {
    console.error('Custom domain lookup error:', error);
  }

  // Not a custom domain or website not found - continue to normal routing
  next();
});

// Legal pages
app.get('/terms-of-service', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/terms-of-service.html'));
});

app.get('/privacy-policy', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/privacy-policy.html'));
});

app.get('/refund-policy', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/refund-policy.html'));
});

// Landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Purchase success page
app.get('/purchase-success', (req, res) => {
  const sessionId = req.query.session_id;
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Purchase Successful - OatCode</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen flex items-center justify-center px-4">
            <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                <div class="mb-6">
                    <div class="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                </div>
                <h1 class="text-3xl font-bold text-gray-900 mb-4">Payment Successful!</h1>
                <p class="text-gray-600 mb-6">Thank you for your purchase. We're setting up your website now.</p>
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p class="text-sm text-blue-800">
                        <strong>📧 Check your email!</strong><br>
                        You'll receive your custom website within the next 24-48 hours. We'll send you an email with the link once it's ready.
                    </p>
                </div>
                <div class="space-y-3">
                    <a href="${process.env.DOMAIN || 'http://localhost:3000'}" class="block w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition">
                        Return to Home
                    </a>
                </div>
                <p class="text-xs text-gray-500 mt-6">Session ID: ${sessionId || 'N/A'}</p>
            </div>
        </div>
    </body>
    </html>
  `);
});

// Routes
app.use('/demo', demoLimiter, demoRoutes); // Demo generation - stricter limit
app.use('/api/dashboard', dashboardAuth, dashboardRoutes);
app.use('/api/monitoring', dashboardAuth, monitoringRoutes);
app.use('/health', healthRoutes); // Public health checks (no rate limit)

// Public scraper stats (no auth required for dashboard display)
app.get('/api/public/scraper-stats', async (req, res) => {
  try {
    const db = require('./database/DatabaseService');
    if (!db.db) await db.connect();

    const result = await db.all(`
      SELECT COUNT(*) as count
      FROM leads
      WHERE source = 'autonomous_scraper'
      AND website = 'none'
    `);

    const leadCount = result[0]?.count || 0;

    // Check if scraper is running (has leads from last 10 minutes)
    const recentLeads = await db.all(`
      SELECT COUNT(*) as count
      FROM leads
      WHERE source = 'autonomous_scraper'
      AND datetime(createdAt) >= datetime('now', '-10 minutes')
    `);

    const isRunning = recentLeads[0]?.count > 0;

    res.json({
      leadCount,
      isRunning,
      target: 10000,
      percent: Math.min((leadCount / 10000) * 100, 100).toFixed(1)
    });

  } catch (error) {
    console.error('Error fetching scraper stats:', error);
    res.status(500).json({
      error: 'Failed to fetch scraper stats',
      leadCount: 0,
      isRunning: false,
      target: 10000,
      percent: 0
    });
  }
});

// Get all leads for dashboard
app.get('/api/public/leads', async (req, res) => {
  try {
    const { limit = 100, offset = 0, status = null } = req.query;
    const db = require('./database/DatabaseService');
    if (!db.db) await db.connect();

    let query = 'SELECT * FROM leads WHERE source = ? AND name != ?';
    const params = ['autonomous_scraper', 'Results'];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const leads = await db.all(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM leads WHERE source = ? AND name != ?';
    const countParams = ['autonomous_scraper', 'Results'];
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    const countResult = await db.all(countQuery, countParams);
    const total = countResult[0]?.total || 0;

    res.json({
      leads,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

app.use('/webhook/sendgrid', webhookRoutes); // SendGrid webhook (public - no auth)
app.use('/webhook/stripe', stripeWebhookRoutes); // Stripe webhook (public - verified by signature)
app.use('/webhook/inbound-email', inboundEmailRoutes); // Inbound email support (public - SendGrid Inbound Parse)
app.use('/api/autonomous-control', autonomousControlRoutes); // Autonomous control API (token auth)
app.use('/api/customer', apiLimiter, customerRoutes); // Customer retention and feedback - API limit
app.use('/api/request-changes', apiLimiter, requestChangesRoutes); // Customer change requests - API limit
app.use('/admin', adminApprovalRoutes); // Admin approval system (no auth for simplicity - add later if needed)

// Dashboard route (protected)
app.get('/dashboard', dashboardAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// Daily presentation route (protected)
app.get('/daily-presentation', dashboardAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/daily-presentation.html'));
});

// Manual trigger for daily presentation (protected)
app.post('/api/generate-presentation', dashboardAuth, async (req, res) => {
  try {
    if (global.dailyPresentation) {
      await global.dailyPresentation.sendDailyPresentation();
      await global.dailyPresentation.savePresentationToFile();
      res.json({ success: true, message: 'Daily presentation generated and sent!' });
    } else {
      res.status(400).json({ success: false, message: 'Presentation service not initialized' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// API Control endpoints
app.post('/api/control/pause', (req, res) => {
  if (global.autonomousBusiness) {
    const result = global.autonomousBusiness.pause();
    res.json(result);
  } else {
    res.status(400).json({ success: false, message: 'Business not initialized' });
  }
});

app.post('/api/control/resume', (req, res) => {
  if (global.autonomousBusiness) {
    const result = global.autonomousBusiness.resume();
    res.json(result);
  } else {
    res.status(400).json({ success: false, message: 'Business not initialized' });
  }
});

app.post('/api/control/stop', (req, res) => {
  if (global.autonomousBusiness) {
    const result = global.autonomousBusiness.stop();
    res.json(result);
  } else {
    res.status(400).json({ success: false, message: 'Business not initialized' });
  }
});

app.get('/api/control/status', (req, res) => {
  if (global.autonomousBusiness) {
    const status = global.autonomousBusiness.getStatus();
    res.json(status);
  } else {
    res.status(400).json({ success: false, message: 'Business not initialized' });
  }
});

// Dashboard route
app.get('/autonomous-dashboard', (req, res) => {
  const criticalNeeds = global.criticalNeeds || [];
  const hasCriticalNeeds = criticalNeeds.length > 0;
  const urgentNeeds = criticalNeeds.filter(n => n.urgency === 'CRITICAL' || n.urgency === 'HIGH');

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Autonomous Business Dashboard</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <meta http-equiv="refresh" content="60">
    </head>
    <body class="bg-gray-100">
        <div class="min-h-screen py-12 px-4">
            <div class="max-w-7xl mx-auto">
                <h1 class="text-4xl font-bold mb-8 text-gray-900">🤖 Autonomous Business Dashboard</h1>

                ${urgentNeeds.length > 0 ? `
                <!-- Critical Needs Alert Banner -->
                <div class="bg-red-600 text-white rounded-lg shadow-lg p-6 mb-8 animate-pulse">
                    <div class="flex items-center gap-4">
                        <div class="text-4xl">🚨</div>
                        <div class="flex-1">
                            <h2 class="text-2xl font-bold mb-2">CRITICAL NEEDS - Action Required!</h2>
                            <p class="text-lg">${urgentNeeds.length} critical ${urgentNeeds.length === 1 ? 'issue' : 'issues'} ${urgentNeeds.some(n => n.blocksProgress) ? 'BLOCKING PROGRESS' : 'requiring attention'}</p>
                            <p class="text-sm mt-2 opacity-90">Check your email (${process.env.EMERGENCY_CONTACT_EMAIL}) for details</p>
                        </div>
                    </div>
                </div>
                ` : ''}

                ${hasCriticalNeeds && urgentNeeds.length === 0 ? `
                <!-- Medium Priority Needs -->
                <div class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900 p-4 mb-8">
                    <div class="flex items-center gap-3">
                        <div class="text-2xl">⚠️</div>
                        <div>
                            <p class="font-semibold">Attention Needed</p>
                            <p class="text-sm">${criticalNeeds.length} ${criticalNeeds.length === 1 ? 'item' : 'items'} require your attention</p>
                        </div>
                    </div>
                </div>
                ` : ''}

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div class="bg-white rounded-lg shadow p-6">
                        <div class="text-gray-500 text-sm font-medium">AI Status</div>
                        <div class="text-3xl font-bold text-green-600 mt-2">Running</div>
                    </div>

                    <div class="bg-white rounded-lg shadow p-6">
                        <div class="text-gray-500 text-sm font-medium">Leads Generated</div>
                        <div class="text-3xl font-bold text-blue-600 mt-2" id="leads">0</div>
                    </div>

                    <div class="bg-white rounded-lg shadow p-6">
                        <div class="text-gray-500 text-sm font-medium">Revenue (MRR)</div>
                        <div class="text-3xl font-bold text-green-600 mt-2" id="revenue">$0</div>
                    </div>
                </div>

                <div class="bg-white rounded-lg shadow p-6 mb-8">
                    <h2 class="text-2xl font-bold mb-4">System Status</h2>
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <span>Lead Generation</span>
                            <span class="text-green-600 font-semibold">Active</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span>Email Outreach</span>
                            <span class="text-green-600 font-semibold">Active</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span>Website Generation</span>
                            <span class="text-green-600 font-semibold">Active (AI-Powered)</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span>Customer Support</span>
                            <span class="text-green-600 font-semibold">Active (AI)</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span>Billing System</span>
                            <span class="text-green-600 font-semibold">Active</span>
                        </div>
                    </div>
                </div>

                ${hasCriticalNeeds ? `
                <!-- Critical Needs Details -->
                <div class="bg-white rounded-lg shadow p-6 mb-8">
                    <h2 class="text-2xl font-bold mb-4 text-red-600">🚨 Critical Needs (Action Required)</h2>
                    <div class="space-y-4">
                        ${criticalNeeds.map(need => `
                        <div class="border-l-4 ${need.urgency === 'CRITICAL' ? 'border-red-600 bg-red-50' : need.urgency === 'HIGH' ? 'border-orange-500 bg-orange-50' : 'border-yellow-500 bg-yellow-50'} p-4 rounded">
                            <div class="flex items-start gap-3">
                                <div class="text-2xl">${need.urgency === 'CRITICAL' ? '🚨' : need.urgency === 'HIGH' ? '⚠️' : '📋'}</div>
                                <div class="flex-1">
                                    <h3 class="font-bold text-lg mb-2">${need.title}</h3>
                                    <p class="text-gray-700 mb-2">${need.description}</p>
                                    <p class="text-sm font-semibold mb-2">💥 Impact: ${need.impact}</p>
                                    <p class="text-sm mb-2">💡 Solution: ${need.solution}</p>
                                    <p class="text-sm mb-2">💰 Cost: ${need.cost}</p>
                                    ${need.blocksProgress ? '<p class="text-red-600 font-bold text-sm">🛑 BLOCKING PROGRESS</p>' : ''}
                                    <p class="text-xs text-gray-500 mt-2">${new Date(need.timestamp).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                        `).join('')}
                    </div>
                    <div class="mt-4 p-4 bg-blue-50 rounded">
                        <p class="text-sm"><strong>📧 Email sent to:</strong> ${process.env.EMERGENCY_CONTACT_EMAIL}</p>
                        <p class="text-xs text-gray-600 mt-1">Check your email for detailed instructions</p>
                    </div>
                </div>
                ` : ''}

                <div class="bg-white rounded-lg shadow p-6">
                    <h2 class="text-2xl font-bold mb-4">AI Stack</h2>
                    <div class="space-y-3">
                        <div class="flex items-center gap-3">
                            <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span><strong>GPT-4</strong> - Content generation, copywriting, strategy</span>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span><strong>DALL-E 3</strong> - Custom hero images, graphics</span>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span><strong>Claude 3.5 Sonnet</strong> - UX optimization, advanced reasoning</span>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span><strong>Tailwind CSS</strong> - Modern, responsive design system</span>
                        </div>
                    </div>
                </div>

                <div class="mt-8 text-center text-gray-600">
                    <p>🤖 AI is running autonomously - ${hasCriticalNeeds ? 'but needs your help!' : 'no human intervention needed'}</p>
                    <p class="text-sm mt-2">Check logs at: <code>data/logs/combined.log</code></p>
                    <p class="text-xs mt-2 text-gray-500">Dashboard auto-refreshes every 60 seconds</p>
                </div>
            </div>
        </div>

        <script>
            // Simulate updating metrics (in real app, fetch from API)
            let leads = 0;
            let revenue = 0;

            setInterval(() => {
                leads += Math.floor(Math.random() * 3);
                revenue += Math.floor(Math.random() * 200);

                document.getElementById('leads').textContent = leads;
                document.getElementById('revenue').textContent = '$' + revenue.toLocaleString();
            }, 5000);
        </script>
    </body>
    </html>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', ai: 'running' });
});

// Start server (only if not in autonomous mode)
if (process.env.ENABLE_WEB_SERVER !== 'false') {
  app.listen(PORT, () => {
    console.log(`🌐 Web server running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/autonomous-dashboard`);
  });
}

module.exports = app;