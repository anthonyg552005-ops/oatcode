/**
 * PROJECT NOTES SERVICE
 *
 * Continuously documents project development, decisions, learnings, and progress.
 * Maintains a comprehensive record of everything that happens during development and operation.
 *
 * This ensures:
 * - Nothing is forgotten
 * - All decisions are documented
 * - Learnings are captured
 * - Progress is tracked
 * - Knowledge is preserved
 */

const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');

class ProjectNotesService {
  constructor(logger) {
    this.logger = logger;
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Notes storage
    this.notes = {
      developmentLog: [],
      decisionsLog: [],
      learningsLog: [],
      issuesLog: [],
      improvementsLog: [],
      metricsLog: [],
      competitorInsights: [],
      customerFeedback: [],
      systemChanges: []
    };

    this.notesDir = path.join(process.cwd(), 'data', 'notes');
  }

  /**
   * Initialize notes system
   */
  async initialize() {
    await fs.mkdir(this.notesDir, { recursive: true });
    this.logger.info('📝 Project Notes Service initialized');

    // Load existing notes if any
    await this.loadExistingNotes();

    // Start auto-save every 5 minutes
    setInterval(() => this.saveAllNotes(), 300000);
  }

  /**
   * LOG DEVELOPMENT ACTIVITY
   */
  async logDevelopment(activity) {
    const note = {
      timestamp: new Date().toISOString(),
      type: 'development',
      activity: activity.action,
      details: activity.details,
      component: activity.component || 'general',
      outcome: activity.outcome
    };

    this.notes.developmentLog.push(note);
    await this.saveNote('development', note);

    this.logger.info(`📝 Logged: ${activity.action}`);
  }

  /**
   * LOG DECISION MADE
   */
  async logDecision(decision) {
    const note = {
      timestamp: new Date().toISOString(),
      type: 'decision',
      decision: decision.what,
      reasoning: decision.why,
      alternatives: decision.alternatives || [],
      expectedOutcome: decision.expectedOutcome,
      madeBy: decision.madeBy || 'AI',
      confidence: decision.confidence || 'medium'
    };

    this.notes.decisionsLog.push(note);
    await this.saveNote('decisions', note);

    this.logger.info(`📝 Decision logged: ${decision.what}`);
  }

  /**
   * LOG LEARNING/INSIGHT
   */
  async logLearning(learning) {
    const note = {
      timestamp: new Date().toISOString(),
      type: 'learning',
      insight: learning.insight,
      source: learning.source,
      category: learning.category,
      applicability: learning.applicability,
      importance: learning.importance || 'medium'
    };

    this.notes.learningsLog.push(note);
    await this.saveNote('learnings', note);

    this.logger.info(`📝 Learning logged: ${learning.insight.substring(0, 50)}...`);
  }

  /**
   * LOG ISSUE/PROBLEM
   */
  async logIssue(issue) {
    const note = {
      timestamp: new Date().toISOString(),
      type: 'issue',
      issue: issue.problem,
      severity: issue.severity || 'medium',
      component: issue.component,
      impact: issue.impact,
      resolution: issue.resolution || 'pending',
      resolvedAt: null
    };

    this.notes.issuesLog.push(note);
    await this.saveNote('issues', note);

    this.logger.warn(`📝 Issue logged: ${issue.problem}`);
  }

  /**
   * LOG IMPROVEMENT MADE
   */
  async logImprovement(improvement) {
    const note = {
      timestamp: new Date().toISOString(),
      type: 'improvement',
      area: improvement.area,
      before: improvement.before,
      after: improvement.after,
      reason: improvement.reason,
      expectedImpact: improvement.expectedImpact,
      actualImpact: null // Will be updated later
    };

    this.notes.improvementsLog.push(note);
    await this.saveNote('improvements', note);

    this.logger.info(`📝 Improvement logged: ${improvement.area}`);
  }

  /**
   * LOG METRICS/PERFORMANCE DATA
   */
  async logMetrics(metrics) {
    const note = {
      timestamp: new Date().toISOString(),
      type: 'metrics',
      ...metrics
    };

    this.notes.metricsLog.push(note);
    await this.saveNote('metrics', note);
  }

  /**
   * LOG COMPETITOR INSIGHT
   */
  async logCompetitorInsight(insight) {
    const note = {
      timestamp: new Date().toISOString(),
      type: 'competitor',
      competitor: insight.competitor,
      observation: insight.observation,
      actionable: insight.actionable,
      implemented: false
    };

    this.notes.competitorInsights.push(note);
    await this.saveNote('competitor-insights', note);

    this.logger.info(`📝 Competitor insight: ${insight.competitor}`);
  }

  /**
   * LOG CUSTOMER FEEDBACK
   */
  async logCustomerFeedback(feedback) {
    const note = {
      timestamp: new Date().toISOString(),
      type: 'feedback',
      customerId: feedback.customerId,
      customerName: feedback.customerName,
      feedback: feedback.message,
      sentiment: feedback.sentiment || 'neutral',
      category: feedback.category,
      actionTaken: feedback.actionTaken || 'none'
    };

    this.notes.customerFeedback.push(note);
    await this.saveNote('customer-feedback', note);

    this.logger.info(`📝 Customer feedback logged`);
  }

