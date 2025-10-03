#!/bin/bash
# EXACT DEPLOYMENT COMMANDS - Copy/Paste to Droplet Terminal

echo "🚀 DEPLOYING DATABASE INTEGRATION TO PRODUCTION"
echo ""

# 1. Navigate to project
cd /var/www/automatedwebsitescraper || cd ~/automatedwebsitescraper || {
    echo "❌ Project directory not found"
    echo "Current directory: $(pwd)"
    exit 1
}

echo "✅ In project directory: $(pwd)"
echo ""

# 2. Pull latest code
echo "📥 Pulling latest code from GitHub..."
git pull origin main || {
    echo "⚠️  Git pull failed. Trying to reset..."
    git fetch origin
    git reset --hard origin/main
}
echo "✅ Code updated"
echo ""

# 3. Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# 4. Initialize database
echo "🗄️  Initializing SQLite database..."
node src/database/init-database.js
echo "✅ Database ready"
echo ""

# 5. Run integration tests
echo "🧪 Running integration tests..."
node test-stripe-integration.js
echo "✅ Tests passed"
echo ""

# 6. Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# 7. Restart services
echo "🔄 Restarting services..."
pm2 restart all || pm2 start src/app.js --name api

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "📊 Status:"
pm2 status
echo ""
echo "📝 Recent logs:"
pm2 logs --lines 10 --nostream
echo ""
echo "🔍 Database check:"
sqlite3 data/autonomous-business.sqlite "SELECT COUNT(*) as customers FROM customers; SELECT COUNT(*) as payments FROM payments;"
echo ""
echo "🌐 Server should be running at:"
echo "   http://172.248.91.121:3000"
echo ""
echo "⚠️  NEXT STEPS:"
echo "1. Configure Stripe webhook (see STRIPE_WEBHOOK_SETUP.md)"
echo "2. For Live Mode: Setup SSL/HTTPS (see SSL_SETUP_REQUIRED.md)"
echo "3. For Test Mode: Use HTTP webhook (allowed in test mode)"
echo ""
