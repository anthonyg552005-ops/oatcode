/**
 * WEBSITE GENERATOR SERVICE
 *
 * Generates professional websites for prospects and clients.
 * Integrates with AIWebsiteGenerationService for AI-powered website creation.
 */

const AIWebsiteGenerationService = require('./AIWebsiteGenerationService');
const fs = require('fs').promises;
const path = require('path');

class WebsiteGeneratorService {
  constructor(logger = console) {
    this.logger = logger;
    this.aiGenerator = new AIWebsiteGenerationService(logger);
    this.generatedSites = new Map(); // In-memory storage for tracking
  }

  /**
   * GENERATE WEBSITE
   *
   * Takes website configuration and generates a live website.
   * Returns the URL of the generated website.
   *
   * @param {Object} config - Website configuration
   * @param {string} config.businessName - Business name
   * @param {string} config.industry - Industry/niche
   * @param {string} config.city - City
   * @param {string} config.state - State
   * @param {Array<string>} config.sections - Sections to include (hero, about, services, etc.)
   * @param {Object} config.customContent - Custom content overrides
   * @param {string} config.type - 'standard' or 'premium'
   * @param {boolean} config.isCustomized - Whether this is a customized version
   * @param {string} config.originalDemoId - Original demo ID if customized
   * @param {string} config.customizationRequestId - Customization request ID
   *
   * @returns {Promise<string>} - URL of generated website
   */
  async generateWebsite(config) {
    this.logger.info(`🌐 Generating ${config.type} website for ${config.businessName}...`);

    try {
      // Build business object for AIWebsiteGenerationService
      const business = {
        name: config.businessName,
        industry: config.industry,
        type: config.industry, // Use industry as type
        city: config.city || '',
        state: config.state || '',
        phone: config.phone || '',
        address: config.address || '',
        rating: 5.0, // Default
        reviewCount: 0,
        website: null,
        description: config.customContent?.description || `Professional ${config.industry} services`,
        tier: config.type === 'premium' ? 'premium' : 'standard'
      };

      // Generate website using AI
      const websiteResult = await this.aiGenerator.generateCompleteWebsite(business);

      // Create unique slug for the website
      const slug = config.isCustomized && config.originalDemoId
        ? `${websiteResult.files.slug}-v${Date.now()}`  // Versioned for customizations
        : websiteResult.files.slug;

      // Save to disk in data/demos/{slug}/index.html
      const demoDir = path.join(process.cwd(), 'data', 'demos', slug);
      await fs.mkdir(demoDir, { recursive: true });
      await fs.writeFile(
        path.join(demoDir, 'index.html'),
        websiteResult.files['index.html']
      );

      // Build the URL
      const websiteUrl = `${process.env.DOMAIN || 'http://localhost:3000'}/demo/${slug}`;

      // Store metadata
      this.generatedSites.set(slug, {
        id: slug,
        url: websiteUrl,
        config,
        business,
        generatedAt: new Date().toISOString(),
        isCustomized: config.isCustomized || false,
        originalDemoId: config.originalDemoId || null
      });

      this.logger.info(`   ✅ Website generated: ${websiteUrl}`);

      return websiteUrl;

    } catch (error) {
      this.logger.error(`Failed to generate website: ${error.message}`);
      throw error;
    }
  }

  /**
   * REGENERATE WEBSITE
   *
   * Regenerates an existing website with new configuration.
   * Used for processing customization requests.
   *
   * @param {string} originalUrl - Original website URL
   * @param {Object} newConfig - Updated configuration
   * @returns {Promise<string>} - URL of regenerated website
   */
  async regenerateWebsite(originalUrl, newConfig) {
    this.logger.info(`🔄 Regenerating website with customizations...`);

    // Mark as customized version
    newConfig.isCustomized = true;

    // Generate new version
    return await this.generateWebsite(newConfig);
  }

  /**
   * GET WEBSITE BY ID
   *
   * Retrieves metadata for a generated website.
   *
   * @param {string} websiteId - Website ID
   * @returns {Object|null} - Website metadata or null if not found
   */
  getWebsiteById(websiteId) {
    return this.generatedSites.get(websiteId) || null;
  }

