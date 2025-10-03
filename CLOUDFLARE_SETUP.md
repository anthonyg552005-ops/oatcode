# Cloudflare Custom Domain Setup

## Overview

The **AutoDomainService** autonomously purchases and configures custom domains for Premium customers using Cloudflare.

**Benefits:**
- 🌐 Custom domains (BusinessName.com)
- 🔒 FREE SSL certificates (automatic HTTPS)
- 🛡️ FREE DDoS protection
- 🌍 FREE global CDN (faster websites)
- 💰 At-cost domain pricing (~$9-15/year)

## One-Time Setup (5 minutes)

### Step 1: Cloudflare Account Setup

1. **Sign up or log in to Cloudflare:**
   - Go to: https://dash.cloudflare.com
   - Create account or sign in

2. **Add payment method:**
   - Go to: https://dash.cloudflare.com/profile/payment
   - Add credit/debit card
   - This will be charged ~$9-15 per domain purchased

### Step 2: Generate API Token

1. **Go to API Tokens page:**
   - https://dash.cloudflare.com/profile/api-tokens

2. **Click "Create Token"**

3. **Use "Edit zone DNS" template OR create custom token with:**
   - **Permissions:**
     - Zone - DNS - Edit
     - Zone - Zone - Edit
     - Account - Account Settings - Read
     - Account - Registrar - Edit
   - **Account Resources:**
     - Include - All accounts
   - **Zone Resources:**
     - Include - All zones

4. **Click "Continue to summary" → "Create Token"**

