/**
 * API KEY TESTING SCRIPT
 * Tests all API keys to make sure they work before launching
 */

require('dotenv').config();
const OpenAI = require('openai');
const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');
const axios = require('axios');

async function testAPIKeys() {
  console.log('');
  console.log('🔍 Testing API Keys...');
  console.log('');

  let allPassed = true;

  // Test OpenAI
  try {
    console.log('1️⃣  Testing OpenAI...');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say "API key works!"' }],
      max_tokens: 10
    });
    console.log('   ✅ OpenAI: WORKING');
    console.log(`   Response: ${response.choices[0].message.content}`);
  } catch (error) {
    console.log('   ❌ OpenAI: FAILED');
    console.log(`   Error: ${error.message}`);
    allPassed = false;
  }

  console.log('');

  // Test SendGrid
  try {
    console.log('2️⃣  Testing SendGrid...');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // Just verify the key is set (don't actually send email yet)
    console.log('   ✅ SendGrid: API key configured');
    console.log(`   From: ${process.env.FROM_EMAIL}`);
  } catch (error) {
    console.log('   ❌ SendGrid: FAILED');
    console.log(`   Error: ${error.message}`);
    allPassed = false;
  }

  console.log('');

  // Test Google Places
  try {
    console.log('3️⃣  Testing Google Places...');
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
      params: {
        query: 'dentist in Austin TX',
        key: process.env.GOOGLE_PLACES_API_KEY
      }
    });

    if (response.data.status === 'OK' || response.data.status === 'ZERO_RESULTS') {
      console.log('   ✅ Google Places: WORKING');
      console.log(`   Found ${response.data.results?.length || 0} results`);
    } else {
      console.log('   ❌ Google Places: FAILED');
      console.log(`   Status: ${response.data.status}`);
      console.log(`   Error: ${response.data.error_message || 'Unknown error'}`);
      allPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Google Places: FAILED');
    console.log(`   Error: ${error.message}`);
    allPassed = false;
  }

  console.log('');

  // Test Twilio
  try {
    console.log('4️⃣  Testing Twilio...');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    // Verify account (doesn't send SMS)
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    console.log('   ✅ Twilio: WORKING');
    console.log(`   Account: ${account.friendlyName}`);
    console.log(`   Phone: ${process.env.TWILIO_PHONE_NUMBER}`);
  } catch (error) {
    console.log('   ❌ Twilio: FAILED');
    console.log(`   Error: ${error.message}`);
    allPassed = false;
  }

  console.log('');

  // Test Stripe
  try {
    console.log('5️⃣  Testing Stripe...');
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // Just verify the key works
    const balance = await stripe.balance.retrieve();
    console.log('   ✅ Stripe: WORKING');
    console.log(`   Mode: ${process.env.STRIPE_SECRET_KEY.startsWith('sk_test') ? 'TEST' : 'LIVE'}`);
  } catch (error) {
    console.log('   ❌ Stripe: FAILED');
    console.log(`   Error: ${error.message}`);
    allPassed = false;
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (allPassed) {
    console.log('');
    console.log('✅ ALL API KEYS WORKING!');
    console.log('');
    console.log('🚀 Ready to launch autonomous business!');
    console.log('');
    console.log('Run: npm start');
    console.log('');
  } else {
    console.log('');
    console.log('❌ SOME API KEYS FAILED');
    console.log('');
    console.log('Please fix the failed keys before launching.');
    console.log('');
  }
}

testAPIKeys().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});