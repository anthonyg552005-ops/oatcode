# Stripe Payment Setup Guide

## Quick Setup Steps

### 1. Create Stripe Products & Payment Links

Go to [Stripe Dashboard](https://dashboard.stripe.com)

#### Standard Plan - $197/month

1. Go to Products → Create Product
2. Name: `OatCode Standard Website`
3. Description: `Professional AI-powered website with stock photos, autonomous management, and 24/7 monitoring`
4. Pricing: `$197/month` (recurring)
5. Click "Create Product"
6. Click "Create Payment Link"
7. Copy the payment link URL
8. Save as: `STRIPE_STANDARD_PAYMENT_LINK` environment variable

#### Premium Plan - $297/month

1. Go to Products → Create Product
2. Name: `OatCode Premium Website`
3. Description: `Everything in Standard plus Runway AI videos, DALL-E 3 custom visuals, and unique AI branding`
4. Pricing: `$297/month` (recurring)
5. Click "Create Product"
6. Click "Create Payment Link"
7. Copy the payment link URL
8. Save as: `STRIPE_PREMIUM_PAYMENT_LINK` environment variable

### 2. Add Environment Variables

Add to your `.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key_here
STRIPE_STANDARD_PAYMENT_LINK=https://buy.stripe.com/xxxxx
STRIPE_PREMIUM_PAYMENT_LINK=https://buy.stripe.com/yyyyy
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 3. Set Up Webhooks

1. Go to Developers → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://yourdomain.com/webhook/stripe`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret
6. Add to `.env` as `STRIPE_WEBHOOK_SECRET`

### 4. Test Mode First

For testing, use Stripe test mode:
- Use test API keys (`sk_test_...` and `pk_test_...`)
- Use test payment link
- Test card: `4242 4242 4242 4242`, any future date, any CVC

### 5. Go Live

1. Toggle to "Live mode" in Stripe dashboard
2. Replace test keys with live keys in `.env`
3. Create live payment links
4. Update webhook endpoint to production URL
5. Test one real payment (you can refund immediately)

## Payment Link Examples

Standard: `https://buy.stripe.com/test_xxxxxxxxxxxxx`
Premium: `https://buy.stripe.com/test_yyyyyyyyyyyyy`

## Revenue Tracking

Stripe automatically tracks:
- Monthly Recurring Revenue (MRR)
- Active subscriptions
- Churn rate
- Failed payments

Access in Stripe Dashboard → Home

## Important Notes

- Payment links handle everything: checkout, billing, invoices
- No code needed for basic payments
- Customers can manage subscriptions in Stripe billing portal
- 30-day money-back guarantee: Handle refunds manually in Stripe dashboard
- Stripe fee: 2.9% + $0.30 per transaction

## Quick Commands

```bash
# Add to Droplet .env
ssh root@24.144.89.17
cd /var/www/automatedwebsitescraper
nano .env
# Add Stripe variables
pm2 restart all --update-env
```

## Webhook Handler (Already Built)

The webhook handler at `/webhook/stripe` automatically:
- Creates customer records
- Tracks subscriptions
- Updates tier (standard/premium)
- Sends welcome emails
- Monitors payment failures

No additional code needed!
