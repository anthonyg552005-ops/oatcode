/**
 * REQUEST CHANGES API
 * Handles customer revision requests from the simple web form
 * Now with AUTOMATIC website regeneration and email delivery!
 */

const express = require('express');
const router = express.Router();
const db = require('../database/DatabaseService');
const sgMail = require('@sendgrid/mail');
const WebsiteUpdateService = require('../services/WebsiteUpdateService');
const EmailLogService = require('../services/EmailLogService');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Initialize services
const updateService = new WebsiteUpdateService(console);
const emailLog = new EmailLogService(console);
emailLog.initialize();

// Handle change requests from form
router.post('/', async (req, res) => {
  try {
    const { customerId, websiteUrl, customerEmail, changes, demo } = req.body;

    console.log('📝 Change request received:');
    console.log(`   Customer ID: ${customerId}`);
    console.log(`   Email: ${customerEmail}`);
    console.log(`   Changes: ${changes.substring(0, 100)}...`);

    // Initialize database if needed
    if (!db.db) await db.connect();

    // Determine if this is a paid customer or pre-purchase demo
    let isPaidCustomer = false;
    let customer = null;

    if (customerId) {
      customer = await db.get('SELECT * FROM customers WHERE id = ?', [customerId]);
      isPaidCustomer = customer && (customer.stripe_subscription_id || customer.monthly_price > 0);
    }

    // Save to database
    if (customerId) {
      try {
        await db.run(
          `INSERT INTO customization_requests
           (customer_id, request_type, request_text, status, created_at)
           VALUES (?, ?, ?, ?, datetime('now'))`,
          [customerId, 'revision', changes, 'processing']
        );
        console.log('   ✅ Saved to database');
      } catch (dbError) {
        console.log('   ⚠️  Could not save to DB (customer might not exist yet):', dbError.message);
      }
    }

    // Send immediate confirmation email
    const confirmationEmail = {
      to: customerEmail,
      from: {
        email: 'hello@oatcode.com',
        name: 'OatCode'
      },
      subject: '✅ Changes Received - We\'re On It!',
      text: `Hi there,

We received your change request!

Your requested changes:
${changes}

⏱ Delivery: You'll receive your updated ${isPaidCustomer ? 'website' : 'demo'} within 24-48 hours.

Our AI is generating it now, and we'll review it to make sure everything looks perfect before sending it to you.

🔄 Unlimited Revisions: Don't worry - revisions are completely FREE! Request as many changes as you need until it's perfect.

Best regards,
OatCode Team`,
      html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }
        .changes-box { background: #f8fafc; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 4px; }
        .timeline-box { background: #fffbeb; border-left: 4px solid #fbbf24; padding: 20px; margin: 20px 0; border-radius: 4px; }
        .revisions-box { background: #f0fdf4; border: 2px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }
        .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">✅ Changes Received - We're On It!</h1>
        </div>
        <div class="content">
            <p>Hi there,</p>

            <p>We received your change request! Our AI is generating your updated ${isPaidCustomer ? 'website' : 'demo'} now.</p>

            <div class="changes-box">
                <strong>Your Requested Changes:</strong>
                <p style="white-space: pre-wrap; margin-top: 10px;">${changes}</p>
            </div>

            <div class="timeline-box">
                <strong>⏱ Delivery Timeline:</strong>
                <p style="margin-top: 10px;">You'll receive your updated ${isPaidCustomer ? 'website' : 'demo'} within <strong>24-48 hours</strong>.</p>
                <p style="margin-top: 5px; font-size: 14px; color: #92400e;">We review every website to ensure it's perfect before sending it to you!</p>
            </div>

            <div class="revisions-box">
                <strong style="color: #059669; font-size: 18px;">🔄 Unlimited FREE Revisions!</strong>
                <p style="margin-top: 10px; color: #065f46;">Don't worry - revisions are completely FREE! Request as many changes as you need until it's perfect.</p>
            </div>

            <div class="footer">
                <p><strong>OatCode Team</strong><br>
                hello@oatcode.com</p>
            </div>
        </div>
    </div>
</body>
</html>
      `,
      trackingSettings: {
        clickTracking: { enable: false },
        openTracking: { enable: true }
      }
    };

    await sgMail.send(confirmationEmail);
    console.log('   ✅ Confirmation email sent');

    // Log email for dashboard tracking
    await emailLog.logEmail({
      type: 'customization_confirmation',
      to: customerEmail,
      recipientName: customer?.business_name || 'Customer',
      businessName: customer?.business_name || 'Demo Customer',
      subject: confirmationEmail.subject,
      text: confirmationEmail.text,
      html: confirmationEmail.html,
      customerId: customerId || null
    });

    // Process update asynchronously (don't make user wait)
    res.json({
      success: true,
      message: 'Changes received! Processing your update...',
      processing: true
    });

    // AUTOMATED UPDATE: Regenerate website and send email with updated version
    setImmediate(async () => {
      try {
        console.log('🤖 Starting automated website update...');

        // Find or create customer data
        let customerData = customer;
        if (!customerData) {
          // For pre-purchase demos, create temporary customer record
          const result = await db.run(
            `INSERT OR IGNORE INTO customers
             (email, business_name, industry, tier, monthly_price, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
            [customerEmail, 'Demo Customer', 'services', 'standard', 0, 'active']
          );

          // If INSERT OR IGNORE didn't insert (customer exists), lastID will be 0
          // Query by email instead
          if (result.lastID && result.lastID > 0) {
            customerData = await db.get('SELECT * FROM customers WHERE id = ?', [result.lastID]);
          } else {
            customerData = await db.get('SELECT * FROM customers WHERE email = ?', [customerEmail]);
          }
        }

        // Verify customer data exists before proceeding
        if (!customerData || !customerData.id) {
          throw new Error(`Could not find or create customer record for ${customerEmail}`);
        }

        // Use WebsiteUpdateService to regenerate website
        const changeRequest = {
          type: 'revision',
          description: changes
        };

        const updateResult = await updateService.makeUpdate({
          id: customerData.id,
          businessName: customerData.business_name || 'Your Business',
          email: customerData.email
        }, changeRequest);

        if (updateResult.success) {
          // Get updated website URL
          const updatedUrl = `${process.env.DOMAIN || 'http://localhost:3000'}/demos/${customerData.id}.html`;

          // Create or update customization_request as PENDING APPROVAL
          let requestId;
          const existingRequest = await db.get(
            'SELECT id FROM customization_requests WHERE customer_id = ? AND status = \'processing\'',
            [customerData.id]
          );

          if (existingRequest) {
            // Update existing request
            await db.run(
              `UPDATE customization_requests
               SET status = 'pending_approval', completed_at = datetime('now'), version_id = ?
               WHERE id = ?`,
              [updateResult.versionId, existingRequest.id]
            );
            requestId = existingRequest.id;
          } else {
            // Create new request for new prospects
            const result = await db.run(
              `INSERT INTO customization_requests
               (customer_id, request_type, request_text, status, created_at, completed_at, version_id)
               VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), ?)`,
              [customerData.id, 'revision', changes, 'pending_approval', updateResult.versionId]
            );
            requestId = result.lastID;
          }

          // Send notification to ADMIN for review & approval
          const adminEmail = {
            to: process.env.NOTIFICATION_EMAIL || 'anthonyg552005@gmail.com',
            from: { email: 'hello@oatcode.com', name: 'Anthony from OatCode' },
            subject: `👍 Review Website: ${customerData.business_name || customerEmail}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1e293b;">🔍 Website Ready for Your Review</h2>

                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Customer:</strong> ${customerEmail}</p>
                  <p><strong>Business:</strong> ${customerData.business_name || 'N/A'}</p>
                  <p><strong>Type:</strong> ${isPaidCustomer ? 'Paid Customer' : 'Pre-Purchase Demo'}</p>
                  <p><strong>Changes Requested:</strong></p>
                  <p style="background: white; padding: 10px; border-radius: 4px; white-space: pre-wrap;">${changes}</p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.DOMAIN || 'http://localhost:3000'}/admin/review?id=${customerData.id}&request_id=${requestId}"
                     style="display: inline-block; background: #667eea; color: white; padding: 18px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">
                    🔍 Review & Decide
                  </a>
                </div>

                <p style="color: #64748b; font-size: 14px; text-align: center;">
                  Review the website and choose:<br>
                  ✅ Approve & send to customer, OR<br>
                  ✏️ Request changes from AI generator
                </p>
              </div>
            `,
            text: `Website Ready for Review

Customer: ${customerEmail}
Business: ${customerData.business_name || 'N/A'}
Type: ${isPaidCustomer ? 'Paid Customer' : 'Pre-Purchase Demo'}

Changes: ${changes}

Review: ${process.env.DOMAIN || 'http://localhost:3000'}/admin/review?id=${customerData.id}&request_id=${requestId}

Options: Approve & send OR request changes from AI`,
            trackingSettings: {
              clickTracking: { enable: false },
              openTracking: { enable: true }
            }
          };

          await sgMail.send(adminEmail);

          // Log admin notification email
          await emailLog.logEmail({
            type: 'admin_review_notification',
            to: adminEmail.to,
            recipientName: 'Admin',
            businessName: customerData.business_name || customerEmail,
            subject: adminEmail.subject,
            text: adminEmail.text,
            html: adminEmail.html,
            customerId: customerData.id
          });

          console.log('✅ Website generated and marked for approval. Admin notified.');
        } else {
          console.error('❌ Update failed:', updateResult.error);

          // Send notification to admin
          await sgMail.send({
            to: process.env.NOTIFICATION_EMAIL || 'anthonyg552005@gmail.com',
            from: { email: 'hello@oatcode.com', name: 'Anthony from OatCode' },
            subject: `❌ Failed Update - Customer ${customerId}`,
            text: `Failed to update website for ${customerEmail}\n\nError: ${updateResult.error}\n\nChanges: ${changes}`
          });
        }

      } catch (error) {
        console.error('❌ Automated update error:', error);

        // Notify admin
        await sgMail.send({
          to: process.env.NOTIFICATION_EMAIL || 'anthonyg552005@gmail.com',
          from: { email: 'hello@oatcode.com', name: 'Anthony from OatCode' },
          subject: `❌ Update System Error`,
          text: `Error processing update for ${customerEmail}\n\nError: ${error.message}\n\nChanges: ${changes}`
        });
      }
    });

  } catch (error) {
    console.error('❌ Error processing change request:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
