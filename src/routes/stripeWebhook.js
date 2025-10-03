/**
 * STRIPE WEBHOOK HANDLER
 *
 * Automatically handles:
 * - New subscriptions (standard & premium)
 * - Subscription updates
 * - Payment failures
 * - Cancellations
 * - Refunds
 */

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const sgMail = require('@sendgrid/mail');
const db = require('../database/DatabaseService');

// Stripe webhook endpoint
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Body is already parsed by express.json() global middleware
    event = req.body;

    console.log('🔔 Stripe webhook received:', event.type);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });

  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

/**
 * Handle successful checkout
 */
async function handleCheckoutComplete(session) {
  console.log('✅ Checkout completed:', session.id);

  const tier = determineTier(session.amount_total);
  const businessName = session.customer_details?.name || session.metadata?.business_name || session.customer_details?.email?.split('@')[0];
  const email = session.customer_details?.email;

  console.log(`   New customer: ${email} (${tier} tier)`);

  // Initialize database if needed
  if (!db.db) await db.connect();

  // Save to SQLite database (upsert = insert or update if exists)
  const dbCustomer = await db.upsertCustomer({
    businessName,
    email,
    tier,
    status: 'active',
    monthlyPrice: tier === 'premium' ? 297 : 197,
    stripeCustomerId: session.customer,
    stripeSubscriptionId: session.subscription
  });

  console.log(`   💾 Customer saved to database (ID: ${dbCustomer.id})`);

  const customer = {
    id: dbCustomer.id,
    stripeCustomerId: session.customer,
    email,
    name: businessName,
    subscriptionId: session.subscription,
    tier,
    status: 'active',
    createdAt: new Date()
  };

  // AUTOMATIC DOMAIN PURCHASE FOR PREMIUM CUSTOMERS
  let domainInfo = null;

  if (tier === 'premium' && global.autoDomain) {
    console.log('');
    console.log('🌐 Premium customer - initiating autonomous domain purchase...');

    try {
      const suggestedDomain = businessName.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/\s+/g, '') + '.com';

      console.log(`   Suggested domain: ${suggestedDomain}`);

      const availability = await global.autoDomain.checkAvailability(suggestedDomain);

      if (availability.available) {
        const domainResult = await global.autoDomain.setupCustomDomain(
          suggestedDomain,
          {
            businessName,
            firstName: session.metadata?.first_name || 'Customer',
            lastName: session.metadata?.last_name || 'Service',
            email,
            phone: session.metadata?.phone || '+1.5125551234',
            address: session.metadata?.address || '123 Main St',
            city: session.metadata?.city || 'Austin',
            state: session.metadata?.state || 'TX',
            zip: session.metadata?.zip || '78701',
            country: session.metadata?.country || 'US'
          }
        );

        // Save domain purchase to database
        await db.createDomainPurchase({
          customerId: dbCustomer.id,
          domainName: suggestedDomain,
          purchasePrice: domainResult.cost,
          expiresAt: domainResult.expirationDate,
          dnsConfigured: true,
          dnsConfiguredAt: new Date().toISOString()
        });

        // Update customer with custom domain
        await db.updateCustomer(dbCustomer.id, {
          customDomain: suggestedDomain,
          websiteUrl: domainResult.liveUrl
        });

        domainInfo = {
          domain: suggestedDomain,
          liveUrl: domainResult.liveUrl,
          cost: domainResult.cost
        };

        console.log(`   ✅ Domain purchased: ${suggestedDomain}`);
      }
    } catch (error) {
      console.error(`   ❌ Domain purchase failed: ${error.message}`);
    }
  }

  // Generate website for customer
  const websiteResult = await generateWebsite(customer, session, domainInfo);

  // Update customer with website URL if not using custom domain
  if (!domainInfo && websiteResult.websiteUrl) {
    await db.updateCustomer(dbCustomer.id, {
      websiteUrl: websiteResult.websiteUrl
    });
  }

  // Record payment in database
  await db.createPayment({
    customerId: dbCustomer.id,
    stripePaymentId: session.payment_intent,
    amount: session.amount_total / 100,
    status: 'succeeded',
    description: `${tier} plan - initial payment`
  });

  // Add customer to retention system (automated check-ins + feedback)
  if (global.customerRetention) {
    try {
      await global.customerRetention.addCustomer({
        email: customer.email,
        businessName: customer.name,
        tier: customer.tier,
        websiteUrl: websiteResult.websiteUrl,
        websiteData: websiteResult.websiteData
      });

      console.log(`   ✅ Added to customer retention system - first check-in on Day 3`);

      // Track purchase in email tracking
      if (global.emailTracking) {
        await global.emailTracking.trackPurchase(customer.email, customer.tier, session.amount_total / 100);
      }
    } catch (error) {
      console.error(`   ⚠️  Failed to add to retention system: ${error.message}`);
    }
  }

  // Send welcome email with website link
  await sendWelcomeEmail(customer, websiteResult);

  console.log(`   🎉 Customer onboarding complete!`);
}

