/**
 * TEST SUPPORT BOT
 * Test the AI customer support bot locally
 */

require('dotenv').config();
const CustomerSupportAI = require('./src/services/CustomerSupportAI');

async function testSupportBot() {
  console.log('🤖 Testing Customer Support AI Bot...\n');

  // Check API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY is missing!');
    process.exit(1);
  }

  const supportAI = new CustomerSupportAI();

  // Test scenarios
  const testCases = [
    {
      name: 'Pricing Question',
      email: 'test@example.com',
      subject: 'How much does your service cost?',
      message: 'Hi, I am interested in getting a website for my business. How much do you charge?'
    },
    {
      name: 'Delivery Timeline',
      email: 'customer@example.com',
      subject: 'When will I get my website?',
      message: 'I just paid for the standard plan. How long until my website is ready?'
    },
    {
      name: 'Revision Request',
      email: 'client@example.com',
      subject: 'Need to change something',
      message: 'I got my website but I want to change the color scheme to blue. How do I do that?'
    },
    {
      name: 'Technical Question',
      email: 'user@example.com',
      subject: 'Can I use my own domain?',
      message: 'Do you support custom domains? I already have one.'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📧 TEST: ${testCase.name}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`From: ${testCase.email}`);
    console.log(`Subject: ${testCase.subject}`);
    console.log(`Message: ${testCase.message}`);
    console.log('');

    try {
      const response = await supportAI.handleInquiry({
        message: testCase.message,
        subject: testCase.subject,
        customerEmail: testCase.email,
        customerName: 'Test Customer',
        channel: 'email'
      });

      console.log('🤖 AI RESPONSE:');
      console.log(`Intent: ${response.intent}`);
      console.log(`Sentiment: ${response.sentiment}`);
      console.log(`Needs Follow-up: ${response.needsFollowUp ? 'Yes' : 'No'}`);
      console.log('');
      console.log('Message:');
      console.log(response.message);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.message);
    }

    // Wait a bit between requests to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Show statistics
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 SUPPORT BOT STATISTICS');
  console.log(`${'='.repeat(60)}`);
  const stats = supportAI.getStatistics();
  console.log(JSON.stringify(stats, null, 2));
  console.log('');

  console.log('✅ All tests completed!\n');
}

testSupportBot().catch(error => {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
