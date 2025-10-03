/**
 * DEMO GALLERY SERVICE
 *
 * Tracks and manages all website demos created for prospects and clients:
 * - Standard demos (free stock photos)
 * - Premium demos (AI-generated visuals)
 * - Demo customization requests
 * - Preview optimization for maximum conversions
 * - Client website gallery
 */

const fs = require('fs').promises;
const path = require('path');

class DemoGalleryService {
  constructor(logger = console) {
    this.logger = logger;
    this.demoPath = path.join(process.cwd(), 'data', 'demos');
    this.demoIndexPath = path.join(this.demoPath, 'demo-index.json');
    this.customizationPath = path.join(this.demoPath, 'customization-requests');
  }

  /**
   * Initialize demo gallery
   */
  async initialize() {
    try {
      await fs.mkdir(this.demoPath, { recursive: true });
      await fs.mkdir(this.customizationPath, { recursive: true});

      // Create index file if doesn't exist
      try {
        await fs.access(this.demoIndexPath);
      } catch {
        await fs.writeFile(this.demoIndexPath, JSON.stringify({
          demos: [],
          stats: {
            total: 0,
            standard: 0,
            premium: 0,
            customizationRequests: 0,
            converted: 0
          }
        }, null, 2));
      }

      this.logger.info('✅ DemoGalleryService initialized');
    } catch (error) {
      this.logger.error(`Failed to initialize DemoGalleryService: ${error.message}`);
    }
  }

