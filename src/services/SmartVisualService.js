/**
 * SMART VISUAL SERVICE
 *
 * Cost-optimized visual generation for client websites:
 * - FREE stock photos from Unsplash/Pexels (default for all clients)
 * - OPTIONAL AI generation for premium clients ($50-100 upsell)
 * - Focus budget on customer acquisition, not expensive visuals
 *
 * Business Logic:
 * - 99% of clients: Free stock photos = $0 cost, $197 revenue = 100% margin
 * - 1% premium: AI visuals = $3 cost, $297 revenue = 99% margin
 * - Saves $200-300/month vs using AI for everyone
 */

const axios = require('axios');
const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');

class SmartVisualService {
  constructor(logger) {
    this.logger = logger;

    // Initialize OpenAI for premium clients only
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.runwayAPIKey = process.env.RUNWAY_API_KEY;
    this.runwayBaseURL = 'https://api.dev.runwayml.com/v1';

    // Free stock photo APIs
    this.unsplashAccessKey = 'your_unsplash_key_here'; // Free tier: 50 requests/hour
    this.pexelsAPIKey = 'your_pexels_key_here'; // Free tier: 200 requests/hour

    this.outputDir = path.join(__dirname, '../../data/generated-assets');
  }

  /**
   * Generate visual package for client website
   * Uses FREE stock photos by default, AI only if premium tier
   */
  async generateWebsiteVisuals(businessInfo, tier = 'standard') {
    this.logger.info(`🎨 Generating visuals for ${businessInfo.name} (${tier} tier)...`);

    if (tier === 'premium') {
      // Premium clients get AI-generated custom visuals
      return await this.generatePremiumVisuals(businessInfo);
    } else {
      // Standard clients get free stock photos (99% of clients)
      return await this.generateStandardVisuals(businessInfo);
    }
  }

  /**
   * STANDARD TIER: Free stock photos (DEFAULT)
   * Cost: $0 per client
   * Quality: Professional, proven effective
   * Speed: Instant
   */
  async generateStandardVisuals(businessInfo) {
    this.logger.info('   Using FREE stock photos (cost: $0)');

    const visualPackage = {
      businessName: businessInfo.name,
      industry: businessInfo.industry,
      tier: 'standard',
      cost: 0,
      generatedAt: new Date().toISOString(),
      assets: {}
    };

    try {
      // Get industry-relevant stock photos from curated free sources
      const stockPhotos = await this.getStockPhotos(businessInfo.industry);

      visualPackage.assets = {
        heroImage: stockPhotos.hero,
        logo: this.getIndustryIcon(businessInfo.industry), // Free icon library
        additionalImages: stockPhotos.gallery,
        colorPalette: this.getIndustryColorPalette(businessInfo.industry)
      };

      this.logger.info('   ✅ Visual package ready (FREE stock photos)');
      return visualPackage;

    } catch (error) {
      this.logger.error(`Failed to generate standard visuals: ${error.message}`);
      // Fallback to default placeholder images
      return this.getFallbackVisuals(businessInfo);
    }
  }

  /**
   * PREMIUM TIER: AI-generated custom visuals (OPTIONAL UPSELL)
   * Cost: ~$3 per client
   * Revenue: +$50-100/month
   * Margin: $47-97 profit per premium client
   */
  async generatePremiumVisuals(businessInfo) {
    this.logger.info('   Using AI generation (cost: ~$3, revenue: +$50-100)');

    const visualPackage = {
      businessName: businessInfo.name,
      industry: businessInfo.industry,
      tier: 'premium',
      cost: 3,
      revenue: 50, // Minimum upsell price
      profit: 47,
      generatedAt: new Date().toISOString(),
      assets: {}
    };

    try {
      // Generate custom AI visuals (only for premium clients)
      const logo = await this.generateAILogo(businessInfo);
      const heroImage = await this.generateAIHeroImage(businessInfo);
      const colorPalette = await this.generateAIColorPalette(businessInfo);

      visualPackage.assets = {
        logo: logo,
        heroImage: heroImage,
        colorPalette: colorPalette,
        additionalImages: [] // AI images are expensive, keep minimal
      };

      this.logger.info('   ✅ Premium AI visuals generated');
      return visualPackage;

    } catch (error) {
      this.logger.error(`AI generation failed, falling back to stock: ${error.message}`);
      // If AI fails, fall back to free stock photos
      return await this.generateStandardVisuals(businessInfo);
    }
  }

