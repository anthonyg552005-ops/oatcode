#!/bin/bash
# QUICK DROPLET SETUP - Run this on your DigitalOcean Droplet
# Just copy-paste this entire script into your SSH terminal

set -e

echo "🚀 OatCode Quick Setup"
echo "====================="

# Update & install essentials
apt-get update && apt-get upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs git
npm install -g pm2

# Clone repo
mkdir -p /var/www && cd /var/www
git clone https://github.com/anthonypacificgarcia/automatedwebsitescraper.git
cd automatedwebsitescraper
npm install

# Create directories
mkdir -p data/databases data/documentation data/logs

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 NEXT STEP: Create .env file with your API keys"
echo "   Run: nano .env"
echo "   Then paste your environment variables and save (Ctrl+X, Y, Enter)"
echo ""
echo "🚀 THEN START: pm2 start src/autonomous-engine.js --name oatcode-engine"
echo "              pm2 start src/app.js --name oatcode-web"
echo "              pm2 save && pm2 startup"
