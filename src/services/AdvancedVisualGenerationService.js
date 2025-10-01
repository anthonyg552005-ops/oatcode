/**
 * ADVANCED VISUAL GENERATION SERVICE
 *
 * Premium AI-powered visual content generation for client websites:
 * - Runway ML for professional video generation
 * - DALL-E 3 for ultra-high quality images
 * - Custom branding and design systems
 * - Automated visual asset creation
 *
 * This creates stunning, custom visuals for every website we sell.
 */

const axios = require('axios');
const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');

class AdvancedVisualGenerationService {
  constructor(logger) {
    this.logger = logger;

    // Initialize AI services
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.runwayAPIKey = process.env.RUNWAY_API_KEY;
    this.runwayBaseURL = 'https://api.dev.runwayml.com/v1';

    this.elevenLabsAPIKey = process.env.ELEVENLABS_API_KEY;

    // Output directories
    this.outputDir = path.join(__dirname, '../../data/generated-assets');
    this.imagesDir = path.join(this.outputDir, 'images');
    this.videosDir = path.join(this.outputDir, 'videos');
    this.brandingDir = path.join(this.outputDir, 'branding');
  }

  /**
   * Initialize service and create directories
   */
  async initialize() {
    this.logger.info('🎨 Initializing Advanced Visual Generation Service...');

    try {
      await fs.mkdir(this.imagesDir, { recursive: true });
      await fs.mkdir(this.videosDir, { recursive: true });
      await fs.mkdir(this.brandingDir, { recursive: true });

      this.logger.info('   ✓ Output directories created');

      // Verify API keys
      const hasRunway = !!this.runwayAPIKey;
      const hasElevenLabs = !!this.elevenLabsAPIKey;

      this.logger.info(`   ✓ Runway ML: ${hasRunway ? 'Ready' : 'Not configured'}`);
      this.logger.info(`   ✓ DALL-E 3: Ready`);
      this.logger.info(`   ✓ ElevenLabs: ${hasElevenLabs ? 'Ready' : 'Not configured'}`);

    } catch (error) {
      this.logger.error(`Failed to initialize: ${error.message}`);
    }
  }

