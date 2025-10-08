/**
 * FREE DEMO REQUEST ROUTE
 * Handles form submissions from /free-demo landing page
 * Autonomously generates demos and sends via email
 */

const express = require('express');
const router = express.Router();
const db = require('../database/DatabaseService');

// Import services (they'll be initialized by autonomous-engine.js)
const getServices = () => ({
  aiWebsiteGenerator: global.aiWebsiteGenerator,
  sendGridService: global.sendGridService,
  uniquePaymentLink: global.uniquePaymentLinkService
});

/**
 * POST /api/free-demo
 * Process free demo request
 */
router.post('/', async (req, res) => {
  try {
    const { businessName, industry, city, state, email, phone } = req.body;

    // Validation
    if (!businessName || !industry || !city || !state || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: businessName, industry, city, state, email'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address'
      });
    }

    console.log(`📝 Free demo request received:`);
    console.log(`   Business: ${businessName}`);
    console.log(`   Industry: ${industry}`);
    console.log(`   Location: ${city}, ${state}`);
    console.log(`   Email: ${email}`);

    // Check for duplicate recent requests (prevent spam)
    if (!db.db) await db.connect();

    const recentRequest = await db.get(`
      SELECT * FROM leads
      WHERE email = ?
      AND datetime(createdAt) > datetime('now', '-1 hour')
    `, [email]);

    if (recentRequest) {
      console.log(`   ⚠️  Duplicate request from ${email} (within 1 hour)`);
      return res.status(429).json({
        success: false,
        error: 'Demo request already submitted. Please check your email or wait 1 hour to request another.'
      });
    }

    // Create lead in database (using autonomous_scraper schema)
    const result = await db.run(`
      INSERT INTO leads (
        name, email, phone, city, state, industry, type, address,
        source, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      businessName,
      email,
      phone || null,
      city,
      state.toUpperCase(),
      industry,
      'free_demo',
      `${city}, ${state}`,
      'free_demo_form',
      'new',
      JSON.stringify({
        requestDate: new Date().toISOString(),
        leadQuality: 'high',
        leadScore: 85,
        conversionIntent: 'high'
      })
    ]);

    const lead = await db.get('SELECT * FROM leads WHERE id = ?', [result.lastID]);
    console.log(`   ✅ Lead created (ID: ${lead.id})`);

    // Queue demo generation (async - don't wait)
    generateAndSendDemo(lead).catch(err => {
      console.error(`❌ Error generating demo for lead ${lead.id}:`, err);
    });

    // Immediate response to user
    res.json({
      success: true,
      message: 'Demo request received! Check your email in 1 hour.',
      leadId: lead.id
    });

  } catch (error) {
    console.error('❌ Free demo request error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process demo request. Please try again or contact hello@oatcode.com'
    });
  }
});

/**
 * Generate demo and send email (async workflow)
 */
async function generateAndSendDemo(lead) {
  try {
    console.log(`\n🎨 Starting demo generation for: ${lead.name}`);

    // Wait 30 minutes before generating (makes it seem more "custom")
    // In production, set to 1 hour (3600000ms)
    const delayMs = process.env.NODE_ENV === 'development' ? 60000 : 1800000; // 1min dev, 30min prod

    console.log(`   ⏰ Waiting ${delayMs/1000/60} minutes before generation...`);
    await new Promise(resolve => setTimeout(resolve, delayMs));

    const services = getServices();

    // Generate professional demo
    console.log(`   🎨 Generating professional demo...`);
    const demo = await generateDemo(lead, services);

    // Create payment link (pricing will be custom per industry)
    const demoUrl = demo.url;

    // Send email with demo
    await sendDemoEmail({
      lead,
      demo,
      demoUrl,
      services
    });

    // Update lead status
    await db.run(`
      UPDATE leads
      SET status = ?, lastContactedAt = ?
      WHERE id = ?
    `, ['demo_sent', new Date().toISOString(), lead.id]);

    console.log(`   ✅ Demo sent successfully to ${lead.email}`);

  } catch (error) {
    console.error(`❌ Demo generation failed for lead ${lead.id}:`, error);

    // Send error notification to admin
    if (global.sendGridService) {
      await global.sendGridService.send({
        to: process.env.NOTIFICATION_EMAIL,
        subject: `Demo Generation Failed: ${lead.name}`,
        text: `Failed to generate demo for ${lead.name} (${lead.email})\n\nError: ${error.message}`,
        html: `<p><strong>Failed to generate demo</strong></p>
               <p>Business: ${lead.name}<br>
               Email: ${lead.email}<br>
               Error: ${error.message}</p>`
      });
    }
  }
}

/**
 * Generate a professional demo
 */
async function generateDemo(lead, services) {
  const demoId = `${Date.now()}`;

  const websiteData = await services.aiWebsiteGenerator.generateCompleteWebsite({
    businessName: lead.name,
    industry: lead.industry,
    city: lead.city,
    state: lead.state
  });

  // Save demo to demos table (if table exists, otherwise skip)
  try {
    await db.run(`
      INSERT INTO demos (demo_id, lead_id, business_name, demo_url, file_path)
      VALUES (?, ?, ?, ?, ?)
    `, [demoId, lead.id, lead.name, `${process.env.DOMAIN || 'http://localhost:3000'}/demos/demo_${demoId}.html`, websiteData.filePath]);
  } catch (err) {
    console.log(`   ⚠️  Could not save to demos table (table may not exist):`, err.message);
  }

  return {
    demoId,
    url: `${process.env.DOMAIN || 'http://localhost:3000'}/demos/demo_${demoId}.html`
  };
}

/**
 * Send demo delivery email
 */
async function sendDemoEmail({ lead, demo, demoUrl, services }) {
  const emailId = `free_demo_${Date.now()}`;

  const subject = `${lead.name} - Your Website Demo Is Ready! 🎉`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 30px; }
    .demo-box { background: linear-gradient(135deg, #f8f9fa 0%, #fff 100%); border: 2px solid #667eea; border-radius: 12px; padding: 30px; margin: 25px 0; text-align: center; }
    .btn { display: inline-block; padding: 16px 32px; margin: 10px 5px; border-radius: 8px; text-decoration: none; font-weight: 600; text-align: center; transition: all 0.3s; }
    .btn-primary { background: #667eea; color: white; }
    .btn-secondary { background: white; color: #667eea; border: 2px solid #667eea; }
    .feature-list { list-style: none; padding: 0; margin: 20px 0; text-align: left; }
    .feature-list li { padding: 10px 0; padding-left: 30px; position: relative; }
    .feature-list li:before { content: "✓"; position: absolute; left: 0; color: #667eea; font-weight: bold; font-size: 18px; }
    .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; font-size: 14px; color: #666; }
    .info-box { background: #e7f3ff; border-left: 4px solid #667eea; padding: 20px; margin: 25px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Your Website Demo Is Ready!</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.95;">Built specifically for ${lead.name}</p>
    </div>

    <div class="content">
      <p>Hi there!</p>
      <p>Thanks for requesting a demo. We've created a <strong>professional website design</strong> tailored specifically for ${lead.name}. Check it out and let us know what you think!</p>

      <div class="demo-box">
        <h2 style="color: #667eea; font-size: 26px; margin-bottom: 20px;">Your Professional Website</h2>

        <ul class="feature-list">
          <li>Modern, professional design</li>
          <li>Mobile-responsive & lightning fast</li>
          <li>High-quality visuals</li>
          <li>SEO optimized</li>
          <li>Fully managed hosting</li>
          <li>Unlimited revisions</li>
          <li>24/7 support & monitoring</li>
          <li>SSL encryption & security</li>
        </ul>

        <div style="text-align: center; margin-top: 30px;">
          <a href="${demoUrl}" class="btn btn-primary" style="color: white; font-size: 18px;">👁️ View Your Demo</a>
        </div>
      </div>

      <div class="info-box">
        <p style="margin: 0; font-size: 16px;"><strong>💡 Love what you see?</strong></p>
        <p style="margin: 10px 0 0 0;">Reply to this email and we'll send you a custom quote based on your industry and specific needs. Every website we build is designed to help your business grow.</p>
      </div>

      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 35px 0;">

      <h3>Want to Make Changes?</h3>
      <p>Not quite what you had in mind? No problem! We offer unlimited revisions to make sure your website is perfect.</p>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${process.env.DOMAIN || 'http://localhost:3000'}/api/request-changes?demo_id=${demo.demoId}" class="btn btn-secondary" style="color: #667eea;">✏️ Request Changes</a>
      </div>

      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 35px 0;">

      <h3>Questions?</h3>
      <p>Just reply to this email! I'm Anthony, the founder, and I personally read every email. I'm here to help make your website perfect and answer any questions you have.</p>

      <p style="margin-top: 30px;">Looking forward to working with you!</p>
      <p><strong>Anthony</strong><br>
      Founder, OatCode<br>
      <a href="mailto:hello@oatcode.com" style="color: #667eea;">hello@oatcode.com</a></p>
    </div>

    <div class="footer">
      <p>OatCode - Professional Websites for Businesses</p>
      <p style="font-size: 12px; color: #999; margin-top: 10px;">
        Don't want emails? <a href="mailto:hello@oatcode.com?subject=Unsubscribe" style="color: #999;">Unsubscribe here</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
${lead.name} - Your Website Demo Is Ready!

Hi there!

Thanks for requesting a demo. We've created a professional website design tailored specifically for ${lead.name}. Check it out and let us know what you think!

YOUR PROFESSIONAL WEBSITE
✓ Modern, professional design
✓ Mobile-responsive & lightning fast
✓ High-quality visuals
✓ SEO optimized
✓ Fully managed hosting
✓ Unlimited revisions
✓ 24/7 support & monitoring
✓ SSL encryption & security

View Your Demo: ${demoUrl}

Love what you see? Reply to this email and we'll send you a custom quote based on your industry and specific needs.

Want changes? We offer unlimited revisions to make sure your website is perfect. Just reply to this email or visit:
${process.env.DOMAIN || 'http://localhost:3000'}/api/request-changes?demo_id=${demo.demoId}

Questions? Just reply to this email! I'm Anthony, the founder, and I personally read every email.

Looking forward to working with you,
Anthony
Founder, OatCode
hello@oatcode.com
  `;

  // Send email via SendGrid
  await services.sendGridService.send({
    to: lead.email,
    from: {
      email: process.env.FROM_EMAIL || 'hello@oatcode.com',
      name: 'Anthony from OatCode'
    },
    replyTo: {
      email: 'hello@oatcode.com',
      name: 'Anthony at OatCode'
    },
    subject: subject,
    text: text,
    html: html,
    trackingSettings: {
      clickTracking: { enable: true },
      openTracking: { enable: true }
    }
  });

  // Track email in database
  await db.createEmail({
    emailId: emailId,
    leadId: lead.id,
    toEmail: lead.email,
    subject: subject,
    body: text,
    emailType: 'free_demo_delivery'
  });

  console.log(`   📧 Demo email sent to ${lead.email}`);
}

module.exports = router;
