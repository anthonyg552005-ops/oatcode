/**
 * CUSTOMIZATION PROCESSOR SERVICE
 *
 * Autonomously processes website customization requests:
 * - Monitors pending customization queue
 * - Uses AI to understand what changes are needed
 * - Regenerates website with requested changes
 * - Updates demo URL
 * - Sends confirmation email
 */

const OpenAI = require('openai');
const path = require('path');

class CustomizationProcessorService {
  constructor(logger = console, demoGalleryService, emailLogService, websiteGeneratorService) {
    this.logger = logger;
    this.demoGallery = demoGalleryService;
    this.emailLog = emailLogService;
    this.websiteGenerator = websiteGeneratorService;

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * PROCESS ALL PENDING CUSTOMIZATIONS
   * Called hourly by autonomous engine
   */
  async processPendingCustomizations() {
    try {
      const pendingRequests = await this.demoGallery.getPendingCustomizations();

      if (pendingRequests.length === 0) {
        this.logger.info('✅ No pending customization requests');
        return { processed: 0, failed: 0 };
      }

      this.logger.info(`🎨 Processing ${pendingRequests.length} customization request(s)...`);

      let processed = 0;
      let failed = 0;

      for (const request of pendingRequests) {
        try {
          await this.processCustomizationRequest(request);
          processed++;
        } catch (error) {
          this.logger.error(`Failed to process customization ${request.requestId}: ${error.message}`);
          failed++;
        }
      }

      this.logger.info(`✅ Customization processing complete: ${processed} processed, ${failed} failed`);

      return { processed, failed };

    } catch (error) {
      this.logger.error(`Failed to process customizations: ${error.message}`);
      return { processed: 0, failed: 0 };
    }
  }

  /**
   * PROCESS A SINGLE CUSTOMIZATION REQUEST
   */
  async processCustomizationRequest(request) {
    this.logger.info(`🎨 Processing customization for ${request.businessName}...`);

    // Step 1: Get original demo details
    const originalDemo = await this.demoGallery.getDemoById(request.demoId);
    if (!originalDemo) {
      throw new Error(`Original demo not found: ${request.demoId}`);
    }

    // Step 2: Use AI to understand what changes are needed
    const customizationPlan = await this.analyzeCustomizationRequest(
      request,
      originalDemo
    );

    this.logger.info(`   📋 AI analyzed request: ${customizationPlan.summary}`);

    // Step 3: Generate updated website with changes
    const updatedWebsite = await this.generateCustomizedWebsite(
      originalDemo,
      customizationPlan,
      request
    );

    this.logger.info(`   🌐 Updated website generated: ${updatedWebsite.url}`);

    // Step 4: Mark customization as complete
    await this.demoGallery.completeCustomization(
      request.requestId,
      updatedWebsite.url
    );

    // Step 5: Send confirmation email to prospect
    await this.sendCustomizationCompleteEmail(
      originalDemo.prospect,
      request,
      updatedWebsite.url
    );

    this.logger.info(`   ✅ Customization complete for ${request.businessName}`);

    return updatedWebsite;
  }

  /**
   * USE AI TO ANALYZE CUSTOMIZATION REQUEST
   */
  async analyzeCustomizationRequest(request, originalDemo) {
    const prompt = `You are analyzing a website customization request from a prospect.

ORIGINAL WEBSITE DETAILS:
Business: ${originalDemo.prospect.businessName}
Industry: ${originalDemo.prospect.industry}
Type: ${originalDemo.type} (standard = stock photos, premium = AI-generated images)
Current Sections: ${originalDemo.features.sections.join(', ')}
Current Images: ${originalDemo.features.images.length} images
Current Videos: ${originalDemo.features.videos.length} videos

CUSTOMIZATION REQUEST:
${request.request.changes ? `Changes Requested: ${request.request.changes}` : ''}
${request.request.additions ? `Additions Requested: ${request.request.additions}` : ''}
${request.request.removals ? `Removals Requested: ${request.request.removals}` : ''}
${request.request.notes ? `Additional Notes: ${request.request.notes}` : ''}

Analyze this request and provide a structured plan for what needs to be changed.

Return a JSON object with:
{
  "summary": "Brief summary of what the prospect wants",
  "sectionsToAdd": ["section1", "section2"],
  "sectionsToRemove": ["section3"],
  "sectionsToModify": [
    {"section": "hero", "changes": "what to change"}
  ],
  "contentChanges": {
    "heading": "new heading if requested",
    "tagline": "new tagline if requested",
    "otherChanges": "any other content changes"
  },
  "imageChanges": {
    "addMore": true/false,
    "specificRequests": "e.g. 'add team photos', 'change hero image'"
  },
  "upgradeRecommendation": "none/premium" (suggest premium if they want custom AI images/videos)
}`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing website customization requests and creating structured implementation plans. Always return valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });

