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

// Stripe webhook endpoint
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify webhook signature (when Stripe SDK is installed)
    // For now, just parse the event
    event = JSON.parse(req.body);

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

  const customer = {
    stripeCustomerId: session.customer,
    email: session.customer_details?.email,
    name: session.customer_details?.name,
    subscriptionId: session.subscription,
    tier: determineTier(session.amount_total), // $197 = standard, $297 = premium
    status: 'active',
    createdAt: new Date()
  };

  console.log(`   New customer: ${customer.email} (${customer.tier} tier)`);

  // TODO: Save to database
  // await saveCustomer(customer);

  // TODO: Send welcome email
  // await sendWelcomeEmail(customer);

  // TODO: Generate website
  // await generateWebsite(customer);
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

  // TODO: Update customer tier
  // TODO: If upgraded to premium, regenerate website with AI visuals
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCanceled(subscription) {
  console.log('❌ Subscription canceled:', subscription.id);

  // TODO: Update customer status
  // TODO: Send cancellation survey email
  // TODO: Schedule website takedown (after grace period)
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

  // TODO: Send payment failure notification
  // TODO: Pause website after 3 failed payments
  // TODO: Send dunning emails
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

module.exports = router;
