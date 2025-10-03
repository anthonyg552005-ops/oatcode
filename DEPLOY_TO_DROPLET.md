# Deploy to DigitalOcean Droplet

## Quick Deploy (5 Minutes)

### 1. Connect to Droplet
```bash
ssh root@172.248.91.121
```

### 2. Navigate to Project
```bash
cd /var/www/automatedwebsitescraper
# or wherever your project is
```

### 3. Pull Latest Code
```bash
git add .
git commit -m "Database integration complete"
git push origin main

# On droplet
git pull origin main
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Run Database Initialization
```bash
node src/database/init-database.js
```

### 6. Test Integration
```bash
node test-stripe-integration.js
```

Expected output:
```
✅ ALL TESTS PASSED!
🎉 Stripe integration is ready for production!
```

### 7. Restart Server
```bash
pm2 restart all
# or
pm2 restart autonomous-engine
```

### 8. Verify Server Running
```bash
pm2 status
pm2 logs
```

---

## Configure Stripe Webhook (CRITICAL!)

### 1. Get Your Droplet URL
Your droplet is at: `http://172.248.91.121:3000`

Or if you have a domain: `https://yourdomain.com`

### 2. Go to Stripe Dashboard
https://dashboard.stripe.com/webhooks

### 3. Add Webhook Endpoint
- Click "Add endpoint"
- URL: `http://172.248.91.121:3000/webhook/stripe`
  (or `https://yourdomain.com/webhook/stripe`)

### 4. Select Events
✅ Check these events:
- `checkout.session.completed` ← MOST IMPORTANT
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

### 5. Copy Webhook Secret
- After creating, copy the "Signing secret" (starts with `whsec_...`)
- Add to your droplet's `.env`:

```bash
ssh root@172.248.91.121
cd /var/www/automatedwebsitescraper
nano .env
```

Add this line:
```
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
```

Save and exit (Ctrl+X, Y, Enter)

### 6. Restart Server Again
```bash
pm2 restart all
```

---

## Test End-to-End Flow

### 1. Use Stripe Test Payment Link
Use the test mode payment link from your Stripe dashboard.

### 2. Complete Test Checkout
- Use test card: `4242 4242 4242 4242`
- Any future date
- Any CVC
- Email: `yourtest@email.com`

### 3. Verify Database
```bash
ssh root@172.248.91.121
cd /var/www/automatedwebsitescraper

# Check database
sqlite3 data/autonomous-business.sqlite "SELECT * FROM customers;"
sqlite3 data/autonomous-business.sqlite "SELECT * FROM payments;"
```

You should see your test customer and payment!

### 4. Check Logs
```bash
pm2 logs
```

Look for:
```
✅ Checkout completed
💾 Customer saved to database
💳 Payment recorded
📧 Welcome email sent
```

---

## Production Checklist

- [x] Database initialized ✅
- [x] Stripe integration tested ✅
- [x] Code deployed to droplet
- [ ] Stripe webhook configured
- [ ] Test payment completed
- [ ] Welcome email verified
- [ ] Dashboard shows real data

---

## Troubleshooting

### Database Not Created?
```bash
node src/database/init-database.js
```

### Server Won't Start?
```bash
pm2 logs
# Look for errors
```

### Webhook Not Working?
1. Check webhook URL is correct
2. Check webhook secret in .env
3. Check pm2 logs for errors
4. Verify server is running: `curl http://localhost:3000/api/dashboard/health`

### No Email Sent?
1. Check SendGrid API key in .env
2. Check pm2 logs
3. Verify SENDGRID_API_KEY is set

---

## Quick Commands Reference

```bash
# SSH to droplet
ssh root@172.248.91.121

# Check server status
pm2 status

# View logs
pm2 logs

# Restart server
pm2 restart all

# Test database
sqlite3 data/autonomous-business.sqlite

# Check environment
cat .env | grep STRIPE

# Pull latest code
git pull origin main

# Install dependencies
npm install
```

---

## What Happens on First Payment

1. **Customer pays** via Stripe payment link
2. **Stripe sends webhook** to `/webhook/stripe`
3. **Server receives webhook** and creates:
   - Customer record in database ✅
   - Payment record ✅
   - Domain purchase for Premium ✅ (if Premium tier)
4. **Welcome email sent** with website link 📧
5. **Dashboard updated** with real-time stats 📊

---

## Next: Go Live! 🚀

Once everything is tested:

1. Switch Stripe to **Live Mode**
2. Update payment links to **live links**
3. Update .env with **live API keys**
4. Share payment links with customers!

Your business is now **100% autonomous** and ready to accept real customers!
