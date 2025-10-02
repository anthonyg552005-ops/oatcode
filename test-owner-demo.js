/**
 * Test script to manually trigger owner demo
 */

require('dotenv').config();

const winston = require('winston');
const OwnerDemoService = require('./src/services/OwnerDemoService');

// Setup logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

async function sendDemo() {
  try {
    logger.info('🎨 Manually triggering owner demo...');

    const demoService = new OwnerDemoService(logger);
    const result = await demoService.sendDailyOwnerDemo();

    if (result.success) {
      logger.info('✅ Demo sent successfully!');
      logger.info('Demo URLs:');
      logger.info(`   Comparison: ${result.demoUrls.comparison}`);
      logger.info(`   Standard: ${result.demoUrls.standard}`);
      logger.info(`   Premium: ${result.demoUrls.premium}`);
    } else {
      logger.error(`❌ Demo failed: ${result.error}`);
    }

  } catch (error) {
    logger.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

sendDemo();
