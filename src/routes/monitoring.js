const express = require('express');
const router = express.Router();
const APIMonitoringService = require('../services/APIMonitoringService');

const monitoringService = new APIMonitoringService();

/**
 * Get current API usage status for dashboard
 */
router.get('/usage', async (req, res) => {
  try {
    const usageStatus = await monitoringService.getUsageStatus();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      services: usageStatus
    });

  } catch (error) {
    console.error('Error fetching usage status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch API usage status'
    });
  }
});

/**
 * Manually trigger usage check
 */
router.post('/check', async (req, res) => {
  try {
    await monitoringService.checkAllAPIUsage();

    res.json({
      success: true,
      message: 'Usage check completed successfully'
    });

  } catch (error) {
    console.error('Error during manual usage check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check API usage'
    });
  }
});

/**
 * Update alert thresholds
 */
router.put('/thresholds', async (req, res) => {
  try {
    const { service, critical, warning } = req.body;

    if (!service || critical === undefined || warning === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: service, critical, warning'
      });
    }

    monitoringService.updateThresholds(service, critical, warning);

    res.json({
      success: true,
      message: `Thresholds updated for ${service}`
    });

  } catch (error) {
    console.error('Error updating thresholds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update thresholds'
    });
  }
});

/**
 * Get monitoring system health
 */
router.get('/health', async (req, res) => {
  try {
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      notificationEmail: process.env.NOTIFICATION_EMAIL,
      notificationPhone: process.env.NOTIFICATION_PHONE,
      smsEnabled: process.env.ENABLE_SMS_NOTIFICATIONS === 'true',
      checkInterval: '1 hour',
      services: ['OpenAI', 'SendGrid', 'Twilio']
    });

  } catch (error) {
    console.error('Error checking monitoring health:', error);
    res.status(500).json({
      success: false,
      error: 'Monitoring system health check failed'
    });
  }
});

module.exports = router;