/**
 * PROJECT LEARNING SERVICE
 *
 * Continuously monitors Anthony's website-scraper project and adopts successful
 * systems, patterns, and improvements to this automated business.
 *
 * This service:
 * - Scans website-scraper codebase daily
 * - Identifies valuable patterns and systems
 * - Automatically adopts improvements
 * - Learns from performance data
 * - Notifies Anthony of major adoptions
 */

const fs = require('fs').promises;
const path = require('path');
const OpenAI = require('openai');
const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');

class ProjectLearningService {
  constructor(logger) {
    this.logger = logger;
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Setup SendGrid
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }

    // Setup Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }

    this.sourceProjectPath = '/Users/anthonygarcia/projects/website-scraper';
    this.currentProjectPath = process.cwd();

    // Track what we've already adopted
    this.adoptedSystems = [];
    this.lastScanTime = null;
    this.adoptionHistory = [];

    // Systems we've identified for potential adoption
    this.identifiedSystems = [];
  }

  /**
   * Initialize learning service
   */
  async initialize() {
    this.logger.info('🧠 Project Learning Service initialized');
    this.logger.info('📚 Will continuously learn from: /Users/anthonygarcia/projects/website-scraper');

    // Load adoption history
    await this.loadAdoptionHistory();

    // Run initial scan
    await this.scanSourceProject();
  }

  /**
   * SCAN SOURCE PROJECT FOR IMPROVEMENTS
   * Runs daily to check for new systems/patterns
   */
  async scanSourceProject() {
    this.logger.info('🔍 Scanning website-scraper project for improvements...');

    try {
      // Key systems to check
      const systemsToCheck = [
        {
          name: 'Email Scheduling',
          path: 'src/services/EmailSchedulingService.js',
          category: 'email',
          priority: 'high',
          description: 'Optimal send times by day/hour/industry'
        },
        {
          name: 'Lead Scoring',
          path: 'src/services/LeadScoringService.js',
          category: 'leads',
          priority: 'high',
          description: 'Score leads based on multiple factors'
        },
        {
          name: 'Follow-Up Sequences',
          path: 'src/services/FollowUpService.js',
          category: 'email',
          priority: 'high',
          description: 'Smart multi-touch follow-up campaigns'
        },
        {
          name: 'Email Optimization',
          path: 'src/services/EmailOptimizationService.js',
          category: 'email',
          priority: 'high',
          description: 'A/B testing, subject lines, personalization'
        },
        {
          name: 'Conversion Optimization',
          path: 'src/services/ConversionOptimizationService.js',
          category: 'conversion',
          priority: 'medium',
          description: 'CRO tactics and testing'
        },
        {
          name: 'Upsell Service',
          path: 'src/services/UpsellService.js',
          category: 'revenue',
          priority: 'medium',
          description: 'Automated upselling and cross-selling'
        },
        {
          name: 'Advanced Analytics',
          path: 'src/services/AdvancedAnalyticsService.js',
          category: 'analytics',
          priority: 'medium',
          description: 'Deep analytics and insights'
        },
        {
          name: 'Customer Support AI',
          path: 'src/services/CustomerSupportAI.js',
          category: 'support',
          priority: 'high',
          description: 'AI-powered support automation'
        },
        {
          name: 'Email Sequences',
          path: 'src/services/EmailSequenceService.js',
          category: 'email',
          priority: 'high',
          description: 'Drip campaigns and nurture sequences'
        },
        {
          name: 'Urgency Engine',
          path: 'src/services/UrgencyEngine.js',
          category: 'conversion',
          priority: 'medium',
          description: 'Dynamic urgency and scarcity messaging'
        }
      ];

      // Check each system
      for (const system of systemsToCheck) {
        const fullPath = path.join(this.sourceProjectPath, system.path);

        try {
          const exists = await fs.access(fullPath).then(() => true).catch(() => false);

          if (exists) {
            // Check if we've already adopted this
            const alreadyAdopted = this.adoptedSystems.find(s => s.name === system.name);

            if (!alreadyAdopted) {
              this.logger.info(`✨ Found new system: ${system.name}`);
              await this.evaluateSystemForAdoption(system, fullPath);
            } else {
              // Check if system has been updated since adoption
              await this.checkForSystemUpdates(system, fullPath, alreadyAdopted);
            }
          }
        } catch (error) {
          this.logger.debug(`Could not check ${system.name}: ${error.message}`);
        }
      }

      this.lastScanTime = new Date();
      await this.saveAdoptionHistory();

      this.logger.info(`🧠 Scan complete. ${this.identifiedSystems.length} systems identified for potential adoption.`);

    } catch (error) {
      this.logger.error(`Failed to scan source project: ${error.message}`);
    }
  }

  /**
   * EVALUATE SYSTEM FOR ADOPTION
   * AI analyzes if system would improve this business
   */
  async evaluateSystemForAdoption(system, filePath) {
    try {
      // Read the source code
      const sourceCode = await fs.readFile(filePath, 'utf-8');

      // Use AI to analyze if this would improve our business
      const analysis = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{
          role: 'user',
          content: `Analyze this system from a successful website selling business:

System: ${system.name}
Description: ${system.description}
Category: ${system.category}

Code:
${sourceCode.substring(0, 3000)}

Current Business Context:
- We're running a fully autonomous website selling business
- Target: Small businesses without websites at $197/month
- Using GPT-4 + DALL-E 3 for website generation
- Autonomous operation for 30 days
- Need maximum conversion and revenue

Questions:
1. Would adopting this system significantly improve our business? (Yes/No)
2. What specific improvements would it bring?
3. What's the estimated impact? (High/Medium/Low)
4. Should we adopt this immediately? (Yes/No)
5. Any modifications needed for our use case?

Provide concise analysis in JSON format:
{
  "shouldAdopt": boolean,
  "improvements": ["list", "of", "improvements"],
  "estimatedImpact": "high/medium/low",
  "adoptImmediately": boolean,
  "modifications": "description of needed changes",
  "estimatedROI": "description"
}`
        }],
        temperature: 0.3
      });

      const aiAnalysis = JSON.parse(analysis.choices[0].message.content);

      if (aiAnalysis.shouldAdopt) {
        this.identifiedSystems.push({
          ...system,
          filePath,
          analysis: aiAnalysis,
          identifiedAt: new Date(),
          status: aiAnalysis.adoptImmediately ? 'ready_to_adopt' : 'needs_review'
        });

        this.logger.info(`✅ ${system.name} recommended for adoption`);
        this.logger.info(`   Impact: ${aiAnalysis.estimatedImpact}`);
        this.logger.info(`   Improvements: ${aiAnalysis.improvements.join(', ')}`);

        // Auto-adopt high-impact systems
        if (aiAnalysis.adoptImmediately && aiAnalysis.estimatedImpact === 'high') {
          await this.adoptSystem(system, filePath, aiAnalysis);
        }
      } else {
        this.logger.debug(`⏭️  ${system.name} not needed at this time`);
      }

    } catch (error) {
      this.logger.error(`Failed to evaluate ${system.name}: ${error.message}`);
    }
  }

  /**
   * ADOPT SYSTEM
   * Automatically integrate beneficial system into our business
   */
  async adoptSystem(system, sourceFilePath, analysis) {
    this.logger.info(`🚀 Adopting system: ${system.name}`);

    try {
      // Read source code
      const sourceCode = await fs.readFile(sourceFilePath, 'utf-8');

      // Determine target path in our project
      const targetPath = path.join(this.currentProjectPath, 'src', 'services', path.basename(sourceFilePath));

      // Check if we need to modify the code
      let finalCode = sourceCode;

      if (analysis.modifications && analysis.modifications !== 'none') {
        // Use AI to adapt the code for our use case
        finalCode = await this.adaptSystemCode(sourceCode, system, analysis);
      }

      // Write to our project
      await fs.writeFile(targetPath, finalCode);

      // Record adoption
      this.adoptedSystems.push({
        name: system.name,
        category: system.category,
        priority: system.priority,
        adoptedAt: new Date(),
        sourcePath: sourceFilePath,
        targetPath: targetPath,
        analysis: analysis,
        version: 1
      });

      // Send notification email
      await this.notifyAdoption(system, analysis);

      this.logger.info(`✅ Successfully adopted: ${system.name}`);
      this.logger.info(`   Saved to: ${targetPath}`);

    } catch (error) {
      this.logger.error(`Failed to adopt ${system.name}: ${error.message}`);
    }
  }

  /**
   * ADAPT SYSTEM CODE
   * AI modifies source code to fit our specific use case
   */
  async adaptSystemCode(sourceCode, system, analysis) {
    const adaptation = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{
        role: 'user',
        content: `Adapt this code for our autonomous website selling business:

Original System: ${system.name}
Modifications Needed: ${analysis.modifications}

Original Code:
${sourceCode}

Our Business Context:
- Fully autonomous operation
- Target: $197/month website service
- Using GPT-4 + DALL-E 3 for generation
- Autonomous decision-making
- SendGrid for emails, Google Places for leads

Please provide the adapted code that:
1. Works with our existing architecture
2. Integrates with our services
3. Maintains full autonomy
4. Follows our coding patterns
5. Includes clear comments

Return ONLY the adapted JavaScript code, no explanations.`
      }],
      temperature: 0.3
    });

    return adaptation.choices[0].message.content;
  }

  /**
   * CHECK FOR SYSTEM UPDATES
   * See if adopted systems have been improved in source project
   */
  async checkForSystemUpdates(system, sourcePath, adoptedSystem) {
    try {
      const sourceCode = await fs.readFile(sourcePath, 'utf-8');
      const currentCode = await fs.readFile(adoptedSystem.targetPath, 'utf-8');

      // Simple check: has source code changed significantly?
      if (sourceCode.length !== currentCode.length ||
          Math.abs(sourceCode.length - currentCode.length) > 500) {

        this.logger.info(`🔄 ${system.name} may have updates in source project`);

        // Use AI to check if updates are beneficial
        const updateAnalysis = await this.analyzeUpdates(system, sourceCode, currentCode);

        if (updateAnalysis.shouldUpdate) {
          this.logger.info(`📥 Updating ${system.name} with improvements`);
          await this.updateAdoptedSystem(adoptedSystem, sourcePath, updateAnalysis);
        }
      }
    } catch (error) {
      this.logger.debug(`Could not check updates for ${system.name}: ${error.message}`);
    }
  }

  /**
   * ANALYZE UPDATES
   * AI compares old vs new code to see if updates are beneficial
   */
  async analyzeUpdates(system, newCode, currentCode) {
    try {
      const analysis = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{
          role: 'user',
          content: `Compare these two versions of ${system.name}:

CURRENT VERSION (what we have):
${currentCode.substring(0, 2000)}

NEW VERSION (from source project):
${newCode.substring(0, 2000)}

Questions:
1. Does the new version have meaningful improvements?
2. Should we update to the new version?
3. What improvements does it bring?
4. Any risks in updating?

Respond in JSON:
{
  "shouldUpdate": boolean,
  "improvements": ["list"],
  "risks": ["list"],
  "impact": "high/medium/low"
}`
        }],
        temperature: 0.3
      });

      return JSON.parse(analysis.choices[0].message.content);
    } catch (error) {
      return { shouldUpdate: false };
    }
  }

  /**
   * UPDATE ADOPTED SYSTEM
   */
  async updateAdoptedSystem(adoptedSystem, sourcePath, updateAnalysis) {
    try {
      const newCode = await fs.readFile(sourcePath, 'utf-8');
      await fs.writeFile(adoptedSystem.targetPath, newCode);

      adoptedSystem.version += 1;
      adoptedSystem.lastUpdated = new Date();
      adoptedSystem.updateNotes = updateAnalysis.improvements.join(', ');

      await this.notifyUpdate(adoptedSystem, updateAnalysis);

      this.logger.info(`✅ Updated ${adoptedSystem.name} to v${adoptedSystem.version}`);
    } catch (error) {
      this.logger.error(`Failed to update ${adoptedSystem.name}: ${error.message}`);
    }
  }

  /**
   * SPECIFIC SYSTEM: EMAIL SCHEDULING
   * Adopt the proven email timing system
   */
  async adoptEmailScheduling() {
    this.logger.info('📧 Adopting Email Scheduling System from website-scraper...');

    try {
      const sourcePath = path.join(this.sourceProjectPath, 'src/services/EmailSchedulingService.js');
      const sourceCode = await fs.readFile(sourcePath, 'utf-8');

      // This system is proven and needs minimal modifications
      const targetPath = path.join(this.currentProjectPath, 'src/services/EmailSchedulingService.js');
      await fs.writeFile(targetPath, sourceCode);

      this.adoptedSystems.push({
        name: 'Email Scheduling',
        category: 'email',
        adoptedAt: new Date(),
        sourcePath,
        targetPath,
        benefits: [
          'Optimal send times by day of week',
          'Industry-specific timing',
          'Holiday/blackout date avoidance',
          'Expected 37-42% open rates (vs 25% baseline)',
          'Volume optimization'
        ],
        version: 1
      });

      this.logger.info('✅ Email Scheduling adopted successfully');
      this.logger.info('   Benefits: Optimal send times, 37-42% expected open rates');

      return true;
    } catch (error) {
      this.logger.error(`Failed to adopt Email Scheduling: ${error.message}`);
      return false;
    }
  }

  /**
   * GENERATE ADOPTION REPORT
   */
  async generateAdoptionReport() {
    const report = {
      generatedAt: new Date(),
      totalSystemsAdopted: this.adoptedSystems.length,
      systemsIdentified: this.identifiedSystems.length,
      adoptedSystems: this.adoptedSystems.map(s => ({
        name: s.name,
        category: s.category,
        adoptedAt: s.adoptedAt,
        benefits: s.analysis?.improvements || s.benefits || [],
        impact: s.analysis?.estimatedImpact || 'medium'
      })),
      pendingSystems: this.identifiedSystems
        .filter(s => s.status === 'needs_review')
        .map(s => ({
          name: s.name,
          category: s.category,
          impact: s.analysis.estimatedImpact,
          improvements: s.analysis.improvements
        })),
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  /**
   * GENERATE RECOMMENDATIONS
   */
  generateRecommendations() {
    const recommendations = [];

    // Recommend high-priority systems that aren't adopted yet
    const highPriority = this.identifiedSystems.filter(
      s => s.priority === 'high' && s.status === 'needs_review'
    );

    for (const system of highPriority) {
      recommendations.push({
        system: system.name,
        action: 'Review and adopt',
        reason: `High impact: ${system.analysis.improvements.join(', ')}`,
        estimatedROI: system.analysis.estimatedROI
      });
    }

    return recommendations;
  }

  /**
   * NOTIFY ADOPTION
   */
  async notifyAdoption(system, analysis) {
    this.logger.info(`📧 Notifying Anthony about adopting: ${system.name}`);

    const notificationEmail = process.env.NOTIFICATION_EMAIL || process.env.EMERGENCY_CONTACT_EMAIL;
    const notificationPhone = process.env.NOTIFICATION_PHONE || process.env.EMERGENCY_CONTACT_PHONE;

    // Email notification
    if (process.env.SENDGRID_API_KEY && notificationEmail) {
      try {
        const emailContent = `
Hi Anthony,

🚀 Your autonomous AI has automatically adopted a new system!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SYSTEM ADOPTED: ${system.name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 IMPACT: ${analysis.estimatedImpact.toUpperCase()}

✨ IMPROVEMENTS:
${analysis.improvements.map(imp => `• ${imp}`).join('\n')}

💰 ESTIMATED ROI: ${analysis.estimatedROI}

📁 SOURCE: website-scraper project
🎯 STATUS: Active and integrated ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your business just got better automatically!

- Your Autonomous AI 🤖
`;

        await sgMail.send({
          to: notificationEmail,
          from: process.env.FROM_EMAIL || notificationEmail,
          subject: `🚀 AI Adopted: ${system.name}`,
          text: emailContent
        });

        this.logger.info(`✅ Email notification sent to ${notificationEmail}`);
      } catch (error) {
        this.logger.error(`Failed to send email: ${error.message}`);
      }
    }

    // SMS notification
    if (this.twilioClient && notificationPhone && process.env.ENABLE_SMS_NOTIFICATIONS === 'true') {
      try {
        const smsContent = `🚀 AI Adopted: ${system.name}\n\n` +
          `Impact: ${analysis.estimatedImpact}\n` +
          `ROI: ${analysis.estimatedROI}\n\n` +
          `Your business just improved automatically! Check email for details.`;

        await this.twilioClient.messages.create({
          body: smsContent,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: notificationPhone
        });

        this.logger.info(`✅ SMS notification sent to ${notificationPhone}`);
      } catch (error) {
        this.logger.error(`Failed to send SMS: ${error.message}`);
      }
    }

    // Log to project notes
    if (global.projectNotes) {
      await global.projectNotes.logImprovement({
        area: `Adopted: ${system.name}`,
        before: 'System not present',
        after: `Integrated ${system.name} from website-scraper project`,
        reason: analysis.improvements.join(', '),
        expectedImpact: `${analysis.estimatedImpact} impact - ${analysis.estimatedROI}`
      });
    }
  }

  /**
   * NOTIFY UPDATE
   */
  async notifyUpdate(adoptedSystem, updateAnalysis) {
    this.logger.info(`📧 Notifying Anthony about update: ${adoptedSystem.name} v${adoptedSystem.version}`);

    const notificationEmail = process.env.NOTIFICATION_EMAIL || process.env.EMERGENCY_CONTACT_EMAIL;
    const notificationPhone = process.env.NOTIFICATION_PHONE || process.env.EMERGENCY_CONTACT_PHONE;

    // Email notification
    if (process.env.SENDGRID_API_KEY && notificationEmail) {
      try {
        const emailContent = `
Hi Anthony,

📥 Your autonomous AI has updated an existing system!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SYSTEM UPDATED: ${adoptedSystem.name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 VERSION: v${adoptedSystem.version - 1} → v${adoptedSystem.version}

✨ IMPROVEMENTS:
${updateAnalysis.improvements.map(imp => `• ${imp}`).join('\n')}

📈 IMPACT: ${updateAnalysis.impact.toUpperCase()}

📁 SOURCE: website-scraper project
🎯 STATUS: Updated and active ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your business keeps getting better!

- Your Autonomous AI 🤖
`;

        await sgMail.send({
          to: notificationEmail,
          from: process.env.FROM_EMAIL || notificationEmail,
          subject: `📥 AI Updated: ${adoptedSystem.name} v${adoptedSystem.version}`,
          text: emailContent
        });

        this.logger.info(`✅ Email notification sent to ${notificationEmail}`);
      } catch (error) {
        this.logger.error(`Failed to send email: ${error.message}`);
      }
    }

    // SMS notification
    if (this.twilioClient && notificationPhone && process.env.ENABLE_SMS_NOTIFICATIONS === 'true') {
      try {
        const smsContent = `📥 AI Updated: ${adoptedSystem.name} v${adoptedSystem.version}\n\n` +
          `Impact: ${updateAnalysis.impact}\n\n` +
          `System improved with new features from website-scraper. Check email for details.`;

        await this.twilioClient.messages.create({
          body: smsContent,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: notificationPhone
        });

        this.logger.info(`✅ SMS notification sent to ${notificationPhone}`);
      } catch (error) {
        this.logger.error(`Failed to send SMS: ${error.message}`);
      }
    }

    // Log to project notes
    if (global.projectNotes) {
      await global.projectNotes.logImprovement({
        area: `Updated: ${adoptedSystem.name}`,
        before: `v${adoptedSystem.version - 1}`,
        after: `v${adoptedSystem.version}`,
        reason: updateAnalysis.improvements.join(', '),
        expectedImpact: updateAnalysis.impact
      });
    }
  }

  /**
   * SAVE/LOAD ADOPTION HISTORY
   */
  async saveAdoptionHistory() {
    try {
      const historyPath = path.join(this.currentProjectPath, 'data', 'learning', 'adoption-history.json');
      await fs.mkdir(path.dirname(historyPath), { recursive: true });
      await fs.writeFile(historyPath, JSON.stringify({
        adoptedSystems: this.adoptedSystems,
        identifiedSystems: this.identifiedSystems,
        lastScanTime: this.lastScanTime
      }, null, 2));
    } catch (error) {
      this.logger.debug(`Could not save adoption history: ${error.message}`);
    }
  }

  async loadAdoptionHistory() {
    try {
      const historyPath = path.join(this.currentProjectPath, 'data', 'learning', 'adoption-history.json');
      const data = await fs.readFile(historyPath, 'utf-8');
      const history = JSON.parse(data);

      this.adoptedSystems = history.adoptedSystems || [];
      this.identifiedSystems = history.identifiedSystems || [];
      this.lastScanTime = history.lastScanTime ? new Date(history.lastScanTime) : null;

      this.logger.info(`📚 Loaded adoption history: ${this.adoptedSystems.length} systems adopted`);
    } catch (error) {
      this.logger.info('📚 No adoption history found, starting fresh');
    }
  }

  /**
   * MANUAL ADOPTION
   * Anthony can request specific systems to be adopted
   */
  async adoptSpecificSystem(systemName) {
    this.logger.info(`🎯 Manually adopting: ${systemName}`);

    const systemMap = {
      'email-scheduling': 'src/services/EmailSchedulingService.js',
      'lead-scoring': 'src/services/LeadScoringService.js',
      'follow-up': 'src/services/FollowUpService.js',
      'email-optimization': 'src/services/EmailOptimizationService.js',
      'conversion-optimization': 'src/services/ConversionOptimizationService.js',
      'upsell': 'src/services/UpsellService.js',
      'analytics': 'src/services/AdvancedAnalyticsService.js',
      'support-ai': 'src/services/CustomerSupportAI.js',
      'email-sequences': 'src/services/EmailSequenceService.js',
      'urgency': 'src/services/UrgencyEngine.js'
    };

    const relativePath = systemMap[systemName];
    if (!relativePath) {
      this.logger.error(`Unknown system: ${systemName}`);
      return false;
    }

    const sourcePath = path.join(this.sourceProjectPath, relativePath);

    try {
      const sourceCode = await fs.readFile(sourcePath, 'utf-8');
      const targetPath = path.join(this.currentProjectPath, 'src', 'services', path.basename(relativePath));
      await fs.writeFile(targetPath, sourceCode);

      this.logger.info(`✅ Successfully adopted: ${systemName}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to adopt ${systemName}: ${error.message}`);
      return false;
    }
  }
}

module.exports = ProjectLearningService;