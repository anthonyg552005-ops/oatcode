/**
 * BUSINESS RESEARCH SERVICE
 *
 * Fully autonomous AI-powered business research.
 * After a customer pays, this service automatically researches their business
 * to gather all the information needed to build their website.
 *
 * Research sources:
 * - Email domain analysis
 * - Google Places API
 * - Web scraping (if existing website)
 * - Social media
 * - AI inference
 *
 * ZERO HUMAN INTERVENTION REQUIRED
 */

const OpenAI = require('openai');
const GooglePlacesService = require('./GooglePlacesService');
const axios = require('axios');

class BusinessResearchService {
  constructor(logger) {
    this.logger = logger || console;
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.googlePlaces = new GooglePlacesService(logger);
  }

  /**
   * MAIN METHOD: Autonomously research a business
   * Input: Just customer email and name (from Stripe)
   * Output: Complete business profile for website generation
   */
  async researchBusiness(customerEmail, customerName) {
    this.logger.info(`🔬 Autonomous business research started for ${customerName}`);
    this.logger.info(`   Email: ${customerEmail}`);

    const research = {
      customerName,
      customerEmail,
      businessName: null,
      industry: null,
      phone: null,
      address: null,
      city: null,
      state: null,
      description: null,
      services: [],
      confidence: 0,
      sources: []
    };

    try {
      // Step 1: Extract domain from email
      const emailDomain = this.extractDomain(customerEmail);
      research.sources.push('email_domain');

      this.logger.info(`   📧 Email domain: ${emailDomain}`);

      // Step 2: Intelligent business name extraction
      research.businessName = await this.inferBusinessName(customerName, emailDomain);
      this.logger.info(`   🏢 Inferred business name: ${research.businessName}`);

      // Step 3: Google Places search (most reliable)
      const placesData = await this.searchGooglePlaces(research.businessName);
      if (placesData) {
        research.businessName = placesData.name || research.businessName;
        research.industry = placesData.industry;
        research.phone = placesData.phone;
        research.address = placesData.address;
        research.city = placesData.city;
        research.state = placesData.state;
        research.description = placesData.description;
        research.services = placesData.services || [];
        research.confidence = 0.9; // High confidence from Google Places
        research.sources.push('google_places');

        this.logger.info(`   ✅ Found on Google Places!`);
        this.logger.info(`      Industry: ${research.industry}`);
        this.logger.info(`      Location: ${research.city}, ${research.state}`);
        this.logger.info(`      Phone: ${research.phone}`);
      }

      // Step 4: If domain is custom (not gmail/yahoo/etc), scrape their website
      if (this.isCustomDomain(emailDomain) && !placesData) {
        const websiteData = await this.scrapeWebsite(`https://${emailDomain}`);
        if (websiteData) {
          research.businessName = websiteData.businessName || research.businessName;
          research.industry = websiteData.industry || research.industry;
          research.phone = websiteData.phone || research.phone;
          research.description = websiteData.description || research.description;
          research.services = websiteData.services || research.services;
          research.confidence = 0.7; // Medium confidence from scraping
          research.sources.push('website_scrape');

          this.logger.info(`   ✅ Scraped existing website`);
        }
      }

      // Step 5: AI inference to fill gaps
      if (research.confidence < 0.8) {
        const aiInference = await this.aiInferMissingData(research);
        research.industry = research.industry || aiInference.industry;
        research.description = research.description || aiInference.description;
        research.services = research.services.length > 0 ? research.services : aiInference.services;
        research.sources.push('ai_inference');

        this.logger.info(`   🤖 AI filled gaps`);
      }

      // Step 6: Ensure we have minimum required data
      research.businessName = research.businessName || customerName;
      research.industry = research.industry || 'Professional Services';
      research.phone = research.phone || this.generatePlaceholderPhone();
      research.city = research.city || 'Local Area';
      research.description = research.description || `Professional services provided by ${research.businessName}`;

      this.logger.info(`   ✅ Research complete!`);
      this.logger.info(`      Confidence: ${(research.confidence * 100).toFixed(0)}%`);
      this.logger.info(`      Sources: ${research.sources.join(', ')}`);

      return research;

    } catch (error) {
      this.logger.error(`   ❌ Research failed: ${error.message}`);

      // Return basic fallback data
      return {
        customerName,
        customerEmail,
        businessName: customerName,
        industry: 'Professional Services',
        phone: this.generatePlaceholderPhone(),
        address: null,
        city: 'Local Area',
        state: null,
        description: `Professional services provided by ${customerName}`,
        services: ['Consultation', 'Professional Services', 'Expert Advice'],
        confidence: 0.3,
        sources: ['fallback']
      };
    }
  }

