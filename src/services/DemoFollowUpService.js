/**
 * DEMO FOLLOW-UP SERVICE
 *
 * Automatically sends follow-up emails to prospects after they receive a demo:
 * - Initial demo delivery email with preview
 * - Follow-up asking "Is there anything else you want on your website?"
 * - Customization request handling
 * - Updated demo delivery after customization
 *
 * Goal: Maximize conversions by making prospects feel heard and involved
 */

const OpenAI = require('openai');

class DemoFollowUpService {
  constructor(logger, sendGridService, emailLogService, demoGalleryService) {
    this.logger = logger;
    this.sendGrid = sendGridService;
    this.emailLog = emailLogService;
    this.demoGallery = demoGalleryService;
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * SEND INITIAL DEMO EMAIL
   * Includes beautiful preview and customization option
   */
  async sendInitialDemo(prospect, demoUrl, demoType = 'standard', demoId = null) {
    try {
      // Build customization URL with query parameters
      const baseUrl = `${process.env.DOMAIN || 'http://localhost:3000'}/customize-demo.html`;
      const params = new URLSearchParams();
      if (prospect.leadId) params.append('lead', prospect.leadId);
      if (demoId) params.append('demo', demoId);
      const customizationUrl = `${baseUrl}?${params.toString()}`;

      const email = await this.generateDemoEmail(prospect, demoUrl, customizationUrl, demoType);

      // Send via SendGrid
      await this.sendGrid.send({
        to: prospect.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        recipientName: prospect.businessName,
        businessName: prospect.businessName
      });

      // Log email
      await this.emailLog.logEmail({
        type: 'demo_delivery',
        to: prospect.email,
        recipientName: prospect.businessName,
        businessName: prospect.businessName,
        subject: email.subject,
        html: email.html,
        text: email.text,
        demoUrl: demoUrl,
        leadId: prospect.leadId,
        industry: prospect.industry,
        city: prospect.city,
        state: prospect.state
      });

      this.logger.info(`📧 Initial demo email sent to ${prospect.email}`);

      // NO FOLLOW-UP DELAY - Customization CTA is already in the initial email!
      // This catches prospects while they're hot and engaged immediately.
      // If needed, follow-up can be triggered manually or based on engagement tracking.

      return { success: true, demoUrl, customizationUrl };

    } catch (error) {
      this.logger.error(`Failed to send initial demo: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * GENERATE DEMO EMAIL WITH PREVIEW
   */
  async generateDemoEmail(prospect, demoUrl, customizationUrl, demoType) {
    const isPremium = demoType === 'premium';

    const subject = `🎉 ${prospect.businessName} - Your New Website is Ready!`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .content {
      padding: 40px 30px;
    }
    .demo-preview {
      background: #f9f9f9;
      border: 2px solid #667eea;
      border-radius: 8px;
      padding: 30px;
      text-align: center;
      margin: 30px 0;
    }
    .demo-preview h2 {
      margin: 0 0 15px 0;
      color: #667eea;
      font-size: 24px;
    }
    ${isPremium ? `
    .premium-badge {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      padding: 8px 20px;
      border-radius: 20px;
      display: inline-block;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 15px;
    }
    ` : ''}
    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 16px 40px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      margin: 10px;
      transition: transform 0.2s;
    }
    .button:hover {
      transform: translateY(-2px);
    }
    .button-secondary {
      background: white;
      color: #667eea;
      border: 2px solid #667eea;
    }
    .highlight-box {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .highlight-box h3 {
      margin: 0 0 10px 0;
      color: #856404;
      font-size: 18px;
    }
    .features {
      list-style: none;
      padding: 0;
    }
    .features li {
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }
    .features li:before {
      content: "✓ ";
      color: #28a745;
      font-weight: bold;
      margin-right: 10px;
    }
    .footer {
      text-align: center;
      padding: 30px;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Your Website is Ready!</h1>
      <p style="margin: 10px 0 0 0; font-size: 18px;">Take a look at what we built for ${prospect.businessName}</p>
    </div>

    <div class="content">
      <p>Hi there,</p>

      <p>We've created a professional website specifically for <strong>${prospect.businessName}</strong>. It's designed to attract more customers and showcase your ${prospect.industry} services in ${prospect.city}, ${prospect.state}.</p>

      <div class="demo-preview">
        ${isPremium ? '<div class="premium-badge">✨ PREMIUM VERSION</div>' : ''}
        <h2>Your New Website</h2>
        <p style="color: #666; margin-bottom: 25px;">Click below to see your website live!</p>

        <a href="${demoUrl}" class="button">🌐 View Your Website</a>
      </div>

      <div class="highlight-box">
        <h3>💡 Want to Make Changes? Click Below RIGHT NOW!</h3>
        <p style="margin: 0; color: #856404;">
          <strong>This is YOUR website</strong>, and we want it to be perfect for you.
          Want to add a section? Change colors? Different photos? More content?
        </p>
        <p style="margin: 10px 0 0 0; color: #856404;">
          <strong>Tell us what you want RIGHT NOW</strong> while you're looking at it, and we'll update it within 24 hours!
        </p>
        <div style="text-align: center; margin-top: 20px;">
          <a href="${customizationUrl}" class="button button-secondary" style="font-size: 18px; padding: 18px 45px;">
            ✏️ I Want to Make Changes
          </a>
        </div>
      </div>

      <h3>What's Included:</h3>
      <ul class="features">
        <li>Professional, modern design optimized for ${prospect.industry}</li>
        <li>Mobile-responsive (looks great on all devices)</li>
        <li>Contact form that delivers leads to your email</li>
        <li>SEO-optimized to rank on Google</li>
        <li>Fast loading speed (under 2 seconds)</li>
        ${isPremium ? '<li><strong>Premium:</strong> AI-generated custom images</li>' : ''}
        ${isPremium ? '<li><strong>Premium:</strong> Professional brand visuals</li>' : ''}
        <li>Free updates and support for 30 days</li>
      </ul>

      <p style="margin-top: 30px;">
        <strong>Next Steps:</strong>
      </p>
      <ol>
        <li>Click "View Your Website" above to see it live</li>
        <li>If you want changes, click "Customize Your Website"</li>
        <li>We'll update it within 24 hours based on your feedback</li>
        <li>Once you're happy, we'll get you online for just $197/month</li>
      </ol>

      <p style="margin-top: 30px; color: #666;">
        Have questions? Just reply to this email and I'll personally help you out.
      </p>

      <p style="margin-top: 30px;">
        Best regards,<br>
        <strong>Anthony</strong><br>
        OatCode - Website Solutions
      </p>
    </div>

    <div class="footer">
      <p>This website was custom-built for ${prospect.businessName}</p>
      <p style="margin: 5px 0;">
        <a href="${demoUrl}" style="color: #667eea;">View Website</a> |
        <a href="${customizationUrl}" style="color: #667eea;">Request Changes</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const text = `
🎉 Your Website is Ready!

Hi ${prospect.businessName},

We've created a professional website specifically for your ${prospect.industry} business in ${prospect.city}, ${prospect.state}.

VIEW YOUR WEBSITE:
${demoUrl}

WANT TO MAKE CHANGES? CLICK RIGHT NOW!
This is YOUR website! Want to add sections? Change colors? Different photos?
Tell us what you want RIGHT NOW while you're looking at it - we'll update it within 24 hours!
${customizationUrl}

What's Included:
✓ Professional, modern design
✓ Mobile-responsive
✓ Contact form
✓ SEO-optimized
✓ Fast loading
${isPremium ? '✓ Premium: AI-generated custom images' : ''}
✓ Free updates and support for 30 days

Next Steps:
1. View your website
2. Request any changes you want
3. We'll update it within 24 hours
4. Go live for just $197/month

Questions? Just reply to this email.

Best regards,
Anthony
OatCode - Website Solutions
    `.trim();

    return { subject, html, text };
  }

  /**
   * SCHEDULE FOLLOW-UP EMAIL
   * Sent 24 hours after demo delivery asking for feedback
   */
  async scheduleFollowUp(prospect, demoUrl, demoId = null) {
    // Store follow-up task
    const fs = require('fs').promises;
    const path = require('path');

    const followUpPath = path.join(process.cwd(), 'data', 'follow-ups');
    await fs.mkdir(followUpPath, { recursive: true });

    const followUp = {
      id: `followup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      prospect,
      demoUrl,
      demoId,
      scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      sent: false,
      type: 'demo_feedback'
    };

    const filePath = path.join(followUpPath, `${followUp.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(followUp, null, 2));

    this.logger.info(`📅 Follow-up scheduled for ${prospect.email} in 24 hours`);
  }

  /**
   * SEND FOLLOW-UP EMAIL
   * "Is there anything else you want on your website?"
   */
  async sendFollowUpEmail(prospect, demoUrl, demoId = null) {
    try {
      // Build customization URL with query parameters
      const baseUrl = `${process.env.DOMAIN || 'http://localhost:3000'}/customize-demo.html`;
      const params = new URLSearchParams();
      if (prospect.leadId) params.append('lead', prospect.leadId);
      if (demoId) params.append('demo', demoId);
      const customizationUrl = `${baseUrl}?${params.toString()}`;

      const subject = `Quick question about your ${prospect.businessName} website...`;

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white !important;
      padding: 14px 30px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <p>Hi there,</p>

  <p>I wanted to follow up on the website we created for <strong>${prospect.businessName}</strong>.</p>

  <p><strong>Have you had a chance to check it out yet?</strong></p>

  <p><a href="${demoUrl}" class="button">🌐 View Your Website</a></p>

  <p>More importantly: <strong>Is there anything else you'd like on your website?</strong></p>

  <p>Seriously, this is YOUR website, and I want it to be perfect for you. Whether it's:</p>

  <ul>
    <li>Adding a specific section (testimonials, gallery, pricing, etc.)</li>
    <li>Changing colors or images</li>
    <li>Different wording or messaging</li>
    <li>Additional pages or features</li>
    <li>Anything else you have in mind</li>
  </ul>

  <p><strong>Just click below and tell me what you want:</strong></p>

  <p><a href="${customizationUrl}" class="button">✏️ I Want to Add/Change Something</a></p>

  <p>I'll update it within 24 hours and send you the new version.</p>

  <p>No pressure at all - just want to make sure you're 100% happy with it before we go live!</p>

  <p>Best,<br>Anthony</p>

  <p style="color: #666; font-size: 14px; margin-top: 40px;">
    P.S. - If the website looks good as-is and you're ready to go live,
    just reply "looks good!" and I'll get you set up immediately.
  </p>
</body>
</html>
      `;

      const text = `
Hi there,

I wanted to follow up on the website we created for ${prospect.businessName}.

Have you had a chance to check it out yet?
${demoUrl}

More importantly: Is there anything else you'd like on your website?

This is YOUR website, and I want it to be perfect for you. Whether it's adding sections, changing colors, different wording, or anything else - just let me know!

Request changes here:
${customizationUrl}

I'll update it within 24 hours.

Best,
Anthony

P.S. - If it looks good as-is and you're ready to go live, just reply "looks good!"
      `.trim();

      // Send email
      await this.sendGrid.send({
        to: prospect.email,
        subject: subject,
        html: html,
        text: text,
        recipientName: prospect.businessName,
        businessName: prospect.businessName
      });

      // Log email
      await this.emailLog.logEmail({
        type: 'demo_followup',
        to: prospect.email,
        recipientName: prospect.businessName,
        businessName: prospect.businessName,
        subject: subject,
        html: html,
        text: text,
        demoUrl: demoUrl,
        leadId: prospect.leadId,
        industry: prospect.industry,
        city: prospect.city,
        state: prospect.state
      });

      this.logger.info(`📧 Follow-up email sent to ${prospect.email}`);
      return { success: true };

    } catch (error) {
      this.logger.error(`Failed to send follow-up: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * PROCESS PENDING FOLLOW-UPS
   * Check for scheduled follow-ups and send them
   */
  async processPendingFollowUps() {
    try {
      const fs = require('fs').promises;
      const path = require('path');

      const followUpPath = path.join(process.cwd(), 'data', 'follow-ups');

      try {
        await fs.access(followUpPath);
      } catch {
        return { sent: 0 };
      }

      const files = await fs.readdir(followUpPath);
      const now = new Date();
      let sent = 0;

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(followUpPath, file);
        const data = await fs.readFile(filePath, 'utf8');
        const followUp = JSON.parse(data);

        if (followUp.sent) continue;

        const scheduledDate = new Date(followUp.scheduledFor);
        if (now >= scheduledDate) {
          await this.sendFollowUpEmail(
            followUp.prospect,
            followUp.demoUrl,
            followUp.demoId || null
          );

          followUp.sent = true;
          followUp.sentAt = now.toISOString();
          await fs.writeFile(filePath, JSON.stringify(followUp, null, 2));

          sent++;
        }
      }

      if (sent > 0) {
        this.logger.info(`📧 Sent ${sent} follow-up email(s)`);
      }

      return { sent };

    } catch (error) {
      this.logger.error(`Failed to process follow-ups: ${error.message}`);
      return { sent: 0 };
    }
  }

  /**
   * SEND CUSTOMIZATION CONFIRMATION
   * After prospect requests changes
   */
  async sendCustomizationConfirmation(prospect, customizationRequest) {
    const subject = `Got it! Updating your ${prospect.businessName} website now...`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .highlight {
      background: #f0f7ff;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <p>Hi there,</p>

  <p>Perfect! I received your customization request for ${prospect.businessName}'s website.</p>

  <div class="highlight">
    <h3 style="margin-top: 0;">What you asked for:</h3>
    <p>${customizationRequest.changes || customizationRequest.notes || 'Custom modifications'}</p>
  </div>

  <p><strong>I'm on it!</strong></p>

  <p>I'll update your website with these changes and send you the new version within 24 hours.</p>

  <p>If you think of anything else you want changed, just reply to this email.</p>

  <p>Talk soon!<br>Anthony</p>
</body>
</html>
    `;

    const text = `
Hi there,

Perfect! I received your customization request for ${prospect.businessName}'s website.

What you asked for:
${customizationRequest.changes || customizationRequest.notes || 'Custom modifications'}

I'm on it! I'll update your website with these changes and send you the new version within 24 hours.

Talk soon!
Anthony
    `.trim();

    await this.sendGrid.send({
      to: prospect.email,
      subject: subject,
      html: html,
      text: text,
      recipientName: prospect.businessName,
      businessName: prospect.businessName
    });

    await this.emailLog.logEmail({
      type: 'customization_confirmation',
      to: prospect.email,
      recipientName: prospect.businessName,
      businessName: prospect.businessName,
      subject: subject,
      html: html,
      text: text,
      leadId: prospect.leadId
    });
  }
}

module.exports = DemoFollowUpService;