  /**
   * LOG A DEMO CREATION
   */
  async logDemo(demoData) {
    try {
      const demo = {
        id: `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: demoData.type || 'standard', // 'standard' or 'premium'
        createdAt: new Date().toISOString(),
        prospect: {
          businessName: demoData.businessName || 'Unknown Business',
          industry: demoData.industry || 'Unknown',
          city: demoData.city || '',
          state: demoData.state || '',
          email: demoData.email || null,
          leadId: demoData.leadId || null
        },
        urls: {
          demo: demoData.demoUrl,
          customization: demoData.demoUrl ? `${demoData.demoUrl}/customize` : null,
          preview: demoData.demoUrl ? `${demoData.demoUrl}/preview` : null
        },
        features: {
          images: demoData.images || [], // Stock or AI-generated
          videos: demoData.videos || [],
          sections: demoData.sections || ['hero', 'about', 'services', 'contact'],
          colorScheme: demoData.colorScheme || null,
          hasAIImages: demoData.type === 'premium',
          hasAIVideo: demoData.hasVideo || false
        },
        customization: {
          requested: false,
          requests: [],
          updatedAt: null
        },
        engagement: {
          views: 0,
          timeSpent: 0,
          lastViewedAt: null,
          customizationRequested: false,
          converted: false,
          convertedAt: null
        },
        status: 'active', // 'active', 'customizing', 'converted', 'expired'
        metadata: {
          generatedBy: 'AI',
          generationTime: demoData.generationTime || null,
          cost: demoData.cost || 0 // Cost to generate (AI images, etc.)
        }
      };

      // Save demo file
      const demoFilePath = path.join(this.demoPath, `${demo.id}.json`);
      await fs.writeFile(demoFilePath, JSON.stringify(demo, null, 2));

      // Update index
      const index = await this.getDemoIndex();
      index.demos.unshift({
        id: demo.id,
        type: demo.type,
        createdAt: demo.createdAt,
        businessName: demo.prospect.businessName,
        industry: demo.prospect.industry,
        demoUrl: demo.urls.demo,
        status: demo.status
      });

      // Update stats
      index.stats.total++;
      if (demo.type === 'standard') index.stats.standard++;
      if (demo.type === 'premium') index.stats.premium++;

      await fs.writeFile(this.demoIndexPath, JSON.stringify(index, null, 2));

      this.logger.info(`🎨 Demo logged: ${demo.id} for ${demo.prospect.businessName} (${demo.type})`);
      return demo;

    } catch (error) {
      this.logger.error(`Failed to log demo: ${error.message}`);
      return null;
    }
  }

  /**
   * GET DEMO INDEX
   */
  async getDemoIndex() {
    try {
      const data = await fs.readFile(this.demoIndexPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {
        demos: [],
        stats: {
          total: 0,
          standard: 0,
          premium: 0,
          customizationRequests: 0,
          converted: 0
        }
      };
    }
  }

  /**
   * GET DEMO BY ID
   */
  async getDemoById(demoId) {
    try {
      const demoFilePath = path.join(this.demoPath, `${demoId}.json`);
      const data = await fs.readFile(demoFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      this.logger.error(`Demo not found: ${demoId}`);
      return null;
    }
  }

  /**
   * GET ALL DEMOS (paginated)
   */
  async getAllDemos(options = {}) {
    const {
      limit = 50,
      offset = 0,
      type = null,
      status = null,
      industry = null
    } = options;

    const index = await this.getDemoIndex();
    let demos = [...index.demos];

    // Filter by type
    if (type) {
      demos = demos.filter(d => d.type === type);
    }

    // Filter by status
    if (status) {
      demos = demos.filter(d => d.status === status);
    }

    // Filter by industry
    if (industry) {
      demos = demos.filter(d => d.industry.toLowerCase().includes(industry.toLowerCase()));
    }

    // Paginate
    const total = demos.length;
    const paginated = demos.slice(offset, offset + limit);

    return {
      demos: paginated,
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    };
  }

  /**
   * GET DEMOS BY TYPE
   */
  async getDemosByType(type) {
    const index = await this.getDemoIndex();
    return index.demos.filter(d => d.type === type);
  }

  /**
   * GET RECENT DEMOS
   */
  async getRecentDemos(count = 20) {
    const index = await this.getDemoIndex();
    return index.demos.slice(0, count);
  }

  /**
   * REQUEST DEMO CUSTOMIZATION
   * Prospect clicks "Customize" button and enters what they want changed
   */
  async requestCustomization(demoId, customizationRequest) {
    try {
      const demo = await this.getDemoById(demoId);
      if (!demo) return { success: false, error: 'Demo not found' };

      const request = {
        id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        requestedAt: new Date().toISOString(),
        changes: customizationRequest.changes || '',
        additions: customizationRequest.additions || '',
        removals: customizationRequest.removals || '',
        notes: customizationRequest.notes || '',
        status: 'pending', // 'pending', 'processing', 'completed'
        updatedVersion: null
      };

      demo.customization.requested = true;
      demo.customization.requests.push(request);
      demo.customization.updatedAt = new Date().toISOString();
      demo.status = 'customizing';
      demo.engagement.customizationRequested = true;

      // Save updated demo
      const demoFilePath = path.join(this.demoPath, `${demoId}.json`);
      await fs.writeFile(demoFilePath, JSON.stringify(demo, null, 2));

      // Save customization request separately for processing queue
      const requestFilePath = path.join(this.customizationPath, `${request.id}.json`);
      await fs.writeFile(requestFilePath, JSON.stringify({
        requestId: request.id,
        demoId: demo.id,
        businessName: demo.prospect.businessName,
        request,
        demo: {
          currentUrl: demo.urls.demo,
          type: demo.type,
          features: demo.features
        }
      }, null, 2));

      // Update index stats
      const index = await this.getDemoIndex();
      index.stats.customizationRequests++;
      await fs.writeFile(this.demoIndexPath, JSON.stringify(index, null, 2));

      this.logger.info(`🎨 Customization requested for demo ${demoId}`);

      return {
        success: true,
        requestId: request.id,
        message: 'Customization request received! We\'ll update your demo within 24 hours.',
        demo
      };

    } catch (error) {
      this.logger.error(`Failed to request customization: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * GET PENDING CUSTOMIZATION REQUESTS
   */
  async getPendingCustomizations() {
    try {
      const files = await fs.readdir(this.customizationPath);
      const requests = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.customizationPath, file);
          const data = await fs.readFile(filePath, 'utf8');
          const request = JSON.parse(data);

          if (request.request.status === 'pending') {
            requests.push(request);
          }
        }
      }

      return requests.sort((a, b) =>
        new Date(a.request.requestedAt) - new Date(b.request.requestedAt)
      );

    } catch (error) {
      this.logger.error(`Failed to get pending customizations: ${error.message}`);
      return [];
    }
  }

