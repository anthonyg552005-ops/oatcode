/**
 * DEMO COMPARISON SERVICE
 * Generates side-by-side Standard vs Premium demos to showcase value difference
 * Strategic Goal: Drive Premium tier conversions by visually showing AI upgrade
 */

const AIWebsiteGenerationService = require('./AIWebsiteGenerationService');
const fs = require('fs').promises;
const path = require('path');

class DemoComparisonService {
  constructor(logger) {
    this.logger = logger || console;
    this.websiteGenerator = new AIWebsiteGenerationService(logger);
    this.demoDir = path.join(__dirname, '../../demos');
  }

  /**
   * Generate BOTH Standard and Premium demos for a business
   * Returns comparison page URL
   */
  async generateDemoComparison(business) {
    try {
      this.logger.info(`🎨 Creating Standard + Premium demo comparison for ${business.businessName || business.name}...`);

      // Normalize business data
      const normalizedBusiness = {
        businessName: business.businessName || business.name,
        name: business.businessName || business.name,
        industry: business.industry || business.types?.[0] || 'business',
        location: business.location || business.city || business.address || 'Local Area',
        city: business.city || business.location,
        description: business.description || `Professional services for ${business.businessName || business.name}`,
        phone: business.phone,
        email: business.email,
        address: business.address
      };

      // Generate Standard demo (FREE stock photos)
      this.logger.info(`   📸 Generating Standard demo (stock photos)...`);
      const standardDemo = await this.websiteGenerator.generateCompleteWebsite({
        ...normalizedBusiness,
        tier: 'standard'
      });

      // Generate Premium demo (AI visuals)
      this.logger.info(`   🎬 Generating Premium demo (AI visuals)...`);
      const premiumDemo = await this.websiteGenerator.generateCompleteWebsite({
        ...normalizedBusiness,
        tier: 'premium'
      });

      // Create comparison page
      const comparisonPage = await this.createComparisonPage(
        normalizedBusiness,
        standardDemo,
        premiumDemo
      );

      this.logger.info(`   ✅ Demo comparison ready!`);

      return {
        standardDemo,
        premiumDemo,
        comparisonUrl: comparisonPage.url,
        standardUrl: standardDemo.demoUrl,
        premiumUrl: premiumDemo.demoUrl,
        businessName: normalizedBusiness.businessName
      };

    } catch (error) {
      this.logger.error(`❌ Demo comparison failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create side-by-side comparison page
   */
  async createComparisonPage(business, standardDemo, premiumDemo) {
    const businessSlug = business.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const fileName = `comparison-${businessSlug}.html`;
    const filePath = path.join(this.demoDir, fileName);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${business.businessName} - Standard vs Premium</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .demo-frame {
            border: 3px solid #e5e7eb;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            height: 600px;
            background: white;
        }
        .premium-badge {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 8px 20px;
            border-radius: 50px;
            font-weight: bold;
            display: inline-block;
            margin-bottom: 15px;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .standard-badge {
            background: #10B981;
            color: white;
            padding: 8px 20px;
            border-radius: 50px;
            font-weight: bold;
            display: inline-block;
            margin-bottom: 15px;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .cta-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px 40px;
            border-radius: 50px;
            font-weight: bold;
            text-decoration: none;
            display: inline-block;
            transition: transform 0.3s, box-shadow 0.3s;
            font-size: 18px;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        .cta-button:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
        }
    </style>
</head>
<body class="bg-gray-50">
    <div class="max-w-7xl mx-auto px-6 py-12">
        <!-- Header -->
        <div class="text-center mb-12">
            <h1 class="text-5xl font-bold text-gray-900 mb-4">
                ${business.businessName} - Website Preview
            </h1>
            <p class="text-xl text-gray-600 mb-8">
                Compare Standard ($197/mo) vs Premium ($297/mo) plans
            </p>
        </div>

        <!-- Comparison Grid -->
        <div class="grid md:grid-cols-2 gap-8 mb-12">
            <!-- Standard Plan -->
            <div>
                <div class="bg-white rounded-2xl shadow-lg p-8">
                    <div class="standard-badge">Standard Plan - $197/mo</div>
                    <h2 class="text-2xl font-bold mb-4 text-gray-900">Professional Stock Photos</h2>
                    <ul class="text-gray-700 space-y-2 mb-6">
                        <li>✓ High-quality stock imagery</li>
                        <li>✓ Modern responsive design</li>
                        <li>✓ SEO optimized</li>
                        <li>✓ Fast loading speed</li>
                        <li>✓ Mobile friendly</li>
                        <li>✓ 24/7 AI monitoring</li>
                    </ul>
                    <div class="demo-frame">
                        <iframe src="${standardDemo.demoUrl || '/demo/standard'}" style="width:100%;height:100%;border:none;"></iframe>
                    </div>
                    <div class="mt-6 text-center">
                        <a href="${standardDemo.demoUrl || '/demo/standard'}" target="_blank" class="text-blue-600 hover:text-blue-800 font-semibold">
                            View Full Demo →
                        </a>
                    </div>
                </div>
            </div>

            <!-- Premium Plan -->
            <div>
                <div class="bg-white rounded-2xl shadow-lg p-8 border-4 border-purple-500">
                    <div class="premium-badge">Premium Plan - $297/mo</div>
                    <h2 class="text-2xl font-bold mb-4 text-gray-900">AI-Generated Custom Visuals</h2>
                    <ul class="text-gray-700 space-y-2 mb-6">
                        <li>✓ <strong>Runway AI videos</strong></li>
                        <li>✓ <strong>DALL-E 3 custom images</strong></li>
                        <li>✓ <strong>Unique AI branding</strong></li>
                        <li>✓ Everything in Standard</li>
                        <li>✓ Stand out from competitors</li>
                        <li>✓ Priority support</li>
                    </ul>
                    <div class="demo-frame">
                        <iframe src="${premiumDemo.demoUrl || '/demo/premium'}" style="width:100%;height:100%;border:none;"></iframe>
                    </div>
                    <div class="mt-6 text-center">
                        <a href="${premiumDemo.demoUrl || '/demo/premium'}" target="_blank" class="text-purple-600 hover:text-purple-800 font-semibold">
                            View Full Demo →
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <!-- Value Proposition -->
        <div class="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl p-12 text-center mb-12">
            <h2 class="text-4xl font-bold mb-4">Ready to Launch Your Website?</h2>
            <p class="text-xl mb-8 opacity-90">
                Both demos show what your actual website will look like. Choose the plan that fits your business.
            </p>
            <div class="flex gap-4 justify-center flex-wrap">
                <a href="${process.env.STRIPE_STANDARD_PAYMENT_LINK || 'https://buy.stripe.com/eVq5kFdx937Z6B4g9D7Re00'}" class="cta-button">
                    Get Standard ($197/mo)
                </a>
                <a href="${process.env.STRIPE_PREMIUM_PAYMENT_LINK || 'https://buy.stripe.com/dRm9AVdx99wn4sWcXr7Re01'}" class="cta-button" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                    Get Premium ($297/mo)
                </a>
            </div>
            <p class="mt-6 text-sm opacity-75">30-day money-back guarantee • Cancel anytime</p>
        </div>

        <!-- Feature Comparison Table -->
        <div class="bg-white rounded-2xl shadow-lg p-8">
            <h3 class="text-3xl font-bold text-center mb-8">Feature Comparison</h3>
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="border-b-2 border-gray-200">
                            <th class="text-left py-4 px-6">Feature</th>
                            <th class="text-center py-4 px-6">Standard</th>
                            <th class="text-center py-4 px-6">Premium</th>
                        </tr>
                    </thead>
                    <tbody class="text-gray-700">
                        <tr class="border-b border-gray-100">
                            <td class="py-4 px-6">Professional Design</td>
                            <td class="text-center py-4 px-6">✓</td>
                            <td class="text-center py-4 px-6">✓</td>
                        </tr>
                        <tr class="border-b border-gray-100">
                            <td class="py-4 px-6">Stock Photos</td>
                            <td class="text-center py-4 px-6">✓</td>
                            <td class="text-center py-4 px-6">✓</td>
                        </tr>
                        <tr class="border-b border-gray-100">
                            <td class="py-4 px-6">Runway AI Videos</td>
                            <td class="text-center py-4 px-6">-</td>
                            <td class="text-center py-4 px-6 text-purple-600 font-bold">✓</td>
                        </tr>
                        <tr class="border-b border-gray-100">
                            <td class="py-4 px-6">DALL-E 3 Custom Images</td>
                            <td class="text-center py-4 px-6">-</td>
                            <td class="text-center py-4 px-6 text-purple-600 font-bold">✓</td>
                        </tr>
                        <tr class="border-b border-gray-100">
                            <td class="py-4 px-6">AI-Generated Logo</td>
                            <td class="text-center py-4 px-6">-</td>
                            <td class="text-center py-4 px-6 text-purple-600 font-bold">✓</td>
                        </tr>
                        <tr class="border-b border-gray-100">
                            <td class="py-4 px-6">Unique Brand Colors</td>
                            <td class="text-center py-4 px-6">-</td>
                            <td class="text-center py-4 px-6 text-purple-600 font-bold">✓</td>
                        </tr>
                        <tr class="border-b border-gray-100">
                            <td class="py-4 px-6">24/7 AI Monitoring</td>
                            <td class="text-center py-4 px-6">✓</td>
                            <td class="text-center py-4 px-6">✓</td>
                        </tr>
                        <tr class="border-b border-gray-100">
                            <td class="py-4 px-6">Priority Support</td>
                            <td class="text-center py-4 px-6">-</td>
                            <td class="text-center py-4 px-6 text-purple-600 font-bold">✓</td>
                        </tr>
                        <tr class="border-b border-gray-100 bg-gray-50">
                            <td class="py-4 px-6 font-bold">Monthly Price</td>
                            <td class="text-center py-4 px-6 font-bold text-green-600">$197</td>
                            <td class="text-center py-4 px-6 font-bold text-purple-600">$297</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Footer -->
        <div class="text-center mt-12 text-gray-600">
            <p>Questions? Email us at <a href="mailto:contact@oatcode.com" class="text-blue-600 hover:text-blue-800">contact@oatcode.com</a></p>
            <p class="mt-2 text-sm">Powered by <strong>OatCode</strong> - AI-Powered Websites</p>
        </div>
    </div>
</body>
</html>`;

    // Ensure demos directory exists
    await fs.mkdir(this.demoDir, { recursive: true });

    // Write comparison page
    await fs.writeFile(filePath, html);

    return {
      url: `/demos/${fileName}`,
      path: filePath
    };
  }

  /**
   * Get demo comparison for use in emails
   */
  async getDemoForOutreach(business) {
    try {
      const comparison = await this.generateDemoComparison(business);

      return {
        comparisonUrl: comparison.comparisonUrl,
        standardUrl: comparison.standardUrl,
        premiumUrl: comparison.premiumUrl,
        emailText: this.generateEmailText(business, comparison)
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get demo for outreach: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate email text with demo links
   */
  generateEmailText(business, comparison) {
    return `
I've created TWO demo websites for ${business.businessName} to show you exactly what you'll get:

📸 Standard Plan ($197/month):
${comparison.standardUrl}
Professional design with high-quality stock photos

🎬 Premium Plan ($297/month):
${comparison.premiumUrl}
AI-generated videos, custom visuals, unique branding

👀 Compare them side-by-side:
${comparison.comparisonUrl}

The Premium plan includes Runway AI videos and DALL-E 3 custom images that make your business stand out from every competitor. Most customers choose Premium because the AI visuals drive significantly more customer attention.

Ready to launch? Choose your plan:
Standard: ${process.env.STRIPE_STANDARD_PAYMENT_LINK || 'https://buy.stripe.com/eVq5kFdx937Z6B4g9D7Re00'}
Premium: ${process.env.STRIPE_PREMIUM_PAYMENT_LINK || 'https://buy.stripe.com/dRm9AVdx99wn4sWcXr7Re01'}

30-day money-back guarantee • Cancel anytime
`.trim();
  }
}

module.exports = DemoComparisonService;
