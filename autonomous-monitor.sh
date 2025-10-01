#!/bin/bash
# AUTONOMOUS MONITORING & RECOVERY
# Monitors services and auto-recovers from crashes

LOG_FILE="/var/www/automatedwebsitescraper/data/logs/auto-monitor.log"
REPO_DIR="/var/www/automatedwebsitescraper"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

cd "$REPO_DIR" || exit 1

# Check if autonomous engine is running
if ! pm2 list | grep "oatcode-engine" | grep -q "online"; then
    log "⚠️  Autonomous engine crashed! Restarting..."
    pm2 restart oatcode-engine

    # Wait and verify
    sleep 5
    if pm2 list | grep "oatcode-engine" | grep -q "online"; then
        log "✅ Autonomous engine recovered"
    else
        log "❌ Failed to recover autonomous engine"
        # Try full restart
        pm2 delete oatcode-engine
        pm2 start src/autonomous-engine.js --name oatcode-engine --time
    fi
fi

# Check if web server is running
if ! pm2 list | grep "oatcode-web" | grep -q "online"; then
    log "⚠️  Web server crashed! Restarting..."
    pm2 restart oatcode-web

    sleep 5
    if pm2 list | grep "oatcode-web" | grep -q "online"; then
        log "✅ Web server recovered"
    else
        log "❌ Failed to recover web server"
        pm2 delete oatcode-web
        pm2 start src/app.js --name oatcode-web --time
    fi
fi

# Check memory usage
MEMORY_PERCENT=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
if [ "$MEMORY_PERCENT" -gt 90 ]; then
    log "⚠️  High memory usage: ${MEMORY_PERCENT}%. Restarting services..."
    pm2 restart all
fi

# Check disk space
DISK_PERCENT=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_PERCENT" -gt 85 ]; then
    log "⚠️  Low disk space: ${DISK_PERCENT}% used"
    # Clean old logs
    find data/logs -name "*.log" -mtime +7 -delete
    log "   Cleaned old logs"
fi

# Everything healthy
log "✅ All systems operational (Memory: ${MEMORY_PERCENT}%, Disk: ${DISK_PERCENT}%)"
