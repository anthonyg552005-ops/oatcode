/**
 * Resend prospect email with better deliverability
 */

require('dotenv').config();
const sgMail = require('@sendgrid/mail');

async function resendEmail() {
  console.log('📧 Resending prospect email...\n');

  const demoUrl = 'https://oatcode.com/demos/demo_1759519605449.html';
  const email = 'anthonyg552005@gmail.com';

  if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ SENDGRID_API_KEY not found');
    process.exit(1);
  }

  console.log('✓ SendGrid API Key:', process.env.SENDGRID_API_KEY.substring(0, 10) + '...');

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const msg = {
    to: email,
    from: {
      email: 'hello@oatcode.com',
      name: 'Sarah from OatCode'
    },
    replyTo: 'hello@oatcode.com',
    subject: `Garcia Dental Studio - I built you a website (take a look)`,
    text: `Hi,

I noticed Garcia Dental Studio doesn't have a website yet (or your current one could use an upgrade).

So I went ahead and built you a professional website demo to show you what's possible.

View your demo: ${demoUrl}

It's 100% custom-built for Garcia Dental Studio. Not a template. Real content written by AI specifically for your business.

What's included:
• Mobile-responsive (looks perfect on phones, tablets, desktops)
• SEO optimized to rank on Google
• Professional copywriting tailored to your business
• Modern design with custom color scheme
• Contact forms that go straight to your email
• Free hosting & SSL certificate included
• Unlimited changes - just reply with what you want changed

If you love it, you can launch it live today for just $197/month (cancel anytime).

Get Started: https://buy.stripe.com/eVq5kFdx937Z6B4g9D7Re00

Questions? Just reply to this email - I read every response.

Best,
Sarah
OatCode
AI-Powered Website Management`,
    html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1e293b;
            margin: 0;
            padding: 0;
            background: #ffffff;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
        }
        .logo {
            display: inline-block;
            width: 60px;
            height: 60px;
            background: #1E293B;
            border-radius: 50%;
            text-align: center;
            line-height: 60px;
            font-size: 36px;
            font-weight: bold;
            color: white;
            margin-bottom: 15px;
        }
        .content {
            padding: 40px 30px;
        }
        .cta-button {
            display: inline-block;
            padding: 16px 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 18px;
            margin: 20px 0;
        }
        .features {
            background: #f8fafc;
            padding: 30px;
            border-radius: 12px;
            margin: 30px 0;
        }
        .price {
            background: #f0fdf4;
            border: 2px solid #10b981;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
        }
        .footer {
            background: #f8fafc;
            padding: 30px;
            text-align: center;
            color: #64748b;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">O</div>
            <h1 style="margin: 0; font-size: 28px;">We Built You a Demo Website</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Garcia Dental Studio</p>
        </div>

        <div class="content">
            <p>Hi there,</p>

            <p>I noticed <strong>Garcia Dental Studio</strong> doesn't have a website yet (or your current one could use an upgrade).</p>

            <p>So I went ahead and built you a <strong>professional website demo</strong> to show you what's possible:</p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="${demoUrl}" class="cta-button">
                    🌐 View Your Demo Website
                </a>
            </div>

            <p><strong>It's 100% custom-built for Garcia Dental Studio.</strong> Not a template.</p>

            <div class="features">
                <h3 style="margin-top: 0;">What's included:</h3>
                <p>✓ Mobile-responsive design<br>
                ✓ SEO optimized for Google<br>
                ✓ Professional copywriting<br>
                ✓ Modern color scheme<br>
                ✓ Contact forms<br>
                ✓ Free hosting & SSL<br>
                ✓ <strong>Unlimited changes</strong></p>
            </div>

            <div class="price">
                <div style="font-size: 36px; font-weight: bold; color: #059669;">$197<span style="font-size: 18px;">/month</span></div>
                <div style="color: #64748b; margin-top: 5px;">Cancel anytime</div>
            </div>

            <p style="text-align: center;">
                <a href="https://buy.stripe.com/eVq5kFdx937Z6B4g9D7Re00" class="cta-button">
                    Get Started - $197/month
                </a>
            </p>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 40px 0;">

            <p><strong>Questions?</strong> Just reply to this email.</p>

            <p>
                Best,<br>
                <strong>Sarah</strong><br>
                OatCode
            </p>
        </div>

        <div class="footer">
            <p><strong>Why we're different:</strong> Most website companies charge $5,000+ upfront. We use AI to build yours instantly for just $197/month.</p>
            <p style="margin-top: 20px;">
                <a href="${demoUrl}" style="color: #667eea;">View Demo</a>
            </p>
        </div>
    </div>
</body>
</html>
    `,
    trackingSettings: {
      clickTracking: { enable: true },
      openTracking: { enable: true }
    },
    mailSettings: {
      sandboxMode: { enable: false }
    }
  };

  try {
    const response = await sgMail.send(msg);
    console.log('✅ Email sent successfully!');
    console.log('   To:', email);
    console.log('   From: hello@oatcode.com');
    console.log('   Subject:', msg.subject);
    console.log('   Response:', response[0].statusCode, response[0].headers['x-message-id']);
    console.log('\n📬 Check your inbox (including spam/promotions folder)');
    console.log('   Gmail users: Check the "Promotions" tab\n');
  } catch (error) {
    console.error('❌ SendGrid Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.statusCode);
      console.error('   Body:', JSON.stringify(error.response.body, null, 2));
    }
  }
}

resendEmail();
