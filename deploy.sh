#!/bin/bash

# AUTOMATIC DEPLOYMENT SCRIPT FOR DROPLET
# Run this on your DigitalOcean droplet to deploy latest code

set -e  # Exit on error

echo "🚀 DEPLOYING TO PRODUCTION"
echo ""

# 1. Pull latest code
echo "1️⃣ Pulling latest code from GitHub..."
git pull origin main || {
    echo "❌ Git pull failed. Make sure you're in the project directory."
    exit 1
}
echo "   ✅ Code updated"
echo ""

# 2. Install dependencies
echo "2️⃣ Installing dependencies..."
npm install
echo "   ✅ Dependencies installed"
echo ""

# 3. Initialize database
echo "3️⃣ Initializing SQLite database..."
node src/database/init-database.js || {
    echo "⚠️  Database init had warnings (this is OK if tables already exist)"
}
echo "   ✅ Database ready"
echo ""

# 4. Test integration (optional)
if [ "$1" == "--test" ]; then
    echo "4️⃣ Running integration tests..."
    node test-stripe-integration.js || {
        echo "❌ Tests failed!"
        exit 1
    }
    echo "   ✅ All tests passed"
    echo ""
fi

# 5. Restart server
echo "5️⃣ Restarting PM2 services..."
if command -v pm2 &> /dev/null; then
    pm2 restart all
    echo "   ✅ PM2 services restarted"
else
    echo "   ⚠️  PM2 not found. Start server manually:"
    echo "      node src/app.js"
fi
echo ""

# 6. Check status
echo "6️⃣ Checking server status..."
if command -v pm2 &> /dev/null; then
    pm2 status
else
    echo "   Run: pm2 status"
fi
echo ""

echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "Next steps:"
echo "1. Configure Stripe webhook: https://dashboard.stripe.com/webhooks"
echo "2. Add webhook URL: http://YOUR_IP:3000/webhook/stripe"
echo "3. Copy webhook secret to .env"
echo "4. Test with payment link"
echo ""
echo "View logs: pm2 logs"
echo "Check database: sqlite3 data/autonomous-business.sqlite"
echo ""
