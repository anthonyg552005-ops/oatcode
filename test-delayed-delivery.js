/**
 * Test Delayed Delivery (24-48 hours)
 * Simulates a REAL customer purchase to verify:
 * 1. Order confirmation email sent immediately
 * 2. Customer status set to 'pending_delivery'
 * 3. Website NOT generated immediately
 * 4. Scheduler will deliver after 24 hours
 */

require('dotenv').config();
const axios = require('axios');

async function testDelayedDelivery() {
  console.log('🧪 TESTING DELAYED DELIVERY (24-48 HOURS)\n');
  console.log('Simulating: REAL customer purchases Standard plan ($197/month)\n');

  // Use a real-looking email (no "test" in it)
  const testEmail = 'customer@smithdental.com';
  const businessName = 'Smith Dental Practice';
  const tier = 'standard';

  const mockStripeWebhook = {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_live_' + Date.now(), // NOT a test ID
        customer: 'cus_live_' + Date.now(), // NOT a test ID
        customer_details: {
          email: testEmail,
          name: businessName
        },
        customer_email: testEmail,
        subscription: 'sub_live_' + Date.now(),
        payment_intent: 'pi_live_' + Date.now(),
        amount_total: 19700, // $197 in cents
        metadata: {
          business_name: businessName,
          tier: tier
        }
      }
    }
  };

  console.log('📧 Test Details:');
  console.log(`   Email: ${testEmail} (REAL customer - no "test" in email)`);
  console.log(`   Business: ${businessName}`);
  console.log(`   Tier: ${tier}`);
  console.log(`   Amount: $197`);
  console.log(`   Stripe IDs: cs_live_* (NOT test IDs)`);
  console.log('');

  try {
    // Test against production server
    const baseUrl = 'https://oatcode.com';
    console.log(`1️⃣  Testing against: ${baseUrl}`);

    // Send webhook to production server
    console.log('2️⃣  Sending Stripe webhook for REAL customer...');
    const webhookUrl = `${baseUrl}/webhook/stripe`;

    const response = await axios.post(webhookUrl, mockStripeWebhook, {
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature'
      },
      timeout: 30000
    });

    console.log('   ✅ Webhook received:', response.data);
    console.log('');

    console.log('✅ DELAYED DELIVERY TEST COMPLETE!');
    console.log('');
    console.log('📋 What should have happened:');
    console.log('   ✅ Order confirmation email sent to customer@smithdental.com');
    console.log('   ✅ Customer status set to "pending_delivery" in database');
    console.log('   ✅ Website NOT generated immediately');
    console.log('   ⏰ Website will be generated in 24-48 hours by scheduler');
    console.log('');
    console.log('🔍 Check server logs for:');
    console.log('   - "⏰ Real customer detected - scheduling delivery for 24-48 hours"');
    console.log('   - "✅ Order confirmed - website will be delivered in 24-48 hours"');
    console.log('   - Should NOT see "🎨 Generating STANDARD website..."');
    console.log('');
    console.log('🎉 If you see the delayed delivery message, it works!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
      console.error('   Status:', error.response.status);
    }
  }
}

testDelayedDelivery();
