/**
 * CUSTOMER ROUTES
 *
 * API endpoints for customer retention and feedback:
 * - Webhook for incoming email responses (SendGrid Inbound Parse)
 * - Feedback submission endpoint
 * - Customer portal (future)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');

// For parsing SendGrid inbound emails
const upload = multer();

/**
 * SendGrid Inbound Parse Webhook
 * Receives customer email replies
 */
router.post('/webhook/email', upload.none(), async (req, res) => {
  try {
    const { from, to, subject, text, html } = req.body;

    console.log('📨 Received customer email response');
    console.log('   From:', from);
    console.log('   Subject:', subject);

    // Extract customer email
    const emailMatch = from.match(/[\w.-]+@[\w.-]+\.\w{2,}/);
    const customerEmail = emailMatch ? emailMatch[0] : from;

    // Find customer
    if (!global.customerRetention) {
      console.warn('⚠️ CustomerRetention service not initialized');
      return res.status(200).send('OK'); // Still return 200 to prevent retries
    }

    const customer = global.customerRetention.customers.find(c =>
      c.email.toLowerCase() === customerEmail.toLowerCase()
    );

    if (!customer) {
      console.warn(`⚠️ Customer not found: ${customerEmail}`);
      return res.status(200).send('OK');
    }

    // Process feedback
    const feedbackText = text || html || '';
    const result = await global.customerRetention.processFeedback(customer.id, feedbackText);

    console.log('✅ Feedback processed:', result);

    res.status(200).send('OK');

  } catch (error) {
    console.error('❌ Error processing inbound email:', error);
    res.status(200).send('OK'); // Still return 200 to prevent SendGrid retries
  }
});

/**
 * Manual feedback submission (for testing or web form)
 */
router.post('/feedback/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { feedback } = req.body;

    if (!feedback) {
      return res.status(400).json({ error: 'Feedback text is required' });
    }

    if (!global.customerRetention) {
      return res.status(503).json({ error: 'Retention service not available' });
    }

    const result = await global.customerRetention.processFeedback(customerId, feedback);

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Error processing feedback:', error);
    res.status(500).json({
      error: 'Failed to process feedback',
      message: error.message
    });
  }
});

/**
 * Get customer info (for testing)
 */
router.get('/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!global.customerRetention) {
      return res.status(503).json({ error: 'Retention service not available' });
    }

    const customer = global.customerRetention.customers.find(c => c.id === customerId);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customer);

  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({
      error: 'Failed to fetch customer',
      message: error.message
    });
  }
});

/**
 * Manually trigger purchase (for testing)
 */
router.post('/purchase', async (req, res) => {
  try {
    const { email, businessName, tier, websiteUrl, websiteData } = req.body;

    if (!email || !businessName) {
      return res.status(400).json({ error: 'Email and businessName required' });
    }

    if (!global.customerRetention) {
      return res.status(503).json({ error: 'Retention service not available' });
    }

    const customer = await global.customerRetention.addCustomer({
      email,
      businessName,
      tier: tier || 'standard',
      websiteUrl: websiteUrl || `http://oatcode.com/demos/${Date.now()}.html`,
      websiteData: websiteData || {}
    });

    console.log(`✅ New customer added: ${businessName} - retention tracking started`);

    res.json({
      success: true,
      customer,
      message: 'Customer added to retention system. First check-in scheduled for Day 3.'
    });

  } catch (error) {
    console.error('Error adding customer:', error);
    res.status(500).json({
      error: 'Failed to add customer',
      message: error.message
    });
  }
});

/**
 * Get retention stats
 */
router.get('/stats', async (req, res) => {
  try {
    if (!global.customerRetention) {
      return res.status(503).json({ error: 'Retention service not available' });
    }

    const stats = await global.customerRetention.getStats();
    res.json(stats);

  } catch (error) {
    console.error('Error fetching retention stats:', error);
    res.status(500).json({
      error: 'Failed to fetch retention stats',
      message: error.message
    });
  }
});

module.exports = router;
