/**
 * Send a real prospect pitch email to test the complete flow
 */

require('dotenv').config();
const AIWebsiteGenerationService = require('./src/services/AIWebsiteGenerationService');
const sgMail = require('@sendgrid/mail');
const fs = require('fs').promises;
const path = require('path');

async function sendProspectEmail() {
  console.log('🎯 SENDING TEST PROSPECT EMAIL\n');

  // Your business details (as the prospect)
  const business = {
    name: 'Garcia Dental Studio',
    businessName: 'Garcia Dental Studio',
    industry: 'Dental Practice',
    location: 'Orange County, CA',
    city: 'Irvine',
    email: 'anthonyg552005@gmail.com', // Your email
    phone: '(714) 824-1045',
    description: 'Modern dental practice offering comprehensive care including cosmetic dentistry, implants, and preventive care in Orange County',
    tier: 'premium'
  };

  const strategy = {
    tier: 'premium',
    colorDetails: {
      primary: '#0ea5e9',
      secondary: '#06b6d4',
      accent: '#10b981'
    }
  };

  try {
    // Step 1: Generate demo website
    console.log('1️⃣  Generating your demo website...');
    const websiteGenerator = new AIWebsiteGenerationService(console);
    const result = await websiteGenerator.generateCompleteWebsite(business, strategy);

    if (!result.success) {
      throw new Error(result.error || 'Website generation failed');
    }

    // Save demo website
    const demoId = `demo_${Date.now()}`;
    const websiteFile = path.join(__dirname, 'public/demos', `${demoId}.html`);
    const demosDir = path.dirname(websiteFile);

    await fs.mkdir(demosDir, { recursive: true });
    await fs.writeFile(websiteFile, result.files['index.html'], 'utf-8');

    const demoUrl = `https://oatcode.com/demos/${demoId}.html`;
    console.log(`   ✅ Demo created: ${demoUrl}\n`);

    // Step 2: Send prospect pitch email
    console.log('2️⃣  Sending pitch email to your inbox...');

    if (!process.env.SENDGRID_API_KEY) {
      console.error('   ❌ SendGrid not configured');
      process.exit(1);
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to: business.email,
      from: {
        email: 'hello@oatcode.com',
        name: 'Sarah from OatCode'
      },
      subject: `${business.name} - I built you a website (take a look)`,
      html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
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
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 18px;
            margin: 20px 0;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(0,0,0,0.15);
        }
        .features {
            background: #f8fafc;
            padding: 30px;
            border-radius: 12px;
            margin: 30px 0;
        }
        .feature-item {
            margin: 15px 0;
            padding-left: 30px;
            position: relative;
        }
        .feature-item:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #10b981;
            font-weight: bold;
            font-size: 20px;
        }
        .price {
            background: #f0fdf4;
            border: 2px solid #10b981;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
        }
        .price-amount {
            font-size: 36px;
            font-weight: bold;
            color: #059669;
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
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${business.name}</p>
        </div>

        <div class="content">
            <p>Hi there,</p>

            <p>I noticed <strong>${business.name}</strong> doesn't have a website yet (or your current one could use an upgrade).</p>

            <p>So I went ahead and built you a <strong>professional website demo</strong> to show you what's possible. No commitment, just take a look:</p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="${demoUrl}" class="cta-button">
                    🌐 View Your Demo Website
                </a>
            </div>

            <p><strong>It's 100% custom-built for ${business.name}.</strong> Not a template. Real content written by AI specifically for your business.</p>

            <div class="features">
                <h3 style="margin-top: 0; color: #1e293b;">What's included:</h3>
                <div class="feature-item">Mobile-responsive (looks perfect on phones, tablets, desktops)</div>
                <div class="feature-item">SEO optimized to rank on Google</div>
                <div class="feature-item">Professional copywriting tailored to your business</div>
                <div class="feature-item">Modern design with custom color scheme</div>
                <div class="feature-item">Contact forms that go straight to your email</div>
                <div class="feature-item">Free hosting & SSL certificate included</div>
                <div class="feature-item"><strong>Unlimited changes</strong> - just reply with what you want changed</div>
            </div>

            <p><strong>If you love it</strong>, you can launch it live today:</p>

            <div class="price">
                <div style="color: #64748b; margin-bottom: 5px;">Just</div>
                <div class="price-amount">$197<span style="font-size: 18px; color: #64748b;">/month</span></div>
                <div style="color: #64748b; margin-top: 5px;">Cancel anytime</div>
            </div>

            <p style="text-align: center;">
                <a href="https://buy.stripe.com/eVq5kFdx937Z6B4g9D7Re00" class="cta-button">
                    Get Started - $197/month
                </a>
            </p>

            <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 30px;">
                <strong>Want premium?</strong> $297/month includes AI-generated custom images and premium features<br>
                <a href="https://buy.stripe.com/dRm9AVdx99wn4sWcXr7Re01" style="color: #667eea;">Upgrade to Premium →</a>
            </p>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 40px 0;">

            <p><strong>Questions?</strong> Just reply to this email - I read every response.</p>

            <p>Looking forward to hearing what you think!</p>

            <p>
                Best,<br>
                <strong>Sarah</strong><br>
                OatCode<br>
                <em>AI-Powered Website Management</em>
            </p>
        </div>

        <div class="footer">
            <p><strong>Why we're different:</strong></p>
            <p>Most website companies charge $5,000+ upfront and take weeks to build. We use AI to build yours instantly for just $197/month. No contracts, cancel anytime.</p>
            <p style="margin-top: 20px;">
                <a href="${demoUrl}" style="color: #667eea; text-decoration: none;">View Demo</a> •
                <a href="https://buy.stripe.com/eVq5kFdx937Z6B4g9D7Re00" style="color: #667eea; text-decoration: none;">Get Started</a>
            </p>
        </div>
    </div>
</body>
</html>
      `,
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true }
      }
    };

    await sgMail.send(msg);

    console.log(`   ✅ Email sent to ${business.email}\n`);
    console.log('✅ TEST COMPLETE!\n');
    console.log('📋 What to test:');
    console.log('   1. Check your inbox for email from "Sarah from OatCode"');
    console.log('   2. Click "View Your Demo Website" button');
    console.log('   3. Review the demo website');
    console.log('   4. Click "Get Started - $197/month" to test purchase flow');
    console.log('   5. Use Stripe test card: 4242 4242 4242 4242');
    console.log('   6. Verify order confirmation email');
    console.log('   7. Wait 24 hours (or force trigger) for website delivery');
    console.log('');
    console.log('🎉 This is exactly what real prospects will receive!');

  } catch (error) {
    console.error('❌ Failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.body);
    }
  }
}

sendProspectEmail();
