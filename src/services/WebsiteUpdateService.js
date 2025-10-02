/**
 * WEBSITE UPDATE SERVICE
 *
 * Autonomously updates customer websites based on their requests:
 * - Updates text, contact info, hours
 * - Changes colors, fonts, layout
 * - Adds/updates images
 * - Modifies content sections
 * - Regenerates and redeploys website automatically
 *
 * Uses AI to understand requests and make appropriate changes
 */

const fs = require('fs').promises;
const path = require('path');
const OpenAI = require('openai');

class WebsiteUpdateService {
  constructor(logger) {
    this.logger = logger || console;
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.websitesDir = path.join(__dirname, '../../public/demos');
  }

  /**
   * Make update to customer website
   */
  async makeUpdate(customer, changeRequest) {
    try {
      this.logger.info(`🔧 Making update to ${customer.businessName} website...`);
      this.logger.info(`   Type: ${changeRequest.type}`);
      this.logger.info(`   Request: ${changeRequest.description}`);

      // Load current website data
      const websiteData = await this.loadWebsiteData(customer);

      // Use AI to determine what changes to make
      const modifications = await this.determineModifications(websiteData, changeRequest);

      // Apply modifications
      const updatedWebsiteData = await this.applyModifications(websiteData, modifications);

      // Regenerate website HTML
      const websiteHtml = await this.regenerateWebsite(updatedWebsiteData, customer);

      // Save updated website
      await this.saveWebsite(customer, websiteHtml, updatedWebsiteData);

      this.logger.info(`✅ Website updated successfully for ${customer.businessName}`);

      return {
        success: true,
        type: changeRequest.type,
        description: changeRequest.description,
        modificationsApplied: modifications
      };

    } catch (error) {
      this.logger.error(`❌ Failed to update website: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Load existing website data
   */
  async loadWebsiteData(customer) {
    try {
      // Try to load from stored data
      if (customer.websiteData) {
        return customer.websiteData;
      }

      // If not stored, try to extract from existing website file
      const websiteFile = path.join(this.websitesDir, `${customer.id}.html`);
      const exists = await fs.access(websiteFile).then(() => true).catch(() => false);

      if (exists) {
        const html = await fs.readFile(websiteFile, 'utf-8');
        // Extract basic data from HTML (fallback)
        return {
          businessName: customer.businessName,
          industry: 'services',
          location: 'Local Area',
          colors: { primary: '#667eea', secondary: '#764ba2' },
          content: { extracted: true, html }
        };
      }

      // Return minimal data structure
      return {
        businessName: customer.businessName,
        industry: 'services',
        location: 'Local Area',
        colors: { primary: '#667eea', secondary: '#764ba2' },
        sections: []
      };

    } catch (error) {
      this.logger.warn(`Could not load website data, using defaults: ${error.message}`);
      return {
        businessName: customer.businessName,
        industry: 'services'
      };
    }
  }

  /**
   * Use AI to determine what modifications to make
   */
  async determineModifications(websiteData, changeRequest) {
    try {
      const prompt = `You are updating a website for a business.

Current website data:
${JSON.stringify(websiteData, null, 2)}

Customer's update request:
Type: ${changeRequest.type}
Description: ${changeRequest.description}

Based on this request, determine what specific modifications should be made to the website data.
Respond in JSON format with the modifications:

{
  "modifications": [
    {
      "path": "colors.primary" | "businessName" | "phone" | "email" | "hours" | etc,
      "action": "update" | "add" | "remove",
      "oldValue": "current value",
      "newValue": "new value"
    }
  ],
  "requiresRegeneration": true | false,
  "summary": "brief description of changes being made"
}

Examples:
- "Change phone to 555-1234" → path: "phone", action: "update", newValue: "555-1234"
- "Update to blue color scheme" → path: "colors.primary", action: "update", newValue: "#2563eb"
- "Add new section about services" → path: "sections", action: "add", newValue: {service section}
`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a website update assistant. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      const result = JSON.parse(response.choices[0].message.content);
      return result;

    } catch (error) {
      this.logger.warn(`AI modification planning failed, using fallback: ${error.message}`);
      return this.fallbackModifications(changeRequest);
    }
  }

  /**
   * Fallback modifications if AI fails
   */
  fallbackModifications(changeRequest) {
    const text = changeRequest.description.toLowerCase();

    // Simple pattern matching for common requests
    const modifications = [];

    // Phone number update
    const phoneMatch = text.match(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/);
    if (phoneMatch) {
      modifications.push({
        path: 'phone',
        action: 'update',
        newValue: phoneMatch[0]
      });
    }

    // Email update
    const emailMatch = text.match(/\b[\w.-]+@[\w.-]+\.\w{2,}\b/);
    if (emailMatch) {
      modifications.push({
        path: 'email',
        action: 'update',
        newValue: emailMatch[0]
      });
    }

    // Color change
    if (text.includes('color') || text.includes('blue') || text.includes('red') || text.includes('green')) {
      const colorMap = {
        blue: '#2563eb',
        red: '#dc2626',
        green: '#10b981',
        purple: '#9333ea',
        orange: '#ea580c'
      };

      for (const [name, hex] of Object.entries(colorMap)) {
        if (text.includes(name)) {
          modifications.push({
            path: 'colors.primary',
            action: 'update',
            newValue: hex
          });
          break;
        }
      }
    }

    return {
      modifications,
      requiresRegeneration: modifications.length > 0,
      summary: `Applied ${modifications.length} modification(s) based on request`
    };
  }

  /**
   * Apply modifications to website data
   */
  async applyModifications(websiteData, modificationPlan) {
    const updated = JSON.parse(JSON.stringify(websiteData)); // Deep clone

    for (const mod of modificationPlan.modifications) {
      const pathParts = mod.path.split('.');

      // Navigate to the correct location and update
      let target = updated;
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!target[part]) {
          target[part] = {};
        }
        target = target[part];
      }

      const finalKey = pathParts[pathParts.length - 1];

      if (mod.action === 'update') {
        target[finalKey] = mod.newValue;
        this.logger.info(`   ✓ Updated ${mod.path}: ${mod.newValue}`);
      } else if (mod.action === 'add') {
        if (Array.isArray(target[finalKey])) {
          target[finalKey].push(mod.newValue);
        } else {
          target[finalKey] = mod.newValue;
        }
        this.logger.info(`   ✓ Added to ${mod.path}`);
      } else if (mod.action === 'remove') {
        delete target[finalKey];
        this.logger.info(`   ✓ Removed ${mod.path}`);
      }
    }

    return updated;
  }

  /**
   * Regenerate website HTML with updated data
   */
  async regenerateWebsite(websiteData, customer) {
    try {
      // If we have the old HTML in websiteData, do smart replacement
      if (websiteData.content && websiteData.content.html) {
        return await this.updateExistingHtml(websiteData.content.html, websiteData);
      }

      // Otherwise, generate fresh HTML using AIWebsiteGenerationService
      const AIWebsiteGeneration = require('./AIWebsiteGenerationService');
      const generator = new AIWebsiteGeneration(this.logger);

      const business = {
        name: websiteData.businessName || customer.businessName,
        businessName: websiteData.businessName || customer.businessName,
        industry: websiteData.industry || 'services',
        location: websiteData.location || 'Local Area',
        city: websiteData.city || websiteData.location || 'Local Area',
        phone: websiteData.phone || '(555) 123-4567',
        email: websiteData.email || customer.email,
        description: websiteData.description || `Professional ${websiteData.industry || 'services'} in ${websiteData.location || 'your area'}`
      };

      const strategy = {
        colorDetails: websiteData.colors || {
          primary: '#667eea',
          secondary: '#764ba2',
          accent: '#10b981'
        },
        tier: customer.tier || 'standard'
      };

      const result = await generator.generateWebsite(business, strategy);

      if (result.success && result.websiteHtml) {
        return result.websiteHtml;
      }

      // Fallback to simple template
      return this.generateSimpleTemplate(websiteData, customer);

    } catch (error) {
      this.logger.warn(`Website regeneration failed, using simple template: ${error.message}`);
      return this.generateSimpleTemplate(websiteData, customer);
    }
  }

  /**
   * Smart update of existing HTML
   */
  async updateExistingHtml(html, websiteData) {
    let updated = html;

    // Replace common patterns
    if (websiteData.phone) {
      updated = updated.replace(/\(\d{3}\)\s*\d{3}-\d{4}/g, websiteData.phone);
    }

    if (websiteData.email) {
      updated = updated.replace(/[\w.-]+@[\w.-]+\.\w{2,}/g, websiteData.email);
    }

    if (websiteData.colors && websiteData.colors.primary) {
      // Replace primary color in gradient and solid uses
      updated = updated.replace(/#667eea/g, websiteData.colors.primary);
    }

    if (websiteData.colors && websiteData.colors.secondary) {
      updated = updated.replace(/#764ba2/g, websiteData.colors.secondary);
    }

    return updated;
  }

  /**
   * Generate simple template as fallback
   */
  generateSimpleTemplate(websiteData, customer) {
    const colors = websiteData.colors || { primary: '#667eea', secondary: '#764ba2' };
    const name = websiteData.businessName || customer.businessName;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1e293b;
        }
        .hero {
            background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%);
            color: white;
            padding: 100px 20px;
            text-align: center;
        }
        .hero h1 {
            font-size: 3em;
            margin-bottom: 20px;
        }
        .content {
            max-width: 1200px;
            margin: 0 auto;
            padding: 60px 20px;
        }
        .contact {
            background: #f8fafc;
            padding: 60px 20px;
            text-align: center;
        }
        .contact a {
            color: ${colors.primary};
            text-decoration: none;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <section class="hero">
        <h1>${name}</h1>
        <p>${websiteData.description || `Professional ${websiteData.industry || 'services'}`}</p>
    </section>

    <section class="content">
        <h2>Welcome</h2>
        <p>Thank you for visiting our website. We provide quality ${websiteData.industry || 'services'} in ${websiteData.location || 'your area'}.</p>
    </section>

    <section class="contact">
        <h2>Get In Touch</h2>
        <p>Phone: ${websiteData.phone || '(555) 123-4567'}</p>
        <p>Email: <a href="mailto:${websiteData.email || customer.email}">${websiteData.email || customer.email}</a></p>
        ${websiteData.address ? `<p>${websiteData.address}</p>` : ''}
    </section>
</body>
</html>
    `.trim();
  }

  /**
   * Save updated website
   */
  async saveWebsite(customer, websiteHtml, websiteData) {
    try {
      // Save HTML file
      const websiteFile = path.join(this.websitesDir, `${customer.id}.html`);
      await fs.mkdir(path.dirname(websiteFile), { recursive: true });
      await fs.writeFile(websiteFile, websiteHtml, 'utf-8');

      // Update customer record with new website data
      if (global.customerRetention) {
        const customerRecord = global.customerRetention.customers.find(c => c.id === customer.id);
        if (customerRecord) {
          customerRecord.websiteData = websiteData;
          customerRecord.lastUpdated = new Date().toISOString();
          await global.customerRetention.save();
        }
      }

      this.logger.info(`💾 Saved updated website to ${websiteFile}`);

    } catch (error) {
      this.logger.error(`Failed to save website: ${error.message}`);
      throw error;
    }
  }

  /**
   * Preview changes before applying (for manual review if needed)
   */
  async previewChanges(customer, changeRequest) {
    const websiteData = await this.loadWebsiteData(customer);
    const modifications = await this.determineModifications(websiteData, changeRequest);

    return {
      currentData: websiteData,
      proposedModifications: modifications,
      summary: modifications.summary
    };
  }
}

module.exports = WebsiteUpdateService;
