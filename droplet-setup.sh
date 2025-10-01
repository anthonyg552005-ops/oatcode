#!/bin/bash
# AUTOMATED DROPLET SETUP SCRIPT
# Run this once on your new DigitalOcean Droplet

set -e

echo "🚀 OatCode Production Droplet Setup"
echo "===================================="
echo ""

# Update system
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# Install Node.js 18.x
echo "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2 globally
echo "📦 Installing PM2 for 24/7 operation..."
npm install -g pm2

# Install Git
echo "📦 Installing Git..."
apt-get install -y git

# Create app directory
echo "📁 Creating application directory..."
mkdir -p /var/www
cd /var/www

# Clone repository
echo "📥 Cloning repository..."
if [ -d "automatedwebsitescraper" ]; then
    echo "   Repository already exists, pulling latest..."
    cd automatedwebsitescraper
    git pull
else
    git clone https://github.com/anthonypacificgarcia/automatedwebsitescraper.git
    cd automatedwebsitescraper
fi

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Create .env file (you'll need to add your API keys)
echo "⚙️  Creating environment configuration template..."
cat > .env << 'ENVEOF'
# OpenAI API Key
OPENAI_API_KEY=YOUR_OPENAI_KEY_HERE

# SendGrid Configuration
SENDGRID_API_KEY=YOUR_SENDGRID_KEY_HERE
FROM_NAME=OatCode
FROM_EMAIL=noreply@oatcode.com

# Twilio Configuration
TWILIO_ACCOUNT_SID=YOUR_TWILIO_SID_HERE
TWILIO_AUTH_TOKEN=YOUR_TWILIO_TOKEN_HERE
TWILIO_PHONE_NUMBER=+14152127775

# Google Places API
GOOGLE_PLACES_API_KEY=YOUR_GOOGLE_KEY_HERE

# Server Configuration
PORT=3000
NODE_ENV=production

# Skip research during outreach (faster)
SKIP_RESEARCH=false
ENVEOF

echo ""
echo "⚠️  IMPORTANT: You need to edit /var/www/automatedwebsitescraper/.env"
echo "    and add your real API keys before starting the services."
echo ""
echo "Press Enter to continue (or Ctrl+C to cancel)..."
read -r

# Create data directories
echo "📁 Creating data directories..."
mkdir -p data/databases
mkdir -p data/documentation
mkdir -p data/logs

# Start with PM2
echo "🚀 Starting autonomous engine with PM2..."
pm2 delete oatcode-engine 2>/dev/null || true
pm2 start src/autonomous-engine.js --name oatcode-engine --time

# Start web server
echo "🌐 Starting web server..."
pm2 delete oatcode-web 2>/dev/null || true
pm2 start src/app.js --name oatcode-web --time

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
echo "⚙️  Setting up PM2 auto-startup..."
pm2 startup systemd -u root --hp /root

# Show status
echo ""
echo "✅ SETUP COMPLETE!"
echo "=================="
echo ""
echo "🎯 Your autonomous engine is now running 24/7!"
echo ""
echo "📊 Useful commands:"
echo "   pm2 status              - View running processes"
echo "   pm2 logs oatcode-engine - View autonomous engine logs"
echo "   pm2 logs oatcode-web    - View web server logs"
echo "   pm2 restart all         - Restart all services"
echo "   pm2 stop all            - Stop all services"
echo ""
echo "🌐 Web dashboard: http://24.144.89.17:3000"
echo "📧 SendGrid webhook: http://24.144.89.17:3000/webhook/sendgrid/events"
echo ""
echo "🔄 To deploy updates:"
echo "   cd /var/www/automatedwebsitescraper"
echo "   git pull"
echo "   npm install"
echo "   pm2 restart all"
echo ""
