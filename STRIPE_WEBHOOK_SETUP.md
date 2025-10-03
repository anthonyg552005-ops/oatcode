# Stripe Webhook Setup Guide

## 🚨 IMPORTANT: Test Mode vs Live Mode

### Test Mode (HTTP Allowed) ✅
- Allows HTTP webhooks
- Use test cards (4242 4242 4242 4242)
- Perfect for testing integration
- **Recommended to start here**

### Live Mode (HTTPS Required) 🔒
- Requires HTTPS webhooks
- Needs SSL certificate
- Accepts real payments
- **Setup SSL first** (see SSL_SETUP_REQUIRED.md)

---

## Option 1: Test Mode Setup (5 Minutes) ✅ START HERE

### Step 1: Switch to Test Mode
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click toggle in top-left corner
3. Select **"Test mode"**

### Step 2: Create Test Webhook
1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click **"Add endpoint"**
3. Enter URL: `http://172.248.91.121:3000/webhook/stripe`
4. Click **"Select events"**
5. Check these events:
   - ✅ `checkout.session.completed` ← **CRITICAL**
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
6. Click **"Add endpoint"**

### Step 3: Copy Webhook Secret
1. After creating, you'll see the webhook details
2. Click **"Reveal"** next to "Signing secret"
3. Copy the secret (starts with `whsec_...`)

### Step 4: Add to Droplet .env
SSH to your droplet:
```bash
ssh root@172.248.91.121
cd /var/www/automatedwebsitescraper
nano .env
```

Add this line:
```bash
STRIPE_WEBHOOK_SECRET=whsec_paste_your_test_secret_here
```

Save: `Ctrl+X`, `Y`, `Enter`

### Step 5: Restart Server
```bash
pm2 restart all
pm2 logs --lines 20
```

### Step 6: Test with Test Payment
1. Get your **test** payment link from Stripe
2. Go to: https://dashboard.stripe.com/test/payment-links
3. Use the payment link
4. Enter test card: `4242 4242 4242 4242`
5. Any future date, any CVC
6. Use email: `test@yourbusiness.com`
7. Complete checkout

### Step 7: Verify It Worked
```bash
# On droplet
sqlite3 data/autonomous-business.sqlite "SELECT * FROM customers;"
sqlite3 data/autonomous-business.sqlite "SELECT * FROM payments;"

# Check logs
pm2 logs
```

You should see:
```
✅ Checkout completed
💾 Customer saved to database (ID: 1)
💳 Payment recorded: $197 or $297
📧 Welcome email sent
```

---

## Option 2: Live Mode Setup (After SSL) 🔒

### Prerequisites
- ✅ Domain pointed to droplet
- ✅ SSL certificate installed
- ✅ HTTPS working

### Step 1: Switch to Live Mode
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Toggle to **"Live mode"**

### Step 2: Create Live Webhook
1. Go to: https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. Enter URL: `https://yourdomain.com/webhook/stripe`
   - **MUST be HTTPS**
4. Select same events as test mode
5. Click **"Add endpoint"**

### Step 3: Copy Live Webhook Secret
1. Reveal and copy the signing secret
2. Update `.env` on droplet:

```bash
STRIPE_WEBHOOK_SECRET=whsec_your_live_secret_here
```

### Step 4: Restart Server
```bash
pm2 restart all
```

### Step 5: Test with Real Card
1. Use **live** payment link
2. Use your own card (you can refund immediately)
3. Complete checkout
4. Verify customer created in database

---

## Debugging Webhook Issues

### Webhook Not Triggering?

**Check Stripe Dashboard:**
1. Go to: https://dashboard.stripe.com/test/webhooks (or live)
2. Click on your webhook
3. Check **"Events"** tab
4. Look for recent events
5. See if any failed

**Check Droplet Logs:**
```bash
pm2 logs
# Look for webhook events
```

**Test Webhook Manually:**
```bash
# On your local machine
curl -X POST http://172.248.91.121:3000/webhook/stripe \
  -H "Content-Type: application/json" \
  -d '{"type":"ping"}'
```

Should return: `{"received":true}`

### Common Issues

**1. Webhook Secret Wrong**
```bash
# On droplet
cat .env | grep STRIPE_WEBHOOK_SECRET
# Make sure it matches Stripe dashboard
```

**2. Server Not Running**
```bash
pm2 status
pm2 logs --lines 50
```

**3. Database Not Initialized**
```bash
sqlite3 data/autonomous-business.sqlite ".tables"
# Should show: customers, payments, domains, etc.
```

**4. Port 3000 Blocked**
```bash
# Test from outside
curl http://172.248.91.121:3000/api/dashboard/health
```

---

## Stripe Webhook Events Explained

### `checkout.session.completed`
- Triggered when customer completes payment
- **Most important event**
- Creates customer in database
- Purchases domain (Premium tier)
- Sends welcome email

### `invoice.payment_succeeded`
- Triggered for recurring payments
- Records payment in database
- Updates customer status

### `invoice.payment_failed`
- Triggered when payment fails
- Records failed payment
- Suspends account after 3 failures

### `customer.subscription.updated`
- Triggered when customer upgrades/downgrades
- Updates tier in database
- Regenerates website if upgraded to Premium

### `customer.subscription.deleted`
- Triggered when customer cancels
- Updates status to "cancelled"
- Sends cancellation survey

---

## Success Criteria

✅ **Webhook is working if:**
1. Stripe dashboard shows events with "200 OK"
2. Database has customer record
3. Payment recorded in database
4. Welcome email sent (check pm2 logs)
5. Dashboard shows customer count increased

❌ **Webhook is NOT working if:**
1. Stripe shows errors (400, 500, timeout)
2. No customer in database after payment
3. Logs show errors

---

## Quick Reference

**Test Mode:**
- Dashboard: https://dashboard.stripe.com/test/webhooks
- Webhook URL: `http://172.248.91.121:3000/webhook/stripe`
- Test Cards: https://stripe.com/docs/testing

**Live Mode:**
- Dashboard: https://dashboard.stripe.com/webhooks
- Webhook URL: `https://yourdomain.com/webhook/stripe` (HTTPS required)
- Real cards only

**Environment Variables:**
```bash
STRIPE_SECRET_KEY=sk_live_... or sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Commands:**
```bash
# View logs
pm2 logs

# Restart server
pm2 restart all

# Check database
sqlite3 data/autonomous-business.sqlite "SELECT * FROM customers;"

# Test webhook
curl http://172.248.91.121:3000/webhook/stripe
```
