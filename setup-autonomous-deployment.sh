#!/bin/bash
# SETUP AUTONOMOUS DEPLOYMENT & MONITORING
# Run this once after initial setup to enable autonomous operations

REPO_DIR="/var/www/automatedwebsitescraper"

echo "🤖 Setting up autonomous deployment system..."

cd "$REPO_DIR" || exit 1

# Make scripts executable
chmod +x autonomous-deploy.sh
chmod +x autonomous-monitor.sh

# Create log directory
mkdir -p data/logs

# Setup cron jobs for autonomous operations
echo "📅 Configuring cron jobs..."

# Remove existing oatcode cron jobs if any
crontab -l 2>/dev/null | grep -v "autonomous-deploy.sh" | grep -v "autonomous-monitor.sh" | crontab -

# Add new cron jobs
(crontab -l 2>/dev/null; echo "# OatCode Autonomous Deployment - Check for updates every hour") | crontab -
(crontab -l; echo "0 * * * * cd $REPO_DIR && ./autonomous-deploy.sh >> data/logs/auto-deploy.log 2>&1") | crontab -

(crontab -l; echo "") | crontab -
(crontab -l; echo "# OatCode Autonomous Monitoring - Check health every 5 minutes") | crontab -
(crontab -l; echo "*/5 * * * * cd $REPO_DIR && ./autonomous-monitor.sh >> data/logs/auto-monitor.log 2>&1") | crontab -

echo ""
echo "✅ Autonomous system configured!"
echo ""
echo "📊 System will now:"
echo "   • Check for GitHub updates every hour"
echo "   • Auto-deploy new code"
echo "   • Monitor services every 5 minutes"
echo "   • Auto-restart on crashes"
echo "   • Auto-rollback on failed deployments"
echo ""
echo "📁 Logs available at:"
echo "   • Deployments: data/logs/auto-deploy.log"
echo "   • Monitoring:  data/logs/auto-monitor.log"
echo ""
echo "🎯 View cron jobs: crontab -l"
echo "📊 View deployment log: tail -f data/logs/auto-deploy.log"
echo "📊 View monitor log: tail -f data/logs/auto-monitor.log"
echo ""
