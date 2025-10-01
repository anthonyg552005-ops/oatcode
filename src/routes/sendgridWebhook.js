/**
 * SENDGRID WEBHOOK ROUTES
 * Receives email events from SendGrid (opens, clicks, bounces, etc.)
 */

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Database path for webhook events
const WEBHOOK_DB_PATH = path.join(__dirname, '../../data/databases/sendgrid-events.json');

/**
 * SENDGRID EVENT WEBHOOK
 * POST /webhook/sendgrid/events
 *
 * Receives events from SendGrid:
 * - processed: Message has been received and is ready to be delivered
 * - dropped: Message was dropped (invalid email, suppressed, etc.)
 * - delivered: Message was successfully delivered
 * - deferred: Receiving server temporarily rejected delivery
 * - bounce: Receiving server could not deliver message (permanent failure)
 * - open: Recipient opened the email
 * - click: Recipient clicked a link in the email
 * - spamreport: Recipient marked email as spam
 * - unsubscribe: Recipient clicked unsubscribe link
 */
router.post('/events', async (req, res) => {
  try {
    const events = req.body; // SendGrid sends array of events

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(200).json({ message: 'No events received' });
    }

    console.log(`📨 Received ${events.length} SendGrid events`);

    // Load existing events database
    let eventDb = { events: [], lastUpdated: null };
    try {
      const data = await fs.readFile(WEBHOOK_DB_PATH, 'utf-8');
      eventDb = JSON.parse(data);
    } catch (error) {
      // Database doesn't exist yet, will create it
    }

    // Process each event
    for (const event of events) {
      const processedEvent = {
        timestamp: new Date().toISOString(),
        eventType: event.event,
        email: event.email,
        emailSubject: event.subject || null,
        businessName: event.business_name || null, // Custom metadata if added
        url: event.url || null, // For click events
        reason: event.reason || null, // For bounces/drops
        ip: event.ip || null,
        userAgent: event.useragent || null,
        sendgridEventId: event.sg_event_id,
        sendgridMessageId: event.sg_message_id,
        rawEvent: event // Store full event for debugging
      };

      eventDb.events.push(processedEvent);

      // Log important events
      if (event.event === 'open') {
        console.log(`   👁️  Email opened: ${event.email}`);
      } else if (event.event === 'click') {
        console.log(`   🖱️  Link clicked: ${event.email} → ${event.url}`);
      } else if (event.event === 'bounce') {
        console.log(`   ⚠️  Bounce: ${event.email} - ${event.reason}`);
      } else if (event.event === 'spamreport') {
        console.log(`   🚫 Spam report: ${event.email}`);
      } else if (event.event === 'delivered') {
        console.log(`   ✅ Delivered: ${event.email}`);
      }

      // Log activity to documentation if available
      if (global.documentation) {
        global.documentation.logActivity('email_event', event.event, {
          email: event.email,
          subject: event.subject,
          type: event.event,
          details: event.reason || event.url || null
        });
      }

      // Update email sequence engagement tracking
      if (global.emailSequence && event.sequence_id) {
        if (event.event === 'open' || event.event === 'click') {
          await global.emailSequence.updateEngagement(event.sequence_id, event.event);
        }
      }
    }

    // Update last updated timestamp
    eventDb.lastUpdated = new Date().toISOString();

    // Save updated database
    await fs.mkdir(path.dirname(WEBHOOK_DB_PATH), { recursive: true });
    await fs.writeFile(WEBHOOK_DB_PATH, JSON.stringify(eventDb, null, 2));

    // Return 200 to acknowledge receipt
    res.status(200).json({
      message: 'Events processed successfully',
      count: events.length
    });

  } catch (error) {
    console.error(`❌ Webhook processing error: ${error.message}`);
    // Always return 200 to SendGrid to avoid retries
    res.status(200).json({ message: 'Error logged' });
  }
});

/**
 * GET WEBHOOK STATISTICS
 * GET /webhook/sendgrid/stats
 * Returns aggregated statistics from webhook events
 */
router.get('/stats', async (req, res) => {
  try {
    const data = await fs.readFile(WEBHOOK_DB_PATH, 'utf-8');
    const eventDb = JSON.parse(data);

    // Calculate statistics
    const stats = {
      totalEvents: eventDb.events.length,
      lastUpdated: eventDb.lastUpdated,
      byType: {},
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      spamReports: 0,
      openRate: 0,
      clickRate: 0
    };

    // Count events by type
    eventDb.events.forEach(event => {
      stats.byType[event.eventType] = (stats.byType[event.eventType] || 0) + 1;

      if (event.eventType === 'delivered') stats.delivered++;
      if (event.eventType === 'open') stats.opened++;
      if (event.eventType === 'click') stats.clicked++;
      if (event.eventType === 'bounce') stats.bounced++;
      if (event.eventType === 'spamreport') stats.spamReports++;
    });

    // Calculate rates
    if (stats.delivered > 0) {
      stats.openRate = ((stats.opened / stats.delivered) * 100).toFixed(2);
      stats.clickRate = ((stats.clicked / stats.delivered) * 100).toFixed(2);
    }

    res.json(stats);

  } catch (error) {
    res.status(404).json({
      message: 'No webhook events recorded yet',
      error: error.message
    });
  }
});

/**
 * GET RECENT EVENTS
 * GET /webhook/sendgrid/recent?limit=50
 * Returns recent webhook events
 */
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const data = await fs.readFile(WEBHOOK_DB_PATH, 'utf-8');
    const eventDb = JSON.parse(data);

    const recentEvents = eventDb.events
      .slice(-limit)
      .reverse();

    res.json({
      count: recentEvents.length,
      events: recentEvents
    });

  } catch (error) {
    res.status(404).json({
      message: 'No webhook events recorded yet',
      error: error.message
    });
  }
});

module.exports = router;
