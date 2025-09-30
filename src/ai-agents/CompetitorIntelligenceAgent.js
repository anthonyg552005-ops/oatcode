/**
 * COMPETITOR INTELLIGENCE AGENT
 *
 * This AI agent continuously:
 * - Scrapes top website selling companies
 * - Analyzes their strategies, pricing, messaging
 * - Learns what makes them successful
 * - Adapts the best tactics for our business
 */

const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');

class CompetitorIntelligenceAgent {
  constructor(logger) {
    this.logger = logger;
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Top website selling competitors to learn from
    this.competitors = [
      {
        name: 'Wix',
        url: 'https://www.wix.com',
        focus: ['pricing', 'features', 'messaging']
      },
      {
        name: 'Squarespace',
        url: 'https://www.squarespace.com',
        focus: ['design', 'pricing', 'targeting']
      },
      {
        name: 'Webflow',
        url: 'https://webflow.com',
        focus: ['technical', 'pricing', 'features']
      },
      {
        name: 'Duda',
        url: 'https://www.duda.co',
        focus: ['white-label', 'agency-model', 'pricing']
      },
      {
        name: 'GoDaddy Website Builder',
        url: 'https://www.godaddy.com/websites/website-builder',
        focus: ['simplicity', 'pricing', 'marketing']
      },
      {
        name: 'Weebly',
        url: 'https://www.weebly.com',
        focus: ['ease-of-use', 'pricing', 'small-business']
      },
      {
        name: 'Shopify',
        url: 'https://www.shopify.com',
        focus: ['ecommerce', 'pricing', 'ecosystem']
      },
      {
        name: 'WordPress.com',
        url: 'https://wordpress.com',
        focus: ['flexibility', 'pricing', 'plugins']
      }
    ];

    this.learnedStrategies = [];
    this.competitorData = new Map();
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    this.logger.info('🔍 Initializing Competitor Intelligence Agent...');

    // Load previously learned strategies
    try {
      const savedData = await fs.readFile('data/competitors/learned-strategies.json', 'utf8');
      this.learnedStrategies = JSON.parse(savedData);
      this.logger.info(`   Loaded ${this.learnedStrategies.length} previously learned strategies`);
    } catch (error) {
      this.logger.info('   Starting with fresh knowledge base');
    }
  }

  /**
   * Analyze top competitors
   */
  async analyzeTopCompetitors() {
    this.logger.info('🔍 Analyzing top competitors...');
    const results = [];

    for (const competitor of this.competitors) {
      try {
        this.logger.info(`   Analyzing ${competitor.name}...`);

        // Scrape competitor website
        const competitorData = await this.scrapeCompetitor(competitor);

        // Analyze with AI
        const insights = await this.analyzeWithAI(competitor.name, competitorData);

        // Store results
        this.competitorData.set(competitor.name, {
          ...competitorData,
          insights,
          analyzedAt: new Date()
        });

        results.push({
          name: competitor.name,
          insights
        });

        this.logger.info(`   ✓ ${competitor.name} analyzed - ${insights.keyLearnings.length} insights gained`);

        // Rate limiting
        await this.delay(5000);

      } catch (error) {
        this.logger.error(`   ✗ Failed to analyze ${competitor.name}: ${error.message}`);
      }
    }

    // Save learned strategies
    await this.saveLearnedStrategies();

    return results;
  }

  /**
   * Scrape competitor website
   */
  async scrapeCompetitor(competitor) {
    let browser;

    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      await page.goto(competitor.url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Extract data
      const data = await page.evaluate(() => {
        return {
          title: document.title,
          description: document.querySelector('meta[name="description"]')?.content || '',
          headlines: Array.from(document.querySelectorAll('h1, h2')).map(h => h.textContent.trim()).slice(0, 10),
          ctaButtons: Array.from(document.querySelectorAll('button, a.button, a.cta')).map(btn => btn.textContent.trim()).slice(0, 10),
          pricing: this.extractPricingInfo(),
          features: Array.from(document.querySelectorAll('li, .feature, .benefit')).map(el => el.textContent.trim()).slice(0, 20)
        };

        function extractPricingInfo() {
          const pricingElements = document.querySelectorAll('[class*="price"], [class*="pricing"]');
          return Array.from(pricingElements).map(el => el.textContent.trim()).slice(0, 5);
        }
      });

      await browser.close();

      return data;

    } catch (error) {
      if (browser) await browser.close();
      throw error;
    }
  }

