require('dotenv').config();
const sgMail = require('@sendgrid/mail');

async function testEmail() {
  console.log('Testing SendGrid email...\n');

  if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ SENDGRID_API_KEY not found in .env');
    process.exit(1);
  }

  console.log(`✅ SendGrid API Key found: ${process.env.SENDGRID_API_KEY.substring(0, 20)}...`);

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const msg = {
    to: 'anthonyg552005@gmail.com',
    from: 'support@oatcode.com', // Use verified sender
    subject: '🎨 Your Free Demo Website - Sunrise Dental Care',
    text: 'View your demo at: https://oatcode.com/demos/comparison-sunrise-dental-care.html',
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6366F1;">Your Free Demo Website is Ready!</h2>
      <p>Hi there,</p>
      <p>I created a professional demo website for <strong>Sunrise Dental Care</strong> to show you what's possible.</p>
      <p><strong>View your demo here:</strong><br>
      <a href="https://oatcode.com/demos/comparison-sunrise-dental-care.html" style="color: #6366F1; font-size: 18px;">https://oatcode.com/demos/comparison-sunrise-dental-care.html</a></p>
      <p>This demo shows both Standard and Premium options side-by-side.</p>
      <p>Best,<br>OatCode Team</p>
    </div>`,
    trackingSettings: {
      clickTracking: {
        enable: false // Disable click tracking to avoid SSL issues
      }
    }
  };

  try {
    const result = await sgMail.send(msg);
    console.log('✅ Email sent successfully!');
    console.log('Response:', result[0].statusCode);
    console.log('Message ID:', result[0].headers['x-message-id']);
  } catch (error) {
    console.error('❌ SendGrid Error:', error.message);
    if (error.response) {
      console.error('Response body:', error.response.body);
    }
  }
}

testEmail();