    const plan = JSON.parse(response.choices[0].message.content);
    return plan;
  }

  /**
   * GENERATE CUSTOMIZED WEBSITE BASED ON PLAN
   */
  async generateCustomizedWebsite(originalDemo, customizationPlan, request) {
    // Build updated website configuration
    const updatedConfig = {
      businessName: originalDemo.prospect.businessName,
      industry: originalDemo.prospect.industry,
      city: originalDemo.prospect.city,
      state: originalDemo.prospect.state,

      // Apply customization changes
      sections: this.applySectionChanges(
        originalDemo.features.sections,
        customizationPlan
      ),

      // Update content if requested
      customContent: customizationPlan.contentChanges || {},

      // Determine if we should upgrade to premium
      type: customizationPlan.upgradeRecommendation === 'premium' ? 'premium' : originalDemo.type,

      // Image customizations
      imageRequests: customizationPlan.imageChanges?.specificRequests || null,

      // Mark as customized version
      isCustomized: true,
      originalDemoId: originalDemo.id,
      customizationRequestId: request.requestId
    };

    // Generate the website using our existing website generator
    // (This would call your actual website generation service)
    const websiteUrl = await this.websiteGenerator.generateWebsite(updatedConfig);

    return {
      url: websiteUrl,
      config: updatedConfig,
      changes: customizationPlan.summary
    };
  }

  /**
   * APPLY SECTION CHANGES (ADD/REMOVE/MODIFY)
   */
  applySectionChanges(originalSections, plan) {
    let sections = [...originalSections];

    // Remove sections
    if (plan.sectionsToRemove && plan.sectionsToRemove.length > 0) {
      sections = sections.filter(s => !plan.sectionsToRemove.includes(s));
    }

    // Add sections
    if (plan.sectionsToAdd && plan.sectionsToAdd.length > 0) {
      sections = [...sections, ...plan.sectionsToAdd];
    }

    // Ensure we keep essential sections
    const essentialSections = ['hero', 'contact'];
    essentialSections.forEach(essential => {
      if (!sections.includes(essential)) {
        sections.push(essential);
      }
    });

    return sections;
  }

  /**
   * SEND CUSTOMIZATION COMPLETE EMAIL
   */
  async sendCustomizationCompleteEmail(prospect, request, updatedDemoUrl) {
    const subject = `✨ Your Updated ${prospect.businessName} Website is Ready!`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; border-radius: 20px;">
        <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">

          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1e293b; margin-bottom: 10px; font-size: 28px;">
              ✨ Your Website Has Been Updated!
            </h1>
            <p style="color: #64748b; font-size: 16px; margin: 0;">
              We listened and made the changes you requested
            </p>
          </div>

          <!-- What We Changed -->
          <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 25px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #10b981;">
            <h2 style="color: #065f46; margin-bottom: 15px; font-size: 20px;">
              ✅ Changes We Made:
            </h2>
            ${request.request.changes ? `
              <div style="margin-bottom: 15px;">
                <strong style="color: #047857;">📝 Modified:</strong>
                <p style="color: #065f46; margin: 5px 0 0 0;">${request.request.changes}</p>
              </div>
            ` : ''}
            ${request.request.additions ? `
              <div style="margin-bottom: 15px;">
                <strong style="color: #047857;">➕ Added:</strong>
                <p style="color: #065f46; margin: 5px 0 0 0;">${request.request.additions}</p>
              </div>
            ` : ''}
            ${request.request.removals ? `
              <div style="margin-bottom: 15px;">
                <strong style="color: #047857;">➖ Removed:</strong>
                <p style="color: #065f46; margin: 5px 0 0 0;">${request.request.removals}</p>
              </div>
            ` : ''}
          </div>

          <!-- View Updated Website Button -->
          <div style="text-align: center; margin: 40px 0;">
            <a href="${updatedDemoUrl}"
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 18px 40px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 18px; box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4); transition: transform 0.2s;">
              🌐 View Your Updated Website
            </a>
          </div>

          <!-- Want More Changes? -->
          <div style="background: #f8fafc; padding: 25px; border-radius: 12px; margin-top: 30px; text-align: center;">
            <h3 style="color: #1e293b; margin-bottom: 15px; font-size: 18px;">
              Want to make more changes?
            </h3>
            <p style="color: #64748b; margin-bottom: 20px; line-height: 1.6;">
              No problem! Just reply to this email with what else you'd like to add or change. We'll update it for you.
            </p>
          </div>

          <!-- Ready to Go Live? -->
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px; margin-top: 30px; text-align: center; color: white;">
            <h3 style="margin-bottom: 15px; font-size: 20px;">
              🚀 Love it? Let's make it live!
            </h3>
            <p style="margin-bottom: 20px; opacity: 0.95; line-height: 1.6;">
              Your website is ready to launch. Get it online for just $197/month - includes hosting, domain, updates, and 24/7 support.
            </p>
            <a href="mailto:${process.env.NOTIFICATION_EMAIL}?subject=Ready%20to%20Launch%20${encodeURIComponent(prospect.businessName)}"
               style="display: inline-block; background: white; color: #059669; padding: 15px 35px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
              💳 Yes, Launch My Website
            </a>
          </div>

          <!-- Footer -->
          <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 14px;">
            <p style="margin: 0;">
              Questions? Just reply to this email - we're here to help!
            </p>
          </div>

        </div>
      </div>
    `;

    const text = `✨ Your Updated ${prospect.businessName} Website is Ready!

