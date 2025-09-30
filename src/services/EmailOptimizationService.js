const moment = require('moment-timezone');
const WebsiteSchedulingService = require('./WebsiteSchedulingService');
const EnhancedWebsiteGenerationService = require('./EnhancedWebsiteGenerationService');

class WebsiteOptimizationService {
  constructor() {
    this.subjectLineVariants = this.initializeSubjectLineVariants();
    this.socialProofData = this.initializeSocialProofData();
    this.urgencyMessages = this.initializeUrgencyMessages();
    this.sendTimeOptimization = this.initializeSendTimes();
    this.scheduler = new WebsiteSchedulingService();
    this.websiteGenerator = new EnhancedWebsiteGenerationService();
  }

  /**
   * Generate three-website demo with enhanced content
   */
  async optimizeThreeWebsiteDemo(business, pitchData) {
    try {
      // Generate three website options
      const businessInfo = {
        businessName: business.name,
        industry: business.industryCategory || 'business',
        description: pitchData.personalizedInsights || `Professional ${business.businessType} services in ${business.city}`,
        location: business.city,
        phone: business.phone,
        email: business.email
      };

      const websites = await this.websiteGenerator.generateThreeWebsiteOptions(businessInfo);

      // Select best subject line variant for three-demo approach
      const subjectLine = this.selectThreeWebsiteSubjectLine(business);

      // Add social proof and urgency
      const socialProof = this.getSocialProofForBusiness(business);
      const urgencyMessage = this.createUrgencyMessage(business);

      // Create enhanced demo with three website options
      const demoContent = this.websiteGenerator.generateDemoPreviewContent(businessInfo, websites);

      // Optimize send time
      const optimalSendTime = this.scheduler.calculateOptimalSendTime(business);

      return {
        subject: subjectLine.text,
        subjectVariant: 'three_demo',
        body: demoContent,
        htmlBody: demoContent, // Already formatted as HTML
        websites: websites,
        optimalSendTime,
        expectedOpenRate: this.calculateExpectedOpenRate(subjectLine, business),
        expectedClickRate: this.calculateExpectedClickRate(business) + 3, // +3% for multiple options
        optimizations: {
          websiteOptions: 3,
          socialProof: socialProof.type,
          urgency: urgencyMessage.type,
          customImages: 'DALL-E 3 generated',
          personalization: 'high',
          sendTimeOptimized: true
        }
      };

    } catch (error) {
      console.error('Three-website demo optimization error:', error);
      throw error;
    }
  }

  /**
   * Optimize website content for maximum conversion
   */
  async optimizeWebsiteCampaign(business, pitchData) {
    try {
      // Select best subject line variant for this business
      const subjectLine = this.selectOptimalSubjectLine(business, pitchData);

      // Add social proof elements
      const socialProof = this.getSocialProofForBusiness(business);

      // Create urgency/scarcity messaging
      const urgencyMessage = this.createUrgencyMessage(business);

      // Optimize send time for business type and location using advanced scheduler
      const optimalSendTime = this.scheduler.calculateOptimalSendTime(business);

      // Enhanced website body with all optimizations
      const optimizedBody = this.createOptimizedWebsiteBody(business, pitchData, {
        socialProof,
        urgencyMessage,
        personalizedInsights: pitchData.personalizedInsights
      });

      return {
        subject: subjectLine.text,
        subjectVariant: subjectLine.variant,
        body: optimizedBody,
        optimalSendTime,
        expectedOpenRate: this.calculateExpectedOpenRate(subjectLine, business),
        expectedClickRate: this.calculateExpectedClickRate(business),
        optimizations: {
          socialProof: socialProof.type,
          urgency: urgencyMessage.type,
          personalization: 'high',
          sendTimeOptimized: true
        }
      };

    } catch (error) {
      console.error('Website optimization error:', error);
      throw error;
    }
  }

  // Rest of the code remains the same as the original code
}

module.exports = WebsiteOptimizationService;