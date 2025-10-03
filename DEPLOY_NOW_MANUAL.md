# 🚀 Deploy Now - Manual Steps

**I couldn't SSH to your droplet automatically** because port 22 is blocked by a firewall (droplet is online, but SSH port is filtered).

Here's exactly what you need to do:

---

## 📋 Step-by-Step Deployment

### 1. SSH to Your Droplet
```bash
ssh root@172.248.91.121
```

### 2. Run This One Command (Copy/Paste Everything)
```bash
cd /var/www/automatedwebsitescraper && \
git pull origin main && \
npm install && \
node src/database/init-database.js && \
node test-stripe-integration.js && \
pm2 restart all
```

### Expected Output:
```
✅ Database initialization complete!
✅ ALL TESTS PASSED!
🎉 Stripe integration is ready for production!
[PM2] Restarted processes
```

### 3. Verify Database Created
```bash
sqlite3 data/autonomous-business.sqlite ".tables"
```

Should show:
```
customers              domain_purchases       emails
customization_requests leads                  payments
demos                  system_metrics
```

### 4. Check Server Status
```bash
pm2 status
pm2 logs --lines 20
```

Should see:
```
✅ SQLite database initialized and connected
🌐 Web server running on http://localhost:3000
```

---

## 🔗 Step 2: Configure Stripe Webhook

### Option A: Test Mode (Start Here) ✅

1. **Go to Stripe Dashboard**
   - https://dashboard.stripe.com
   - Switch to **Test Mode** (toggle top-left)

2. **Create Test Webhook**
   - Go to: https://dashboard.stripe.com/test/webhooks
   - Click **"Add endpoint"**
   - URL: `http://172.248.91.121:3000/webhook/stripe`
   - Select events:
     - ✅ `checkout.session.completed`
     - ✅ `invoice.payment_succeeded`
     - ✅ `invoice.payment_failed`
     - ✅ `customer.subscription.*`
   - Click **"Add endpoint"**

3. **Copy Webhook Secret**
   - Click **"Reveal"** next to signing secret
   - Copy the secret (starts with `whsec_...`)

4. **Add to Droplet .env**
   ```bash
   nano /var/www/automatedwebsitescraper/.env
   ```

   Add this line:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_paste_your_secret_here
   ```

   Save: `Ctrl+X`, `Y`, `Enter`

5. **Restart Server**
   ```bash
   pm2 restart all
   ```

---

## 🧪 Step 3: Test with Stripe Payment

1. **Get Test Payment Link**
   - https://dashboard.stripe.com/test/payment-links
   - Use your test payment link

2. **Complete Test Checkout**
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - Email: `test@yourbusiness.com`

3. **Verify Customer Created**
   ```bash
   sqlite3 data/autonomous-business.sqlite "SELECT * FROM customers;"
   sqlite3 data/autonomous-business.sqlite "SELECT * FROM payments;"
   ```

4. **Check Logs**
   ```bash
   pm2 logs
   ```

   Look for:
   ```
   ✅ Checkout completed
   💾 Customer saved to database (ID: 1)
   💳 Payment recorded: $197 or $297
   📧 Welcome email sent
   ```

---

## ✅ Success Checklist

- [ ] Code deployed to droplet
- [ ] Database initialized (8 tables)
- [ ] Tests passing
- [ ] PM2 running
- [ ] Stripe webhook created
- [ ] Webhook secret in .env
- [ ] Test payment completed
- [ ] Customer in database
- [ ] Logs show success

---

## 🎉 You're Live (Test Mode)!

Once everything works in test mode:

### To Go Live (Requires HTTPS):
1. **Get a domain** (if you don't have one)
2. **Install SSL certificate** (see `SSL_SETUP_REQUIRED.md`)
3. **Switch Stripe to Live Mode**
4. **Create live webhook** with HTTPS URL
5. **Update .env** with live webhook secret
6. **Start accepting real payments!**

---

## 📚 Reference Guides

- **`DEPLOY_COMMANDS.sh`** - Deployment script
- **`STRIPE_WEBHOOK_SETUP.md`** - Complete webhook guide
- **`SSL_SETUP_REQUIRED.md`** - HTTPS setup for production
- **`test-stripe-integration.js`** - Test database integration

---

## 🆘 Troubleshooting

### Server won't start?
```bash
pm2 logs
# Look for errors
```

### Database error?
```bash
node src/database/init-database.js
# Re-run initialization
```

### Webhook not working?
```bash
# Check webhook secret
cat .env | grep STRIPE_WEBHOOK_SECRET

# Test webhook endpoint
curl http://172.248.91.121:3000/webhook/stripe
```

### Port 3000 blocked?
```bash
# Check if server is listening
lsof -i :3000

# Check firewall
ufw status
```

---

## 🔥 Quick Deploy (TL;DR)

```bash
# 1. SSH to droplet
ssh root@172.248.91.121

# 2. Deploy
cd /var/www/automatedwebsitescraper && git pull origin main && npm install && node src/database/init-database.js && pm2 restart all

# 3. Setup Stripe webhook (Test Mode)
# - https://dashboard.stripe.com/test/webhooks
# - Add endpoint: http://172.248.91.121:3000/webhook/stripe
# - Copy secret to .env

# 4. Test with payment link
# - Card: 4242 4242 4242 4242

# 5. Verify
sqlite3 data/autonomous-business.sqlite "SELECT * FROM customers;"
```

---

## 💡 What Happens After First Payment

1. ✅ Stripe sends webhook to your server
2. ✅ Server creates customer in database
3. ✅ Records payment in database
4. ✅ Purchases custom domain (if Premium tier)
5. ✅ Sends welcome email with website link
6. ✅ Dashboard shows customer + revenue
7. ✅ Business is fully autonomous!

Your autonomous website business is **ready to launch**! 🚀
