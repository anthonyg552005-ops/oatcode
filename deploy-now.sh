#!/bin/bash
# ONE-COMMAND AUTONOMOUS DEPLOYMENT
# Run this locally: ./deploy-now.sh
# Or just paste the SSH command below

echo "🚀 Deploying to OatCode Droplet..."
echo ""

ssh root@24.144.89.17 << 'ENDSSH'
cd /var/www/automatedwebsitescraper

echo "📥 Pulling latest code from GitHub..."
git pull origin main

echo "📦 Installing dependencies..."
npm install --production

echo "🔄 Running database migrations..."
node migrate-add-delivery-scheduled.js || echo "Migration 1 already applied or failed"
node migrate-update-status-constraint.js || echo "Migration 2 already applied or failed"

echo "🔄 Restarting PM2 services..."
pm2 restart all

echo "⏳ Waiting for services to start..."
sleep 3

echo "✅ Checking service status..."
pm2 list

echo ""
echo "🎉 Deployment complete!"
echo "📊 Dashboard: https://oatcode.com/dashboard"
echo "🔍 Logs: pm2 logs"
ENDSSH

echo ""
echo "✅ Done! Your dashboard should now show 'System Running'"
