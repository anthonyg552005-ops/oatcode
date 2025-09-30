/**
 * SIMPLE SERVER - Just to view the website
 * Use this to preview OatCode.com before full launch
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = 3001;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
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

app.listen(PORT, () => {
  console.log('');
  console.log('🎉 ============================================');
  console.log('🎉 OatCode.com Preview Server Running!');
  console.log('🎉 ============================================');
  console.log('');
  console.log(`   Visit: http://localhost:${PORT}`);
  console.log('');
  console.log('   Pages available:');
  console.log(`   • Homepage: http://localhost:${PORT}/`);
  console.log(`   • Terms: http://localhost:${PORT}/terms-of-service`);
  console.log(`   • Privacy: http://localhost:${PORT}/privacy-policy`);
  console.log(`   • Refund: http://localhost:${PORT}/refund-policy`);
  console.log('');
  console.log('   Press Ctrl+C to stop');
  console.log('');
});