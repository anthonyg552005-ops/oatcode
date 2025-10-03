/**
 * STRIPE WEBHOOK ROUTES
 * Handles automatic customer creation and payment processing from Stripe
 */

const express = require('express');
const router = express.Router();
const db = require('../database/DatabaseService');

/**
 * Stripe Webhook Endpoint
 * Receives events from Stripe and processes them automatically
 *
 * IMPORTANT: Add this URL to Stripe Dashboard:
 * https://dashboard.stripe.com/webhooks
 * Endpoint URL: https://YOUR_DOMAIN/api/stripe/webhook
 *
 * Events to listen for:
 * - checkout.session.completed (new customer payment)
 * - invoice.payment_succeeded (recurring payment)
 * - invoice.payment_failed (failed payment)
 * - customer.subscription.deleted (cancellation)
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;

  try {
    // Parse webhook event
    const body = req.body;
    const signature = req.headers['stripe-signature'];

    // In production, verify webhook signature:
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);

    // For now, parse directly
    event = JSON.parse(body);

    console.log('💳 Stripe webhook received:', event.type);

  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });

  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Handle checkout.session.completed
 * Creates new customer automatically when payment succeeds
 */
async function handleCheckoutCompleted(session) {
  console.log('');
  console.log('🎉 NEW CUSTOMER PAYMENT!');
  console.log(`   Email: ${session.customer_email}`);
  console.log(`   Amount: $${(session.amount_total / 100).toFixed(2)}`);

  // Ensure database connection
  if (!db.db) await db.connect();

  // Determine tier from amount
  const amountInDollars = session.amount_total / 100;
  let tier = 'standard';
  let monthlyPrice = 197;

  if (amountInDollars >= 297) {
    tier = 'premium';
    monthlyPrice = 297;
  }

  console.log(`   Tier: ${tier}`);

  // Extract metadata (business name, etc.)
  const metadata = session.metadata || {};
  const businessName = metadata.business_name || metadata.businessName || session.customer_email.split('@')[0];

  // Create customer in database
  const customer = await db.createCustomer({
    businessName: businessName,
    email: session.customer_email,
    tier: tier,
    status: 'active',
    monthlyPrice: monthlyPrice,
    stripeCustomerId: session.customer,
    stripeSubscriptionId: session.subscription
  });

  console.log(`   ✅ Customer created: ${customer.business_name} (ID: ${customer.id})`);

  // AUTOMATIC DOMAIN PURCHASE FOR PREMIUM CUSTOMERS
  let domainInfo = null;

  if (tier === 'premium' && global.autoDomain) {
    console.log('');
    console.log('🌐 Premium customer - initiating autonomous domain purchase...');

    try {
      // Generate domain from business name
      const suggestedDomain = businessName.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/\s+/g, '') + '.com';

      console.log(`   Suggested domain: ${suggestedDomain}`);

      // Check availability
      const availability = await global.autoDomain.checkAvailability(suggestedDomain);

      if (availability.available) {
        // Purchase and configure domain
        const domainResult = await global.autoDomain.setupCustomDomain(
          suggestedDomain,
          {
            businessName,
            firstName: metadata.first_name || 'Customer',
            lastName: metadata.last_name || 'Service',
            email: session.customer_email,
            phone: metadata.phone || '+1.5125551234',
            address: metadata.address || '123 Main St',
            city: metadata.city || 'Austin',
            state: metadata.state || 'TX',
            zip: metadata.zip || '78701',
            country: metadata.country || 'US'
          }
        );

        // Save domain purchase to database
        await db.createDomainPurchase({
          customerId: customer.id,
          domainName: suggestedDomain,
          purchasePrice: domainResult.cost,
          expiresAt: domainResult.expirationDate,
          dnsConfigured: true,
          dnsConfiguredAt: new Date().toISOString()
        });

        // Update customer with custom domain
        await db.updateCustomer(customer.id, {
          customDomain: suggestedDomain,
          websiteUrl: domainResult.liveUrl
        });

        domainInfo = {
          domain: suggestedDomain,
          liveUrl: domainResult.liveUrl,
          cost: domainResult.cost
        };

        console.log(`   ✅ Domain purchased: ${suggestedDomain}`);

      } else {
        console.log(`   ⚠️  ${suggestedDomain} not available`);
        // Could suggest alternatives here
      }

    } catch (error) {
      console.error(`   ❌ Domain purchase failed: ${error.message}`);
    }
  }

  // Record payment
  await db.createPayment({
    customerId: customer.id,
    stripePaymentId: session.payment_intent,
    amount: amountInDollars,
    status: 'succeeded',
    description: `${tier} plan - initial payment`
  });

  console.log(`   ✅ Payment recorded`);

  // Send welcome email
  if (global.sendGrid) {
    await sendWelcomeEmail(customer, domainInfo);
  }

  console.log('');
  console.log('✅ NEW CUSTOMER ONBOARDING COMPLETE!');
  console.log('');
}

