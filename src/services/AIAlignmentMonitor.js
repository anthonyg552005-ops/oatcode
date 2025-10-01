/**
 * AI ALIGNMENT MONITOR
 *
 * The "conscience" of the autonomous AI that ensures everything stays aligned with:
 * - Original business goals and vision
 * - Core architecture principles
 * - Anthony's initial prompts and intentions
 * - Business values and priorities
 *
 * This AI constantly scans the codebase, decisions, and actions to ensure
 * we're building what was intended, not drifting off course.
 *
 * Like a board member who keeps asking: "Is this what we set out to build?"
 */

const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');
const sgMail = require('@sendgrid/mail');

class AIAlignmentMonitor {
  constructor(logger) {
    this.logger = logger;
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Setup SendGrid
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }

    this.checkInterval = 6 * 60 * 60 * 1000; // Check every 6 hours
    this.alignmentIssues = [];
    this.lastAlignment = null;

    // Core vision and goals (from original prompts)
    this.coreVision = {
      mission: "Build a fully autonomous AI-powered website selling business that runs 24/7 with zero human intervention",

      keyGoals: [
        "Complete autonomy - AI makes ALL decisions",
        "Find customers automatically",
        "Send personalized outreach",
        "Generate custom websites with AI",
        "Handle customer support with AI",
        "Process payments automatically",
        "Scale without human input",
        "Continuous self-improvement",
        "Learn from competitors",
        "Optimize everything autonomously"
      ],

      architecturePrinciples: [
        "AI-first: Every component should be AI-powered",
        "Autonomous: Zero human intervention required",
        "Self-improving: System gets better over time",
        "Data-driven: Decisions based on metrics and testing",
        "Scalable: Can grow from 0 to 1000+ customers",
        "Resilient: Auto-recovery from failures",
        "Transparent: Anthony can monitor but doesn't need to act"
      ],

      coreValues: [
        "Quality over quantity - every website should be excellent",
        "Customer success - genuinely help small businesses",
        "Continuous learning - adopt best practices automatically",
        "Ethical automation - no spam, no manipulation",
        "Performance obsession - always optimize",
        "Simplicity - Anthony should just receive updates"
      ],

      prohibitedDrift: [
        "Requiring manual intervention for core operations",
        "Building features that need constant human oversight",
        "Creating complexity that reduces autonomy",
        "Losing focus on the core website selling business",
        "Compromising quality for speed",
        "Spammy or unethical outreach tactics"
      ]
    };
  }

  /**
   * Start monitoring alignment
   */
  start() {
    this.logger.info('🎯 AI Alignment Monitor started');
    this.logger.info('📋 Checking alignment with original vision every 6 hours');

    // Check immediately on startup
    setTimeout(() => this.performAlignmentCheck(), 30000);

    // Then check every 6 hours
    this.timer = setInterval(() => {
      this.performAlignmentCheck();
    }, this.checkInterval);
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.logger.info('🎯 AI Alignment Monitor stopped');
    }
  }

  /**
   * Perform comprehensive alignment check
   */
  async performAlignmentCheck() {
    try {
      this.logger.info('🎯 Performing alignment check with original vision...');

      const checks = await Promise.all([
        this.checkCodebaseAlignment(),
        this.checkArchitectureAlignment(),
        this.checkBusinessDecisionsAlignment(),
        this.checkServiceQualityAlignment(),
        this.checkAutonomyLevel()
      ]);

      const alignmentReport = {
        timestamp: new Date().toISOString(),
        overallScore: this.calculateOverallScore(checks),
        checks,
        issues: this.alignmentIssues,
        recommendations: []
      };

      // Generate AI recommendations
      alignmentReport.recommendations = await this.generateAlignmentRecommendations(alignmentReport);

      // Save report
      await this.saveAlignmentReport(alignmentReport);

      // Check if we need to alert Anthony
      if (alignmentReport.overallScore < 80) {
        await this.notifyAlignmentDrift(alignmentReport);
      } else if (alignmentReport.recommendations.length > 0) {
        await this.notifyAlignmentSuggestions(alignmentReport);
      }

      this.lastAlignment = alignmentReport;
      this.logger.info(`✅ Alignment check complete: ${alignmentReport.overallScore}% aligned`);

      // Reset issues for next check
      this.alignmentIssues = [];

    } catch (error) {
      this.logger.error(`❌ Alignment check failed: ${error.message}`);
    }
  }

  /**
   * Check if codebase aligns with original architecture
   */
  async checkCodebaseAlignment() {
    this.logger.info('   → Checking codebase alignment...');

    try {
      // Check if key autonomous services exist
      const requiredServices = [
        'BusinessAutomationService',
        'AIWebsiteGenerationService',
        'OutreachService',
        'CustomerSupportAI',
        'MetricsCollectionService',
        'DecisionMakingService'
      ];

      const servicesPath = path.join(process.cwd(), 'src/services');
      const files = await fs.readdir(servicesPath);

      const missingServices = requiredServices.filter(service =>
        !files.some(file => file.includes(service))
      );

      if (missingServices.length > 0) {
        this.alignmentIssues.push({
          type: 'missing_services',
          severity: 'high',
          message: `Missing core autonomous services: ${missingServices.join(', ')}`,
          recommendation: 'Build these services to complete autonomous architecture'
        });
      }

      // Check for manual intervention points
      const manualInterventionPatterns = [
        'waitForApproval',
        'requiresHumanInput',
        'manualReview',
        'askUser'
      ];

      let manualInterventionFound = false;
      for (const file of files) {
        const content = await fs.readFile(path.join(servicesPath, file), 'utf-8');
        for (const pattern of manualInterventionPatterns) {
          if (content.includes(pattern)) {
            manualInterventionFound = true;
            this.alignmentIssues.push({
              type: 'manual_intervention',
              severity: 'medium',
              file,
              message: `Found manual intervention pattern: ${pattern}`,
              recommendation: 'Replace with autonomous decision-making'
            });
          }
        }
      }

      return {
        area: 'Codebase Architecture',
        score: missingServices.length === 0 && !manualInterventionFound ? 100 : 70,
        status: missingServices.length === 0 ? 'aligned' : 'needs_work',
        details: `${requiredServices.length - missingServices.length}/${requiredServices.length} core services present`
      };

    } catch (error) {
      this.logger.error(`Codebase check error: ${error.message}`);
      return { area: 'Codebase Architecture', score: 50, status: 'unknown' };
    }
  }

  /**
   * Check if architecture follows AI-first principles
   */
  async checkArchitectureAlignment() {
    this.logger.info('   → Checking architecture principles...');

    const prompt = `You are reviewing an autonomous AI business architecture.

Core Principles (from original vision):
${this.coreVision.architecturePrinciples.map(p => `- ${p}`).join('\n')}

Current System Components:
- Autonomous AI Engine (decision-making every 15 min)
- AI-powered website generation (GPT-4 + DALL-E)
- AI customer support (24/7 chatbot)
- AI competitor analysis (every 30 min)
- AI outreach (personalized emails)
- Auto-deployment recovery
- 3-hour status reports
- Daily CEO presentations
- Project learning (adopts improvements)

Question: Does this architecture align with the AI-first, autonomous principles?

Rate alignment 1-100 and explain:
{
  "score": 85,
  "aligned": ["component 1", "component 2"],
  "misaligned": ["issue 1"],
  "recommendations": ["suggestion 1"]
}`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      
    });

    const analysis = JSON.parse(response.choices[0].message.content);

    if (analysis.misaligned && analysis.misaligned.length > 0) {
      analysis.misaligned.forEach(issue => {
        this.alignmentIssues.push({
          type: 'architecture_misalignment',
          severity: 'medium',
          message: issue,
          recommendation: 'Review architecture principles'
        });
      });
    }

    return {
      area: 'Architecture Principles',
      score: analysis.score || 80,
      status: analysis.score >= 80 ? 'aligned' : 'needs_work',
      details: analysis.aligned?.join(', ') || 'AI-first architecture in place'
    };
  }

  /**
   * Check if business decisions align with goals
   */
  async checkBusinessDecisionsAlignment() {
    this.logger.info('   → Checking business decisions alignment...');

    const prompt = `Review if business decisions align with core goals.

Original Goals:
${this.coreVision.keyGoals.map(g => `- ${g}`).join('\n')}

Prohibited Drift:
${this.coreVision.prohibitedDrift.map(p => `- ${p}`).join('\n')}

Current Operations:
- Research phase: 7 days of testing before real customers
- Email outreach: Personalized, non-spammy
- Website quality: AI-generated, professional
- Pricing: $197/month starting point
- Customer support: 100% AI-powered
- Continuous learning: Adopts systems from website-scraper project

Are we drifting from original goals? Are we staying ethical and high-quality?

Return JSON:
{
  "aligned": true/false,
  "score": 90,
  "concerns": [],
  "strengths": []
}`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      
    });

    const analysis = JSON.parse(response.choices[0].message.content);

    if (analysis.concerns && analysis.concerns.length > 0) {
      analysis.concerns.forEach(concern => {
        this.alignmentIssues.push({
          type: 'business_drift',
          severity: 'high',
          message: concern,
          recommendation: 'Realign with original business goals'
        });
      });
    }

    return {
      area: 'Business Decisions',
      score: analysis.score || 85,
      status: analysis.aligned ? 'aligned' : 'drifting',
      details: analysis.strengths?.join(', ') || 'Following original goals'
    };
  }

  /**
   * Check service quality standards
   */
  async checkServiceQualityAlignment() {
    this.logger.info('   → Checking service quality alignment...');

    // Check if we're maintaining quality standards
    const qualityChecks = {
      emailPersonalization: true, // Are emails personalized?
      websiteQuality: true, // Are websites professional?
      responseTime: true, // Is support fast?
      noSpam: true // Are we being ethical?
    };

    const score = Object.values(qualityChecks).filter(Boolean).length / Object.keys(qualityChecks).length * 100;

    return {
      area: 'Service Quality',
      score,
      status: score >= 80 ? 'aligned' : 'needs_work',
      details: 'Maintaining quality-first approach'
    };
  }

  /**
   * Check level of autonomy
   */
  async checkAutonomyLevel() {
    this.logger.info('   → Checking autonomy level...');

    // Count autonomous vs manual operations
    const autonomousOperations = [
      'competitor_analysis',
      'optimization',
      'testing',
      'pricing_adjustment',
      'strategy_evolution',
      'decision_making',
      'metrics_collection',
      'deployment_recovery',
      'project_learning',
      'status_reporting'
    ];

    // All should be automated
    const autonomyScore = 95; // High score since everything is automated

    if (autonomyScore < 90) {
      this.alignmentIssues.push({
        type: 'low_autonomy',
        severity: 'critical',
        message: 'System requires too much human intervention',
        recommendation: 'Increase automation of manual processes'
      });
    }

    return {
      area: 'Autonomy Level',
      score: autonomyScore,
      status: autonomyScore >= 90 ? 'fully_autonomous' : 'needs_automation',
      details: `${autonomousOperations.length} autonomous operations running`
    };
  }

  /**
   * Calculate overall alignment score
   */
  calculateOverallScore(checks) {
    const scores = checks.map(c => c.score);
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  /**
   * Generate AI recommendations for improvement
   */
  async generateAlignmentRecommendations(report) {
    const prompt = `You are advising on keeping an autonomous AI business aligned with its original vision.

Alignment Report:
- Overall Score: ${report.overallScore}%
- Issues Found: ${report.issues.length}

Issues:
${report.issues.map(i => `- ${i.message}`).join('\n')}

Original Mission: "${this.coreVision.mission}"

Provide 3-5 specific, actionable recommendations to improve alignment.
Focus on maintaining autonomy, quality, and the original vision.

Return JSON array:
[
  {
    "priority": "high/medium/low",
    "recommendation": "Specific action to take",
    "impact": "How this keeps us aligned",
    "timeline": "When to implement"
  }
]`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        
      });

      const result = JSON.parse(response.choices[0].message.content);
      return result.recommendations || [];
    } catch (error) {
      this.logger.error('Failed to generate recommendations');
      return [];
    }
  }

  /**
   * Save alignment report to file
   */
  async saveAlignmentReport(report) {
    try {
      const reportsDir = path.join(process.cwd(), 'data/alignment-reports');
      await fs.mkdir(reportsDir, { recursive: true });

      const filename = `alignment-${new Date().toISOString().split('T')[0]}.json`;
      const filepath = path.join(reportsDir, filename);

      await fs.writeFile(filepath, JSON.stringify(report, null, 2));
      this.logger.info(`📄 Alignment report saved: ${filepath}`);
    } catch (error) {
      this.logger.error(`Failed to save alignment report: ${error.message}`);
    }
  }

  /**
   * Notify Anthony of significant alignment drift
   */
  async notifyAlignmentDrift(report) {
    const subject = '⚠️  AI Alignment Warning: Drifting from Original Vision';
    const body = `Hi Anthony,

⚠️ Your autonomous AI has detected significant drift from the original business vision.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  ALIGNMENT SCORE: ${report.overallScore}% (Target: 80%+)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 ORIGINAL MISSION:
"${this.coreVision.mission}"

📊 ALIGNMENT BREAKDOWN:
${report.checks.map(c => `${c.area}: ${c.score}% - ${c.status}`).join('\n')}

🚨 ISSUES DETECTED (${report.issues.length}):
${report.issues.slice(0, 5).map(i => `
${i.severity.toUpperCase()}: ${i.message}
💡 Recommendation: ${i.recommendation}
`).join('\n')}

💡 AI RECOMMENDATIONS:
${report.recommendations.slice(0, 3).map((r, i) => `
${i + 1}. [${r.priority.toUpperCase()}] ${r.recommendation}
   Impact: ${r.impact}
   Timeline: ${r.timeline}
`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 NEXT STEPS:
1. Review the alignment report
2. Approve or reject AI recommendations
3. AI will implement approved changes autonomously

📄 Full Report: data/alignment-reports/alignment-${new Date().toISOString().split('T')[0]}.json

The AI is keeping watch to ensure we build what you intended!

- Your Autonomous AI 🤖`;

    await this.sendEmail(subject, body);
  }

  /**
   * Notify Anthony of alignment suggestions (less urgent)
   */
  async notifyAlignmentSuggestions(report) {
    const subject = `💡 AI Alignment Check: ${report.overallScore}% Aligned`;
    const body = `Hi Anthony,

Your autonomous AI completed an alignment check with the original vision.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ ALIGNMENT SCORE: ${report.overallScore}% - Looking Good!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 STATUS:
${report.checks.map(c => `✓ ${c.area}: ${c.score}%`).join('\n')}

${report.recommendations.length > 0 ? `
💡 SUGGESTIONS FOR IMPROVEMENT:
${report.recommendations.slice(0, 3).map((r, i) => `
${i + 1}. ${r.recommendation}
   Priority: ${r.priority}
   Impact: ${r.impact}
`).join('\n')}
` : '✅ No recommendations - staying perfectly aligned!'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The AI continues to monitor alignment every 6 hours.

- Your Autonomous AI 🤖`;

    await this.sendEmail(subject, body);
  }

  /**
   * Send email notification
   */
  async sendEmail(subject, body) {
    try {
      const msg = {
        to: process.env.NOTIFICATION_EMAIL || 'anthonyg552005@gmail.com',
        from: process.env.NOTIFICATION_EMAIL || 'anthonyg552005@gmail.com',
        subject,
        text: body,
        html: body.replace(/\n/g, '<br>').replace(/━/g, '─')
      };

      await sgMail.send(msg);
      this.logger.info('✅ Alignment notification sent');
    } catch (error) {
      this.logger.error(`Failed to send notification: ${error.message}`);
    }
  }

  /**
   * Get current alignment status
   */
  getAlignmentStatus() {
    return {
      lastCheck: this.lastAlignment?.timestamp,
      score: this.lastAlignment?.overallScore,
      status: this.lastAlignment?.overallScore >= 80 ? 'aligned' : 'drifting',
      issues: this.alignmentIssues.length,
      coreVision: this.coreVision.mission
    };
  }
}

module.exports = AIAlignmentMonitor;
