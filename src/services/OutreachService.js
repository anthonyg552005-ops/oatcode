/**
 * OUTREACH SERVICE
 * Handles automated outreach to businesses
 */

const OpenAI = require('openai');
const SendGridService = require('./SendGridService');
const GooglePlacesService = require('./GooglePlacesService');
const AIWebsiteGenerationService = require('./AIWebsiteGenerationService');
const MultiSourceBusinessDiscovery = require('./MultiSourceBusinessDiscovery');
const DemoComparisonService = require('./DemoComparisonService');

class OutreachService {
  constructor(logger) {
    this.logger = logger || console;
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.sendGrid = new SendGridService();
    this.googlePlaces = new GooglePlacesService();
    this.websiteGenerator = new AIWebsiteGenerationService(logger);
    this.multiSourceDiscovery = new MultiSourceBusinessDiscovery(logger);
    this.demoComparison = new DemoComparisonService(logger);

    this.testMode = process.env.SKIP_RESEARCH !== 'true'; // Test mode during research phase
  }

  /**
   * Generate HYPER-PERSONALIZED outreach email using gathered intelligence
   * Uses AI to research the business and craft a unique, compelling email
   */
  async generateOutreachEmail(business, intelligence = null) {
    // If no intelligence provided, gather it now
    if (!intelligence) {
      this.logger.info(`   🔬 Gathering intelligence for personalized email...`);
      intelligence = await this.multiSourceDiscovery.gatherBusinessIntelligence(business);
    }

    const prompt = `You are a friendly, helpful website provider reaching out to a small business.

Business Info:
- Name: ${business.name}
- Industry: ${business.industry || business.types?.join(', ') || 'unknown'}
- Location: ${business.address || business.city}
- Rating: ${business.rating || 'N/A'} stars
- Has website: ${business.hasWebsite ? 'Yes (poor quality)' : 'No'}

PERSONALIZATION INTELLIGENCE (use this to make email HIGHLY relevant):
${intelligence.emailHooks && intelligence.emailHooks.length > 0 ? `
Email Hooks (USE THESE):
${intelligence.emailHooks.map(hook => `- ${hook}`).join('\n')}
` : ''}

${intelligence.ownerName ? `Owner: ${intelligence.ownerName}` : ''}
${intelligence.yearsInBusiness ? `Years in Business: ${intelligence.yearsInBusiness}` : ''}

${intelligence.reviews ? `
Customer Feedback:
- Average Rating: ${intelligence.reviews.average}
- Customers Love: ${intelligence.reviews.commonPraises?.join(', ')}
- Common Issues: ${intelligence.reviews.commonComplaints?.join(', ')}
` : ''}

${intelligence.personalizedInsights && intelligence.personalizedInsights.length > 0 ? `
Unique Insights:
${intelligence.personalizedInsights.map(i => `- ${i}`).join('\n')}
` : ''}

Write a HYPER-PERSONALIZED, conversational outreach email that:
1. Uses 1-2 of the email hooks above (if available) to show you researched them
2. ${intelligence.ownerName ? `Addresses ${intelligence.ownerName} by name` : 'Addresses the business owner'}
3. References something SPECIFIC (their great reviews, award, years in business, etc.)
4. Identifies their pain point (no website, hard to find online, outdated site)
5. Offers a free demo website as solution
6. Explains clear benefit (more customers finding them)
7. Keeps it warm, conversational, and SHORT (3-5 sentences max)
8. Includes clear call-to-action

TONE: Friendly, helpful, like a local business owner helping another business owner
AVOID: Corporate speak, sales jargon, generic templates

Return JSON with: { subject, body }`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      
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
   * Full outreach workflow: research + generate email + create demo + send
   * NOW WITH INTELLIGENCE GATHERING for hyper-personalization
   */
  async executeOutreach(business, options = {}) {
    try {
      // Step 0: Gather intelligence on business (if not in quick mode)
      let intelligence = null;
      if (!options.skipIntelligence) {
        this.logger.info(`   🔬 Researching ${business.name} for personalization...`);
        intelligence = await this.multiSourceDiscovery.gatherBusinessIntelligence(business);
      }

      // Step 1: Generate HYPER-PERSONALIZED email using intelligence
      const email = await this.generateOutreachEmail(business, intelligence);

      // Step 2: Create BOTH Standard + Premium demos for comparison
      this.logger.info(`   🎨 Creating Standard + Premium demo comparison...`);
      const demoComparison = await this.demoComparison.getDemoForOutreach({
        businessName: business.name,
        name: business.name,
        industry: business.industry || business.types?.[0] || 'business',
        location: business.city || business.address,
        city: business.city,
        address: business.address,
        phone: business.phone,
        email: business.email,
        description: `Professional website for ${business.name}`
      });

      // Step 3: Add demo comparison to email (shows value of Premium tier)
      email.body += `\n\n${demoComparison.emailText}`;

      // Step 4: Send email
      const sendResult = await this.sendOutreach(business, email);

      // Step 5: Log activity to documentation
      if (global.documentation) {
        global.documentation.logActivity('outreach', 'sent_email', {
          business: business.name,
          industry: business.industry || business.types?.[0],
          location: business.city || business.address,
          hasIntelligence: !!intelligence,
          emailSubject: email.subject
        });
      }

      // Step 6: Start 5-email follow-up sequence
      if (global.emailSequence) {
        await global.emailSequence.startSequence(business, email);
        this.logger.info(`   📧 Started follow-up sequence (5 emails over 21 days)`);
      }

      return {
        success: true,
        business: business.name,
        email,
        demoComparison,
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