  /**
   * Extract domain from email address
   */
  extractDomain(email) {
    const match = email.match(/@(.+)$/);
    return match ? match[1].toLowerCase() : null;
  }

  /**
   * Check if domain is a custom business domain (not gmail, yahoo, etc)
   */
  isCustomDomain(domain) {
    const commonProviders = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
      'aol.com', 'icloud.com', 'protonmail.com', 'mail.com'
    ];
    return domain && !commonProviders.includes(domain.toLowerCase());
  }

  /**
   * Intelligently infer business name from customer name and email
   */
  async inferBusinessName(customerName, emailDomain) {
    try {
      // If custom domain, use domain as business name hint
      if (this.isCustomDomain(emailDomain)) {
        const domainParts = emailDomain.split('.')[0];
        const businessHint = domainParts
          .replace(/[-_]/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        return businessHint || customerName;
      }

      // Otherwise, use customer name
      return customerName;

    } catch (error) {
      return customerName;
    }
  }

  /**
   * Search Google Places for business
   */
  async searchGooglePlaces(businessName) {
    try {
      if (!this.googlePlaces.enabled) {
        return null;
      }

      // Search for business
      const results = await this.googlePlaces.searchBusinesses(businessName, 'United States', 1, true);

      if (results && results.length > 0) {
        const business = results[0];

        return {
          name: business.name,
          industry: business.types?.[0] || business.industry,
          phone: business.phone,
          address: business.address,
          city: business.city,
          state: business.state,
          description: business.description,
          services: business.services || [],
          rating: business.rating,
          reviews: business.reviewCount
        };
      }

      return null;

    } catch (error) {
      this.logger.warn(`   ⚠️  Google Places search failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Scrape existing website for information
   */
  async scrapeWebsite(url) {
    try {
      this.logger.info(`   🌐 Attempting to scrape: ${url}`);

      const response = await axios.get(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OatCodeBot/1.0)'
        }
      });

      const html = response.data;

      // Use AI to extract structured data from HTML
      const extraction = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `Extract business information from this website HTML. Return JSON only.

HTML:
${html.substring(0, 5000)}

Return:
{
  "businessName": "Business name",
  "industry": "Industry type",
  "phone": "Phone number if found",
  "description": "Brief description",
  "services": ["service1", "service2"]
}`
        }],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const data = JSON.parse(extraction.choices[0].message.content);
      return data;

    } catch (error) {
      this.logger.warn(`   ⚠️  Website scraping failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Use AI to infer missing data based on what we know
   */
  async aiInferMissingData(research) {
    try {
      const prompt = `You are a business analyst. Based on the limited information below, infer the most likely business details.

Known Information:
- Business Name: ${research.businessName}
- Email: ${research.customerEmail}
- Industry: ${research.industry || 'Unknown'}

Infer and return JSON only:
{
  "industry": "Most likely industry (e.g., Legal Services, Medical, Restaurant, Retail)",
  "description": "Professional 2-sentence business description",
  "services": ["service1", "service2", "service3"]
}

Be realistic and professional.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const inference = JSON.parse(response.choices[0].message.content);
      return inference;

    } catch (error) {
      this.logger.warn(`   ⚠️  AI inference failed: ${error.message}`);
      return {
        industry: 'Professional Services',
        description: `Professional services provided by ${research.businessName}`,
        services: ['Consultation', 'Professional Services', 'Expert Advice']
      };
    }
  }

  /**
   * Generate a realistic-looking placeholder phone number
   */
  generatePlaceholderPhone() {
    // Generate a number in format (5XX) 555-XXXX (clearly fake but realistic)
    const areaCode = 500 + Math.floor(Math.random() * 100);
    const exchange = '555';
    const line = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `(${areaCode}) ${exchange}-${line}`;
  }
}

module.exports = BusinessResearchService;