  /**
   * COMPLETE CUSTOMIZATION
   * Mark customization as completed with new demo URL
   */
  async completeCustomization(requestId, newDemoUrl) {
    try {
      const requestFilePath = path.join(this.customizationPath, `${requestId}.json`);
      const data = await fs.readFile(requestFilePath, 'utf8');
      const customization = JSON.parse(data);

      customization.request.status = 'completed';
      customization.request.completedAt = new Date().toISOString();
      customization.request.updatedVersion = newDemoUrl;

      await fs.writeFile(requestFilePath, JSON.stringify(customization, null, 2));

      // Update original demo
      const demo = await this.getDemoById(customization.demoId);
      if (demo) {
        demo.urls.demo = newDemoUrl;
        demo.status = 'active';
        demo.customization.updatedAt = new Date().toISOString();

        const demoFilePath = path.join(this.demoPath, `${customization.demoId}.json`);
        await fs.writeFile(demoFilePath, JSON.stringify(demo, null, 2));
      }

      this.logger.info(`✅ Customization completed: ${requestId}`);
      return { success: true };

    } catch (error) {
      this.logger.error(`Failed to complete customization: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * TRACK DEMO VIEW
   */
  async trackDemoView(demoId, timeSpent = 0) {
    try {
      const demo = await this.getDemoById(demoId);
      if (!demo) return false;

      demo.engagement.views++;
      demo.engagement.timeSpent += timeSpent;
      demo.engagement.lastViewedAt = new Date().toISOString();

      const demoFilePath = path.join(this.demoPath, `${demoId}.json`);
      await fs.writeFile(demoFilePath, JSON.stringify(demo, null, 2));

      return true;
    } catch (error) {
      this.logger.error(`Failed to track demo view: ${error.message}`);
      return false;
    }
  }

  /**
   * MARK DEMO AS CONVERTED (prospect became customer)
   */
  async markDemoConverted(demoId, customerId) {
    try {
      const demo = await this.getDemoById(demoId);
      if (!demo) return false;

      demo.engagement.converted = true;
      demo.engagement.convertedAt = new Date().toISOString();
      demo.status = 'converted';
      demo.customerId = customerId;

      const demoFilePath = path.join(this.demoPath, `${demoId}.json`);
      await fs.writeFile(demoFilePath, JSON.stringify(demo, null, 2));

      // Update stats
      const index = await this.getDemoIndex();
      index.stats.converted++;
      await fs.writeFile(this.demoIndexPath, JSON.stringify(index, null, 2));

      this.logger.info(`🎉 Demo converted: ${demoId} → Customer ${customerId}`);
      return true;

    } catch (error) {
      this.logger.error(`Failed to mark demo converted: ${error.message}`);
      return false;
    }
  }

  /**
   * GET DEMO STATISTICS
   */
  async getDemoStats() {
    const index = await this.getDemoIndex();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      ...index.stats,
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      conversionRate: index.stats.total > 0
        ? ((index.stats.converted / index.stats.total) * 100).toFixed(2)
        : '0.00',
      recentDemos: []
    };

    index.demos.forEach(demo => {
      const createdDate = new Date(demo.createdAt);

      if (createdDate >= today) stats.today++;
      if (createdDate >= thisWeek) stats.thisWeek++;
      if (createdDate >= thisMonth) stats.thisMonth++;
    });

    stats.recentDemos = index.demos.slice(0, 10).map(d => ({
      id: d.id,
      businessName: d.businessName,
      industry: d.industry,
      type: d.type,
      status: d.status,
      createdAt: d.createdAt,
      demoUrl: d.demoUrl
    }));

    return stats;
  }

  /**
   * GET CLIENT WEBSITES
   * Returns all converted demos (actual client websites)
   */
  async getClientWebsites() {
    const index = await this.getDemoIndex();
    const clientDemos = index.demos.filter(d => d.status === 'converted');

    // Get full details for each
    const websites = [];
    for (const demo of clientDemos) {
      const fullDemo = await this.getDemoById(demo.id);
      if (fullDemo) {
        websites.push({
          id: fullDemo.id,
          businessName: fullDemo.prospect.businessName,
          industry: fullDemo.prospect.industry,
          location: `${fullDemo.prospect.city}, ${fullDemo.prospect.state}`,
          url: fullDemo.urls.demo,
          type: fullDemo.type,
          convertedAt: fullDemo.engagement.convertedAt,
          customerId: fullDemo.customerId
        });
      }
    }

    return websites.sort((a, b) =>
      new Date(b.convertedAt) - new Date(a.convertedAt)
    );
  }
}

module.exports = DemoGalleryService;