/**
 * Handle new subscription
 */
async function handleSubscriptionCreated(subscription) {
  console.log('💳 Subscription created:', subscription.id);

  const tier = determineTierFromPrice(subscription.items.data[0].price.unit_amount);

  console.log(`   Tier: ${tier}`);
  console.log(`   Amount: $${subscription.items.data[0].price.unit_amount / 100}/month`);

  // TODO: Update customer record with subscription details
}

/**
 * Handle subscription update (tier change, etc)
 */
async function handleSubscriptionUpdated(subscription) {
  console.log('🔄 Subscription updated:', subscription.id);

  const newTier = determineTierFromPrice(subscription.items.data[0].price.unit_amount);

  console.log(`   New tier: ${newTier}`);

  try {
    // Initialize database if needed
    if (!db.db) await db.connect();

    // Find customer by subscription ID
    const customer = await db.get(
      'SELECT * FROM customers WHERE stripe_subscription_id = ?',
      [subscription.id]
    );

    if (!customer) {
      console.warn(`   ⚠️  Customer not found for subscription ${subscription.id}`);
      return;
    }

    const oldTier = customer.tier;

    // Update customer tier in database
    await db.updateCustomer(customer.id, {
      tier: newTier,
      monthlyPrice: newTier === 'premium' ? 297 : 197
    });

    console.log(`   ✅ Updated tier: ${oldTier} → ${newTier}`);

    // If upgraded to premium, regenerate website with AI visuals
    if (oldTier === 'standard' && newTier === 'premium') {
      console.log(`   🎨 Upgrading website to premium (AI visuals)...`);

      const customerForWebsite = {
        id: customer.id,
        stripeCustomerId: customer.stripe_customer_id,
        email: customer.email,
        name: customer.business_name,
        subscriptionId: customer.stripe_subscription_id,
        tier: newTier
      };

      const websiteResult = await generateWebsite(customerForWebsite, null, true); // Force premium

      // Update customer with new website URL
      if (websiteResult.websiteUrl) {
        await db.updateCustomer(customer.id, {
          websiteUrl: websiteResult.websiteUrl
        });
      }

      // Update retention system
      if (global.customerRetention) {
        const retentionCustomer = global.customerRetention.customers.find(c => c.email === customer.email);
        if (retentionCustomer) {
          retentionCustomer.websiteData = websiteResult.websiteData;
          retentionCustomer.tier = 'premium';
          await global.customerRetention.save();
        }
      }

      // Send upgrade notification email
      await sendUpgradeEmail(customerForWebsite, websiteResult);

      console.log(`   ✅ Premium website generated and delivered!`);
    }
  } catch (error) {
    console.error(`   ❌ Failed to update subscription: ${error.message}`);
  }
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCanceled(subscription) {
  console.log('❌ Subscription canceled:', subscription.id);

  try {
    // Initialize database if needed
    if (!db.db) await db.connect();

    // Find customer by subscription ID
    const customer = await db.get(
      'SELECT * FROM customers WHERE stripe_subscription_id = ?',
      [subscription.id]
    );

    if (!customer) {
      console.warn(`   ⚠️  Customer not found for subscription ${subscription.id}`);
      return;
    }

    // Update customer status in database
    await db.updateCustomer(customer.id, {
      status: 'cancelled'
    });

    // Update retention system
    if (global.customerRetention) {
      const retentionCustomer = global.customerRetention.customers.find(c => c.email === customer.email);
      if (retentionCustomer) {
        retentionCustomer.subscriptionActive = false;
        await global.customerRetention.save();
      }
    }

    console.log(`   ✅ Customer status updated to cancelled`);

    // Send cancellation survey email
    const customerForEmail = {
      email: customer.email,
      name: customer.business_name
    };
    await sendCancellationSurvey(customerForEmail);

    // Schedule website takedown after 30-day grace period
    // (For now, just log it - implement actual scheduling later)
    console.log(`   📅 Website will be taken down in 30 days`);

  } catch (error) {
    console.error(`   ❌ Failed to process cancellation: ${error.message}`);
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice) {
  console.log('💰 Payment succeeded:', invoice.id);
  console.log(`   Amount: $${invoice.amount_paid / 100}`);

  // TODO: Log revenue
  // TODO: Send receipt (Stripe does this automatically)
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice) {
  console.log('⚠️ Payment failed:', invoice.id);
  console.log(`   Customer: ${invoice.customer}`);

  try {
    // Initialize database if needed
    if (!db.db) await db.connect();

    // Find customer by Stripe customer ID
    const customer = await db.get(
      'SELECT * FROM customers WHERE stripe_customer_id = ?',
      [invoice.customer]
    );

    if (!customer) {
      console.warn(`   ⚠️  Customer not found: ${invoice.customer}`);
      return;
    }

    // Record failed payment in database
    await db.createPayment({
      customerId: customer.id,
      stripePaymentId: invoice.payment_intent,
      stripeInvoiceId: invoice.id,
      amount: invoice.amount_due / 100,
      status: 'failed',
      description: 'Failed payment'
    });

    // Count failed payments for this customer
    const failedPayments = await db.all(
      'SELECT COUNT(*) as count FROM payments WHERE customer_id = ? AND status = "failed"',
      [customer.id]
    );
    const failedCount = failedPayments[0]?.count || 1;

    console.log(`   ⚠️  Failed payment #${failedCount} for ${customer.email}`);

    // Send payment failure notification
    const customerForEmail = {
      email: customer.email,
      name: customer.business_name,
      failedPayments: { length: failedCount }
    };
    await sendPaymentFailureEmail(customerForEmail, invoice);

    // Pause website after 3 failed payments
    if (failedCount >= 3) {
      await db.updateCustomer(customer.id, {
        status: 'paused'
      });
      console.log(`   🛑 Website suspended after 3 failed payments`);

      // Update retention system
      if (global.customerRetention) {
        const retentionCustomer = global.customerRetention.customers.find(c => c.email === customer.email);
        if (retentionCustomer) {
          retentionCustomer.subscriptionActive = false;
          retentionCustomer.churnRisk = 'high';
          await global.customerRetention.save();
        }
      }
    }

  } catch (error) {
    console.error(`   ❌ Failed to process payment failure: ${error.message}`);
  }
}

/**
 * Determine tier from checkout amount
 */
function determineTier(amountInCents) {
  const amount = amountInCents / 100;

  if (amount >= 297) {
    return 'premium';
  } else if (amount >= 197) {
    return 'standard';
  }

  return 'unknown';
}

/**
 * Determine tier from subscription price
 */
function determineTierFromPrice(priceInCents) {
  const price = priceInCents / 100;

  if (price >= 297) {
    return 'premium';
  } else if (price >= 197) {
    return 'standard';
  }

  return 'unknown';
}

/**
 * HELPER FUNCTIONS
 */

/**
 * Load customers from database
 */
async function loadCustomers() {
  try {
    const customersFile = path.join(__dirname, '../../data/stripe-customers.json');
    const data = await fs.readFile(customersFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist, return empty array
    return [];
  }
}

/**
 * Save customers to database
 */
async function saveCustomers(customers) {
  const customersFile = path.join(__dirname, '../../data/stripe-customers.json');
  const dataDir = path.dirname(customersFile);

  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(customersFile, JSON.stringify(customers, null, 2), 'utf-8');
}

/**
 * Save single customer
 */
async function saveCustomer(customer) {
  const customers = await loadCustomers();

  // Check if customer already exists
  const existingIndex = customers.findIndex(c => c.stripeCustomerId === customer.stripeCustomerId);

  if (existingIndex >= 0) {
    customers[existingIndex] = { ...customers[existingIndex], ...customer };
  } else {
    customers.push(customer);
  }

  await saveCustomers(customers);
  console.log(`   💾 Customer saved to database`);
}

/**
 * Generate website for customer
 */
async function generateWebsite(customer, session, domainInfo = null) {
  try {
    const forcePremium = typeof domainInfo === 'boolean' ? domainInfo : false;
    console.log(`   🎨 Generating ${forcePremium || customer.tier === 'premium' ? 'PREMIUM' : 'STANDARD'} website for ${customer.name}...`);

    // Use AI website generation service
    const AIWebsiteGenerationService = require('../services/AIWebsiteGenerationService');
    const websiteGenerator = new AIWebsiteGenerationService(console);

    // Extract business info from customer name/email
    const businessName = customer.name || customer.email.split('@')[0];

    const business = {
      name: businessName,
      businessName,
      industry: 'General Business', // Will be improved with onboarding form
      location: 'United States',
      city: 'Local Area',
      email: customer.email,
      phone: '(555) 123-4567', // Placeholder - will get real data from onboarding
      description: `Professional services provided by ${businessName}`
    };

    const strategy = {
      tier: forcePremium ? 'premium' : customer.tier,
      colorDetails: {
        primary: '#667eea',
        secondary: '#764ba2',
        accent: '#10b981'
      }
    };

    const result = await websiteGenerator.generateCompleteWebsite(business, strategy);

    if (!result.success) {
      throw new Error(result.error || 'Website generation failed');
    }

    // Save website to demos folder
    const websiteId = `customer_${customer.stripeCustomerId}_${Date.now()}`;
    const websiteFile = path.join(__dirname, '../../public/demos', `${websiteId}.html`);
    const demosDir = path.dirname(websiteFile);

    await fs.mkdir(demosDir, { recursive: true });
    await fs.writeFile(websiteFile, result.files['index.html'], 'utf-8');

    const websiteUrl = `${process.env.DOMAIN || 'https://oatcode.com'}/demos/${websiteId}.html`;

    console.log(`   ✅ Website generated: ${websiteUrl}`);

    return {
      success: true,
      websiteUrl,
      websiteData: {
        business,
        strategy,
        generatedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error(`   ❌ Website generation failed: ${error.message}`);

    // Return fallback simple website
    const websiteId = `customer_${customer.stripeCustomerId}_fallback`;
    const websiteUrl = `${process.env.DOMAIN || 'https://oatcode.com'}/demos/${websiteId}.html`;

    return {
      success: false,
      websiteUrl,
      websiteData: {},
      error: error.message
    };
  }
}

/**
 * Send welcome email to new customer
 */
async function sendWelcomeEmail(customer, websiteResult) {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn(`   ⚠️  SendGrid not configured, skipping welcome email`);
      return;
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to: customer.email,
      from: {
        email: process.env.NOTIFICATION_EMAIL || 'hello@oatcode.com',
        name: 'OatCode'
      },
      subject: `🎉 Welcome to OatCode - Your Website is Ready!`,
      html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1e293b;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 20px;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 30px;
        }
        .cta-button {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 Welcome to OatCode!</h1>
        <p>Your ${customer.tier === 'premium' ? 'Premium' : 'Standard'} website is ready</p>
    </div>

    <h2>Hi ${customer.name}!</h2>

    <p>Thank you for choosing OatCode! We're excited to help grow your business with a professional website.</p>

    <p><strong>Your website is now live:</strong></p>

    <div style="text-align: center;">
        <a href="${websiteResult.websiteUrl}" class="cta-button">
            🌐 View Your Website
        </a>
    </div>

    <h3>What's included in your ${customer.tier === 'premium' ? 'Premium' : 'Standard'} plan:</h3>
    <ul>
        <li>✅ Professional modern design</li>
        <li>✅ Mobile-responsive (looks great on all devices)</li>
        <li>✅ SEO optimized for Google</li>
        <li>✅ Free hosting & SSL certificate</li>
        ${customer.tier === 'premium' ? `
        <li>✅ AI-generated custom images (DALL-E 3)</li>
        <li>✅ Premium branding & design</li>
        ` : ''}
        <li>✅ 24/7 AI customer support</li>
        <li>✅ Automatic updates when you request changes</li>
    </ul>

    <h3>Need changes?</h3>
    <p>Simply reply to any of our check-in emails and tell us what you'd like changed. Our AI will update your website automatically within 24 hours!</p>

    <p>We'll check in with you in a few days to make sure everything is perfect.</p>

    <p>
        Best,<br>
        The OatCode Team<br>
        <em>Automated Website Management</em>
    </p>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">

    <p style="color: #64748b; font-size: 0.9em;">
        Questions? Just reply to this email.<br>
        Billing: $${customer.tier === 'premium' ? '297' : '197'}/month
    </p>
</body>
</html>
      `
    };

    await sgMail.send(msg);
    console.log(`   ✅ Welcome email sent to ${customer.email}`);

  } catch (error) {
    console.error(`   ❌ Failed to send welcome email: ${error.message}`);
  }
}

/**
 * Send upgrade notification email
 */
async function sendUpgradeEmail(customer, websiteResult) {
  try {
    if (!process.env.SENDGRID_API_KEY) return;

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to: customer.email,
      from: {
        email: process.env.NOTIFICATION_EMAIL || 'hello@oatcode.com',
        name: 'OatCode'
      },
      subject: `✨ Your Website Has Been Upgraded to Premium!`,
      html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>✨ Upgrade Complete!</h2>

    <p>Great news! Your website has been upgraded to our Premium plan with AI-generated visuals.</p>

    <p><strong>Check out your enhanced website:</strong></p>
    <p><a href="${websiteResult.websiteUrl}" style="color: #667eea;">View Premium Website →</a></p>

    <h3>New Premium features:</h3>
    <ul>
        <li>🎨 AI-generated custom images (DALL-E 3)</li>
        <li>✨ Premium branding & design</li>
        <li>🎥 Advanced animations & effects</li>
    </ul>

    <p>Best,<br>The OatCode Team</p>
</body>
</html>
      `
    };

    await sgMail.send(msg);
    console.log(`   ✅ Upgrade email sent`);

  } catch (error) {
    console.error(`   ❌ Failed to send upgrade email: ${error.message}`);
  }
}

/**
 * Send cancellation survey
 */
async function sendCancellationSurvey(customer) {
  try {
    if (!process.env.SENDGRID_API_KEY) return;

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to: customer.email,
      from: {
        email: process.env.NOTIFICATION_EMAIL || 'hello@oatcode.com',
        name: 'OatCode'
      },
      subject: `Sorry to see you go - Quick feedback?`,
      html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>We're sorry to see you go</h2>

    <p>Your subscription has been canceled. Your website will remain active for the next 30 days.</p>

    <p>We'd love to understand what we could have done better. Would you mind taking 30 seconds to let us know why you canceled?</p>

    <p>Just reply to this email with your feedback. It really helps us improve!</p>

    <p>If you change your mind, you can reactivate anytime.</p>

    <p>Best,<br>The OatCode Team</p>
</body>
</html>
      `
    };

    await sgMail.send(msg);
    console.log(`   ✅ Cancellation survey sent`);

  } catch (error) {
    console.error(`   ❌ Failed to send cancellation survey: ${error.message}`);
  }
}

/**
 * Send payment failure email
 */
async function sendPaymentFailureEmail(customer, invoice) {
  try {
    if (!process.env.SENDGRID_API_KEY) return;

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const failedCount = customer.failedPayments?.length || 1;
    const isFinalWarning = failedCount >= 3;

    const msg = {
      to: customer.email,
      from: {
        email: process.env.NOTIFICATION_EMAIL || 'hello@oatcode.com',
        name: 'OatCode'
      },
      subject: isFinalWarning ? `⚠️ URGENT: Payment Failed - Website Will Be Suspended` : `Payment Failed - Please Update Payment Method`,
      html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>${isFinalWarning ? '⚠️ URGENT: ' : ''}Payment Failed</h2>

    <p>We were unable to process your payment of $${(invoice.amount_due / 100).toFixed(2)}.</p>

    ${isFinalWarning ? `
    <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
        <strong>This is your final notice.</strong> Your website will be suspended if payment is not received within 24 hours.
    </div>
    ` : `
    <p>This is failed payment attempt #${failedCount}. Please update your payment method to avoid service interruption.</p>
    `}

    <p>To update your payment method, please contact us by replying to this email.</p>

    <p>Best,<br>The OatCode Team</p>
</body>
</html>
      `
    };

    await sgMail.send(msg);
    console.log(`   ✅ Payment failure email sent (attempt #${failedCount})`);

  } catch (error) {
    console.error(`   ❌ Failed to send payment failure email: ${error.message}`);
  }
}

module.exports = router;
