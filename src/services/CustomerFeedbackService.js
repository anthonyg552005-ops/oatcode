/**
 * CUSTOMER FEEDBACK SERVICE
 *
 * Processes customer feedback and extracts update requests:
 * - Uses AI to understand what customer wants changed
 * - Categorizes feedback (positive, needs update, has issue)
 * - Extracts specific changes requested
 * - Triggers WebsiteUpdateService to make changes
 * - Sends confirmation when updates are complete
 */

const OpenAI = require('openai');

class CustomerFeedbackService {
  constructor(logger) {
    this.logger = logger || console;
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Process customer feedback and extract action items
   */
  async processFeedback(customer, feedbackText) {
    try {
      this.logger.info(`🤖 Analyzing feedback from ${customer.businessName}...`);

      // Use GPT-4 to understand the feedback
      const analysis = await this.analyzeFeedback(feedbackText, customer);

      this.logger.info(`📊 Feedback sentiment: ${analysis.sentiment}`);
      this.logger.info(`🔧 Updates requested: ${analysis.updatesRequested ? 'YES' : 'NO'}`);

      // If updates are requested, process them
      if (analysis.updatesRequested) {
        return await this.processUpdateRequest(customer, analysis);
      }

      // If just positive feedback, send thank you
      if (analysis.sentiment === 'positive') {
        await this.sendThankYou(customer);
        return {
          success: true,
          sentiment: 'positive',
          updatesRequested: false,
          message: 'Positive feedback received, thank you sent'
        };
      }

      // If there's an issue, escalate
      if (analysis.sentiment === 'negative' || analysis.hasIssue) {
        await this.escalateIssue(customer, feedbackText, analysis);
        return {
          success: true,
          sentiment: 'negative',
          updatesRequested: false,
          escalated: true,
          message: 'Issue escalated to owner'
        };
      }

      return {
        success: true,
        sentiment: analysis.sentiment,
        updatesRequested: false,
        message: 'Feedback acknowledged'
      };

    } catch (error) {
      this.logger.error(`❌ Failed to process feedback: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Use AI to analyze customer feedback
   */
  async analyzeFeedback(feedbackText, customer) {
    try {
      const prompt = `You are analyzing customer feedback for ${customer.businessName}'s website.

Customer feedback:
"${feedbackText}"

Analyze this feedback and respond in JSON format:
{
  "sentiment": "positive" | "neutral" | "negative",
  "updatesRequested": true | false,
  "hasIssue": true | false,
  "requestedChanges": [
    {
      "type": "text" | "color" | "image" | "layout" | "feature" | "content",
      "description": "what they want changed",
      "priority": "high" | "medium" | "low"
    }
  ],
  "summary": "brief summary of the feedback"
}

Examples:
- "Love it! No changes needed" → sentiment: positive, updatesRequested: false
- "Can you update my phone number to 555-1234?" → sentiment: neutral, updatesRequested: true, type: text
- "The website is broken" → sentiment: negative, hasIssue: true
- "I'd like to change the colors to blue" → sentiment: neutral, updatesRequested: true, type: color`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a customer feedback analyzer. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const result = JSON.parse(response.choices[0].message.content);
      return result;

    } catch (error) {
      this.logger.warn(`AI analysis failed, using fallback: ${error.message}`);

      // Fallback analysis based on keywords
      return this.fallbackAnalysis(feedbackText);
    }
  }

  /**
   * Fallback analysis if AI fails
   */
  fallbackAnalysis(text) {
    const lowerText = text.toLowerCase();

    // Check sentiment
    const positiveWords = ['love', 'great', 'perfect', 'awesome', 'excellent', 'thanks'];
    const negativeWords = ['broken', 'issue', 'problem', 'error', 'wrong', 'terrible'];
    const updateWords = ['change', 'update', 'modify', 'add', 'remove', 'edit'];

    const hasPositive = positiveWords.some(word => lowerText.includes(word));
    const hasNegative = negativeWords.some(word => lowerText.includes(word));
    const hasUpdate = updateWords.some(word => lowerText.includes(word));

    let sentiment = 'neutral';
    if (hasPositive && !hasNegative) sentiment = 'positive';
    if (hasNegative) sentiment = 'negative';

    return {
      sentiment,
      updatesRequested: hasUpdate,
      hasIssue: hasNegative,
      requestedChanges: hasUpdate ? [
        {
          type: 'content',
          description: text,
          priority: 'medium'
        }
      ] : [],
      summary: text.substring(0, 100)
    };
  }

  /**
   * Process update request and trigger website changes
   */
  async processUpdateRequest(customer, analysis) {
    try {
      this.logger.info(`🔧 Processing update request for ${customer.businessName}...`);

      // Import WebsiteUpdateService
      const WebsiteUpdateService = require('./WebsiteUpdateService');
      const updateService = new WebsiteUpdateService(this.logger);

      // Process each requested change
      const results = [];
      for (const change of analysis.requestedChanges) {
        this.logger.info(`   📝 Processing: ${change.description}`);

        const result = await updateService.makeUpdate(customer, change);
        results.push(result);
      }

      // Send confirmation email to customer
      await this.sendUpdateConfirmation(customer, analysis, results);

      // Update customer record
      if (global.customerRetention) {
        const customerRecord = global.customerRetention.customers.find(c => c.id === customer.id);
        if (customerRecord) {
          customerRecord.updatesCompleted++;
          await global.customerRetention.save();
        }
      }

      this.logger.info(`✅ Updates completed for ${customer.businessName}`);

      return {
        success: true,
        updatesRequested: true,
        changesProcessed: results.length,
        results
      };

    } catch (error) {
      this.logger.error(`❌ Failed to process updates: ${error.message}`);

      // Notify owner that manual intervention needed
      await this.escalateIssue(customer, analysis.summary, {
        type: 'update_failed',
        error: error.message
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Send thank you email for positive feedback
   */
  async sendThankYou(customer) {
    try {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      const msg = {
        to: customer.email,
        from: {
          email: process.env.NOTIFICATION_EMAIL || 'anthonyg552005@gmail.com',
          name: 'OatCode Support'
        },
        subject: `Thanks for the feedback, ${customer.businessName}! 🎉`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1e293b;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
    </style>
</head>
<body>
    <h2>🎉 That's great to hear!</h2>
    <p>Thanks for letting us know you're happy with your website. That's exactly what we love to hear!</p>

    <p>Remember, if you ever need any updates or changes, just reply to any of our check-in emails and we'll take care of it automatically.</p>

    <p>Keep crushing it!</p>

    <p>
        Best,<br>
        The OatCode Team
    </p>
</body>
</html>
        `
      };

      await sgMail.send(msg);
      this.logger.info(`✅ Thank you email sent to ${customer.businessName}`);

    } catch (error) {
      this.logger.error(`Failed to send thank you: ${error.message}`);
    }
  }

  /**
   * Send update confirmation email
   */
  async sendUpdateConfirmation(customer, analysis, results) {
    try {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      const successfulUpdates = results.filter(r => r.success);
      const changesHtml = successfulUpdates.map(r =>
        `<li>✅ ${r.description || r.type}</li>`
      ).join('');

      const msg = {
        to: customer.email,
        from: {
          email: process.env.NOTIFICATION_EMAIL || 'anthonyg552005@gmail.com',
          name: 'OatCode Support'
        },
        subject: `✅ Your website updates are live, ${customer.businessName}!`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1e293b;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .updates-box {
            background: #f0fdf4;
            border-left: 4px solid #10b981;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
        }
    </style>
</head>
<body>
    <h2>🎉 Your updates are live!</h2>

    <p>We've processed your requested changes and your website has been updated:</p>

    <div class="updates-box">
        <h3>Changes made:</h3>
        <ul>
            ${changesHtml}
        </ul>
    </div>

    <p>
        <strong>Check it out:</strong> <a href="${customer.websiteUrl}">${customer.websiteUrl}</a>
    </p>

    <p>Everything look good? If you'd like any additional changes, just reply to this email!</p>

    <p>
        Best,<br>
        The OatCode Team<br>
        <em>Automated Website Management</em>
    </p>
</body>
</html>
        `
      };

      await sgMail.send(msg);
      this.logger.info(`✅ Update confirmation sent to ${customer.businessName}`);

    } catch (error) {
      this.logger.error(`Failed to send update confirmation: ${error.message}`);
    }
  }

  /**
   * Escalate issue to owner
   */
  async escalateIssue(customer, feedbackText, analysis) {
    try {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      const msg = {
        to: process.env.NOTIFICATION_EMAIL || 'anthonyg552005@gmail.com',
        from: process.env.NOTIFICATION_EMAIL || 'anthonyg552005@gmail.com',
        subject: `🚨 Customer Issue: ${customer.businessName}`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body>
    <h2>🚨 Customer Issue Requires Attention</h2>

    <p><strong>Customer:</strong> ${customer.businessName}</p>
    <p><strong>Email:</strong> ${customer.email}</p>
    <p><strong>Website:</strong> <a href="${customer.websiteUrl}">${customer.websiteUrl}</a></p>

    <h3>Feedback:</h3>
    <p style="background: #fef2f2; padding: 15px; border-left: 4px solid #ef4444;">
        ${feedbackText}
    </p>

    <h3>Analysis:</h3>
    <pre>${JSON.stringify(analysis, null, 2)}</pre>

    <p><strong>Action needed:</strong> Manual review and response required</p>
</body>
</html>
        `
      };

      await sgMail.send(msg);
      this.logger.info(`🚨 Issue escalated to owner for ${customer.businessName}`);

    } catch (error) {
      this.logger.error(`Failed to escalate issue: ${error.message}`);
    }
  }
}

module.exports = new CustomerFeedbackService(console);