/**
 * Handle invoice.payment_succeeded
 * Records recurring payments
 */
async function handlePaymentSucceeded(invoice) {
  console.log(`📧 Recurring payment succeeded: ${invoice.customer_email}`);

  if (!db.db) await db.connect();

  // Find customer by Stripe ID
  const customer = await db.get(
    'SELECT * FROM customers WHERE stripe_customer_id = ?',
    [invoice.customer]
  );

  if (customer) {
    await db.createPayment({
      customerId: customer.id,
      stripePaymentId: invoice.payment_intent,
      stripeInvoiceId: invoice.id,
      amount: invoice.amount_paid / 100,
      status: 'succeeded',
      description: `${customer.tier} plan - recurring payment`
    });

    console.log(`   ✅ Payment recorded for ${customer.business_name}`);
  }
}

/**
 * Handle invoice.payment_failed
 * Alerts when payment fails
 */
async function handlePaymentFailed(invoice) {
  console.log(`❌ Payment failed: ${invoice.customer_email}`);

  if (!db.db) await db.connect();

  const customer = await db.get(
    'SELECT * FROM customers WHERE stripe_customer_id = ?',
    [invoice.customer]
  );

  if (customer) {
    // Update customer status
    await db.updateCustomer(customer.id, {
      status: 'paused' // or send email to update payment method
    });

    console.log(`   ⚠️  Customer ${customer.business_name} marked as paused`);

    // Could send email alert here
  }
}

/**
 * Handle customer.subscription.deleted
 * Marks customer as cancelled
 */
async function handleSubscriptionCancelled(subscription) {
  console.log(`🚫 Subscription cancelled for customer: ${subscription.customer}`);

  if (!db.db) await db.connect();

  const customer = await db.get(
    'SELECT * FROM customers WHERE stripe_customer_id = ?',
    [subscription.customer]
  );

  if (customer) {
    await db.updateCustomer(customer.id, {
      status: 'cancelled'
    });

    console.log(`   ✅ Customer ${customer.business_name} marked as cancelled`);
  }
}

/**
 * Send welcome email to new customer
 */
async function sendWelcomeEmail(customer, domainInfo) {
  const websiteUrl = customer.custom_domain
    ? `http://${customer.custom_domain}`
    : `http://oatcode.com/demos/${customer.business_name.toLowerCase().replace(/\s+/g, '-')}`;

  const emailBody = `
Welcome to OatCode, ${customer.business_name}!

Your new website is being set up and will be ready within 24 hours.

${customer.tier === 'premium' ? `
🌐 YOUR CUSTOM DOMAIN:
${domainInfo ? `Your website will be live at: ${domainInfo.liveUrl}` : 'We\'ll email you when your custom domain is configured.'}
DNS propagation takes 15-30 minutes.
` : `
🌐 YOUR WEBSITE:
${websiteUrl}
`}

WHAT'S INCLUDED:
✅ Professional AI-generated website
✅ ${customer.tier === 'premium' ? 'Custom domain + AI videos + custom images' : 'Modern responsive design'}
✅ Mobile-friendly design
✅ SEO optimized
✅ Hosting & maintenance included
✅ 24/7 support

NEED CHANGES?
Simply reply to this email with what you'd like changed. Our AI will update your website automatically.

Questions? Just reply to this email - we're here to help!

Thanks for choosing OatCode!
- The OatCode Team

P.S. Your website will be delivered within 24 hours. We'll send you another email with your live link.
  `.trim();

  try {
    await global.sendGrid.send({
      to: customer.email,
      subject: `Welcome to OatCode! Your ${customer.tier === 'premium' ? 'Premium' : 'Standard'} Website is Being Built`,
      html: emailBody.replace(/\n/g, '<br>')
    });

    console.log(`   ✅ Welcome email sent to ${customer.email}`);

  } catch (error) {
    console.error(`   ❌ Failed to send welcome email: ${error.message}`);
  }
}

/**
 * Test endpoint to manually trigger customer creation
 * DELETE THIS IN PRODUCTION
 */
router.post('/test-checkout', async (req, res) => {
  console.log('🧪 TEST: Simulating Stripe checkout...');

  const { email, businessName, tier } = req.body;

  const mockSession = {
    customer_email: email,
    amount_total: tier === 'premium' ? 29700 : 19700, // in cents
    customer: 'cus_test_' + Date.now(),
    subscription: 'sub_test_' + Date.now(),
    payment_intent: 'pi_test_' + Date.now(),
    metadata: {
      business_name: businessName
    }
  };

  await handleCheckoutCompleted(mockSession);

  res.json({
    success: true,
    message: 'Test customer created successfully',
    mockSession
  });
});

module.exports = router;
