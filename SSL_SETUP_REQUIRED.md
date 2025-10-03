# ⚠️ CRITICAL: SSL/HTTPS Required for Stripe Live Mode

## The Issue
Stripe **Live Mode** webhooks require HTTPS. Your droplet at `http://172.248.91.121:3000` uses HTTP only.

Error from Stripe:
```
Invalid URL: http://172.248.91.121:3000/webhook/stripe
URLs in livemode must begin with "https://"
```

## Quick Solutions

### Option 1: Use Stripe Test Mode (5 minutes) ✅ RECOMMENDED TO START
**Best for testing before going live**

1. Switch to Test Mode in Stripe Dashboard (toggle in top-left)
2. Create test webhook:
   ```bash
   URL: http://172.248.91.121:3000/webhook/stripe
   Events: checkout.session.completed, invoice.*, customer.subscription.*
   ```
3. Use **test** payment links and **test** API keys
4. Test card: `4242 4242 4242 4242`

**Pros:** Works immediately, no SSL needed
**Cons:** Can't accept real payments yet

---

### Option 2: Add Domain + SSL (30 minutes) ✅ FOR PRODUCTION

#### A. Get a Domain (if you don't have one)
- Namecheap: $10/year for .com
- Or use Cloudflare free domain

#### B. Point Domain to Droplet
Add A record:
```
Type: A
Name: @
Value: 172.248.91.121
TTL: Auto
```

Add CNAME for www:
```
Type: CNAME
Name: www
Value: yourdomain.com
TTL: Auto
```

#### C. Install SSL on Droplet (Free with Let's Encrypt)

SSH to droplet:
```bash
ssh root@172.248.91.121
```

Install Certbot:
```bash
apt update
apt install -y certbot
apt install -y python3-certbot-nginx  # if using nginx
# or
apt install -y python3-certbot-apache  # if using apache
```

Get SSL Certificate:
```bash
# If using nginx (recommended)
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# If using apache
certbot --apache -d yourdomain.com -d www.yourdomain.com

# Or standalone (if no web server)
certbot certonly --standalone -d yourdomain.com
```

Update your app to use HTTPS port 443:
```bash
cd /var/www/automatedwebsitescraper
nano .env
```

Add:
```
DOMAIN=https://yourdomain.com
PORT=443
```

Configure nginx as reverse proxy:
```bash
nano /etc/nginx/sites-available/default
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Restart nginx:
```bash
nginx -t
systemctl restart nginx
```

#### D. Update Stripe Webhook
```bash
URL: https://yourdomain.com/webhook/stripe
Events: checkout.session.completed, invoice.*, customer.subscription.*
```

Copy webhook secret to `.env`:
```
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
```

Restart app:
```bash
pm2 restart all
```

---

### Option 3: Use Cloudflare Tunnel (15 minutes) ✅ EASIEST SSL

**Free HTTPS without domain purchase or server config**

1. Install cloudflared on droplet:
```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
```

2. Authenticate:
```bash
cloudflared tunnel login
```

3. Create tunnel:
```bash
cloudflared tunnel create oatcode-webhook
cloudflared tunnel route dns oatcode-webhook oatcode-webhook.yourdomain.com
```

4. Configure tunnel:
```bash
nano ~/.cloudflared/config.yml
```

```yaml
url: http://localhost:3000
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json
```

5. Run tunnel:
```bash
cloudflared tunnel run oatcode-webhook
# Or with PM2
pm2 start cloudflared --name tunnel -- tunnel run oatcode-webhook
```

6. Use tunnel URL in Stripe:
```
https://oatcode-webhook.yourdomain.com/webhook/stripe
```

---

## My Recommendation

### For Testing (Now):
✅ Use **Option 1: Stripe Test Mode**
- Works immediately
- No SSL needed
- Perfect for testing the integration
- Use test cards and test payment links

### For Production (After Testing):
✅ Use **Option 2: Domain + Let's Encrypt SSL**
- Free SSL certificate (auto-renews)
- Professional setup
- Full control
- Best for long-term

---

## Quick Start (Test Mode)

1. **Switch to Test Mode** in Stripe Dashboard
2. **Create webhook** in test mode:
   - URL: `http://172.248.91.121:3000/webhook/stripe`
   - Events: All checkout and subscription events
3. **Deploy to droplet:**
   ```bash
   ssh root@172.248.91.121
   cd /var/www/automatedwebsitescraper
   git pull origin main
   npm install
   node src/database/init-database.js
   pm2 restart all
   ```
4. **Add webhook secret** to `.env`
5. **Test with test payment link** (test card: 4242 4242 4242 4242)
6. **Verify** customer created in database

Once test mode works perfectly, then set up SSL and switch to live mode!

---

## Status Checklist

- [ ] Test Mode Webhook Working
- [ ] Customer Creation Tested
- [ ] Database Integration Verified
- [ ] Domain Purchased (for production)
- [ ] SSL Certificate Installed
- [ ] Live Mode Webhook Configured
- [ ] Ready for Real Customers ✅

---

## Need Help?

Test mode is the safest way to start. Get everything working in test mode first, then we'll set up SSL for production!