  /**
   * Generate complete branding package for a business
   */
  async generateBrandingPackage(businessInfo) {
    this.logger.info(`🎨 Generating branding package for ${businessInfo.name}...`);

    try {
      const branding = {
        businessName: businessInfo.name,
        industry: businessInfo.industry,
        generatedAt: new Date().toISOString(),
        assets: {}
      };

      // 1. Generate Logo
      this.logger.info('   📝 Generating logo...');
      const logo = await this.generateLogo(businessInfo);
      branding.assets.logo = logo;

      // 2. Generate Hero Image
      this.logger.info('   🖼️ Generating hero image...');
      const heroImage = await this.generateHeroImage(businessInfo);
      branding.assets.heroImage = heroImage;

      // 3. Generate Additional Images
      this.logger.info('   📸 Generating additional images...');
      const additionalImages = await this.generateAdditionalImages(businessInfo, 3);
      branding.assets.additionalImages = additionalImages;

      // 4. Generate Color Palette
      this.logger.info('   🎨 Generating color palette...');
      const colorPalette = await this.generateColorPalette(businessInfo);
      branding.assets.colorPalette = colorPalette;

      // Save branding package
      const brandingFile = path.join(
        this.brandingDir,
        `${businessInfo.name.replace(/\s+/g, '_')}_branding.json`
      );

      await fs.writeFile(brandingFile, JSON.stringify(branding, null, 2));

      this.logger.info(`   ✅ Branding package complete: ${brandingFile}`);

      return branding;

    } catch (error) {
      this.logger.error(`Failed to generate branding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate professional logo using DALL-E 3
   */
  async generateLogo(businessInfo) {
    const prompt = `Professional modern logo for "${businessInfo.name}", ${businessInfo.industry} business,
    clean minimalist design, memorable icon, professional color scheme, vector-style,
    suitable for web and print, high contrast, iconic symbol representing ${businessInfo.industry},
    corporate and trustworthy aesthetic, white or transparent background`;

    try {
      const response = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'hd',
        style: 'vivid'
      });

      return {
        url: response.data[0].url,
        prompt: prompt,
        size: '1024x1024',
        type: 'logo'
      };

    } catch (error) {
      this.logger.error(`Logo generation failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Generate hero image for website
   */
  async generateHeroImage(businessInfo) {
    const prompt = `Professional hero banner image for ${businessInfo.industry} website,
    modern ${businessInfo.industry} business environment, high-end professional photography style,
    clean composition with space for text overlay, aspirational and premium feel,
    natural lighting, professional setting, HD quality, wide format,
    represents excellence in ${businessInfo.industry}`;

    try {
      const response = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1792x1024',
        quality: 'hd',
        style: 'natural'
      });

      return {
        url: response.data[0].url,
        prompt: prompt,
        size: '1792x1024',
        type: 'hero'
      };

    } catch (error) {
      this.logger.error(`Hero image generation failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Generate additional supporting images
   */
  async generateAdditionalImages(businessInfo, count = 3) {
    const images = [];

    const imageTypes = [
      'team working together professionally',
      'customer service excellence',
      'premium quality products/services',
      'modern technology and innovation',
      'success and achievement'
    ];

    for (let i = 0; i < count && i < imageTypes.length; i++) {
      const imageType = imageTypes[i];
      const prompt = `Professional ${businessInfo.industry} business image showing ${imageType},
      modern commercial photography, clean professional aesthetic, natural lighting,
      high quality, represents ${businessInfo.name} values`;

      try {
        const response = await this.openai.images.generate({
          model: 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: '1024x1024',
          quality: 'hd',
          style: 'natural'
        });

        images.push({
          url: response.data[0].url,
          prompt: prompt,
          type: imageType,
          size: '1024x1024'
        });

        // Rate limiting
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }

      } catch (error) {
        this.logger.error(`Additional image ${i + 1} failed: ${error.message}`);
      }
    }

    return images;
  }

  /**
   * Generate AI-powered color palette
   */
  async generateColorPalette(businessInfo) {
    const prompt = `Generate a professional color palette for a ${businessInfo.industry} business named "${businessInfo.name}".
    Provide colors that are: modern, professional, trustworthy, and appropriate for the industry.
    Return JSON with: primary, secondary, accent, background, text colors as hex codes.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a professional brand designer. Return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const colors = JSON.parse(response.choices[0].message.content);
      return colors;

    } catch (error) {
      // Fallback color palette
      return {
        primary: '#2563EB',
        secondary: '#7C3AED',
        accent: '#F59E0B',
        background: '#FFFFFF',
        text: '#1F2937'
      };
    }
  }

  /**
   * Generate promotional video using Runway ML
   */
  async generatePromotionalVideo(businessInfo, style = 'professional') {
    if (!this.runwayAPIKey) {
      this.logger.warn('Runway API key not configured');
      return null;
    }

    this.logger.info(`🎬 Generating promotional video for ${businessInfo.name}...`);

    try {
      // Create video prompt
      const videoPrompts = {
        professional: `Professional business showcase for ${businessInfo.industry} company,
        modern office environment, confident team collaboration, premium quality services,
        smooth camera movement, cinematic lighting, corporate excellence`,

        dynamic: `Dynamic energetic video showcasing ${businessInfo.industry} business innovation,
        fast-paced exciting visuals, modern technology, growth and success,
        vibrant colors, motivating atmosphere`,

        elegant: `Elegant sophisticated showcase of ${businessInfo.industry} business,
        luxury aesthetic, premium services, refined professional environment,
        smooth elegant camera work, high-end commercial style`
      };

      const prompt = videoPrompts[style] || videoPrompts.professional;

      // Use a base image (you could generate this with DALL-E first)
      const baseImage = 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800';

      const requestData = {
        model: 'gen4_turbo',
        promptImage: baseImage,
        promptText: prompt,
        ratio: '16:9'
      };

      const response = await axios.post(
        `${this.runwayBaseURL}/image_to_video`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${this.runwayAPIKey}`,
            'Content-Type': 'application/json',
            'X-Runway-Version': '2024-11-06'
          }
        }
      );

      this.logger.info(`   ✓ Video generation started (Task ID: ${response.data.id})`);

      // Poll for completion
      const result = await this.pollRunwayTask(response.data.id);

      if (result.success) {
        this.logger.info('   ✅ Video generation complete!');

        return {
          taskId: response.data.id,
          videoUrl: result.videoUrl,
          prompt: prompt,
          style: style,
          generatedAt: new Date().toISOString()
        };
      }

      return result;

    } catch (error) {
      this.logger.error(`Video generation failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Poll Runway task for completion
   */
  async pollRunwayTask(taskId, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

      try {
        const response = await axios.get(
          `${this.runwayBaseURL}/tasks/${taskId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.runwayAPIKey}`,
              'X-Runway-Version': '2024-11-06'
            }
          }
        );

        const status = response.data.status;
        this.logger.info(`   📊 Video status: ${status} (${i + 1}/${maxAttempts})`);

        if (status === 'SUCCEEDED') {
          return {
            success: true,
            videoUrl: response.data.output,
            taskId: taskId
          };
        }

        if (status === 'FAILED') {
          return {
            success: false,
            error: 'Video generation failed'
          };
        }

      } catch (error) {
        this.logger.error(`Error checking status: ${error.message}`);
      }
    }

    return {
      success: false,
      error: 'Video generation timed out'
    };
  }

  /**
   * Generate complete visual package for a website
   */
  async generateWebsiteVisuals(businessInfo) {
    this.logger.info(`🎨 Generating complete visual package for ${businessInfo.name}...`);

    const visualPackage = {
      businessName: businessInfo.name,
      industry: businessInfo.industry,
      generatedAt: new Date().toISOString(),
      assets: {}
    };

    try {
      // Generate branding
      const branding = await this.generateBrandingPackage(businessInfo);
      visualPackage.branding = branding;

      // Generate video (if Runway available)
      if (this.runwayAPIKey) {
        const video = await this.generatePromotionalVideo(businessInfo);
        visualPackage.assets.video = video;
      }

      this.logger.info('   ✅ Complete visual package generated');

      return visualPackage;

    } catch (error) {
      this.logger.error(`Failed to generate visual package: ${error.message}`);
      throw error;
    }
  }
}

module.exports = AdvancedVisualGenerationService;