5. **Copy the API token** (you'll need it for .env)

### Step 3: Get Account ID

1. **Go to Cloudflare dashboard:**
   - https://dash.cloudflare.com

2. **Click any website OR go to Account Home**

3. **Copy your Account ID** (found in right sidebar)

### Step 4: Get Your Server IP

1. **If using Railway:**
   ```bash
   # Your Railway app URL
   # Example: automatedwebsitescraper-production.up.railway.app

   # Find IP with:
   nslookup your-app-name.up.railway.app
   # OR
   ping your-app-name.up.railway.app
   ```

2. **Copy the IP address** (e.g., 123.45.67.89)

### Step 5: Update .env File

Add these to your `.env` file:

```bash
# Cloudflare Custom Domain Setup
CLOUDFLARE_API_TOKEN=your_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
SERVER_IP=your_railway_server_ip
```

**Example:**
```bash
CLOUDFLARE_API_TOKEN=abcdef123456789_YourTokenHere_xyz
CLOUDFLARE_ACCOUNT_ID=1234567890abcdef1234567890abcdef
SERVER_IP=123.45.67.89
```

### Step 6: Test It!

Run this command to test domain purchasing:

```bash
node -e "
const AutoDomainService = require('./src/services/AutoDomainService');
const service = new AutoDomainService(console);

// Check if a domain is available
service.checkAvailability('test-example-business.com')
  .then(result => {
    console.log('✅ Cloudflare API working!');
    console.log('Domain check result:', result);
  })
  .catch(err => {
    console.error('❌ Setup error:', err.message);
  });
"
```

## How It Works Autonomously

### Standard Plan ($197/mo)
- Customer gets: `businessname.oatcode.com`
- Cost to you: $0
- Setup: Instant (subdomain on your domain)

### Premium Plan ($297/mo)
- Customer gets: `BusinessName.com` (their own domain!)
- Cost to you: ~$9-15/year (one-time domain registration)
- Profit: $297/mo x 12 = $3,564/year - $15 domain = **$3,549/year profit**

### Automatic Domain Flow

When Premium customer signs up:

1. **AI checks domain availability:**
   ```javascript
   await global.autoDomain.checkAvailability('austindentalcare.com');
   ```

2. **AI purchases domain:**
   - Charges YOUR Cloudflare account ~$9-15
   - You charge customer $297/month (includes domain)
   - Net: You profit $3,549/year per Premium customer

3. **AI configures everything:**
   - DNS points to your server
   - SSL certificate auto-enabled (FREE)
   - CDN enabled (FREE)
   - DDoS protection enabled (FREE)

4. **Customer's website is live:**
   - `https://BusinessName.com` (secure, fast, protected)
   - Takes ~30 seconds after purchase

## Usage Examples

### Check Domain Availability
```javascript
const result = await global.autoDomain.checkAvailability('example.com');
// { available: true, price: 9.77, domain: 'example.com' }
```

### Purchase and Setup Domain
```javascript
const customerInfo = {
  businessName: 'Austin Dental Care',
  firstName: 'John',
  lastName: 'Smith',
  email: 'john@austindentalcare.com',
  phone: '+1.5125551234',
  address: '123 Main St',
  city: 'Austin',
  state: 'TX',
  zip: '78701',
  country: 'US'
};

const result = await global.autoDomain.setupCustomDomain(
  'austindentalcare.com',
  customerInfo
);

// Returns:
// {
//   success: true,
//   domain: 'austindentalcare.com',
//   liveUrl: 'https://austindentalcare.com',
//   cost: 9.77,
//   ssl: true,
//   cdn: true,
//   ddos: true
// }
```

### Suggest Alternative Domain
```javascript
const alternative = await global.autoDomain.suggestAvailableDomain('Austin Dental Care');
// Checks: austindentalcare.com, getaustindentalcare.com, etc.
// Returns first available
```

### Check Domain Status
```javascript
const status = await global.autoDomain.getDomainStatus('austindentalcare.com');
// {
//   domain: 'austindentalcare.com',
//   status: 'active',
//   ssl: true,
//   ...
// }
```

## Cost Analysis

### Standard Plan Economics
- **Customer Pays:** $197/month = $2,364/year
- **Your Cost:** $0 (uses your subdomain)
- **Profit:** $2,364/year per customer

### Premium Plan Economics
- **Customer Pays:** $297/month = $3,564/year
- **Your Cost:** $9-15/year (domain only - SSL/CDN/DDoS are FREE)
- **Profit:** ~$3,549/year per customer

**10 Premium customers = $35,490/year profit**
**100 Premium customers = $354,900/year profit**

Domain cost is negligible compared to monthly subscription revenue!

## Subdomain Strategy (Standard Plan)

For Standard plan customers, use subdomains on your domain:

```javascript
// Standard customers get:
businessname.oatcode.com

// Configure via Cloudflare DNS:
// A record: *.oatcode.com -> YOUR_SERVER_IP

// Each customer website accessible at:
// austin-dental.oatcode.com
// texas-plumbing.oatcode.com
// etc.
```

**This is FREE** - no domain purchase needed for Standard tier.

## Troubleshooting

### Error: "Invalid API token"
- Verify token has correct permissions (Zone DNS, Account Registrar)
- Regenerate token if needed

### Error: "Account ID not found"
- Copy Account ID from Cloudflare dashboard (right sidebar)
- Should be 32-character hex string

### Error: "Domain already exists"
- Domain already registered (check Cloudflare dashboard)
- Try alternative domain suggestion

### DNS not propagating
- Wait 30-60 minutes for global DNS propagation
- Check status: `nslookup domain.com`

## Security Notes

**Keep API token secure:**
- Never commit to git
- Store in `.env` file (already in .gitignore)
- Regenerate if exposed

**Token permissions:**
- Only grant DNS and Registrar permissions
- Don't use Global API Key (too powerful)

## Support

**Cloudflare API Docs:**
- https://developers.cloudflare.com/api/

**Domain Registration API:**
- https://developers.cloudflare.com/registrar/

**Questions?**
- Check Cloudflare dashboard for domain status
- Review autonomous engine logs for errors

---

## Summary

Once set up, the system **autonomously**:
1. Checks domain availability
2. Purchases domains (~$9-15 charged to your Cloudflare account)
3. Configures DNS, SSL, CDN, DDoS protection
4. Points domain to customer's website
5. Customer's site live at `https://BusinessName.com`

**Zero human intervention needed!** 🎉
