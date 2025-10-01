#!/bin/bash
# AUTONOMOUS DEPLOYMENT SYSTEM FOR DROPLET
# Automatically checks for updates, deploys, and recovers from failures

LOG_FILE="/var/www/automatedwebsitescraper/data/logs/auto-deploy.log"
REPO_DIR="/var/www/automatedwebsitescraper"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "🔍 Checking for updates..."

cd "$REPO_DIR" || exit 1

# Fetch latest changes
git fetch origin main

# Check if updates available
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    log "✅ Already up to date"
    exit 0
fi

log "📥 New updates detected. Deploying..."

# Backup current state
BACKUP_COMMIT=$LOCAL

# Pull updates
if ! git pull origin main; then
    log "❌ Git pull failed. Rolling back..."
    git reset --hard $BACKUP_COMMIT
    exit 1
fi

# Install dependencies if package.json changed
if git diff --name-only $BACKUP_COMMIT HEAD | grep -q "package.json"; then
    log "📦 package.json changed. Running npm install..."
    if ! npm install; then
        log "❌ npm install failed. Rolling back..."
        git reset --hard $BACKUP_COMMIT
        npm install
        exit 1
    fi
fi

# Restart services
log "🔄 Restarting services..."
pm2 restart all

# Wait 10 seconds and check if services are running
sleep 10

if ! pm2 list | grep -q "online"; then
    log "❌ Services failed to start. Rolling back..."
    git reset --hard $BACKUP_COMMIT
    npm install
    pm2 restart all
    exit 1
fi

log "✅ Deployment successful!"
log "   Previous: ${BACKUP_COMMIT:0:7}"
log "   Current:  ${REMOTE:0:7}"