  /**
   * Get free stock photos from Unsplash/Pexels
   * Cost: $0
   */
  async getStockPhotos(industry) {
    // Curated industry-specific stock photo URLs
    const industryPhotos = {
      'restaurant': {
        hero: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
        gallery: [
          'https://images.unsplash.com/photo-1414235077428-338989a2e8c0',
          'https://images.unsplash.com/photo-1590846406792-0adc7f938f1d',
          'https://images.unsplash.com/photo-1555396273-367ea4eb4db5'
        ]
      },
      'retail': {
        hero: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8',
        gallery: [
          'https://images.unsplash.com/photo-1472851294608-062f824d29cc',
          'https://images.unsplash.com/photo-1483985988355-763728e1935b',
          'https://images.unsplash.com/photo-1445205170230-053b83016050'
        ]
      },
      'professional': {
        hero: 'https://images.unsplash.com/photo-1497366216548-37526070297c',
        gallery: [
          'https://images.unsplash.com/photo-1556761175-4b46a572b786',
          'https://images.unsplash.com/photo-1542744173-8e7e53415bb0',
          'https://images.unsplash.com/photo-1519389950473-47ba0277781c'
        ]
      },
      'healthcare': {
        hero: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907',
        gallery: [
          'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d',
          'https://images.unsplash.com/photo-1579684385127-1ef15d508118',
          'https://images.unsplash.com/photo-1584982751601-97dcc096659c'
        ]
      },
      'construction': {
        hero: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5',
        gallery: [
          'https://images.unsplash.com/photo-1503387762-592deb58ef4e',
          'https://images.unsplash.com/photo-1581094794329-c8112a89af12',
          'https://images.unsplash.com/photo-1504307651254-35680f356dfd'
        ]
      },
      'default': {
        hero: 'https://images.unsplash.com/photo-1497366216548-37526070297c',
        gallery: [
          'https://images.unsplash.com/photo-1552664730-d307ca884978',
          'https://images.unsplash.com/photo-1600880292203-757bb62b4baf',
          'https://images.unsplash.com/photo-1556761175-4b46a572b786'
        ]
      }
    };

    return industryPhotos[industry.toLowerCase()] || industryPhotos.default;
  }

  /**
   * Get free industry icon (no cost)
   */
  getIndustryIcon(industry) {
    const icons = {
      'restaurant': '🍽️',
      'retail': '🛍️',
      'professional': '💼',
      'healthcare': '⚕️',
      'construction': '🏗️',
      'default': '🏢'
    };

    return {
      emoji: icons[industry.toLowerCase()] || icons.default,
      type: 'icon',
      cost: 0
    };
  }

  /**
   * Get industry-appropriate color palette (no cost)
   */
  getIndustryColorPalette(industry) {
    const palettes = {
      'restaurant': {
        primary: '#D97706',
        secondary: '#DC2626',
        accent: '#FCD34D',
        background: '#FFFFFF',
        text: '#1F2937'
      },
      'retail': {
        primary: '#EC4899',
        secondary: '#8B5CF6',
        accent: '#F59E0B',
        background: '#FFFFFF',
        text: '#1F2937'
      },
      'professional': {
        primary: '#2563EB',
        secondary: '#1E40AF',
        accent: '#3B82F6',
        background: '#FFFFFF',
        text: '#1F2937'
      },
      'healthcare': {
        primary: '#059669',
        secondary: '#0D9488',
        accent: '#10B981',
        background: '#FFFFFF',
        text: '#1F2937'
      },
      'construction': {
        primary: '#F59E0B',
        secondary: '#D97706',
        accent: '#FCD34D',
        background: '#FFFFFF',
        text: '#1F2937'
      },
      'default': {
        primary: '#2563EB',
        secondary: '#7C3AED',
        accent: '#F59E0B',
        background: '#FFFFFF',
        text: '#1F2937'
      }
    };

    return palettes[industry.toLowerCase()] || palettes.default;
  }

  /**
   * AI Logo generation (PREMIUM ONLY)
   * Cost: ~$0.04
   */
  async generateAILogo(businessInfo) {
    const prompt = `Professional modern logo for "${businessInfo.name}", ${businessInfo.industry} business,
    clean minimalist design, memorable icon, professional color scheme, vector-style`;

    const response = await this.openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard' // Use standard instead of hd to save costs
    });

    return {
      url: response.data[0].url,
      type: 'ai-generated',
      cost: 0.04
    };
  }

  /**
   * AI Hero Image generation (PREMIUM ONLY)
   * Cost: ~$0.08
   */
  async generateAIHeroImage(businessInfo) {
    const prompt = `Professional hero banner for ${businessInfo.industry} website,
    modern business environment, clean composition, professional photography style`;

    const response = await this.openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1792x1024',
      quality: 'standard'
    });

    return {
      url: response.data[0].url,
      type: 'ai-generated',
      cost: 0.08
    };
  }

  /**
   * AI Color Palette generation (PREMIUM ONLY)
   * Cost: ~$0.01 (GPT-4)
   */
  async generateAIColorPalette(businessInfo) {
    const prompt = `Generate a professional color palette for ${businessInfo.name} (${businessInfo.industry}).
    Return JSON: { primary, secondary, accent, background, text }`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 200
    });

    try {
      return JSON.parse(response.choices[0].message.content);
    } catch {
      return this.getIndustryColorPalette(businessInfo.industry);
    }
  }

  /**
   * Fallback visuals if everything fails
   */
  getFallbackVisuals(businessInfo) {
    return {
      businessName: businessInfo.name,
      tier: 'fallback',
      cost: 0,
      assets: {
        heroImage: { url: 'https://via.placeholder.com/1200x600/2563EB/FFFFFF?text=Your+Business', cost: 0 },
        logo: this.getIndustryIcon(businessInfo.industry),
        colorPalette: this.getIndustryColorPalette(businessInfo.industry),
        additionalImages: []
      }
    };
  }

  /**
   * Calculate monthly savings from using free stock photos
   */
  calculateMonthlySavings(clientCount) {
    const aiCostPerClient = 3;
    const stockCostPerClient = 0;
    const monthlySavings = (aiCostPerClient - stockCostPerClient) * clientCount;

    return {
      clientCount,
      aiCostPerClient,
      stockCostPerClient,
      monthlySavings,
      message: `Saving $${monthlySavings}/month by using free stock photos for ${clientCount} clients`
    };
  }
}

module.exports = SmartVisualService;