  /**
   * Analyze competitor data using AI
   */
  async analyzeWithAI(competitorName, data) {
    const prompt = `You are an expert business analyst studying website selling companies.

Analyze this data from ${competitorName}:

Title: ${data.title}
Description: ${data.description}

Headlines: ${JSON.stringify(data.headlines)}
CTA Buttons: ${JSON.stringify(data.ctaButtons)}
Pricing Info: ${JSON.stringify(data.pricing)}
Key Features: ${JSON.stringify(data.features)}

Provide a detailed analysis in JSON format:
{
  "keyLearnings": ["learning 1", "learning 2", "learning 3"],
  "pricingStrategy": "description of their pricing approach",
  "messagingStrategy": "what messaging tactics they use",
  "targetAudience": "who they're targeting",
  "competitiveAdvantages": ["advantage 1", "advantage 2"],
  "tacticsToAdopt": ["tactic 1", "tactic 2", "tactic 3"],
  "estimatedPrice": "their pricing range",
  "conversionTactics": ["tactic 1", "tactic 2"]
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an expert business strategy analyst specializing in SaaS and website building businesses.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const analysis = JSON.parse(response.choices[0].message.content);

      // Store learned tactics
      analysis.tacticsToAdopt.forEach(tactic => {
        this.learnedStrategies.push({
          tactic,
          source: competitorName,
          learnedAt: new Date(),
          implemented: false
        });
      });

      return analysis;

    } catch (error) {
      this.logger.error(`AI analysis error for ${competitorName}: ${error.message}`);
      return {
        keyLearnings: [],
        pricingStrategy: 'unknown',
        messagingStrategy: 'unknown',
        targetAudience: 'unknown',
        competitiveAdvantages: [],
        tacticsToAdopt: [],
        estimatedPrice: 'unknown',
        conversionTactics: []
      };
    }
  }

  /**
   * Analyze specific competitor
   */
  async analyzeCompetitor(competitorUrl) {
    try {
      const data = await this.scrapeCompetitor({ name: 'Custom', url: competitorUrl, focus: [] });
      const insights = await this.analyzeWithAI('Custom Competitor', data);
      return insights;
    } catch (error) {
      this.logger.error(`Error analyzing competitor: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get best tactics learned from competitors
   */
  getBestTactics(limit = 10) {
    return this.learnedStrategies
      .filter(s => !s.implemented)
      .slice(0, limit);
  }

  /**
   * Mark tactic as implemented
   */
  async markTacticImplemented(tactic) {
    const strategy = this.learnedStrategies.find(s => s.tactic === tactic);
    if (strategy) {
      strategy.implemented = true;
      strategy.implementedAt = new Date();
      await this.saveLearnedStrategies();
    }
  }

  /**
   * Get competitor pricing analysis
   */
  getCompetitorPricing() {
    const pricing = [];

    for (const [name, data] of this.competitorData) {
      if (data.insights.estimatedPrice) {
        pricing.push({
          competitor: name,
          pricing: data.insights.estimatedPrice,
          strategy: data.insights.pricingStrategy
        });
      }
    }

    return pricing;
  }

  /**
   * Get best messaging strategies
   */
  getBestMessagingStrategies() {
    const messaging = [];

    for (const [name, data] of this.competitorData) {
      messaging.push({
        competitor: name,
        strategy: data.insights.messagingStrategy,
        examples: data.headlines || []
      });
    }

    return messaging;
  }

  /**
   * Save learned strategies to disk
   */
  async saveLearnedStrategies() {
    try {
      const dir = path.join(__dirname, '../../data/competitors');
      await fs.mkdir(dir, { recursive: true });

      await fs.writeFile(
        path.join(dir, 'learned-strategies.json'),
        JSON.stringify(this.learnedStrategies, null, 2)
      );

      // Also save full competitor data
      const competitorDataObj = {};
      for (const [name, data] of this.competitorData) {
        competitorDataObj[name] = data;
      }

      await fs.writeFile(
        path.join(dir, 'competitor-data.json'),
        JSON.stringify(competitorDataObj, null, 2)
      );

    } catch (error) {
      this.logger.error(`Error saving strategies: ${error.message}`);
    }
  }

  /**
   * Generate competitive intelligence report
   */
  generateReport() {
    return {
      totalCompetitorsAnalyzed: this.competitorData.size,
      totalStrategiesLearned: this.learnedStrategies.length,
      implementedStrategies: this.learnedStrategies.filter(s => s.implemented).length,
      pricingInsights: this.getCompetitorPricing(),
      messagingInsights: this.getBestMessagingStrategies(),
      topTacticsToImplement: this.getBestTactics(5)
    };
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = CompetitorIntelligenceAgent;