  /**
   * LOG SYSTEM CHANGE
   */
  async logSystemChange(change) {
    const note = {
      timestamp: new Date().toISOString(),
      type: 'system-change',
      component: change.component,
      changeType: change.changeType,
      description: change.description,
      reason: change.reason,
      rollbackPossible: change.rollbackPossible || false
    };

    this.notes.systemChanges.push(note);
    await this.saveNote('system-changes', note);

    this.logger.info(`📝 System change logged: ${change.component}`);
  }

  /**
   * GENERATE DAILY SUMMARY
   */
  async generateDailySummary() {
    const today = new Date().toISOString().split('T')[0];

    const summary = {
      date: today,
      development: this.getTodays('developmentLog'),
      decisions: this.getTodays('decisionsLog'),
      learnings: this.getTodays('learningsLog'),
      issues: this.getTodays('issuesLog'),
      improvements: this.getTodays('improvementsLog'),
      metrics: this.getTodays('metricsLog')
    };

    // Use AI to create readable summary
    try {
      const aiSummary = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{
          role: 'user',
          content: `Summarize today's project activity in a clear, concise format:

${JSON.stringify(summary, null, 2)}

Create a readable summary highlighting:
- Key developments
- Important decisions
- Major learnings
- Issues encountered
- Improvements made

Format as markdown.`
        }],
        temperature: 0.7
      });

      const readableSummary = aiSummary.choices[0].message.content;

      // Save daily summary
      const summaryPath = path.join(this.notesDir, 'daily-summaries', `${today}.md`);
      await fs.mkdir(path.dirname(summaryPath), { recursive: true });
      await fs.writeFile(summaryPath, readableSummary);

      this.logger.info(`📝 Daily summary generated: ${today}`);

      return readableSummary;

    } catch (error) {
      this.logger.error(`Failed to generate daily summary: ${error.message}`);
      return summary;
    }
  }

  /**
   * GENERATE PROJECT DOCUMENTATION
   */
  async generateProjectDocumentation() {
    this.logger.info('📝 Generating comprehensive project documentation...');

    const documentation = {
      projectOverview: await this.generateOverview(),
      architectureDecisions: this.notes.decisionsLog.filter(d => d.category === 'architecture'),
      keyLearnings: this.notes.learningsLog.sort((a, b) =>
        (b.importance === 'high' ? 1 : 0) - (a.importance === 'high' ? 1 : 0)
      ).slice(0, 20),
      majorImprovements: this.notes.improvementsLog,
      systemArchitecture: this.documentSystemArchitecture(),
      apiIntegrations: this.documentAPIIntegrations(),
      performanceMetrics: this.aggregateMetrics(),
      competitorAnalysis: this.notes.competitorInsights,
      customerInsights: this.aggregateCustomerFeedback(),
      knownIssues: this.notes.issuesLog.filter(i => i.resolution === 'pending'),
      futureRoadmap: await this.generateRoadmap()
    };

    // Save comprehensive documentation
    const docPath = path.join(this.notesDir, 'PROJECT_DOCUMENTATION.json');
    await fs.writeFile(docPath, JSON.stringify(documentation, null, 2));

    // Generate markdown version
    const mdPath = path.join(this.notesDir, 'PROJECT_DOCUMENTATION.md');
    const markdown = await this.convertToMarkdown(documentation);
    await fs.writeFile(mdPath, markdown);

    this.logger.info('📝 Project documentation generated');

    return documentation;
  }

  /**
   * Helper methods
   */

  getTodays(logName) {
    const today = new Date().toISOString().split('T')[0];
    return this.notes[logName].filter(note =>
      note.timestamp.startsWith(today)
    );
  }

  async generateOverview() {
    return {
      projectName: 'Autonomous Website Seller',
      description: 'Fully autonomous AI that runs a complete website selling business',
      startDate: this.notes.developmentLog[0]?.timestamp || new Date().toISOString(),
      currentPhase: 'Development/Pre-Launch',
      keyFeatures: [
        'AI website generation (GPT-4 + DALL-E 3 + Tailwind)',
        'Autonomous lead generation and outreach',
        'AI customer support (24/7)',
        'Self-monitoring and improvement',
        'Critical needs detection',
        '7-day pre-launch research phase',
        '30-day autonomous operation'
      ],
      technologyStack: {
        ai: ['GPT-4', 'DALL-E 3', 'Claude 3.5 Sonnet'],
        backend: ['Node.js', 'Express'],
        database: ['SQLite', 'PostgreSQL'],
        apis: ['OpenAI', 'Anthropic', 'SendGrid', 'Twilio', 'Google Places', 'Stripe'],
        frontend: ['Tailwind CSS']
      }
    };
  }

  documentSystemArchitecture() {
    return {
      coreComponents: [
        'Autonomous Engine (orchestrator)',
        'AI Agents (5 specialized agents)',
        'Business Automation Services',
        'Website Generation Service',
        'Pre-Launch Research Phase',
        'Testing Phase Service',
        'Monitoring Services'
      ],
      dataFlow: 'Autonomous Engine → AI Agents → Services → External APIs',
      architecture: '3-phase launch (Research → Testing → Production)'
    };
  }

  documentAPIIntegrations() {
    return {
      openai: {
        purpose: 'GPT-4 (content, strategy), DALL-E 3 (images)',
        critical: true,
        fallback: false
      },
      anthropic: {
        purpose: 'Claude 3.5 (UX optimization, critique)',
        critical: false,
        fallback: 'GPT-4'
      },
      sendgrid: {
        purpose: 'Email delivery',
        critical: true,
        fallback: 'SMTP'
      },
      google: {
        purpose: 'Lead discovery (Places API)',
        critical: true,
        fallback: false
      },
      stripe: {
        purpose: 'Payment processing',
        critical: true,
        fallback: false
      }
    };
  }

  aggregateMetrics() {
    if (this.notes.metricsLog.length === 0) return null;

    const latest = this.notes.metricsLog[this.notes.metricsLog.length - 1];
    return {
      latestMetrics: latest,
      totalDataPoints: this.notes.metricsLog.length,
      trends: 'To be calculated with more data'
    };
  }

  aggregateCustomerFeedback() {
    const positive = this.notes.customerFeedback.filter(f => f.sentiment === 'positive').length;
    const negative = this.notes.customerFeedback.filter(f => f.sentiment === 'negative').length;
    const neutral = this.notes.customerFeedback.filter(f => f.sentiment === 'neutral').length;

    return {
      total: this.notes.customerFeedback.length,
      sentiment: { positive, negative, neutral },
      commonThemes: this.extractCommonThemes(),
      actionableInsights: this.extractActionableInsights()
    };
  }

  extractCommonThemes() {
    // Group feedback by category
    const themes = {};
    this.notes.customerFeedback.forEach(f => {
      if (!themes[f.category]) themes[f.category] = 0;
      themes[f.category]++;
    });
    return themes;
  }

  extractActionableInsights() {
    return this.notes.customerFeedback
      .filter(f => f.actionTaken !== 'none')
      .slice(-10); // Last 10 actionable items
  }

  async generateRoadmap() {
    return {
      immediate: [
        'Complete 7-day research phase',
        'Complete 2-day testing phase',
        'Launch production operations'
      ],
      shortTerm: [
        'Implement lead scoring AI',
        'Add A/B testing',
        'Enable chat widget'
      ],
      longTerm: [
        'Voice AI for phone calls',
        'AI video demos',
        'Multi-language support',
        'Scale to $200K+ MRR'
      ]
    };
  }

  async convertToMarkdown(documentation) {
    // Convert JSON documentation to readable markdown
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{
          role: 'user',
          content: `Convert this project documentation to a well-formatted, comprehensive markdown document:

${JSON.stringify(documentation, null, 2)}

Make it professional, organized, and easy to read.`
        }],
        temperature: 0.7
      });

      return response.choices[0].message.content;

    } catch (error) {
      // Fallback: basic markdown
      return `# Project Documentation\n\n${JSON.stringify(documentation, null, 2)}`;
    }
  }

  /**
   * SAVE METHODS
   */

  async saveNote(category, note) {
    const filename = path.join(this.notesDir, category, `${Date.now()}.json`);
    await fs.mkdir(path.dirname(filename), { recursive: true });
    await fs.writeFile(filename, JSON.stringify(note, null, 2));
  }

  async saveAllNotes() {
    const allNotesPath = path.join(this.notesDir, 'all-notes.json');
    await fs.writeFile(allNotesPath, JSON.stringify(this.notes, null, 2));
    this.logger.info('📝 All notes auto-saved');
  }

  async loadExistingNotes() {
    try {
      const allNotesPath = path.join(this.notesDir, 'all-notes.json');
      const data = await fs.readFile(allNotesPath, 'utf-8');
      this.notes = JSON.parse(data);
      this.logger.info('📝 Loaded existing notes');
    } catch (error) {
      this.logger.info('📝 Starting fresh notes (no existing notes found)');
    }
  }

  /**
   * GET NOTES
   */

  getAllNotes() {
    return this.notes;
  }

  getRecentNotes(category, limit = 10) {
    return this.notes[category]?.slice(-limit) || [];
  }

  searchNotes(query) {
    const results = [];
    Object.entries(this.notes).forEach(([category, notes]) => {
      notes.forEach(note => {
        const noteStr = JSON.stringify(note).toLowerCase();
        if (noteStr.includes(query.toLowerCase())) {
          results.push({ category, note });
        }
      });
    });
    return results;
  }
}

module.exports = ProjectNotesService;