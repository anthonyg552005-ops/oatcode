/**
 * SIMPLE SERVER - Just to view the website
 * Use this to preview OatCode.com before full launch
 */

const express = require('express');
const path = require('path');
const basicAuth = require('express-basic-auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Password protection for dashboard and API routes
const dashboardAuth = basicAuth({
  users: {
    [process.env.DASHBOARD_USERNAME || 'admin']: process.env.DASHBOARD_PASSWORD || 'changeme123'
  },
  challenge: true,
  realm: 'OatCode Dashboard'
});

// API Routes (protected)
const dashboardRoutes = require('./src/routes/dashboard');
const monitoringRoutes = require('./src/routes/monitoring');

app.use('/api/dashboard', dashboardAuth, dashboardRoutes);
app.use('/api/monitoring', dashboardAuth, monitoringRoutes);

// Static Page Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Dashboard route (protected)
app.get('/dashboard', dashboardAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});

app.get('/terms-of-service', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/terms-of-service.html'));
});

app.get('/privacy-policy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/privacy-policy.html'));
});

app.get('/refund-policy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/refund-policy.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🎉 ============================================');
  console.log('🎉 OatCode.com Preview Server Running!');
  console.log('🎉 ============================================');
  console.log('');
  console.log(`   Port: ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('   Pages available:');
  console.log(`   • Homepage: /`);
  console.log(`   • Dashboard: /dashboard`);
  console.log(`   • Terms: /terms-of-service`);
  console.log(`   • Privacy: /privacy-policy`);
  console.log(`   • Refund: /refund-policy`);
  console.log('');
  console.log('   API Endpoints:');
  console.log(`   • GET /api/dashboard/stats`);
  console.log(`   • GET /api/dashboard/health`);
  console.log(`   • GET /api/monitoring/usage`);
  console.log('');
});