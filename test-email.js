/**
 * TEST EMAIL SENDING
 * Quick test to verify supportbot email is working
 */

require('dotenv').config();
const EmailDeliverabilityService = require('./src/services/EmailDeliverabilityService');

// Simple logger
const logger = {
  info: (msg) => console.log(msg),
  warn: (msg) => console.warn(msg),
  error: (msg) => console.error(msg)
};

async function testEmail() {
  console.log('🧪 Testing Email System...\n');

  // Check environment variables
  console.log('📧 Email Configuration:');
  console.log(`   FROM_EMAIL: ${process.env.FROM_EMAIL || 'noreply@oatcode.com'}`);
  console.log(`   SENDGRID_API_KEY: ${process.env.SENDGRID_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   NOTIFICATION_EMAIL: ${process.env.NOTIFICATION_EMAIL}`);
  console.log('');

  if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ SENDGRID_API_KEY is missing!');
    process.exit(1);
  }

  // Initialize SendGrid
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  // Create email service
  const emailService = new EmailDeliverabilityService(logger);

  // Get test email from command line or use default
  const testEmail = process.argv[2] || process.env.NOTIFICATION_EMAIL;

  if (!testEmail) {
    console.error('❌ No test email provided!');
    console.error('Usage: node test-email.js your-email@example.com');
    process.exit(1);
  }

  console.log(`📨 Sending test email to: ${testEmail}\n`);

  // Test deliverability
  const result = await emailService.testDeliverability(testEmail);

  console.log('\n📊 Test Results:');
  console.log(JSON.stringify(result, null, 2));

  if (result.success) {
    console.log('\n✅ SUCCESS! Email sent successfully!');
    console.log('   Check your inbox (and spam folder just in case)');
    console.log('   If it landed in spam, we may need to adjust settings');
  } else {
    console.log('\n❌ FAILED! Email could not be sent');
    console.log(`   Error: ${result.error || result.reason}`);
  }
}

testEmail().catch(error => {
  console.error('❌ Test failed with error:', error.message);
  console.error(error);
  process.exit(1);
});
