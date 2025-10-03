/**
 * TEST OUTREACH EMAIL FLOW
 *
 * Tests the complete autonomous outreach process:
 * 1. Takes a real business
 * 2. Generates demo website
 * 3. Writes personalized email
 * 4. Sends email with demo link
 */

require('dotenv').config();
const DemoComparisonService = require('./src/services/DemoComparisonService');
const OutreachService = require('./src/services/OutreachService');
const sgMail = require('@sendgrid/mail');

async function testOutreachFlow() {
  console.log('🧪 TESTING AUTONOMOUS OUTREACH FLOW\n');

  // REAL BUSINESS INFO (you can change this)
  const testBusiness = {
    name: 'Sunrise Dental Care',
    industry: 'dentist',
    owner: 'Dr. Sarah Johnson',
    phone: '512-555-0123',
    email: 'anthonyg552005@gmail.com', // YOUR ACTUAL EMAIL to receive the outreach
    address: '123 Main St, Austin, TX 78701',
    website: null, // No website currently
    rating: 4.5,
    reviewCount: 48,
    city: 'Austin',
    state: 'TX'
  };

  console.log('📋 Business Info:');
  console.log(`   Name: ${testBusiness.name}`);
  console.log(`   Industry: ${testBusiness.industry}`);
  console.log(`   Owner: ${testBusiness.owner}`);
  console.log(`   Location: ${testBusiness.city}, ${testBusiness.state}`);
  console.log(`   Rating: ${testBusiness.rating} (${testBusiness.reviewCount} reviews)`);
  console.log(`   Email: ${testBusiness.email}`);
  console.log('');

  // Step 1: Generate Demo Website (Standard + Premium)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 1: Generating Demo Websites (Standard + Premium)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const logger = { info: console.log, error: console.error, warn: console.warn };
  const demoService = new DemoComparisonService(logger);
  const demo = await demoService.generateDemoComparison({
    businessName: testBusiness.name,
    name: testBusiness.name,
    industry: testBusiness.industry,
    location: `${testBusiness.city}, ${testBusiness.state}`,
    city: testBusiness.city,
    phone: testBusiness.phone,
    email: testBusiness.email,
    address: testBusiness.address
  });

  console.log('✅ Demo Websites Created!');
  console.log(`   Comparison URL: ${demo.comparisonUrl}`);
  console.log(`   Standard Demo: ${demo.standardUrl}`);
  console.log(`   Premium Demo: ${demo.premiumUrl}`);
  console.log('');

  // Step 2: Generate Personalized Outreach Email
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 2: Generating Personalized Outreach Email');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const outreachService = new OutreachService(logger);
  const email = await outreachService.generateOutreachEmail({
    name: testBusiness.name,
    industry: testBusiness.industry,
    ownerName: testBusiness.owner,
    city: testBusiness.city,
    state: testBusiness.state,
    address: testBusiness.address,
    demoUrl: demo.comparisonUrl,
    hasWebsite: false,
    rating: testBusiness.rating
  }, {
    ownerName: testBusiness.owner,
    emailHooks: [
      `${testBusiness.name} has ${testBusiness.reviewCount} great reviews (${testBusiness.rating} stars)`,
      'Located in Austin, TX - growing market for dental services'
    ],
    personalizedInsights: ['No website found online - missing potential customers']
  });

  console.log('✅ Email Generated!');
  console.log('');
  console.log('📧 EMAIL PREVIEW:');
  console.log('─────────────────────────────────────────────────');
  console.log(`To: ${testBusiness.email}`);
  console.log(`Subject: ${email.subject}`);
  console.log('');
  console.log(email.body);
  console.log('─────────────────────────────────────────────────');
  console.log('');

  // Step 3: Send Email
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 3: Sending Outreach Email');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Setup SendGrid
  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }

  try {
    const msg = {
      to: testBusiness.email,
      from: 'noreply@oatcode.com',
      subject: email.subject,
      html: email.body
    };

    await sgMail.send(msg);

    console.log('✅ Email Sent Successfully!');
    console.log(`   To: ${testBusiness.email}`);
    console.log(`   Subject: ${email.subject}`);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ OUTREACH FLOW TEST COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log('   1. Check your email: ' + testBusiness.email);
    console.log('   2. Open the outreach email');
    console.log('   3. Click the demo website link');
    console.log('   4. See the Standard vs Premium comparison');
    console.log('   5. Click "Get Started" to test checkout');
    console.log('');
    console.log(`   Demo URL: ${demo.comparisonUrl}`);
    console.log(`   Standard: ${demo.standardUrl}`);
    console.log(`   Premium: ${demo.premiumUrl}`);
  } catch (error) {
    console.error('❌ Email Failed to Send:', error.message);
    throw error;
  }
}

// Run the test
testOutreachFlow().catch(error => {
  console.error('❌ Test Failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