  /**
   * DELETE WEBSITE
   *
   * Removes a website (useful for demos that expire).
   *
   * @param {string} websiteId - Website ID to delete
   * @returns {Promise<boolean>} - Success status
   */
  async deleteWebsite(websiteId) {
    try {
      // TODO: Replace with actual deletion logic
      // - Remove from hosting
      // - Clean up files
      // - etc.

      this.generatedSites.delete(websiteId);
      this.logger.info(`🗑️ Website deleted: ${websiteId}`);
      return true;

    } catch (error) {
      this.logger.error(`Failed to delete website: ${error.message}`);
      return false;
    }
  }

  /**
   * GENERATE WEBSITE FROM BUSINESS DATA
   *
   * Helper method to generate a website from scraped business data.
   * This is what gets called when creating initial demos for prospects.
   *
   * @param {Object} businessData - Scraped business data
   * @param {string} type - 'standard' or 'premium'
   * @returns {Promise<string>} - URL of generated website
   */
  async generateFromBusinessData(businessData, type = 'standard') {
    this.logger.info(`🎨 Generating website from business data: ${businessData.name}...`);

    // Pass business data directly to AI generator
    const business = {
      name: businessData.name || 'Business',
      industry: businessData.industry || businessData.types?.[0] || 'Business',
      type: businessData.industry || businessData.types?.[0] || 'Business',
      city: businessData.city || '',
      state: businessData.state || '',
      phone: businessData.phone || '',
      address: businessData.address || '',
      rating: businessData.rating || 5.0,
      reviewCount: businessData.reviewCount || 0,
      website: businessData.website || null,
      description: businessData.description || `Professional ${businessData.industry || 'services'}`,
      tier: type === 'premium' ? 'premium' : 'standard'
    };

    // Generate using AI
    const websiteResult = await this.aiGenerator.generateCompleteWebsite(business);

    // Save to disk
    const slug = websiteResult.files.slug;
    const demoDir = path.join(process.cwd(), 'data', 'demos', slug);
    await fs.mkdir(demoDir, { recursive: true });
    await fs.writeFile(
      path.join(demoDir, 'index.html'),
      websiteResult.files['index.html']
    );

    // Build URL
    const websiteUrl = `${process.env.DOMAIN || 'http://localhost:3000'}/demo/${slug}`;

    // Store metadata
    this.generatedSites.set(slug, {
      id: slug,
      url: websiteUrl,
      business,
      generatedAt: new Date().toISOString(),
      isCustomized: false
    });

    this.logger.info(`   ✅ Website generated from business data: ${websiteUrl}`);

    return websiteUrl;
  }

  /**
   * GET STOCK IMAGES
   *
   * Returns stock image URLs based on industry.
   * In a real implementation, this would use Unsplash/Pexels API.
   *
   * @param {string} industry - Industry type
   * @returns {Array<string>} - Array of image URLs
   */
  getStockImages(industry) {
    // TODO: Replace with actual Unsplash/Pexels API calls
    // For now, return placeholder URLs
    return [
      'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1200',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200',
      'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200'
    ];
  }

  /**
   * GENERATE AI IMAGES (Premium only)
   *
   * Generates custom AI images using DALL-E.
   * Only used for premium websites.
   *
   * @param {string} businessName - Business name
   * @param {string} industry - Industry
   * @param {number} count - Number of images to generate
   * @returns {Promise<Array<string>>} - Array of generated image URLs
   */
  async generateAIImages(businessName, industry, count = 3) {
    // TODO: Integrate with DALL-E API
    // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // const images = await openai.images.generate({
    //   model: "dall-e-3",
    //   prompt: `Professional, modern image for a ${industry} business called ${businessName}`,
    //   n: count,
    //   size: "1792x1024"
    // });
    // return images.data.map(img => img.url);

    this.logger.info(`🎨 AI image generation requested for ${businessName} (${count} images)`);

    // Placeholder - return empty array for now
    return [];
  }
}

module.exports = WebsiteGeneratorService;
