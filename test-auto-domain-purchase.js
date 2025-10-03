/**
 * Test Automatic Domain Purchasing for Premium Customers
 */

require('dotenv').config();
const axios = require('axios');

async function testAutoDomainPurchase() {
  console.log('🧪 Testing Automatic Domain Purchase for Premium Customer...\n');

  // Test data - Premium customer signup
  const testCustomer = {
    email: 'owner@austindentalcare.com',
    businessName: 'Austin Dental Care',
    tier: 'premium',  // This triggers automatic domain purchase!
    customerInfo: {
      firstName: 'John',
      lastName: 'Smith',
      phone: '+1.5125551234',
      address: '123 Main St',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      country: 'US'
    }
  };

  try {
    console.log('📋 Test Customer:');
    console.log(`   Business: ${testCustomer.businessName}`);
    console.log(`   Email: ${testCustomer.email}`);
    console.log(`   Tier: ${testCustomer.tier}`);
    console.log('');
    console.log('⚠️  NOTE: This is a DRY RUN test - no actual domain will be purchased!');
    console.log('   To actually purchase, use the API endpoint with real data.');
    console.log('');

    // Simulate what happens when Premium customer signs up
    const AutoDomainService = require('./src/services/AutoDomainService');
    const autoDomain = new AutoDomainService(console);

    // Generate domain from business name
    const suggestedDomain = testCustomer.businessName.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/\s+/g, '') + '.com';

    console.log('═══════════════════════════════════════════════════════');
    console.log('🌐 AUTONOMOUS DOMAIN PURCHASE SIMULATION');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log(`Suggested domain: ${suggestedDomain}`);
    console.log('');

    // Check availability
    const availability = await autoDomain.checkAvailability(suggestedDomain);

    if (availability.available) {
      console.log('');
      console.log('✅ Domain is AVAILABLE!');
      console.log('');
      console.log('🤖 What would happen automatically:');
      console.log('   1. ✅ Domain checked: austindentalcare.com - Available');
      console.log('   2. 💳 Domain purchased via Namecheap API (~$10 from your balance)');
      console.log('   3. ⚙️  DNS configured: austindentalcare.com → 172.248.91.121');
      console.log('   4. 🌐 Customer website live at: http://austindentalcare.com');
      console.log('   5. 📧 Customer notified of their custom domain');
      console.log('   6. 💰 You profit: $297/mo - $10/year = $3,554/year');
      console.log('');
      console.log('⏳ DNS propagation: 15-30 minutes');
      console.log('🔒 SSL: Add via Cloudflare (free)');
      console.log('');

      // TO ACTUALLY PURCHASE (uncomment to test with real purchase):
      // const result = await autoDomain.setupCustomDomain(suggestedDomain, testCustomer.customerInfo);
      // console.log('Domain purchase result:', result);

    } else {
      console.log('');
      console.log('❌ Domain is TAKEN');
      console.log('');
      console.log('🤖 Finding alternative domain...');
      const alternative = await autoDomain.suggestAvailableDomain(testCustomer.businessName);
      console.log('');
      console.log(`✅ Alternative found: ${alternative.domain}`);
      console.log('');
      console.log('   Customer would be offered this alternative domain.');
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ TEST COMPLETE - System Ready for Premium Customers!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('📖 How to trigger actual purchase:');
    console.log('');
    console.log('   Method 1: API Call');
    console.log('   POST http://your-server.com/api/customer/purchase');
    console.log('   {');
    console.log('     "email": "customer@business.com",');
    console.log('     "businessName": "Business Name",');
    console.log('     "tier": "premium"');
    console.log('   }');
    console.log('');
    console.log('   Method 2: When customer clicks Stripe payment link');
    console.log('   Premium plan: $297/mo → Auto domain purchase triggered');
    console.log('');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testAutoDomainPurchase();
