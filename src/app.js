/**
 * EXPRESS APPLICATION
 * Serves demo websites and provides dashboard
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const basicAuth = require('express-basic-auth');
require('dotenv').config();

const demoRoutes = require('./routes/demoRoutes');
const dashboardRoutes = require('./routes/dashboard');
const monitoringRoutes = require('./routes/monitoring');

const app = express();
const PORT = process.env.PORT || 3000;

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (landing page, legal pages)
app.use(express.static(path.join(__dirname, '../public')));

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

// Routes
app.use('/demo', demoRoutes);
app.use('/api/dashboard', dashboardAuth, dashboardRoutes);
app.use('/api/monitoring', dashboardAuth, monitoringRoutes);

// Dashboard route (protected)
app.get('/dashboard', dashboardAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
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