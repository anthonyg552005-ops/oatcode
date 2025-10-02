/**
 * SELF-IMPROVEMENT AI SERVICE
 *
 * An AI assistant that continuously analyzes the business and autonomously:
 * 1. Identifies areas for improvement and optimization
 * 2. Designs and generates new autonomous services
 * 3. Writes the code for these services
 * 4. Integrates them into the autonomous engine
 * 5. Tests and deploys them automatically
 *
 * This creates a self-evolving, self-improving business that gets better over time.
 */

const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class SelfImprovementAIService {
  constructor(logger) {
    this.logger = logger;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.analysisInterval = null;
    this.servicesCreated = [];
    this.improvementHistory = [];
    this.isAnalyzing = false;

    // Track business metrics for analysis
    this.businessMetrics = {
      revenue: 0,
      customers: 0,
      emailsSent: 0,
      conversionRate: 0,
      uptime: 0,
      errors: [],
      bottlenecks: [],
      opportunities: []
    };
  }

  /**
   * Start the self-improvement AI
   * Analyzes business every 24 hours and creates new services as needed
   */
  start() {
    this.logger.info('🧠 Self-Improvement AI Assistant starting...');
    this.logger.info('   Will analyze business daily and create optimization services');

    // Initial analysis after 1 hour of system operation
    setTimeout(() => {
      this.performAnalysis();
    }, 60 * 60 * 1000); // 1 hour

    // Daily analysis
    this.analysisInterval = setInterval(() => {
      this.performAnalysis();
    }, 24 * 60 * 60 * 1000); // Every 24 hours
  }

  /**
   * Perform comprehensive business analysis
   */
  async performAnalysis() {
    if (this.isAnalyzing) {
      this.logger.info('⏳ Analysis already in progress...');
      return;
    }

    this.isAnalyzing = true;
    this.logger.info('');
    this.logger.info('╔════════════════════════════════════════════════════════════════╗');
    this.logger.info('║  🧠 SELF-IMPROVEMENT AI: Starting Business Analysis           ║');
    this.logger.info('╚════════════════════════════════════════════════════════════════╝');
    this.logger.info('');

    try {
      // Step 1: Gather business data
      this.logger.info('📊 Step 1: Gathering business data...');
      const businessData = await this.gatherBusinessData();

      // Step 2: Analyze with AI
      this.logger.info('🤖 Step 2: AI analyzing business state...');
      const analysis = await this.analyzeWithAI(businessData);

      // Step 3: Identify improvement opportunities
      this.logger.info('💡 Step 3: Identifying improvement opportunities...');
      const opportunities = this.extractOpportunities(analysis);

      if (opportunities.length === 0) {
        this.logger.info('✅ No improvements needed - business is optimized!');
        this.isAnalyzing = false;
        return;
      }

      this.logger.info(`   Found ${opportunities.length} improvement opportunities:`);
      opportunities.forEach((opp, i) => {
        this.logger.info(`   ${i + 1}. ${opp.title} (Priority: ${opp.priority})`);
      });

      // Step 4: Generate services for top opportunities
      this.logger.info('');
      this.logger.info('🛠️  Step 4: Generating autonomous services...');

      const topOpportunities = opportunities
        .sort((a, b) => this.getPriorityScore(b.priority) - this.getPriorityScore(a.priority))
        .slice(0, 3); // Top 3 opportunities

      for (const opportunity of topOpportunities) {
        await this.createServiceForOpportunity(opportunity);
      }

      // Step 5: Deploy new services
      this.logger.info('');
      this.logger.info('🚀 Step 5: Deploying new services...');
      await this.deployNewServices();

      this.logger.info('');
      this.logger.info('✅ Self-improvement cycle complete!');
      this.logger.info(`   Created ${this.servicesCreated.length} new services today`);

    } catch (error) {
      this.logger.error(`❌ Self-improvement analysis failed: ${error.message}`);
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * Gather comprehensive business data for analysis
   */
  async gatherBusinessData() {
    const data = {
      timestamp: new Date().toISOString(),
      system: {},
      codebase: {},
      metrics: {},
      services: {},
      logs: {}
    };

    try {
      // Get system status
      data.system = {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version
      };

      // Get existing services
      const servicesDir = path.join(__dirname);
      const files = await fs.readdir(servicesDir);
      data.services.existing = files.filter(f => f.endsWith('.js')).map(f => f.replace('.js', ''));
      data.services.count = data.services.existing.length;

      // Get recent errors from logs (both local and PM2 production)
      try {
        const logFile = path.join(__dirname, '../../data/logs/combined.log');
        const logContent = await fs.readFile(logFile, 'utf-8');
        const lines = logContent.split('\n').slice(-100); // Last 100 lines
        data.logs.recentErrors = lines.filter(l => l.includes('error') || l.includes('Error')).slice(-10);
      } catch (error) {
        data.logs.recentErrors = [];
      }

      // Get PM2 production errors (if running in production)
      try {
        const { exec } = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(exec);

        // Check if running on production (has droplet_key)
        try {
          await fs.access(path.join(require('os').homedir(), '.ssh', 'droplet_key'));

          // Get production errors from PM2 logs
          const prodLogsCmd = 'ssh -i ~/.ssh/droplet_key root@24.144.89.17 "tail -500 /root/.pm2/logs/oatcode-engine-error.log"';
          const { stdout } = await execPromise(prodLogsCmd);
          const prodErrors = stdout.split('\n').filter(l =>
            l.includes('Error') || l.includes('TypeError') || l.includes('ReferenceError')
          ).slice(-20);

          data.logs.productionErrors = prodErrors;
          data.logs.isProduction = true;
        } catch (error) {
          data.logs.productionErrors = [];
          data.logs.isProduction = false;
        }
      } catch (error) {
        data.logs.productionErrors = [];
      }

      // Get metrics from global state (if available)
      if (global.autonomousMetrics) {
        data.metrics = global.autonomousMetrics;
      }

      // Analyze codebase structure
      data.codebase.structure = await this.analyzeCodebaseStructure();

      return data;

    } catch (error) {
      this.logger.error(`Error gathering business data: ${error.message}`);
      return data;
    }
  }

  /**
   * Analyze codebase structure
   */
  async analyzeCodebaseStructure() {
    try {
      const rootDir = path.join(__dirname, '../..');

      const structure = {
        services: [],
        routes: [],
        models: [],
        hasDatabase: false,
        hasAuth: false,
        hasTesting: false
      };

      // Check for services
      const servicesPath = path.join(rootDir, 'src/services');
      const services = await fs.readdir(servicesPath);
      structure.services = services.filter(f => f.endsWith('.js'));

      // Check for routes
      try {
        const routesPath = path.join(rootDir, 'src/routes');
        const routes = await fs.readdir(routesPath);
        structure.routes = routes.filter(f => f.endsWith('.js'));
      } catch (error) {
        structure.routes = [];
      }

      // Check for database
      try {
        const modelsPath = path.join(rootDir, 'src/models');
        const models = await fs.readdir(modelsPath);
        structure.models = models.filter(f => f.endsWith('.js'));
        structure.hasDatabase = structure.models.length > 0;
      } catch (error) {
        structure.hasDatabase = false;
      }

      // Check for tests
      try {
        await fs.access(path.join(rootDir, 'tests'));
        structure.hasTesting = true;
      } catch (error) {
        structure.hasTesting = false;
      }

      return structure;

    } catch (error) {
      return { services: [], routes: [], models: [] };
    }
  }

  /**
   * Analyze business with AI
   */
  async analyzeWithAI(businessData) {
    const prompt = `You are an AI business analyst for an autonomous website-selling business. Analyze the current state and identify concrete improvement opportunities.

BUSINESS DATA:
${JSON.stringify(businessData, null, 2)}

EXISTING SERVICES:
${businessData.services.existing.join(', ')}

RECENT LOCAL ERRORS:
${businessData.logs.recentErrors.slice(0, 5).join('\n')}

PRODUCTION ERRORS:
${businessData.logs.productionErrors ? businessData.logs.productionErrors.slice(0, 10).join('\n') : 'N/A (not running on production)'}

Analyze and identify:
1. Missing critical services that would improve reliability
2. Optimization opportunities for existing systems
3. Revenue-generating features that could be automated
4. Customer experience improvements
5. Cost-reduction opportunities
6. Scaling bottlenecks

For each opportunity, specify:
- Title (concise)
- Description (what it does)
- Priority (CRITICAL, HIGH, MEDIUM, LOW)
- Impact (specific benefit)
- Implementation (brief approach)

Respond in JSON format:
{
  "opportunities": [
    {
      "title": "Service Name",
      "description": "What it does",
      "priority": "HIGH",
      "impact": "Specific benefit",
      "implementation": "Brief approach",
      "category": "reliability|revenue|experience|cost|scaling"
    }
  ]
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert AI business analyst specialized in autonomous systems and SaaS businesses. Provide actionable, specific recommendations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      return analysis;

    } catch (error) {
      this.logger.error(`AI analysis error: ${error.message}`);
      return { opportunities: [] };
    }
  }

  /**
   * Extract opportunities from analysis
   */
  extractOpportunities(analysis) {
    if (!analysis.opportunities || !Array.isArray(analysis.opportunities)) {
      return [];
    }

    // Filter out opportunities for services that already exist
    const existing = this.servicesCreated.map(s => s.toLowerCase());

    return analysis.opportunities.filter(opp => {
      const serviceName = this.generateServiceName(opp.title);
      return !existing.includes(serviceName.toLowerCase());
    });
  }

  /**
   * Generate service name from title
   */
  generateServiceName(title) {
    return title
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('') + 'Service';
  }

  /**
   * Get priority score
   */
  getPriorityScore(priority) {
    const scores = {
      'CRITICAL': 4,
      'HIGH': 3,
      'MEDIUM': 2,
      'LOW': 1
    };
    return scores[priority] || 0;
  }

  /**
   * Create a new service for an opportunity
   */
  async createServiceForOpportunity(opportunity) {
    this.logger.info('');
    this.logger.info(`📝 Creating service: ${opportunity.title}`);
    this.logger.info(`   Priority: ${opportunity.priority}`);
    this.logger.info(`   Impact: ${opportunity.impact}`);

    try {
      // Generate service code with AI
      const serviceCode = await this.generateServiceCode(opportunity);

      // Write service to file
      const serviceName = this.generateServiceName(opportunity.title);
      const filePath = path.join(__dirname, `${serviceName}.js`);

      await fs.writeFile(filePath, serviceCode, 'utf-8');

      this.logger.info(`   ✅ Created: ${serviceName}.js`);

      this.servicesCreated.push(serviceName);
      this.improvementHistory.push({
        timestamp: new Date().toISOString(),
        opportunity,
        serviceName,
        filePath
      });

      return serviceName;

    } catch (error) {
      this.logger.error(`   ❌ Failed to create service: ${error.message}`);
      return null;
    }
  }

  /**
   * Generate service code with AI
   */
  async generateServiceCode(opportunity) {
    const prompt = `Generate a complete, production-ready Node.js service class for this opportunity:

TITLE: ${opportunity.title}
DESCRIPTION: ${opportunity.description}
IMPLEMENTATION: ${opportunity.implementation}
IMPACT: ${opportunity.impact}

Requirements:
1. Complete autonomous service that runs on a schedule
2. Include comprehensive error handling
3. Include logging using this.logger
4. Include a start() method that sets up cron jobs or intervals
5. Include proper JSDoc comments
6. Follow best practices for Node.js services
7. Use modern ES6+ syntax
8. Include environment variable checks where needed

Generate ONLY the JavaScript code, no explanations. The code should be copy-paste ready.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert Node.js developer. Generate clean, production-ready code following best practices.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 3000
    });

    return response.choices[0].message.content.replace(/```javascript\n?/g, '').replace(/```\n?/g, '');
  }

  /**
   * Deploy new services to production
   */
  async deployNewServices() {
    if (this.servicesCreated.length === 0) {
      this.logger.info('   No new services to deploy');
      return;
    }

    try {
      // Commit new services
      const serviceFiles = this.servicesCreated.map(name => `src/services/${name}.js`).join(' ');

      this.logger.info(`   📦 Committing ${this.servicesCreated.length} new services...`);

      await execPromise(`git add ${serviceFiles}`);

      const commitMessage = `Add AI-generated services: ${this.servicesCreated.join(', ')}

Auto-generated by Self-Improvement AI
Services created to address business needs:
${this.improvementHistory.map(h => `- ${h.opportunity.title}: ${h.opportunity.impact}`).join('\n')}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>`;

      await execPromise(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`);

      this.logger.info('   ✅ Services committed to git');

      // Push to GitHub
      await execPromise('git push origin main');

      this.logger.info('   ✅ Services pushed to GitHub');

      // Deploy to Droplet (if SSH key available)
      try {
        await execPromise(
          `ssh -i ~/.ssh/droplet_key root@24.144.89.17 'cd /var/www/automatedwebsitescraper && git pull origin main && pm2 restart oatcode-engine'`
        );

        this.logger.info('   ✅ Services deployed to production');
      } catch (error) {
        this.logger.warn('   ⚠️  Could not auto-deploy to production - manual deployment needed');
      }

      // Log successful deployment
      this.logger.info('');
      this.logger.info('🎉 New services successfully deployed:');
      this.servicesCreated.forEach(name => {
        this.logger.info(`   • ${name}`);
      });

      // Reset for next cycle
      this.servicesCreated = [];

    } catch (error) {
      this.logger.error(`   ❌ Deployment failed: ${error.message}`);
    }
  }

  /**
   * Stop the self-improvement AI
   */
  stop() {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.logger.info('🛑 Self-Improvement AI stopped');
    }
  }
}

module.exports = SelfImprovementAIService;
