/**
 * Send personalized pitch email using real business data
 */

require('dotenv').config();
const AIWebsiteGenerationService = require('./src/services/AIWebsiteGenerationService');
const sgMail = require('@sendgrid/mail');
const fs = require('fs').promises;
const path = require('path');

async function sendRealBusinessPitch() {
  console.log('🎯 SENDING PERSONALIZED PITCH FOR REAL BUSINESS\n');

  // Real business example: Local law firm in Orange County
  const business = {
    name: 'Thompson & Associates Law Firm',
    businessName: 'Thompson & Associates Law Firm',
    industry: 'Legal Services',
    location: 'Newport Beach, CA',
    city: 'Newport Beach',
    email: 'contact@thompsonlawfirm.com', // Business contact email (shown on website)
    phone: '(949) 555-0147',
    description: 'Experienced Orange County law firm specializing in personal injury, business litigation, and estate planning. Over 25 years serving Southern California families and businesses with dedicated legal representation.',
    tier: 'premium',
    // Additional context for personalization
    targetAudience: 'Individuals and businesses needing legal representation in Orange County',
    keyServices: ['Personal Injury Law', 'Business Litigation', 'Estate Planning', 'Real Estate Law'],
    competitiveAdvantage: '25+ years experience, personalized attention, no fees unless we win',
    location_details: {
      city: 'Newport Beach',
      state: 'California',
      county: 'Orange County'
    }
  };

  const strategy = {
    tier: 'premium',
    colorDetails: {
      primary: '#1e40af', // Professional blue
      secondary: '#0284c7',
      accent: '#b45309' // Gold accent for trust/prestige
    }
  };

  // Recipient email (separate from business contact email)
  const recipientEmail = 'anthonyg552005@gmail.com';

  try {
    // Step 1: Generate personalized demo website
    console.log('1️⃣  Generating personalized demo for Thompson & Associates...');
    const websiteGenerator = new AIWebsiteGenerationService(console);
    const result = await websiteGenerator.generateCompleteWebsite(business, strategy);

    if (!result.success) {
      throw new Error(result.error || 'Website generation failed');
    }

    // Save demo website
    const demoId = `demo_${Date.now()}`;
    const websiteFile = path.join(__dirname, 'public/demos', `${demoId}.html`);
    const premiumWebsiteFile = path.join(__dirname, 'public/demos', `${demoId}-premium.html`);
    const demosDir = path.dirname(websiteFile);

    await fs.mkdir(demosDir, { recursive: true });
    await fs.writeFile(websiteFile, result.files['index.html'], 'utf-8');

    // Generate premium demo with AI visuals badge
    const premiumHTML = result.files['index.html'].replace(
      '<title>',
      '<title>PREMIUM - '
    ).replace(
      '</head>',
      `<style>
        .premium-badge {
          position: fixed;
          top: 80px;
          right: 20px;
          background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          font-weight: bold;
          font-size: 14px;
          z-index: 1000;
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
        }
      </style>
      </head>`
    ).replace(
      '<body',
      '<body><div class="premium-badge">✨ Premium Plan - Custom Domain + AI Visuals</div'
    );
    await fs.writeFile(premiumWebsiteFile, premiumHTML, 'utf-8');

    // Upload both demos to production server
    const { execSync } = require('child_process');
    try {
      console.log('   📤 Uploading demos to production...');
      execSync(`scp ${websiteFile} ${premiumWebsiteFile} root@24.144.89.17:/var/www/automatedwebsitescraper/public/demos/`, {
        stdio: 'inherit'
      });
      console.log('   ✅ Demos uploaded to production');
    } catch (uploadError) {
      console.warn('   ⚠️  Failed to upload to production (running locally?):', uploadError.message);
    }

    const demoUrl = `https://oatcode.com/demos/${demoId}.html`;
    const premiumDemoUrl = `https://oatcode.com/demos/${demoId}-premium.html`;
    console.log(`   ✅ Standard demo: ${demoUrl}`);
    console.log(`   ✅ Premium demo: ${premiumDemoUrl}\n`);

    // Step 2: Send highly personalized pitch email
    console.log('2️⃣  Sending personalized pitch email...');

    if (!process.env.SENDGRID_API_KEY) {
      console.error('   ❌ SendGrid not configured');
      process.exit(1);
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    // Personalized email content based on industry
    const msg = {
      to: recipientEmail,
      from: {
        email: 'hello@oatcode.com',
        name: 'Sarah from OatCode'
      },
      replyTo: 'hello@oatcode.com',
      subject: `${business.name} - Your new website is ready to preview`,
      text: `Hi,

I was researching law firms in ${business.city} and came across ${business.name}.

I noticed you could benefit from a stronger online presence to attract more clients in Orange County, so I went ahead and built you a professional website demo.

View your demo: ${demoUrl}

This isn't a template - it's custom-built specifically for ${business.name} with:
• Professional copywriting highlighting your 25+ years of experience
• Content optimized for "personal injury lawyer Orange County" and related searches
• Mobile-responsive design (70% of potential clients search on mobile)
• Lead capture forms that go directly to your email
• Trust-building testimonials section
• Practice area pages for each service you offer

Most law firms pay $8,000-15,000 upfront for a website like this. We use AI to build yours for just $197/month (no contract, cancel anytime).

View your demo: ${demoUrl}

If you love it, we can have it live within 24-48 hours.

Get started: https://buy.stripe.com/eVq5kFdx937Z6B4g9D7Re00

Questions? Just reply - I read every message personally.

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
            background: linear-gradient(135deg, #1e40af 0%, #0284c7 100%);
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
            background: linear-gradient(135deg, #1e40af 0%, #0284c7 100%);
            color: white !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 18px;
            margin: 20px 0;
        }
        .insight-box {
            background: #fef3c7;
            border-left: 4px solid #b45309;
            padding: 20px;
            margin: 25px 0;
            border-radius: 4px;
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
            <div class="logo">⚖️</div>
            <h1 style="margin: 0; font-size: 28px;">Your New Website is Ready</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${business.name}</p>
        </div>

        <div class="content">
            <p>Hi there,</p>

            <p>I was researching law firms in <strong>${business.city}</strong> and came across <strong>${business.name}</strong>.</p>

            <p>I noticed you could benefit from a stronger online presence to attract more clients in Orange County, so I went ahead and built you a professional website demo.</p>

            <div class="insight-box">
                <strong>💡 Industry Insight:</strong> 73% of people looking for legal services start their search online. A professional website helps you capture those leads before they find your competitors.
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="${demoUrl}" class="cta-button">
                    ⚖️ View Your Website Demo
                </a>
            </div>

            <p><strong>This isn't a template</strong> - it's custom-built specifically for ${business.name} by our AI:</p>

            <div class="features">
                <h3 style="margin-top: 0; color: #1e40af;">What's included in your demo:</h3>
                <p style="margin: 5px 0;">✓ Professional copywriting highlighting your 25+ years of experience<br>
                ✓ Content optimized for "personal injury lawyer Orange County"<br>
                ✓ Mobile-responsive design (70% of clients search on mobile)<br>
                ✓ Lead capture forms that go directly to your email<br>
                ✓ Trust-building testimonials and case results section<br>
                ✓ Practice area pages for each service you offer<br>
                ✓ Google Maps integration for your Newport Beach location<br>
                ✓ Free SSL certificate & professional hosting</p>
            </div>

            <h3 style="color: #1e40af;">Why law firms choose us:</h3>
            <ul style="line-height: 1.8;">
                <li><strong>Fast deployment</strong> - Live in 24-48 hours, not 6 weeks</li>
                <li><strong>No huge upfront cost</strong> - $197/month vs $8,000-15,000 traditional</li>
                <li><strong>Unlimited changes</strong> - Need to update your practice areas? Just reply to this email</li>
                <li><strong>SEO optimized</strong> - Rank for local searches in Orange County</li>
                <li><strong>No technical skills needed</strong> - We handle everything</li>
            </ul>

            <div class="price">
                <div style="color: #64748b; margin-bottom: 5px;">Professional Website</div>
                <div style="font-size: 36px; font-weight: bold; color: #059669;">$197<span style="font-size: 18px; color: #64748b;">/month</span></div>
                <div style="color: #64748b; margin-top: 5px;">No contract • Cancel anytime</div>
            </div>

            <p style="text-align: center;">
                <a href="https://buy.stripe.com/eVq5kFdx937Z6B4g9D7Re00" class="cta-button">
                    Get Started Today - $197/month
                </a>
            </p>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 40px 0;">

            <div style="text-align: center; margin: 40px 0;">
                <h3 style="font-size: 22px; color: #1e40af; margin-bottom: 10px;">👉 Want to see more demos?</h3>
                <p style="font-size: 16px; color: #1e293b; line-height: 1.6; margin-bottom: 25px;">
                    This demo is just an example! We create a <strong>100% custom website</strong> based on your specific business.<br>
                    <span style="color: #059669; font-weight: 600;">✓ Unlimited revisions</span> - simply reply to this email with any changes you want<br>
                    <span style="color: #059669; font-weight: 600;">✓ Changes made within 24 hours</span>
                </p>
            </div>

            <div style="background: #fefce8; border: 2px solid #eab308; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
                <div style="font-size: 20px; font-weight: bold; color: #713f12; margin-bottom: 15px;">
                    ⭐ Want Your Own Custom Domain?
                </div>
                <div style="font-size: 16px; color: #422006; margin-bottom: 20px; line-height: 1.6;">
                    Most clients choose Standard - it's perfect for local businesses. Premium is for those who want their own custom domain (like <strong>ThompsonLawFirm.com</strong>) and unique AI-generated visuals.
                </div>

                <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 500px; margin: 20px auto;">
                    <tr>
                        <td style="background: white; border-radius: 8px; padding: 25px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                            <div style="font-size: 14px; color: #64748b; margin-bottom: 8px;">✨ Premium Plan</div>
                            <div style="font-size: 36px; font-weight: bold; color: #1e40af; margin: 10px 0;">
                                $297<span style="font-size: 18px; color: #64748b; font-weight: normal;">/month</span>
                            </div>
                            <div style="font-size: 14px; color: #64748b; margin-bottom: 20px;">AI visuals + custom domain + priority support</div>
                            <a href="${demoUrl.replace('.html', '-premium.html')}" style="display: inline-block; padding: 14px 35px; background: linear-gradient(135deg, #1e40af 0%, #0284c7 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin-bottom: 15px;">
                                View Premium Demo →
                            </a>
                            <div style="font-size: 13px; color: #64748b;">
                                or <a href="https://buy.stripe.com/dRm9AVdx99wn4sWcXr7Re01" style="color: #1e40af; text-decoration: none; font-weight: 600;">Get Started with Premium</a>
                            </div>
                        </td>
                    </tr>
                </table>

                <div style="font-size: 13px; color: #78716c; margin-top: 20px; font-style: italic;">
                    💡 Most clients start with Standard and upgrade later when they want a custom domain
                </div>
            </div>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 40px 0;">

            <p><strong>Compare the cost:</strong></p>
            <ul style="color: #64748b; line-height: 1.8;">
                <li>Traditional web design: $8,000-15,000 upfront + $150/month maintenance</li>
                <li><strong>OatCode: $197/month total</strong> (everything included, no setup fee)</li>
            </ul>

            <p><strong>Questions?</strong> Just reply to this email - I read every response personally.</p>

            <p>
                Best,<br>
                <strong>Sarah</strong><br>
                OatCode<br>
                <em>AI-Powered Website Management for Professionals</em>
            </p>

            <p style="font-size: 12px; color: #94a3b8; margin-top: 30px;">
                P.S. - First thing potential clients see when they Google your name is your website. Make sure it represents the quality of service you provide.
            </p>
        </div>

        <div class="footer">
            <p><strong>Trusted by law firms across California</strong></p>
            <p>We use AI to build professional websites instantly, so you can focus on practicing law while we handle your online presence.</p>
            <p style="margin-top: 20px;">
                <a href="${demoUrl}" style="color: #1e40af; text-decoration: none;">View Demo</a> •
                <a href="https://buy.stripe.com/eVq5kFdx937Z6B4g9D7Re00" style="color: #1e40af; text-decoration: none;">Get Started</a>
            </p>
        </div>
    </div>
</body>
</html>
      `,
      trackingSettings: {
        clickTracking: { enable: false },  // MUST be disabled to prevent SSL errors
        openTracking: { enable: true }
      },
      mailSettings: {
        sandboxMode: { enable: false }
      }
    };

    await sgMail.send(msg);

    console.log(`   ✅ Personalized email sent to ${recipientEmail}\n`);
    console.log('✅ TEST COMPLETE!\n');
    console.log('📋 Notice the personalization:');
    console.log('   • Business name used throughout');
    console.log('   • Industry-specific insights (legal services)');
    console.log('   • Location targeting (Newport Beach, Orange County)');
    console.log('   • Competitive comparison relevant to law firms');
    console.log('   • Service-specific features highlighted');
    console.log('   • Professional tone matching industry');
    console.log('');
    console.log('🎨 Demo Website:');
    console.log(`   ${demoUrl}`);
    console.log('');
    console.log('📧 Check your inbox for:');
    console.log('   Subject: "Thompson & Associates Law Firm - Your new website is ready to preview"');
    console.log('   From: Sarah from OatCode <hello@oatcode.com>');
    console.log('');
    console.log('🎯 This is how AI personalizes EVERY pitch automatically!');

  } catch (error) {
    console.error('❌ Failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.body);
    }
  }
}

sendRealBusinessPitch();
