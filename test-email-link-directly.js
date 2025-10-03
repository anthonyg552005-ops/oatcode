/**
 * Send email with click tracking DISABLED to prevent URL rewrites
 */

require('dotenv').config();
const sgMail = require('@sendgrid/mail');

async function sendEmailDirectLink() {
  console.log('📧 Sending email with direct links (no click tracking)...\n');

  const demoUrl = 'https://oatcode.com/demos/demo_1759520096443.html';
  const email = 'anthonyg552005@gmail.com';

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const msg = {
    to: email,
    from: {
      email: 'hello@oatcode.com',
      name: 'Sarah from OatCode'
    },
    replyTo: 'hello@oatcode.com',
    subject: `[TEST] Thompson Law - Direct Link (No Tracking)`,
    text: `Hi,

This is a test email with direct links (no click tracking).

View your demo: ${demoUrl}

Copy and paste this URL directly into your browser:
${demoUrl}

Or click here: ${demoUrl}

Get started: https://buy.stripe.com/eVq5kFdx937Z6B4g9D7Re00

Best,
Sarah`,
    html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 20px; background: #ffffff;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">

        <div style="background: linear-gradient(135deg, #1e40af 0%, #0284c7 100%); color: white; padding: 40px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Test Email - Direct Links</h1>
            <p style="margin: 10px 0 0 0;">Thompson & Associates Law Firm</p>
        </div>

        <div style="padding: 40px 30px;">
            <p><strong>Testing direct demo link (no click tracking):</strong></p>

            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-family: monospace; word-break: break-all;">
                    ${demoUrl}
                </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="${demoUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #1e40af 0%, #0284c7 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">
                    View Demo Website →
                </a>
            </div>

            <p><strong>If the button doesn't work, copy and paste this URL:</strong></p>
            <p style="word-break: break-all; background: #fef3c7; padding: 15px; border-radius: 4px; border-left: 4px solid #b45309;">
                ${demoUrl}
            </p>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

            <p><strong>Payment link (also direct):</strong></p>
            <div style="text-align: center; margin: 20px 0;">
                <a href="https://buy.stripe.com/eVq5kFdx937Z6B4g9D7Re00" style="display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Get Started - $197/month →
                </a>
            </div>

            <p style="font-size: 14px; color: #64748b; margin-top: 30px;">
                This email has click tracking DISABLED to ensure direct links work properly.
            </p>
        </div>

    </div>
</body>
</html>
    `,
    trackingSettings: {
      clickTracking: { enable: false },  // DISABLED
      openTracking: { enable: false }     // DISABLED
    },
    mailSettings: {
      sandboxMode: { enable: false }
    }
  };

  try {
    const response = await sgMail.send(msg);
    console.log('✅ Email sent with direct links!');
    console.log('   Message ID:', response[0].headers['x-message-id']);
    console.log('\n📋 Testing:');
    console.log('   1. Check inbox for "[TEST] Thompson Law - Direct Link"');
    console.log('   2. Click the demo link - should work without SSL warning');
    console.log('   3. If button fails, copy/paste the URL shown in yellow box');
    console.log('\n🔗 Direct demo URL:');
    console.log(`   ${demoUrl}`);
    console.log('\n💡 Note: Click tracking is DISABLED to prevent URL rewrites');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.body);
    }
  }
}

sendEmailDirectLink();
