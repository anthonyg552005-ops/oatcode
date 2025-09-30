/**
 * CLOUD DEPLOYMENT SCRIPT
 *
 * Deploys the autonomous AI to cloud infrastructure
 * for 24/7 operation
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('');
console.log('╔════════════════════════════════════════════════════════╗');
console.log('║   🚀 DEPLOYING AUTONOMOUS AI TO CLOUD                 ║');
console.log('╚════════════════════════════════════════════════════════╝');
console.log('');

// Check if git is initialized
if (!fs.existsSync('.git')) {
  console.log('📦 Initializing git repository...');
  execSync('git init', { stdio: 'inherit' });
  execSync('git add .', { stdio: 'inherit' });
  execSync('git commit -m "Initial commit: Autonomous AI Engine"', { stdio: 'inherit' });
  console.log('✅ Git initialized\n');
}

console.log('🎯 Deployment Options:');
console.log('');
console.log('1. Railway (Recommended)');
console.log('   - Easy setup');
console.log('   - Free tier available');
console.log('   - Automatic deployments');
console.log('');
console.log('2. Heroku');
console.log('   - Popular platform');
console.log('   - Good free tier');
console.log('   - Many add-ons');
console.log('');
console.log('3. DigitalOcean');
console.log('   - More control');
console.log('   - $5/month');
console.log('   - VPS access');
console.log('');

console.log('📋 Pre-Deployment Checklist:');
console.log('');
console.log('✓ Ensure .env is configured with all API keys');
console.log('✓ Set environment variables in cloud platform');
console.log('✓ Configure PostgreSQL database (if using Railway/Heroku)');
console.log('✓ Set NODE_ENV=production');
console.log('✓ Enable ENABLE_AUTOMATION=true');
console.log('');

console.log('🔧 Railway Deployment:');
console.log('');
console.log('1. Install Railway CLI:');
console.log('   npm install -g @railway/cli');
console.log('');
console.log('2. Login to Railway:');
console.log('   railway login');
console.log('');
console.log('3. Initialize project:');
console.log('   railway init');
console.log('');
console.log('4. Add environment variables:');
console.log('   railway variables set OPENAI_API_KEY=your_key');
console.log('   railway variables set SENDGRID_API_KEY=your_key');
console.log('   (repeat for all variables)');
console.log('');
console.log('5. Deploy:');
console.log('   railway up');
console.log('');

console.log('🔧 Heroku Deployment:');
console.log('');
console.log('1. Install Heroku CLI:');
console.log('   https://devcenter.heroku.com/articles/heroku-cli');
console.log('');
console.log('2. Login to Heroku:');
console.log('   heroku login');
console.log('');
console.log('3. Create app:');
console.log('   heroku create your-autonomous-ai');
console.log('');
console.log('4. Add environment variables:');
console.log('   heroku config:set OPENAI_API_KEY=your_key');
console.log('   heroku config:set SENDGRID_API_KEY=your_key');
console.log('   (repeat for all variables)');
console.log('');
console.log('5. Deploy:');
console.log('   git push heroku main');
console.log('');

console.log('📊 After Deployment:');
console.log('');
console.log('✓ Access dashboard at: https://your-app.railway.app/autonomous-dashboard');
console.log('✓ Monitor logs: railway logs (or heroku logs --tail)');
console.log('✓ Check metrics: https://your-app.railway.app/metrics');
console.log('✓ Review daily reports in cloud storage');
console.log('');

console.log('✅ Ready to deploy! Follow the steps above for your chosen platform.');
console.log('');