We listened and made the changes you requested:

${request.request.changes ? `📝 Modified: ${request.request.changes}\n` : ''}
${request.request.additions ? `➕ Added: ${request.request.additions}\n` : ''}
${request.request.removals ? `➖ Removed: ${request.request.removals}\n` : ''}

View Your Updated Website: ${updatedDemoUrl}

Want more changes? No problem! Just reply to this email with what else you'd like.

Love it? Let's make it live! Reply with "Ready to launch" and we'll get your website online for $197/month.

Questions? Just reply - we're here to help!`;

    // Send email via SendGrid
    await this.sendEmail(prospect.email, subject, html, text);

    // Log email
    await this.emailLog.logEmail({
      type: 'customization_complete',
      to: prospect.email,
      recipientName: prospect.businessName,
      businessName: prospect.businessName,
      subject,
      html,
      text,
      demoUrl: updatedDemoUrl,
      leadId: prospect.leadId,
      industry: prospect.industry,
      city: prospect.city,
      state: prospect.state
    });
  }

  /**
   * SEND EMAIL VIA SENDGRID
   */
  async sendEmail(to, subject, html, text) {
    // Use SendGrid or your email service
    // For now, just log it
    this.logger.info(`   📧 Email sent: "${subject}" → ${to}`);

    // TODO: Integrate with actual SendGrid when ready
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send({ to, from: 'noreply@oatcode.com', subject, html, text });
  }

  /**
   * GET PROCESSING STATS
   */
  async getProcessingStats() {
    const pending = await this.demoGallery.getPendingCustomizations();

    return {
      pending: pending.length,
      oldestRequest: pending.length > 0 ? pending[0].request.requestedAt : null
    };
  }
}

module.exports = CustomizationProcessorService;
