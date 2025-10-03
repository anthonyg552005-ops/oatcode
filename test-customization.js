/**
 * TEST CUSTOMIZATION FLOW
 *
 * Tests the complete autonomous customization system:
 * 1. Generate initial demo website
 * 2. Create customization request
 * 3. Process customization with AI
 * 4. Generate updated website
 * 5. Send confirmation email
 */

// Load environment variables
require('dotenv').config();

const DemoGalleryService = require('./src/services/DemoGalleryService');
const EmailLogService = require('./src/services/EmailLogService');
const WebsiteGeneratorService = require('./src/services/WebsiteGeneratorService');
const CustomizationProcessorService = require('./src/services/CustomizationProcessorService');

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║   🧪 TESTING AUTONOMOUS CUSTOMIZATION SYSTEM          ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

async function runTest() {
  try {
    // Initialize services
    console.log('📦 Initializing services...');
    const demoGallery = new DemoGalleryService(console);
    const emailLog = new EmailLogService(console);
    const websiteGenerator = new WebsiteGeneratorService(console);
    const customizationProcessor = new CustomizationProcessorService(
      console,
      demoGallery,
      emailLog,
      websiteGenerator
    );

    await demoGallery.initialize();
    await emailLog.initialize();
    console.log('✅ Services initialized\n');

    // Step 1: Generate initial demo website
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 1: Generate Initial Demo Website');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const testBusiness = {
      name: 'Austin Dental Care',
      industry: 'dentist',
      city: 'Austin',
      state: 'TX',
      phone: '(512) 555-1234',
      rating: 4.8,
      reviewCount: 127
    };

    console.log(`🎨 Generating demo for: ${testBusiness.name}`);
    console.log(`   Industry: ${testBusiness.industry}`);
    console.log(`   Location: ${testBusiness.city}, ${testBusiness.state}\n`);

    const demoUrl = await websiteGenerator.generateFromBusinessData(testBusiness, 'standard');

    console.log(`\n✅ Demo generated successfully!`);
    console.log(`   URL: ${demoUrl}\n`);

    // Step 2: Log the demo
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 2: Log Demo to Gallery');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const demo = await demoGallery.logDemo({
      type: 'standard',
      businessName: testBusiness.name,
      industry: testBusiness.industry,
      city: testBusiness.city,
      state: testBusiness.state,
      email: 'test@example.com',
      leadId: 'lead_test_123',
      demoUrl: demoUrl,
      sections: ['hero', 'about', 'services', 'contact'],
      images: []
    });

    console.log(`✅ Demo logged to gallery`);
    console.log(`   Demo ID: ${demo.id}\n`);

    // Step 3: Create customization request
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 3: Submit Customization Request');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const customizationRequest = {
      changes: 'Change the main heading to emphasize family-friendly dental care',
      additions: 'Add a testimonials section with patient reviews, and add emergency dental services information',
      removals: 'Remove any stock photos that look generic',
      notes: 'We serve families primarily, so keep the tone warm and friendly. We also offer 24/7 emergency services.'
    };

    console.log('📝 Customization Request:');
    console.log(`   Changes: ${customizationRequest.changes}`);
    console.log(`   Additions: ${customizationRequest.additions}`);
    console.log(`   Removals: ${customizationRequest.removals}`);
    console.log(`   Notes: ${customizationRequest.notes}\n`);

    const result = await demoGallery.requestCustomization(demo.id, customizationRequest);

    console.log(`✅ Customization request submitted`);
    console.log(`   Request ID: ${result.requestId}\n`);

    // Step 4: Process customization with AI
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 4: Process Customization with AI');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🤖 AI Customization Processor starting...\n');

    const processingResult = await customizationProcessor.processPendingCustomizations();

    console.log(`\n✅ Customization processing complete!`);
    console.log(`   Processed: ${processingResult.processed}`);
    console.log(`   Failed: ${processingResult.failed}\n`);

    // Step 5: View results
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 5: View Results');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const updatedDemo = await demoGallery.getDemoById(demo.id);

    console.log('📊 Updated Demo Status:');
    console.log(`   Original URL: ${demo.urls.demo}`);
    console.log(`   Updated URL: ${updatedDemo.urls.demo}`);
    console.log(`   Status: ${updatedDemo.status}`);
    console.log(`   Customization Requested: ${updatedDemo.customization.requested}`);
    console.log(`   Number of Requests: ${updatedDemo.customization.requests.length}\n`);

    const stats = await demoGallery.getDemoStats();
    console.log('📈 Demo Gallery Stats:');
    console.log(`   Total Demos: ${stats.total}`);
    console.log(`   Standard: ${stats.standard}`);
    console.log(`   Premium: ${stats.premium}`);
    console.log(`   Customization Requests: ${stats.customizationRequests}`);
    console.log(`   Converted: ${stats.converted}\n`);

    const emailStats = await emailLog.getEmailStats();
    console.log('📧 Email Stats:');
    console.log(`   Total Emails: ${emailStats.total}`);
    console.log(`   Today: ${emailStats.today}`);
    console.log(`   This Week: ${emailStats.thisWeek}`);
    console.log(`   This Month: ${emailStats.thisMonth}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ TEST COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🎉 Autonomous Customization System is working!\n');
    console.log('Next Steps:');
    console.log('1. Check data/demos/ for generated websites');
    console.log('2. Check data/demos/customization-requests/ for requests');
    console.log('3. View dashboard at http://localhost:3000/dashboard.html');
    console.log('4. The system will process new requests every hour automatically\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
runTest();
