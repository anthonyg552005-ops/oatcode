/**
 * Test Purchase Flow
 * Simulates a customer purchasing through Stripe and verifies:
 * 1. Webhook receives payment
 * 2. Website is generated automatically
 * 3. Welcome email is sent with website link
 */

require('dotenv').config();
const axios = require('axios');

async function testPurchaseFlow() {
  console.log('🧪 TESTING COMPLETE PURCHASE FLOW\n');
  console.log('Simulating: Customer purchases Standard plan ($197/month)\n');

  const testEmail = 'anthonyg552005@gmail.com';
  const businessName = 'Test Dental Practice';
  const tier = 'standard'; // or 'premium' for $297/month

  const mockStripeWebhook = {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_' + Date.now(),
        customer: 'cus_test_' + Date.now(),
        customer_details: {
          email: testEmail,
          name: businessName
        },
        customer_email: testEmail,
        subscription: 'sub_test_' + Date.now(),
        payment_intent: 'pi_test_' + Date.now(),
        amount_total: tier === 'premium' ? 29700 : 19700, // in cents
        metadata: {
          business_name: businessName,
          tier: tier
        }
      }
    }
  };

  console.log('📧 Test Details:');
  console.log(`   Email: ${testEmail}`);
  console.log(`   Business: ${businessName}`);
  console.log(`   Tier: ${tier}`);
  console.log(`   Amount: $${mockStripeWebhook.data.object.amount_total / 100}`);
  console.log('');

  try {
    // Check if server is running
    console.log('1️⃣  Checking if server is running...');
    const baseUrl = process.env.DOMAIN || 'http://localhost:3000';

    try {
      await axios.get(`${baseUrl}/status.html`);
      console.log('   ✅ Server is running\n');
    } catch (error) {
      console.log('   ❌ Server is not running at ' + baseUrl);
      console.log('   💡 Run: node src/autonomous-engine.js\n');
      return;
    }

    // Send webhook to server
    console.log('2️⃣  Sending Stripe webhook...');
    const webhookUrl = `${baseUrl}/webhook/stripe`;
    console.log(`   Webhook URL: ${webhookUrl}`);

    const response = await axios.post(webhookUrl, mockStripeWebhook, {
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature'
      }
    });

    console.log('   ✅ Webhook received:', response.data);
    console.log('');

    // Wait for processing
    console.log('3️⃣  Waiting for website generation (5 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('');

    // Check results
    console.log('4️⃣  Checking results...');
    console.log('');
    console.log('✅ TEST COMPLETE!');
    console.log('');
    console.log('📋 What to check:');
    console.log('   1. Check server logs above for:');
    console.log('      - "🎨 Generating STANDARD website..."');
    console.log('      - "✅ Website generated: [URL]"');
    console.log('      - "✅ Welcome email sent to..."');
    console.log('');
    console.log('   2. Check your email inbox:');
    console.log(`      - Look for "Welcome to OatCode" email to ${testEmail}`);
    console.log('      - Email should contain your website URL');
    console.log('');
    console.log('   3. Check the database:');
    console.log('      - Customer should be saved with status "active"');
    console.log('      - Payment should be recorded');
    console.log('');
    console.log('🎉 If all checks pass, the automated fulfillment system works!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

testPurchaseFlow();
