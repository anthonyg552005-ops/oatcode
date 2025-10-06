/**
 * ADMIN APPROVAL SYSTEM
 *
 * Simple one-click approval for AI-generated websites
 * - Review website
 * - Click approve
 * - Customer gets "Updated Website Ready" email instantly
 *
 * This ensures quality control while keeping process fast!
 */

const express = require('express');
const router = express.Router();
const db = require('../database/DatabaseService');
const sgMail = require('@sendgrid/mail');
const WebsiteUpdateService = require('../services/WebsiteUpdateService');
const fs = require('fs').promises;
const path = require('path');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const updateService = new WebsiteUpdateService(console);

/**
 * REVIEW PAGE - Approve OR Request Changes
 * GET /admin/review?id=123&request_id=456
 */
router.get('/review', async (req, res) => {
  try {
    const { id, request_id } = req.query;

    if (!id) {
      return res.status(400).send('Missing customer ID');
    }

    // Initialize database
    if (!db.db) await db.connect();

    // Get customer data
    const customer = await db.get('SELECT * FROM customers WHERE id = ?', [id]);
    if (!customer) {
      return res.status(404).send('Customer not found');
    }

    // Get the pending request (use request_id if provided, otherwise get latest)
    const request = request_id
      ? await db.get('SELECT * FROM customization_requests WHERE id = ?', [request_id])
      : await db.get(
          `SELECT * FROM customization_requests
           WHERE customer_id = ? AND status = 'pending_approval'
           ORDER BY created_at DESC LIMIT 1`,
          [id]
        );

    if (!request) {
      return res.status(404).send('No pending approval request found');
    }

    // Get website HTML from the version linked to this request
    let websiteHTML;
    if (request.version_id) {
      const version = await db.get(
        'SELECT html_content FROM website_versions WHERE id = ?',
        [request.version_id]
      );
      websiteHTML = version?.html_content;
    }

    // Fallback to file if no version found
    if (!websiteHTML) {
      const filePath = path.join(__dirname, '../../public/demos', `${customer.id}.html`);
      try {
        websiteHTML = await fs.readFile(filePath, 'utf-8');
      } catch (err) {
        websiteHTML = '<html><body><h1>Website not found</h1></body></html>';
      }
    }

    // Check if paid customer by looking at stripe_subscription_id
    const isPaidCustomer = customer.stripe_subscription_id || customer.monthly_price > 0;
    const updatedUrl = `${process.env.DOMAIN || 'http://localhost:3000'}/demos/${customer.id}.html`;
    const approveUrl = `/admin/approve?id=${id}&request_id=${request.id}`;

    // Show review page with both options
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Review Website - ${customer.business_name || customer.email}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f8fafc;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .content {
            padding: 30px;
        }
        .info-box {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .website-frame {
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            margin: 20px 0;
            height: 500px;
            overflow: hidden;
        }
        iframe {
            width: 100%;
            height: 100%;
            border: none;
        }
        .btn {
            display: inline-block;
            padding: 15px 30px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: bold;
            margin: 10px;
            cursor: pointer;
            border: none;
            font-size: 16px;
        }
        .btn-approve {
            background: #10b981;
            color: white;
        }
        .btn-view {
            background: #667eea;
            color: white;
        }
        textarea {
            width: 100%;
            min-height: 120px;
            padding: 12px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-family: inherit;
            font-size: 14px;
            resize: vertical;
        }
        .form-section {
            background: #fffbeb;
            border: 2px solid #fbbf24;
            border-radius: 8px;
            padding: 25px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0 0 10px 0;">🔍 Review Website</h1>
            <p style="margin: 0; opacity: 0.9;">${customer.business_name || customer.email}</p>
        </div>

        <div class="content">
            <div class="info-box">
                <p><strong>Customer:</strong> ${customer.email}</p>
                <p><strong>Type:</strong> ${isPaidCustomer ? '💰 Paid Customer' : '🎯 Pre-Purchase Demo'}</p>
                <p><strong>Changes Requested:</strong></p>
                <p style="background: white; padding: 10px; border-radius: 4px; white-space: pre-wrap;">${request.request_text}</p>
            </div>

            <div class="website-frame">
                <iframe srcdoc="${websiteHTML.replace(/"/g, '&quot;')}"></iframe>
            </div>

            <div style="text-align: center; margin: 20px 0;">
                <a href="${updatedUrl}" target="_blank" class="btn btn-view">
                    🌐 Open in New Tab
                </a>
            </div>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

            <h3 style="color: #1e293b; margin-bottom: 10px;">✅ Option 1: Approve & Send to Customer</h3>
            <p style="color: #64748b; margin-bottom: 15px;">Website looks perfect? Click below to send it to the customer immediately.</p>
            <div style="text-align: center;">
                <a href="${approveUrl}" class="btn btn-approve">
                    ✅ Approve & Send to Customer
                </a>
            </div>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

            <div class="form-section">
                <h3 style="color: #92400e; margin: 0 0 10px 0;">✏️ Option 2: Request Changes from AI Generator</h3>
                <p style="color: #78350f; margin-bottom: 15px;">Need adjustments? Tell the AI what to change and it'll regenerate the website for you to review again.</p>

                <form method="POST" action="/admin/regenerate">
                    <input type="hidden" name="customer_id" value="${id}">
                    <input type="hidden" name="request_id" value="${request.id}">

                    <label style="font-weight: 600; color: #1e293b; display: block; margin-bottom: 8px;">
                        What changes do you want the AI to make?
                    </label>

                    <textarea name="changes" placeholder="Examples:&#10;• Add a team photo in the About section&#10;• Change primary color from purple to blue&#10;• Make the headline font bigger&#10;• Add a testimonials section&#10;• Replace hero image with something more professional&#10;• Update contact form to include phone field"></textarea>

                    <button type="submit" class="btn" style="background: #fbbf24; color: #1e293b; width: 100%; margin: 15px 0 0 0;">
                        🔄 Regenerate with My Changes
                    </button>
                </form>

                <p style="color: #92400e; font-size: 13px; margin: 10px 0 0 0;">
                    ⏱ The AI will apply your feedback and regenerate. You'll get another review email when ready (usually 1-2 minutes).
                </p>
            </div>
        </div>
    </div>
</body>
</html>
    `);

  } catch (error) {
    console.error('❌ Review page error:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

/**
 * APPROVE & SEND WEBSITE TO CUSTOMER
 * GET /admin/approve?id=123&request_id=456
 */
router.get('/approve', async (req, res) => {
  try {
    const { id, request_id } = req.query;

    if (!id) {
      return res.status(400).send('Missing customer ID');
    }

    console.log(`👍 Approving website for customer ${id}...`);

    // Initialize database
    if (!db.db) await db.connect();

    // Get customer data
    const customer = await db.get('SELECT * FROM customers WHERE id = ?', [id]);
    if (!customer) {
      return res.status(404).send('Customer not found');
    }

    // Get the pending request
    const request = await db.get(
      `SELECT * FROM customization_requests
       WHERE customer_id = ? AND status = 'pending_approval'
       ORDER BY created_at DESC LIMIT 1`,
      [id]
    );

    if (!request) {
      return res.status(404).send('No pending approval request found for this customer');
    }

    // Determine if paid customer
    // Check if paid customer by looking at stripe_subscription_id
    const isPaidCustomer = customer.stripe_subscription_id || customer.monthly_price > 0;
    const isInitialPurchase = request.request_type === 'initial_purchase';

    // Get website URL
    const websiteUrl = customer.website_url || `${process.env.DOMAIN || 'http://localhost:3000'}/demos/${customer.id}.html`;

    // For initial purchase of paid customers, send welcome email
    // For demo changes or post-purchase changes, send updated website email
    if (isPaidCustomer && isInitialPurchase) {
      console.log(`   💰 Paid customer - sending welcome email...`);

      // Send welcome email with website link (same email as Stripe would send)
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      const msg = {
        to: customer.email,
        from: {
          email: 'hello@oatcode.com',
          name: 'Anthony from OatCode'
        },
        subject: `🎉 Welcome to OatCode - Your Website is Ready!`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; border-radius: 12px; text-align: center; margin-bottom: 30px; }
        .cta-button { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 Welcome to OatCode!</h1>
        <p>Your ${customer.tier === 'premium' ? 'Premium' : 'Standard'} website is ready</p>
    </div>
    <h2>Hi ${customer.business_name}!</h2>
    <p>Thank you for choosing OatCode! Your professional website has been reviewed and is now ready.</p>
    <p style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px;">
        <strong>📝 Important:</strong> We used AI to build this website for you. If any details need adjustment, use the buttons below - we'll update everything within 24-48 hours!
    </p>
    <div style="text-align: center; margin: 30px 0;">
        <a href="${websiteUrl}" class="cta-button">🌐 View Your Website</a><br>
        <a href="${process.env.DOMAIN || 'https://oatcode.com'}/request-changes.html?id=${customer.id}&website=${encodeURIComponent(websiteUrl)}&email=${encodeURIComponent(customer.email)}" class="cta-button" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">✏️ Request Changes</a><br>
        <a href="mailto:hello@oatcode.com?subject=Question about my website&body=Hi Anthony,%0D%0A%0D%0AI have a question about my website:%0D%0A%0D%0A" class="cta-button" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">💬 Contact Anthony</a>
    </div>
    <div style="background: #f0fdf4; border: 2px solid #10b981; border-radius: 12px; padding: 20px; margin: 30px 0;">
        <h3 style="margin-top: 0; color: #059669;">✅ Unlimited FREE Revisions</h3>
        <p style="margin-bottom: 0;">Click "Request Changes" anytime - we'll update your website within 24-48 hours!</p>
    </div>
    <p>Best,<br><strong>Anthony</strong><br>OatCode</p>
</body>
</html>
        `,
        trackingSettings: { clickTracking: { enable: false }, openTracking: { enable: true } }
      };

      await sgMail.send(msg);
    } else {
      console.log(`   📧 Sending updated website email...`);

      // Send "Updated Website Ready" email for demos or post-purchase changes
      await updateService.sendUpdatedWebsiteEmail({
        customerId: customer.id,
        customerEmail: customer.email,
        businessName: customer.business_name || 'Your Business',
        changes: request.request_text,
        updatedUrl: websiteUrl,
        isPaidCustomer
      });
    }

    // Mark request as approved/completed
    await db.run(
      `UPDATE customization_requests
       SET status = 'approved', approved_at = datetime('now')
       WHERE id = ?`,
      [request.id]
    );

    console.log(`✅ Approved and sent to ${customer.email}`);

    // Show success page
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Approved! ✅</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
            background: white;
            padding: 60px 40px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 500px;
        }
        .icon {
            font-size: 80px;
            margin-bottom: 20px;
        }
        h1 {
            color: #10b981;
            margin: 0 0 10px 0;
            font-size: 32px;
        }
        p {
            color: #64748b;
            line-height: 1.6;
            margin: 20px 0;
        }
        .customer-info {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: left;
        }
        .customer-info strong {
            color: #1e293b;
        }
        a {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 8px;
            margin-top: 20px;
            font-weight: bold;
        }
        a:hover {
            opacity: 0.9;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">✅</div>
        <h1>Approved & Sent!</h1>
        <p>The website has been delivered to the customer.</p>

        <div class="customer-info">
            <p><strong>Customer:</strong> ${customer.email}</p>
            <p><strong>Business:</strong> ${customer.business_name || 'N/A'}</p>
            <p style="margin: 0;"><strong>Status:</strong> ${isPaidCustomer ? '💰 Paid Customer' : '🎯 Pre-Purchase Demo'}</p>
        </div>

        <p style="color: #059669; font-weight: 600;">
            Email sent: "✅ Your Updated ${isPaidCustomer ? 'Website' : 'Demo'} is Ready!"
        </p>

        <a href="${websiteUrl}" target="_blank">View Website</a>
        <br>
        <a href="/admin/pending" style="background: #64748b;">View Pending Approvals</a>
    </div>
</body>
</html>
    `);

  } catch (error) {
    console.error('❌ Approval error:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

/**
 * VIEW ALL PENDING APPROVALS
 * GET /admin/pending
 */
router.get('/pending', async (req, res) => {
  try {
    if (!db.db) await db.connect();

    // Get customization requests (revisions/changes)
    const customizations = await db.all(
      `SELECT cr.*, c.email, c.business_name, c.stripe_subscription_id, c.monthly_price
       FROM customization_requests cr
       JOIN customers c ON cr.customer_id = c.id
       WHERE cr.status = 'pending_approval' AND (cr.request_type IS NULL OR cr.request_type != 'initial_purchase')
       ORDER BY cr.created_at ASC`
    );

    // Get new purchases (initial purchases from paid customers)
    const purchases = await db.all(
      `SELECT cr.*, c.email, c.business_name, c.stripe_subscription_id, c.monthly_price
       FROM customization_requests cr
       JOIN customers c ON cr.customer_id = c.id
       WHERE cr.status = 'pending_approval' AND cr.request_type = 'initial_purchase'
       ORDER BY cr.created_at ASC`
    );

    const renderRows = (items) => items.map(p => {
      const isPaid = p.stripe_subscription_id || p.monthly_price > 0;
      const reviewUrl = `/admin/review?id=${p.customer_id}&request_id=${p.id}`;

      return `
        <tr>
          <td style="padding: 15px; border-bottom: 1px solid #e2e8f0;">
            <strong>${p.business_name || 'Unknown'}</strong><br>
            <span style="color: #64748b; font-size: 14px;">${p.email}</span>
          </td>
          <td style="padding: 15px; border-bottom: 1px solid #e2e8f0;">
            <span style="background: ${isPaid ? '#10b981' : '#fbbf24'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
              ${isPaid ? 'PAID' : 'DEMO'}
            </span>
          </td>
          <td style="padding: 15px; border-bottom: 1px solid #e2e8f0; max-width: 300px;">
            <div style="max-height: 60px; overflow: hidden; font-size: 14px; color: #475569;">
              ${p.request_text}
            </div>
          </td>
          <td style="padding: 15px; border-bottom: 1px solid #e2e8f0; text-align: center;">
            <a href="${reviewUrl}"
               style="display: inline-block; background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-size: 14px; margin: 2px; font-weight: 600;">
              🔍 Review
            </a>
          </td>
        </tr>
      `;
    }).join('');

    const customizationRows = renderRows(customizations);
    const purchaseRows = renderRows(purchases);

    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Admin Dashboard</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f8fafc;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
        }
        .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            overflow-x: auto;
        }
        .tab {
            padding: 15px 25px;
            background: white;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            color: #64748b;
            transition: all 0.3s;
            white-space: nowrap;
            flex-shrink: 0;
        }
        .tab.active {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
        .count {
            background: rgba(255,255,255,0.3);
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 14px;
            margin-left: 8px;
        }
        .tab.active .count {
            background: rgba(255,255,255,0.2);
        }
        table {
            width: 100%;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        th {
            background: #1e293b;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
        }
        .empty {
            text-align: center;
            padding: 60px 20px;
            color: #64748b;
            background: white;
            border-radius: 12px;
        }
        .empty-icon {
            font-size: 60px;
            margin-bottom: 20px;
        }
        @media (max-width: 768px) {
            body { padding: 10px; }
            .header h1 { font-size: 22px; }
            .tab { padding: 12px 20px; font-size: 14px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>👍 Admin Dashboard</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Review and approve AI-generated websites</p>
    </div>

    <div class="tabs">
        <div class="tab active" onclick="showTab('customizations')">
            ✏️ Customizations
            <span class="count">${customizations.length}</span>
        </div>
        <div class="tab" onclick="showTab('purchases')">
            💰 New Purchases
            <span class="count">${purchases.length}</span>
        </div>
    </div>

    <div id="customizations" class="tab-content active">
        ${customizations.length === 0 ? `
          <div class="empty">
            <div class="empty-icon">✅</div>
            <h2 style="color: #1e293b;">All Caught Up!</h2>
            <p>No customization requests pending approval.</p>
          </div>
        ` : `
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Type</th>
                <th>Changes Requested</th>
                <th style="text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${customizationRows}
            </tbody>
          </table>
        `}
    </div>

    <div id="purchases" class="tab-content">
        ${purchases.length === 0 ? `
          <div class="empty">
            <div class="empty-icon">✅</div>
            <h2 style="color: #1e293b;">All Caught Up!</h2>
            <p>No new purchases pending approval.</p>
          </div>
        ` : `
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Type</th>
                <th>Details</th>
                <th style="text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${purchaseRows}
            </tbody>
          </table>
        `}
    </div>

    <script>
        function showTab(tabName) {
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            // Remove active class from all tabs
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            // Show selected tab content
            document.getElementById(tabName).classList.add('active');
            // Add active class to selected tab
            event.target.classList.add('active');
        }
    </script>
</body>
</html>
    `);

  } catch (error) {
    console.error('❌ Error fetching pending approvals:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

/**
 * REGENERATE WEBSITE WITH ADMIN FEEDBACK
 * POST /admin/regenerate
 */
router.post('/regenerate', async (req, res) => {
  try {
    const { customer_id, request_id, changes } = req.body;

    if (!customer_id || !changes) {
      return res.status(400).send('Missing required fields');
    }

    console.log(`🔄 Admin requested regeneration for customer ${customer_id}`);
    console.log(`   Changes: ${changes}`);

    if (!db.db) await db.connect();

    const customer = await db.get('SELECT * FROM customers WHERE id = ?', [customer_id]);
    if (!customer) {
      return res.status(404).send('Customer not found');
    }

    // Update the request status back to "processing" with admin feedback
    await db.run(
      `UPDATE customization_requests
       SET status = 'processing', request_text = ?, approved_at = NULL
       WHERE customer_id = ? AND status = 'pending_approval'`,
      [`${changes} (Admin feedback)`, customer_id]
    );

    // Trigger regeneration (same as customer request changes flow)
    const changeRequest = {
      type: 'admin_revision',
      description: changes
    };

    // Check if paid customer by looking at stripe_subscription_id
    const isPaidCustomer = customer.stripe_subscription_id || customer.monthly_price > 0;

    // Show immediate response
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Regenerating... 🔄</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        }
        .container {
            background: white;
            padding: 60px 40px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 500px;
        }
        .spinner {
            font-size: 60px;
            animation: spin 2s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        h1 {
            color: #f59e0b;
            margin: 20px 0 10px 0;
        }
        p {
            color: #64748b;
            line-height: 1.6;
        }
        .changes {
            background: #fffbeb;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: left;
            color: #92400e;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner">🔄</div>
        <h1>AI is Regenerating...</h1>
        <p>Processing your changes now. This usually takes 1-2 minutes.</p>

        <div class="changes">
            <strong>Your Requested Changes:</strong>
            <p style="margin: 10px 0 0 0; white-space: pre-wrap;">${changes}</p>
        </div>

        <p style="font-weight: 600; color: #1e293b;">
            You'll receive a new review email when it's ready!
        </p>

        <p style="font-size: 14px; color: #64748b;">
            You can close this tab now.
        </p>
    </div>
</body>
</html>
    `);

    // Process regeneration asynchronously
    setImmediate(async () => {
      try {
        console.log('🤖 Starting admin-requested regeneration...');

        const updateResult = await updateService.makeUpdate({
          id: customer.id,
          businessName: customer.business_name || 'Your Business',
          email: customer.email
        }, changeRequest);

        if (updateResult.success) {
          const updatedUrl = `${process.env.DOMAIN || 'http://localhost:3000'}/demos/${customer.id}.html`;

          // Mark as pending approval again
          await db.run(
            `UPDATE customization_requests
             SET status = 'pending_approval', completed_at = datetime('now')
             WHERE customer_id = ? AND status = 'processing'`,
            [customer.id]
          );

          // Send review email to admin again
          await sgMail.send({
            to: process.env.NOTIFICATION_EMAIL || 'anthonyg552005@gmail.com',
            from: { email: 'hello@oatcode.com', name: 'Anthony from OatCode' },
            subject: `👍 Re-Review: ${customer.business_name || customer.email} (Regenerated)`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1e293b;">🔄 Website Regenerated - Ready for Review</h2>

                <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <strong style="color: #059669;">✅ Your Changes Applied!</strong>
                  <p style="margin: 10px 0 0 0;">${changes}</p>
                </div>

                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Customer:</strong> ${customer.email}</p>
                  <p><strong>Business:</strong> ${customer.business_name || 'N/A'}</p>
                  <p><strong>Type:</strong> ${isPaidCustomer ? 'Paid Customer' : 'Pre-Purchase Demo'}</p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.DOMAIN || 'http://localhost:3000'}/admin/review?id=${customer.id}&request_id=${request_id}"
                     style="display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    🔍 Review Regenerated Website
                  </a>
                </div>
              </div>
            `,
            text: `Website Regenerated - Ready for Review

Your Changes: ${changes}

Customer: ${customer.email}
Business: ${customer.business_name || 'N/A'}

Review: ${process.env.DOMAIN || 'http://localhost:3000'}/admin/review?id=${customer.id}`
          });

          console.log('✅ Regeneration complete! Admin notified for re-review.');
        } else {
          console.error('❌ Regeneration failed:', updateResult.error);

          // Notify admin of failure
          await sgMail.send({
            to: process.env.NOTIFICATION_EMAIL || 'anthonyg552005@gmail.com',
            from: { email: 'hello@oatcode.com', name: 'Anthony from OatCode' },
            subject: `❌ Regeneration Failed - ${customer.email}`,
            text: `Failed to regenerate website\n\nError: ${updateResult.error}\n\nChanges: ${changes}`
          });
        }
      } catch (error) {
        console.error('❌ Regeneration error:', error);

        await sgMail.send({
          to: process.env.NOTIFICATION_EMAIL || 'anthonyg552005@gmail.com',
          from: { email: 'hello@oatcode.com', name: 'Anthony from OatCode' },
          subject: `❌ Regeneration Error`,
          text: `Error: ${error.message}\n\nChanges: ${changes}`
        });
      }
    });

  } catch (error) {
    console.error('❌ Regenerate error:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

/**
 * VIEW ALL CUSTOMER WEBSITES
 * GET /admin/websites
 */
router.get('/websites', async (req, res) => {
  try {
    if (!db.db) await db.connect();

    const customers = await db.all(
      `SELECT c.id, c.email, c.business_name, c.stripe_subscription_id, c.monthly_price,
              COUNT(wv.id) as version_count,
              MAX(wv.created_at) as last_updated
       FROM customers c
       LEFT JOIN website_versions wv ON c.id = wv.customer_id
       GROUP BY c.id
       ORDER BY last_updated DESC`
    );

    const rows = customers.map(c => {
      const isPaid = c.stripe_subscription_id || c.monthly_price > 0;
      const websiteUrl = `/demos/${c.id}.html`;
      const versionsUrl = `/admin/websites/${c.id}/versions`;

      return `
        <tr>
          <td style="padding: 15px; border-bottom: 1px solid #e2e8f0;">
            <strong>${c.business_name || 'Unknown'}</strong><br>
            <span style="color: #64748b; font-size: 14px;">${c.email}</span>
          </td>
          <td style="padding: 15px; border-bottom: 1px solid #e2e8f0; text-align: center;">
            <span style="background: ${isPaid ? '#10b981' : '#fbbf24'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
              ${isPaid ? 'PAID' : 'DEMO'}
            </span>
          </td>
          <td style="padding: 15px; border-bottom: 1px solid #e2e8f0; text-align: center;">
            ${c.version_count}
          </td>
          <td style="padding: 15px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #64748b;">
            ${c.last_updated ? new Date(c.last_updated).toLocaleString() : 'Never'}
          </td>
          <td style="padding: 15px; border-bottom: 1px solid #e2e8f0; text-align: center;">
            <a href="${websiteUrl}" target="_blank"
               style="display: inline-block; background: #3b82f6; color: white; padding: 8px 15px; text-decoration: none; border-radius: 6px; font-size: 13px; margin: 2px;">
              🌐 View
            </a>
            <a href="${versionsUrl}"
               style="display: inline-block; background: #6366f1; color: white; padding: 8px 15px; text-decoration: none; border-radius: 6px; font-size: 13px; margin: 2px;">
              📜 History
            </a>
          </td>
        </tr>
      `;
    }).join('');

    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>All Websites</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f8fafc;
        }
        .header {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            text-align: center;
        }
        table {
            width: 100%;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        th {
            background: #1e293b;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
        }
        @media (max-width: 768px) {
            body { padding: 10px; }
            table { font-size: 13px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🌐 All Customer Websites</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">View and manage all customer and prospect websites</p>
    </div>

    ${customers.length === 0 ? `
      <div style="text-align: center; padding: 60px; background: white; border-radius: 12px;">
        <div style="font-size: 60px; margin-bottom: 20px;">📭</div>
        <h2>No Websites Yet</h2>
        <p style="color: #64748b;">Websites will appear here once customers request demos or make purchases.</p>
      </div>
    ` : `
      <table>
        <thead>
          <tr>
            <th>Customer</th>
            <th style="text-align: center;">Type</th>
            <th style="text-align: center;">Versions</th>
            <th>Last Updated</th>
            <th style="text-align: center;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `}

    <div style="text-align: center; margin-top: 30px;">
        <a href="/admin/pending" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
            ← Back to Approvals
        </a>
    </div>
</body>
</html>
    `);

  } catch (error) {
    console.error('Error fetching websites:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

/**
 * VIEW WEBSITE VERSION HISTORY
 * GET /admin/websites/:customerId/versions
 */
router.get('/websites/:customerId/versions', async (req, res) => {
  try {
    const { customerId } = req.params;
    if (!db.db) await db.connect();

    const customer = await db.get('SELECT * FROM customers WHERE id = ?', [customerId]);
    if (!customer) {
      return res.status(404).send('Customer not found');
    }

    const versions = await updateService.getCustomerVersions(customerId);

    const rows = versions.map(v => `
      <tr>
        <td style="padding: 15px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #3b82f6;">
          v${v.version_number}
        </td>
        <td style="padding: 15px; border-bottom: 1px solid #e2e8f0;">
          ${v.change_description || 'Initial version'}
        </td>
        <td style="padding: 15px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
          ${new Date(v.created_at).toLocaleString()}
        </td>
        <td style="padding: 15px; border-bottom: 1px solid #e2e8f0; text-align: center;">
          ${v.is_current ? '<span style="background: #10b981; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">CURRENT</span>' : ''}
        </td>
        <td style="padding: 15px; border-bottom: 1px solid #e2e8f0; text-align: center;">
          <a href="/admin/websites/version/${v.id}" target="_blank"
             style="display: inline-block; background: #3b82f6; color: white; padding: 8px 15px; text-decoration: none; border-radius: 6px; font-size: 13px;">
            👁 Preview
          </a>
        </td>
      </tr>
    `).join('');

    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Version History - ${customer.business_name || customer.email}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f8fafc;
        }
        .header {
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
        }
        table {
            width: 100%;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        th {
            background: #1e293b;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📜 Version History</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">${customer.business_name || customer.email}</p>
    </div>

    ${versions.length === 0 ? `
      <div style="text-align: center; padding: 60px; background: white; border-radius: 12px;">
        <div style="font-size: 60px; margin-bottom: 20px;">📭</div>
        <h2>No Versions Yet</h2>
        <p style="color: #64748b;">Website versions will appear here once changes are made.</p>
      </div>
    ` : `
      <table>
        <thead>
          <tr>
            <th style="text-align: center;">Version</th>
            <th>Changes</th>
            <th>Created</th>
            <th style="text-align: center;">Status</th>
            <th style="text-align: center;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `}

    <div style="text-align: center; margin-top: 30px;">
        <a href="/admin/websites" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
            ← Back to All Websites
        </a>
    </div>
</body>
</html>
    `);

  } catch (error) {
    console.error('Error fetching versions:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

/**
 * VIEW SPECIFIC VERSION
 * GET /admin/websites/version/:versionId
 */
router.get('/websites/version/:versionId', async (req, res) => {
  try {
    const html = await updateService.getVersionHTML(req.params.versionId);
    if (!html) {
      return res.status(404).send('Version not found');
    }
    res.send(html);
  } catch (error) {
    console.error('Error fetching version:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

module.exports = router;
