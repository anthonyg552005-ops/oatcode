# 🚀 Deploy Now - Copy/Paste These Commands

## Step 1: SSH to Droplet
```bash
ssh root@172.248.91.121
```

## Step 2: Navigate and Deploy (Copy All)
```bash
cd /var/www/automatedwebsitescraper && \
git pull origin main && \
npm install && \
node src/database/init-database.js && \
pm2 restart all
```

Expected output:
```
✅ Database initialization complete!
[PM2] Restarted processes
```

## Step 3: Verify Database
```bash
sqlite3 data/autonomous-business.sqlite "SELECT COUNT(*) FROM customers;"
```

Should show: `0` (empty, ready for first customer)

## Step 4: Check Server Running
```bash
pm2 status
pm2 logs --lines 20
```

Should see:
```
✅ SQLite database initialized and connected
🌐 Web server running on http://localhost:3000
```

## Step 5: Get Stripe Webhook Secret

I'll configure the Stripe webhook for you. First, let me get the webhook URL:

**Your Webhook URL:** `http://172.248.91.121:3000/webhook/stripe`

### Go to Stripe Dashboard:
https://dashboard.stripe.com/test/webhooks

1. Click "Add endpoint"
2. Endpoint URL: `http://172.248.91.121:3000/webhook/stripe`
3. Select these events:
   - ✅ `checkout.session.completed`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`

4. Click "Add endpoint"
5. **Copy the Signing Secret** (starts with `whsec_...`)

## Step 6: Add Webhook Secret to .env
```bash
nano /var/www/automatedwebsitescraper/.env
```

Add this line at the bottom:
```
STRIPE_WEBHOOK_SECRET=whsec_paste_your_secret_here
```

Save: `Ctrl+X`, `Y`, `Enter`

## Step 7: Restart Server
```bash
pm2 restart all
pm2 logs --lines 10
```

## Step 8: Test with Real Payment

### Get your Stripe Test Payment Link:
https://dashboard.stripe.com/test/payment-links

Use the test payment link and complete checkout with:
- Card: `4242 4242 4242 4242`
- Any future date
- Any CVC
- Email: `test@yourcompany.com`

## Step 9: Verify Customer Created
```bash
sqlite3 data/autonomous-business.sqlite "SELECT * FROM customers;"
sqlite3 data/autonomous-business.sqlite "SELECT * FROM payments;"
```

You should see your test customer and payment!

## Step 10: Check Logs
```bash
pm2 logs
```

Look for:
```
✅ Checkout completed
💾 Customer saved to database (ID: 1)
💳 Payment recorded
📧 Welcome email sent
```

---

## 🎉 You're Live!

Once the test payment works:

1. **Switch to Live Mode in Stripe**
2. **Create Live Payment Links** ($197 Standard, $297 Premium)
3. **Update Webhook** to live webhook secret
4. **Share payment links** with customers!

Your autonomous business is ready to accept real customers! 🚀

---

## Quick Reference

**Droplet IP:** 172.248.91.121
**Webhook URL:** http://172.248.91.121:3000/webhook/stripe
**Project Path:** /var/www/automatedwebsitescraper
**Database:** data/autonomous-business.sqlite

**Commands:**
- Deploy: `./deploy.sh --test`
- Restart: `pm2 restart all`
- Logs: `pm2 logs`
- Database: `sqlite3 data/autonomous-business.sqlite`
- Status: `pm2 status`

**Test Cards:**
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002
- Requires Auth: 4000 0025 0000 3155
