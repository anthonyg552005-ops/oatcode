/**
 * OUTREACH SERVICE
 * Handles automated outreach to businesses
 */

const OpenAI = require('openai');
const SendGridService = require('./SendGridService');
const GooglePlacesService = require('./GooglePlacesService');
const AIWebsiteGenerationService = require('./AIWebsiteGenerationService');

class OutreachService {
  constructor(logger) {
    this.logger = logger || console;
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.sendGrid = new SendGridService();
    this.googlePlaces = new GooglePlacesService();
    this.websiteGenerator = new AIWebsiteGenerationService(logger);

    this.testMode = process.env.SKIP_RESEARCH !== 'true'; // Test mode during research phase
  }

  /**
   * Generate personalized outreach email for a business
   */
  async generateOutreachEmail(business) {
    const prompt = `You are a friendly, helpful website provider reaching out to a small business.

Business Info:
- Name: ${business.name}
- Industry: ${business.industry || business.types?.join(', ') || 'unknown'}
- Location: ${business.address || business.city}
- Rating: ${business.rating || 'N/A'} stars
- Has website: ${business.hasWebsite ? 'Yes (poor quality)' : 'No'}

Write a personalized, conversational outreach email that:
1. Mentions something specific about their business (location, rating, etc.)
2. Offers to build them a free demo website
3. Explains the benefit clearly (get more customers)
4. Keeps it short and friendly (3-4 sentences)
5. Includes a clear call-to-action

Return JSON with: { subject, body }`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content);
  }

  /**
   * Send outreach email to a business
   */
  async sendOutreach(business, email) {
    const testPrefix = this.testMode ? '[TEST] ' : '';

    const result = await this.sendGrid.send({
      to: business.email || 'test@example.com',
      subject: testPrefix + email.subject,
      text: email.body,
      html: `<p>${email.body.replace(/\n/g, '<br>')}</p>`
    });

    this.logger.info(`   📧 Sent outreach to ${business.name} ${this.testMode ? '(TEST MODE)' : ''}`);

    return result;
  }

  /**
   * Full outreach workflow: generate email + create demo + send
   */
  async executeOutreach(business) {
    try {
      // Step 1: Generate personalized email
      const email = await this.generateOutreachEmail(business);

      // Step 2: Create demo website
      const demo = await this.websiteGenerator.generateWebsiteForBusiness({
        businessName: business.name,
        industry: business.industry || business.types?.[0] || 'business',
        location: business.city || business.address,
        description: `Professional website for ${business.name}`
      });

      // Step 3: Add demo link to email
      email.body += `\n\nCheck out your demo: ${demo.demoUrl || 'https://oatcode.com/demo/preview'}`;

      // Step 4: Send email
      const sendResult = await this.sendOutreach(business, email);

      return {
        success: true,
        business: business.name,
        email,
        demo,
        sendResult
      };

    } catch (error) {
      this.logger.error(`❌ Outreach failed for ${business.name}: ${error.message}`);
      return {
        success: false,
        business: business.name,
        error: error.message
      };
    }
  }

  /**
   * Find and outreach to multiple businesses
   * UPDATED: Now focuses on low-maintenance businesses WITHOUT websites
   */
  async findAndOutreach(query, location, count = 10, targetNoWebsite = true) {
    this.logger.info(`🔍 Finding ${count} ${query} businesses in ${location}...`);

    let businesses;

    if (targetNoWebsite) {
      // PRIMARY STRATEGY: Find low-maintenance businesses WITHOUT websites
      this.logger.info(`   🎯 Targeting low-maintenance businesses WITHOUT websites (easiest conversions)`);
      businesses = await this.googlePlaces.searchLowMaintenanceBusinesses(location, 'mvp');
    } else {
      // Fallback: Regular search
      businesses = await this.googlePlaces.searchBusinesses(query, location);
    }

    const selected = businesses.slice(0, count);

    this.logger.info(`   Found ${businesses.length} businesses, processing ${selected.length}...`);

    // Execute outreach for each
    const results = [];
    for (const business of selected) {
      const result = await this.executeOutreach(business);
      results.push(result);

      // Rate limit: 30 seconds between emails
      if (results.length < selected.length) {
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    const successful = results.filter(r => r.success).length;
    this.logger.info(`✅ Outreach complete: ${successful}/${selected.length} successful`);

    return {
      total: selected.length,
      successful,
      results
    };
  }

  /**
   * Find and outreach to businesses WITH existing websites (Phase 2 expansion)
   */
  async findAndOutreachWithWebsites(location, count = 10) {
    this.logger.info(`🔍 Finding ${count} low-maintenance businesses WITH websites in ${location}...`);
    this.logger.info(`   💡 These are "upgrade" targets - need better website for less money`);

    const businesses = await this.googlePlaces.searchBusinessesWithWebsites(location, 'automation');
    const selected = businesses.slice(0, count);

    this.logger.info(`   Found ${businesses.length} businesses, processing ${selected.length}...`);

    // Execute outreach with different messaging (upgrade angle)
    const results = [];
    for (const business of selected) {
      const result = await this.executeOutreach(business, { upgradeAngle: true });
      results.push(result);

      if (results.length < selected.length) {
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    const successful = results.filter(r => r.success).length;
    this.logger.info(`✅ Upgrade outreach complete: ${successful}/${selected.length} successful`);

    return {
      total: selected.length,
      successful,
      results
    };
  }
}

module.exports = OutreachService;
