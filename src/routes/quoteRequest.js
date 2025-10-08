/**
 * QUOTE REQUEST ROUTE
 * Handles custom quote requests with industry-specific pricing
 */

const express = require('express');
const router = express.Router();
const db = require('../database/DatabaseService');

// Import services
const getServices = () => ({
  sendGridService: global.sendGridService
});

/**
 * POST /api/quote-request
 * Process custom quote request
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, business, industry, message } = req.body;

    // Validation
    if (!name || !email || !industry) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, email, industry'
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

    console.log(`📝 Quote request received:`);
    console.log(`   Name: ${name}`);
    console.log(`   Business: ${business || 'N/A'}`);
    console.log(`   Industry: ${industry}`);
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
        error: 'Quote request already submitted. Please check your email or wait 1 hour to request another.'
      });
    }

    // Create lead in database
    const result = await db.run(`
      INSERT INTO leads (
        name, email, industry, type, source, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      business || name,
      email,
      industry,
      'quote_request',
      'quote_form',
      'new',
      JSON.stringify({
        contactName: name,
        businessName: business,
        message: message,
        requestDate: new Date().toISOString(),
        leadQuality: 'high',
        leadScore: 90
      })
    ]);

    const lead = await db.get('SELECT * FROM leads WHERE id = ?', [result.lastID]);
    console.log(`   ✅ Lead created (ID: ${lead.id})`);

    // Send confirmation email to customer
    sendCustomerConfirmation({ name, email, business, industry, message }).catch(err => {
      console.error(`❌ Error sending confirmation email:`, err);
    });

    // Send notification to admin
    sendAdminNotification({ name, email, business, industry, message, leadId: lead.id }).catch(err => {
      console.error(`❌ Error sending admin notification:`, err);
    });

    // Immediate response to user
    res.json({
      success: true,
      message: 'Quote request received! We\'ll get back to you within 24 hours.',
      leadId: lead.id
    });

  } catch (error) {
    console.error('❌ Quote request error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process quote request. Please try again or contact hello@oatcode.com'
    });
  }
});

/**
 * Send confirmation email to customer
 */
async function sendCustomerConfirmation({ name, email, business, industry, message }) {
  const services = getServices();
  if (!services.sendGridService) {
    console.log('   ⚠️  SendGrid not available, skipping confirmation email');
    return;
  }

  const subject = 'We received your quote request!';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    .btn { display: inline-block; padding: 14px 28px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Thanks for your interest!</h1>
    </div>
    <div class="content">
      <p>Hi ${name},</p>

      <p>Thanks for requesting a custom quote from OatCode! We received your request and will get back to you within 24 hours with:</p>

      <ul>
        <li>Custom pricing for your industry</li>
        <li>A personalized demo showcasing what we can build</li>
        <li>Timeline and next steps</li>
      </ul>

      <p><strong>Your Request Details:</strong></p>
      <ul style="list-style: none; padding-left: 0;">
        ${business ? `<li>📍 Business: ${business}</li>` : ''}
        <li>🏢 Industry: ${industry}</li>
        ${message ? `<li>💬 Message: ${message}</li>` : ''}
      </ul>

      <p>In the meantime, if you have any questions, feel free to reply to this email or reach out to us at hello@oatcode.com</p>

      <p style="margin-top: 30px;">Looking forward to working with you!</p>

      <p><strong>Anthony</strong><br>
      Founder, OatCode<br>
      <a href="mailto:hello@oatcode.com">hello@oatcode.com</a></p>
    </div>
    <div class="footer">
      <p>OatCode - Professional Websites Tailored to Your Industry</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Hi ${name},

Thanks for requesting a custom quote from OatCode! We received your request and will get back to you within 24 hours with custom pricing for your industry and a personalized demo.

Your Request Details:
${business ? `Business: ${business}` : ''}
Industry: ${industry}
${message ? `Message: ${message}` : ''}

If you have any questions, reply to this email or contact us at hello@oatcode.com

Looking forward to working with you!

Anthony
Founder, OatCode
hello@oatcode.com
  `;

  await services.sendGridService.send({
    to: email,
    from: {
      email: process.env.FROM_EMAIL || 'hello@oatcode.com',
      name: 'Anthony from OatCode'
    },
    replyTo: 'hello@oatcode.com',
    subject: subject,
    text: text,
    html: html
  });

  console.log(`   📧 Confirmation email sent to ${email}`);
}

/**
 * Send notification to admin
 */
async function sendAdminNotification({ name, email, business, industry, message, leadId }) {
  const services = getServices();
  if (!services.sendGridService) return;

  const adminEmail = process.env.NOTIFICATION_EMAIL || 'hello@oatcode.com';

  const subject = `🎯 New Quote Request: ${business || name} (${industry})`;

  const html = `
<h2>New Quote Request Received!</h2>

<p><strong>Lead ID:</strong> ${leadId}</p>

<h3>Contact Information:</h3>
<ul>
  <li><strong>Name:</strong> ${name}</li>
  <li><strong>Email:</strong> <a href="mailto:${email}">${email}</a></li>
  ${business ? `<li><strong>Business:</strong> ${business}</li>` : ''}
  <li><strong>Industry:</strong> ${industry}</li>
</ul>

${message ? `
<h3>Message:</h3>
<p>${message}</p>
` : ''}

<p><strong>Action Required:</strong> Respond within 24 hours with custom quote and demo.</p>

<hr>
<p style="color: #666; font-size: 14px;">Sent from OatCode Automated System</p>
  `;

  const text = `
New Quote Request Received!

Lead ID: ${leadId}

Contact Information:
- Name: ${name}
- Email: ${email}
${business ? `- Business: ${business}` : ''}
- Industry: ${industry}

${message ? `Message: ${message}` : ''}

Action Required: Respond within 24 hours with custom quote and demo.
  `;

  await services.sendGridService.send({
    to: adminEmail,
    from: process.env.FROM_EMAIL || 'hello@oatcode.com',
    subject: subject,
    text: text,
    html: html
  });

  console.log(`   📧 Admin notification sent to ${adminEmail}`);
}

module.exports = router;
