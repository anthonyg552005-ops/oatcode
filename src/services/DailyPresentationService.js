/**
 * DAILY PRESENTATION SERVICE
 *
 * Creates a beautiful, visual daily presentation showing:
 * - What the AI accomplished today
 * - Screenshots/examples of websites created
 * - Email templates being used
 * - Business improvements made
 * - Future plans
 * - Visual metrics and charts
 *
 * Like a CEO walkthrough of the entire operation.
 */

const OpenAI = require('openai');
const sgMail = require('@sendgrid/mail');
const fs = require('fs').promises;
const path = require('path');
const OwnerDemoService = require('./OwnerDemoService');

class DailyPresentationService {
  constructor(logger) {
    this.logger = logger;
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.ownerDemo = new OwnerDemoService(logger);

    // Setup SendGrid
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }

    this.presentationData = {
      date: new Date().toISOString().split('T')[0],
      accomplishments: [],
      websiteExamples: [],
      emailExamples: [],
      improvements: [],
      futurePlans: [],
      metrics: {}
    };
  }

  /**
   * Log an accomplishment for today's presentation
   */
  logAccomplishment(category, description, visual = null) {
    this.presentationData.accomplishments.push({
      timestamp: new Date().toISOString(),
      category, // 'system', 'outreach', 'optimization', 'customer'
      description,
      visual // URL or data for visual representation
    });
  }

  /**
   * Add a website example to showcase
   */
  addWebsiteExample(businessName, industry, websiteUrl, highlights) {
    this.presentationData.websiteExamples.push({
      businessName,
      industry,
      url: websiteUrl,
      highlights, // Array of features: ['Professional design', 'Mobile responsive', etc.]
      createdAt: new Date().toISOString()
    });
  }

  /**
   * Add an email template example
   */
  addEmailExample(type, subject, preview, metrics) {
    this.presentationData.emailExamples.push({
      type, // 'outreach', 'follow-up', 'upsell', etc.
      subject,
      preview, // First few lines
      metrics // { sent: 10, opened: 5, clicked: 2 }
    });
  }

  /**
   * Log a business improvement made today
   */
  logImprovement(area, description, impact) {
    this.presentationData.improvements.push({
      area, // 'conversion', 'automation', 'pricing', etc.
      description,
      impact, // 'high', 'medium', 'low'
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Add future plans
   */
  addFuturePlan(title, description, timeline) {
    this.presentationData.futurePlans.push({
      title,
      description,
      timeline // 'Next 24 hours', 'This week', etc.
    });
  }

  /**
   * Update metrics
   */
  updateMetrics(metrics) {
    this.presentationData.metrics = {
      ...this.presentationData.metrics,
      ...metrics,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Generate AI-powered executive summary
   */
  async generateExecutiveSummary() {
    const prompt = `You are presenting to the CEO (Anthony) about what his autonomous AI business accomplished today.

Today's Data:
- Date: ${this.presentationData.date}
- Accomplishments: ${this.presentationData.accomplishments.length} total
- Websites Created: ${this.presentationData.websiteExamples.length}
- Email Campaigns: ${this.presentationData.emailExamples.length}
- Improvements Made: ${this.presentationData.improvements.length}
- Metrics: ${JSON.stringify(this.presentationData.metrics)}

Write a compelling executive summary (3-4 paragraphs) that:
1. Highlights the most impressive accomplishments
2. Shows business progress and momentum
3. Demonstrates AI's autonomous decision-making
4. Builds confidence in the system
5. Sets up what's coming next

Tone: Professional but exciting, like a successful startup CEO briefing investors.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 600
    });

    return response.choices[0].message.content.trim();
  }

  /**
   * Generate beautiful HTML presentation
   */
  async generateHTMLPresentation() {
    const executiveSummary = await this.generateExecutiveSummary();
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OatCode Daily Presentation - ${this.presentationData.date}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 20px;
            line-height: 1.6;
        }

        .presentation {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
            color: white;
            padding: 60px 40px;
            text-align: center;
        }

        .header h1 {
            font-size: 3em;
            margin-bottom: 10px;
            font-weight: 800;
        }

        .header .date {
            font-size: 1.2em;
            opacity: 0.9;
        }

        .section {
            padding: 40px;
            border-bottom: 2px solid #f0f0f0;
        }

        .section:last-child {
            border-bottom: none;
        }

        .section-title {
            font-size: 2em;
            color: #1e40af;
            margin-bottom: 20px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .section-icon {
            font-size: 1.5em;
        }

        .executive-summary {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            padding: 30px;
            border-radius: 15px;
            font-size: 1.1em;
            line-height: 1.8;
            margin-bottom: 20px;
        }

        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }

        .metric-card {
            background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
            padding: 25px;
            border-radius: 12px;
            text-align: center;
        }

        .metric-value {
            font-size: 3em;
            font-weight: 800;
            color: #0369a1;
        }

        .metric-label {
            color: #075985;
            font-size: 0.9em;
            margin-top: 5px;
            font-weight: 600;
        }

        .accomplishment-item {
            background: #f8fafc;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 15px;
            border-left: 4px solid #2563eb;
        }

        .accomplishment-category {
            color: #2563eb;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 0.85em;
            margin-bottom: 8px;
        }

        .website-card {
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 20px;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .website-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }

        .website-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }

        .business-name {
            font-size: 1.5em;
            font-weight: 700;
            color: #1e293b;
        }

        .industry-badge {
            background: #dbeafe;
            color: #1e40af;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
        }

        .highlights {
            list-style: none;
            margin-top: 15px;
        }

        .highlights li {
            padding: 8px 0;
            padding-left: 25px;
            position: relative;
        }

        .highlights li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #10b981;
            font-weight: bold;
        }

        .email-example {
            background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 15px;
        }

        .email-subject {
            font-weight: 700;
            font-size: 1.2em;
            color: #1e293b;
            margin-bottom: 10px;
        }

        .email-preview {
            color: #64748b;
            font-style: italic;
            margin-bottom: 10px;
        }

        .email-metrics {
            display: flex;
            gap: 20px;
            font-size: 0.9em;
            margin-top: 15px;
        }

        .email-metric {
            background: white;
            padding: 8px 15px;
            border-radius: 8px;
        }

        .improvement-item {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
            padding: 20px;
            background: #fef3c7;
            border-radius: 10px;
        }

        .improvement-icon {
            font-size: 2em;
        }

        .improvement-impact {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 5px;
            font-size: 0.8em;
            font-weight: 600;
            margin-left: 10px;
        }

        .impact-high {
            background: #dcfce7;
            color: #166534;
        }

        .impact-medium {
            background: #fef3c7;
            color: #92400e;
        }

        .impact-low {
            background: #e0e7ff;
            color: #3730a3;
        }

        .future-plan {
            background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 15px;
        }

        .plan-title {
            font-weight: 700;
            font-size: 1.2em;
            color: #0c4a6e;
            margin-bottom: 8px;
        }

        .timeline-badge {
            display: inline-block;
            background: #0369a1;
            color: white;
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 0.85em;
            margin-top: 10px;
        }

        .footer {
            background: #1e293b;
            color: white;
            text-align: center;
            padding: 30px;
        }

        .no-data {
            text-align: center;
            padding: 40px;
            color: #64748b;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="presentation">
        <!-- Header -->
        <div class="header">
            <h1>🚀 OatCode Daily Presentation</h1>
            <div class="date">${today}</div>
        </div>

        <!-- Executive Summary -->
        <div class="section">
            <div class="section-title">
                <span class="section-icon">📊</span>
                Executive Summary
            </div>
            <div class="executive-summary">
                ${executiveSummary}
            </div>
        </div>

        <!-- Key Metrics -->
        <div class="section">
            <div class="section-title">
                <span class="section-icon">📈</span>
                Key Metrics
            </div>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">${this.presentationData.metrics.leadsGenerated || 0}</div>
                    <div class="metric-label">Leads Generated</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${this.presentationData.metrics.emailsSent || 0}</div>
                    <div class="metric-label">Emails Sent</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${this.presentationData.metrics.websitesCreated || 0}</div>
                    <div class="metric-label">Websites Created</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${this.presentationData.metrics.customersAcquired || 0}</div>
                    <div class="metric-label">Customers Acquired</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">$${this.presentationData.metrics.revenue || 0}</div>
                    <div class="metric-label">Revenue Today</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${this.presentationData.accomplishments.length}</div>
                    <div class="metric-label">Accomplishments</div>
                </div>
            </div>
        </div>

        <!-- Today's Accomplishments -->
        <div class="section">
            <div class="section-title">
                <span class="section-icon">✅</span>
                Today's Accomplishments
            </div>
            ${this.presentationData.accomplishments.length > 0 ?
                this.presentationData.accomplishments.map(acc => `
                    <div class="accomplishment-item">
                        <div class="accomplishment-category">${acc.category}</div>
                        <div>${acc.description}</div>
                    </div>
                `).join('') :
                '<div class="no-data">No accomplishments recorded yet today.</div>'
            }
        </div>

        <!-- Website Examples -->
        <div class="section">
            <div class="section-title">
                <span class="section-icon">🌐</span>
                Websites Created Today
            </div>
            ${this.presentationData.websiteExamples.length > 0 ?
                this.presentationData.websiteExamples.map(site => `
                    <div class="website-card">
                        <div class="website-header">
                            <div class="business-name">${site.businessName}</div>
                            <div class="industry-badge">${site.industry}</div>
                        </div>
                        <div>🔗 <a href="${site.url}" target="_blank">${site.url}</a></div>
                        <ul class="highlights">
                            ${site.highlights.map(h => `<li>${h}</li>`).join('')}
                        </ul>
                    </div>
                `).join('') :
                '<div class="no-data">No websites created yet today. AI is in learning/optimization mode.</div>'
            }
        </div>

        <!-- Email Examples -->
        <div class="section">
            <div class="section-title">
                <span class="section-icon">📧</span>
                Email Campaigns
            </div>
            ${this.presentationData.emailExamples.length > 0 ?
                this.presentationData.emailExamples.map(email => `
                    <div class="email-example">
                        <div class="email-subject">📨 ${email.subject}</div>
                        <div class="email-preview">"${email.preview}..."</div>
                        <div class="email-metrics">
                            <div class="email-metric">📤 Sent: ${email.metrics.sent || 0}</div>
                            <div class="email-metric">👁️ Opened: ${email.metrics.opened || 0}</div>
                            <div class="email-metric">🖱️ Clicked: ${email.metrics.clicked || 0}</div>
                        </div>
                    </div>
                `).join('') :
                '<div class="no-data">No emails sent yet today.</div>'
            }
        </div>

        <!-- Business Improvements -->
        <div class="section">
            <div class="section-title">
                <span class="section-icon">⚡</span>
                Improvements Made
            </div>
            ${this.presentationData.improvements.length > 0 ?
                this.presentationData.improvements.map(imp => `
                    <div class="improvement-item">
                        <div class="improvement-icon">🔧</div>
                        <div>
                            <strong>${imp.area}</strong>
                            <span class="improvement-impact impact-${imp.impact}">${imp.impact.toUpperCase()} IMPACT</span>
                            <div style="margin-top: 10px;">${imp.description}</div>
                        </div>
                    </div>
                `).join('') :
                '<div class="no-data">System is stable. Monitoring for optimization opportunities.</div>'
            }
        </div>

        <!-- Future Plans -->
        <div class="section">
            <div class="section-title">
                <span class="section-icon">🎯</span>
                What's Coming Next
            </div>
            ${this.presentationData.futurePlans.length > 0 ?
                this.presentationData.futurePlans.map(plan => `
                    <div class="future-plan">
                        <div class="plan-title">${plan.title}</div>
                        <div>${plan.description}</div>
                        <div class="timeline-badge">⏰ ${plan.timeline}</div>
                    </div>
                `).join('') :
                `<div class="future-plan">
                    <div class="plan-title">Continue Autonomous Operation</div>
                    <div>AI will continue optimizing, testing, and growing the business 24/7</div>
                    <div class="timeline-badge">⏰ Ongoing</div>
                </div>`
            }
        </div>

        <!-- Footer -->
        <div class="footer">
            <p><strong>Generated by OatCode Autonomous AI</strong></p>
            <p style="margin-top: 10px; opacity: 0.8;">Running completely autonomously since ${new Date(this.presentationData.metrics.startDate || Date.now()).toLocaleDateString()}</p>
        </div>
    </div>
</body>
</html>`;

    return html;
  }

  /**
   * Send daily presentation via email
   */
  async sendDailyPresentation() {
    try {
      this.logger.info('📊 Generating daily presentation...');

      const presentationHTML = await this.generateHTMLPresentation();
      const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      const msg = {
        to: process.env.NOTIFICATION_EMAIL || 'anthonyg552005@gmail.com',
        from: process.env.NOTIFICATION_EMAIL || 'anthonyg552005@gmail.com',
        subject: `📊 OatCode Daily Presentation - ${today}`,
        html: presentationHTML
      };

      await sgMail.send(msg);

      this.logger.info(`✅ Daily presentation sent to ${msg.to}`);

      // Also send daily demo for owner to test
      this.logger.info('🎨 Sending daily demo for owner to test...');
      await this.ownerDemo.sendDailyOwnerDemo();

      // Reset data for tomorrow
      this.resetDailyData();

    } catch (error) {
      this.logger.error(`❌ Failed to send daily presentation: ${error.message}`);
    }
  }

  /**
   * Reset data for next day
   */
  resetDailyData() {
    this.presentationData = {
      date: new Date().toISOString().split('T')[0],
      accomplishments: [],
      websiteExamples: [],
      emailExamples: [],
      improvements: [],
      futurePlans: [],
      metrics: {
        startDate: this.presentationData.metrics.startDate || new Date().toISOString()
      }
    };
  }

  /**
   * Save presentation HTML to file for viewing
   */
  async savePresentationToFile() {
    try {
      const presentationHTML = await this.generateHTMLPresentation();
      const filePath = path.join(process.cwd(), 'public', 'daily-presentation.html');

      await fs.writeFile(filePath, presentationHTML);

      this.logger.info(`📄 Daily presentation saved to: ${filePath}`);
      this.logger.info(`🌐 View at: ${process.env.DOMAIN || 'http://localhost:3000'}/daily-presentation.html`);

      return filePath;
    } catch (error) {
      this.logger.error(`❌ Failed to save presentation: ${error.message}`);
    }
  }
}

module.exports = DailyPresentationService;
