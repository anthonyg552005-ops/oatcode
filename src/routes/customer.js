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
const db = require('../database/DatabaseService');

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
 * Automatically purchases custom domain for Premium tier
 */
router.post('/purchase', async (req, res) => {
  try {
    const { email, businessName, tier, websiteUrl, websiteData, customerInfo } = req.body;

    if (!email || !businessName) {
      return res.status(400).json({ error: 'Email and businessName required' });
    }

    if (!global.customerRetention) {
      return res.status(503).json({ error: 'Retention service not available' });
    }

    const customerTier = tier || 'standard';
    let domainInfo = null;

    // AUTOMATIC DOMAIN PURCHASING FOR PREMIUM CUSTOMERS
    if (customerTier === 'premium' && global.autoDomain) {
      console.log('');
      console.log('🌐 Premium customer - initiating autonomous domain purchase...');

      try {
        // Generate domain from business name
        const suggestedDomain = businessName.toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .replace(/\s+/g, '') + '.com';

        console.log(`   Suggested domain: ${suggestedDomain}`);

        // Check if domain is available
        const availability = await global.autoDomain.checkAvailability(suggestedDomain);

        if (availability.available) {
          // Purchase and configure domain automatically
          const domainResult = await global.autoDomain.setupCustomDomain(
            suggestedDomain,
            {
              businessName,
              firstName: customerInfo?.firstName || 'Customer',
              lastName: customerInfo?.lastName || 'Service',
              email: email,
              phone: customerInfo?.phone || '+1.5125551234',
              address: customerInfo?.address || '123 Main St',
              city: customerInfo?.city || 'Austin',
              state: customerInfo?.state || 'TX',
              zip: customerInfo?.zip || '78701',
              country: customerInfo?.country || 'US'
            }
          );

          domainInfo = {
            domain: suggestedDomain,
            status: 'purchased',
            cost: domainResult.cost,
            liveUrl: domainResult.liveUrl,
            expirationDate: domainResult.expirationDate
          };

          console.log(`✅ Domain purchased autonomously: ${suggestedDomain}`);
          console.log(`   Cost: $${domainResult.cost}/year`);
          console.log(`   Live URL: ${domainResult.liveUrl}`);
          console.log('');

        } else {
          // Domain taken - suggest alternative
          console.log(`   ${suggestedDomain} is taken, finding alternative...`);
          const alternative = await global.autoDomain.suggestAvailableDomain(businessName);

          domainInfo = {
            domain: alternative.domain,
            status: 'suggested',
            message: `${suggestedDomain} was taken. Suggested: ${alternative.domain}`
          };

          console.log(`   Suggested alternative: ${alternative.domain}`);
        }

      } catch (error) {
        console.error('❌ Domain purchase failed:', error.message);
        domainInfo = {
          status: 'failed',
          error: error.message,
          message: 'Custom domain purchase failed. Contact support.'
        };
      }
    }

    // Initialize database if needed
    if (!db.db) await db.connect();

    // Save to database
    const dbCustomer = await db.createCustomer({
      businessName,
      email,
      tier: customerTier,
      status: 'active',
      websiteUrl: websiteUrl || (domainInfo?.liveUrl || `http://oatcode.com/demos/${Date.now()}.html`),
      customDomain: domainInfo?.domain || null,
      monthlyPrice: customerTier === 'premium' ? 297 : 197
    });

    // Save domain purchase if applicable
    if (domainInfo && domainInfo.status === 'purchased') {
      await db.createDomainPurchase({
        customerId: dbCustomer.id,
        domainName: domainInfo.domain,
        purchasePrice: domainInfo.cost,
        expiresAt: domainInfo.expirationDate,
        dnsConfigured: true,
        dnsConfiguredAt: new Date().toISOString()
      });
    }

    // Also add to retention service if available
    let customer = dbCustomer;
    if (global.customerRetention) {
      customer = await global.customerRetention.addCustomer({
        email,
        businessName,
        tier: customerTier,
        websiteUrl: websiteUrl || (domainInfo?.liveUrl || `http://oatcode.com/demos/${Date.now()}.html`),
        websiteData: websiteData || {},
        customDomain: domainInfo
      });
    }

    console.log(`✅ New customer added: ${businessName} (${customerTier}) - DB ID: ${dbCustomer.id}`);

    res.json({
      success: true,
      customer,
      customDomain: domainInfo,
      message: customerTier === 'premium'
        ? `Premium customer added! ${domainInfo?.status === 'purchased' ? `Custom domain ${domainInfo.domain} purchased and configured.` : 'Domain setup pending.'}`
        : 'Customer added to retention system. First check-in scheduled for Day 3.'
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
