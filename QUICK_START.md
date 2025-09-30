# 🚀 QUICK START GUIDE

Get your Autonomous AI up and running in 5 minutes!

## Step 1: Install Dependencies

```bash
cd automatedwebsitescraper
npm install
```

This will install all required packages.

## Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

**Required:**
- `OPENAI_API_KEY` - Get from https://platform.openai.com/api-keys
- `SENDGRID_API_KEY` OR `SMTP_USER/SMTP_PASS` - For email sending
- `GOOGLE_PLACES_API_KEY` - For business discovery

**Optional but recommended:**
- `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` - For SMS
- `ANTHROPIC_API_KEY` - For advanced AI features
- `STRIPE_SECRET_KEY` - For payments

## Step 3: Start the Autonomous Engine

```bash
npm start
```

You'll see:
```
╔═══════════════════════════════════════════════════════════╗
║   🤖 AUTONOMOUS AI ENGINE - STARTING UP                  ║
║   Building the Best Website Selling Business Ever        ║
║   Mode: 1 Week Autonomous Operation                       ║
╚═══════════════════════════════════════════════════════════╝

🎯 MISSION:
   • Continuously improve every aspect of the business
   • Learn from the best website sellers
   • Automatically test and optimize everything
   • Scale to maximize revenue
   • Run completely autonomously for 1 week
```

## Step 4: Monitor Progress

Open your browser:
```
http://localhost:3000/autonomous-dashboard
```

You'll see:
- AI status and uptime
- Recent autonomous decisions
- Performance metrics
- Learning progress
- Active tests and optimizations

## Step 5: Let It Run!

The AI will now:
- ✅ Analyze competitors every 30 minutes
- ✅ Optimize everything every hour
- ✅ Run A/B tests every 2 hours
- ✅ Optimize pricing every 4 hours
- ✅ Evolve strategy every 6 hours
- ✅ Make decisions every 15 minutes
- ✅ Generate daily reports at midnight

## What Happens Next?

### First Hour
- AI analyzes top competitors (Wix, Squarespace, etc.)
- Calculates optimal pricing
- Identifies winning strategies
- Runs initial system tests

### First Day
- Discovers businesses in target cities
- Sends personalized outreach emails
- Generates demo websites
- Tests different messaging
- Optimizes conversion funnel

### First Week
- Continuously learns and improves
- Tests hundreds of variations
- Finds optimal pricing
- Discovers best strategies
- Scales what works

## Daily Reports

Check `data/metrics/day-N-report.json` for:
- AI performance stats
- Business metrics
- Knowledge gained
- Improvements made
- Recommendations

## Monitoring Endpoints

- **Dashboard**: `http://localhost:3000/autonomous-dashboard`
- **Metrics**: `http://localhost:3000/metrics`
- **Knowledge**: `http://localhost:3000/knowledge`

## Common Issues

### "API key not found"
→ Make sure .env file has all required keys

### "Cannot connect to database"
→ Check DATABASE_URL or let it use SQLite (default)

### "Competitor scraping failed"
→ Normal - some sites block scraping, AI will retry

### "Email sending failed"
→ Check SendGrid key or SMTP credentials

## Need Help?

1. Check logs: `data/logs/combined.log`
2. Review dashboard: `http://localhost:3000/autonomous-dashboard`
3. Check metrics: `data/metrics/`
4. Read README.md for full documentation

## Deploy to Cloud

Ready for 24/7 operation?

```bash
npm run deploy
```

Follow the instructions for Railway or Heroku deployment.

## Success Checklist

- [ ] Dependencies installed
- [ ] .env configured with API keys
- [ ] System started successfully
- [ ] Dashboard accessible
- [ ] First competitor analysis complete
- [ ] Initial pricing calculated
- [ ] System tests passed
- [ ] Daily report generated

## You're Done!

The AI is now running autonomously. It will:
- Learn from competitors
- Optimize everything continuously
- Test and validate improvements
- Make intelligent decisions
- Generate daily progress reports

**Just let it run and check the dashboard periodically!**

🎉 **Congratulations! Your Autonomous AI is now building the best website selling business ever!**