/**
 * OWNER DEMO SERVICE
 *
 * Generates a demo of OatCode itself for Anthony to test the entire customer experience.
 * This lets the owner see EXACTLY what customers will see when they receive their demo.
 *
 * Sends daily demo so Anthony can:
 * - Test the website quality
 * - Experience the customer journey
 * - Verify everything works perfectly
 * - Give feedback on improvements
 */

const DemoComparisonService = require('./DemoComparisonService');
const sgMail = require('@sendgrid/mail');

class OwnerDemoService {
  constructor(logger) {
    this.logger = logger;
    this.demoComparison = new DemoComparisonService(logger);

    // Setup SendGrid
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }
  }

  /**
   * Generate and send daily demo to owner
   */
  async sendDailyOwnerDemo() {
    try {
      this.logger.info('🎨 Generating daily demo for owner to test...');

      // Generate demo of OatCode itself (meta!)
      const oatCodeBusiness = {
        businessName: 'OatCode',
        name: 'OatCode',
        industry: 'Web Development',
        location: 'San Francisco, CA',
        city: 'San Francisco',
        description: 'AI-powered website generation service that creates professional websites in minutes. Fully automated, affordable pricing, perfect for small businesses that need an online presence.',
        phone: '(555) 123-4567',
        email: 'hello@oatcode.com',
        address: 'San Francisco, CA'
      };

      // Generate Standard vs Premium comparison
      const demo = await this.demoComparison.generateDemoComparison(oatCodeBusiness);

      this.logger.info('📧 Sending demo to owner...');

      // Send email with demo links
      const emailSubject = '🎨 Your Daily OatCode Demo - Test the Customer Experience';
      const emailBody = this.buildDemoEmail(demo);

      const msg = {
        to: process.env.NOTIFICATION_EMAIL || 'anthonyg552005@gmail.com',
        from: process.env.NOTIFICATION_EMAIL || 'anthonyg552005@gmail.com',
        subject: emailSubject,
        html: emailBody
      };

      await sgMail.send(msg);

      this.logger.info('✅ Daily demo sent to owner!');

      return {
        success: true,
        demoUrls: {
          comparison: demo.comparisonUrl,
          standard: demo.standardUrl,
          premium: demo.premiumUrl
        }
      };

    } catch (error) {
      this.logger.error(`❌ Failed to send owner demo: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Build demo email for owner
   */
  buildDemoEmail(demo) {
    const domain = process.env.DOMAIN || 'http://oatcode.com';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #2563eb;
            font-size: 28px;
            margin: 0;
        }
        .section {
            margin: 30px 0;
            padding: 20px;
            background: #f8fafc;
            border-left: 4px solid #2563eb;
            border-radius: 8px;
        }
        .section h2 {
            margin-top: 0;
            color: #1e40af;
            font-size: 20px;
        }
        .demo-links {
            margin: 20px 0;
        }
        .demo-link {
            display: block;
            padding: 15px 25px;
            margin: 10px 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            text-align: center;
            font-weight: 600;
            transition: transform 0.2s;
        }
        .demo-link:hover {
            transform: translateY(-2px);
        }
        .premium-link {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        .comparison-link {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }
        .info-box {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .checklist {
            list-style: none;
            padding: 0;
        }
        .checklist li {
            padding: 8px 0;
            padding-left: 30px;
            position: relative;
        }
        .checklist li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #10b981;
            font-weight: bold;
            font-size: 18px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎨 Your Daily Demo Is Ready!</h1>
            <p style="color: #6b7280; margin-top: 10px;">Test the exact customer experience</p>
        </div>

        <div class="section">
            <h2>🎯 Why This Demo?</h2>
            <p>Every day, the AI generates a fresh demo of <strong>OatCode itself</strong> so you can:</p>
            <ul class="checklist">
                <li>See what customers will receive</li>
                <li>Test website quality and design</li>
                <li>Experience the full customer journey</li>
                <li>Verify AI is creating high-quality demos</li>
                <li>Spot any issues before customers see them</li>
            </ul>
        </div>

        <div class="info-box">
            <strong>📊 Today's Demo:</strong> OatCode business website (Standard vs Premium comparison)
        </div>

        <div class="demo-links">
            <a href="${domain}${demo.comparisonUrl}" class="demo-link comparison-link">
                🔍 View Full Comparison (Standard vs Premium)
            </a>

            <a href="${domain}${demo.standardUrl}" class="demo-link">
                📱 View Standard Demo ($197/mo)
            </a>

            <a href="${domain}${demo.premiumUrl}" class="demo-link premium-link">
                ✨ View Premium Demo ($297/mo)
            </a>
        </div>

        <div class="section">
            <h2>🧪 What to Test:</h2>
            <ul class="checklist">
                <li>Does the website look professional?</li>
                <li>Is the design modern and mobile-friendly?</li>
                <li>Do all the links and buttons work?</li>
                <li>Is the difference between Standard and Premium clear?</li>
                <li>Would YOU pay $197-297/month for this?</li>
                <li>Does it showcase value better than competitors?</li>
            </ul>
        </div>

        <div class="section">
            <h2>💡 Give Feedback:</h2>
            <p>If you see any issues or have ideas for improvement, the AI will automatically incorporate your feedback into future demos.</p>
            <p><strong>Just reply to this email</strong> with your thoughts!</p>
        </div>

        <div class="footer">
            <p>🤖 Auto-generated by your Autonomous AI Business<br>
            <a href="${domain}/dashboard" style="color: #2563eb;">View Dashboard</a> |
            <a href="${domain}/autonomous-dashboard" style="color: #2563eb;">System Status</a></p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Generate test demo for specific business type
   */
  async generateTestDemo(businessType = 'restaurant') {
    try {
      const testBusinesses = {
        restaurant: {
          businessName: 'Bella Vista Italian Restaurant',
          industry: 'Restaurant',
          location: 'San Francisco, CA',
          city: 'San Francisco',
          description: 'Authentic Italian cuisine in the heart of San Francisco. Family recipes passed down through generations.',
          phone: '(415) 555-1234',
          email: 'info@bellavista.com'
        },
        lawyer: {
          businessName: 'Johnson & Associates Law Firm',
          industry: 'Legal Services',
          location: 'San Francisco, CA',
          city: 'San Francisco',
          description: 'Personal injury and business law specialists serving the Bay Area for over 20 years.',
          phone: '(415) 555-5678',
          email: 'contact@johnsonlaw.com'
        },
        plumber: {
          businessName: 'Bay Area Plumbing Pro',
          industry: 'Plumbing',
          location: 'San Francisco, CA',
          city: 'San Francisco',
          description: '24/7 emergency plumbing service. Licensed, bonded, and insured.',
          phone: '(415) 555-9999',
          email: 'service@bayareaplumbing.com'
        }
      };

      const business = testBusinesses[businessType] || testBusinesses.restaurant;

      return await this.demoComparison.generateDemoComparison(business);

    } catch (error) {
      this.logger.error(`Failed to generate test demo: ${error.message}`);
      throw error;
    }
  }
}

module.exports = OwnerDemoService;
