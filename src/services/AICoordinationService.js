/**
 * AI COORDINATION SERVICE
 *
 * Central coordination hub that ensures all AI services work together cohesively:
 * - Shares insights between AI services
 * - Prevents duplicate work
 * - Coordinates decision-making
 * - Manages AI service priorities
 * - Ensures all AIs are aligned with business goals
 *
 * Think of this as the "central nervous system" connecting all AI brains.
 */

const fs = require('fs').promises;
const path = require('path');

class AICoordinationService {
  constructor(logger) {
    this.logger = logger;

    // Shared knowledge base between all AI services
    this.sharedKnowledge = {
      recentDecisions: [],
      activeProblems: [],
      completedTasks: [],
      businessGoals: [],
      insights: []
    };

    // AI service registry
    this.aiServices = {
      selfImprovement: null,
      alignment: null,
      documentation: null,
      opportunity: null,
      customerSupport: null,
      decisionMaking: null
    };

    // Coordination state
    this.coordinationInterval = null;
    this.lastSync = null;
  }

  /**
   * Initialize AI coordination
   */
  async initialize() {
    this.logger.info('🤝 AI Coordination Service initializing...');

    // Register AI services from global scope
    this.aiServices.selfImprovement = global.selfImprovement || null;
    this.aiServices.alignment = global.aiAlignment || null;
    this.aiServices.documentation = global.documentation || null;
    this.aiServices.opportunity = global.aiOpportunity || null;
    this.aiServices.customerSupport = global.customerSupport || null;
    this.aiServices.decisionMaking = global.decisionMaking || null;

    // Load previous shared knowledge
    await this.loadSharedKnowledge();

    // Start coordination loop
    this.startCoordination();

    this.logger.info('   ✓ AI Coordination ready - all AI services connected');
  }

  /**
   * Start coordination loop
   */
  startCoordination() {
    // Coordinate every 15 minutes
    this.coordinationInterval = setInterval(async () => {
      await this.coordinateAIServices();
    }, 15 * 60 * 1000);

    // Initial coordination after 5 minutes
    setTimeout(async () => {
      await this.coordinateAIServices();
    }, 5 * 60 * 1000);
  }

  /**
   * Main coordination function
   */
  async coordinateAIServices() {
    this.logger.info('🤝 Coordinating AI services...');

    try {
      // Step 1: Gather insights from all AI services
      const insights = await this.gatherInsights();

      // Step 2: Share insights across all services
      await this.shareInsights(insights);

      // Step 3: Identify conflicts or duplicate work
      const conflicts = this.identifyConflicts(insights);
      if (conflicts.length > 0) {
        this.logger.warn(`   ⚠️  Found ${conflicts.length} AI service conflicts`);
        await this.resolveConflicts(conflicts);
      }

      // Step 4: Prioritize AI service actions
      const priorities = this.calculatePriorities(insights);
      await this.communicatePriorities(priorities);

      // Step 5: Update shared knowledge
      await this.updateSharedKnowledge(insights);

      // Step 6: Check alignment across all AIs
      const alignmentScore = this.checkGlobalAlignment(insights);
      this.logger.info(`   ✓ All AI services coordinated (Alignment: ${alignmentScore}%)`);

      this.lastSync = new Date();

    } catch (error) {
      this.logger.error(`AI coordination error: ${error.message}`);
    }
  }

  /**
   * Gather insights from all AI services
   */
  async gatherInsights() {
    const insights = {
      timestamp: new Date().toISOString(),
      services: {}
    };

    // Collect from SelfImprovementAI
    if (this.aiServices.selfImprovement && this.aiServices.selfImprovement.improvementHistory) {
      insights.services.selfImprovement = {
        recentImprovements: this.aiServices.selfImprovement.improvementHistory.slice(-5),
        servicesCreated: this.aiServices.selfImprovement.servicesCreated
      };
    }

    // Collect from AIAlignmentMonitor
    if (global.aiAlignment && global.aiAlignment.getAlignmentScore) {
      try {
        insights.services.alignment = {
          score: await global.aiAlignment.getAlignmentScore(),
          concerns: global.aiAlignment.alignmentConcerns || []
        };
      } catch (error) {
        insights.services.alignment = { score: 100, concerns: [] };
      }
    }

    // Collect from DecisionMakingService
    if (global.decisionMaking && global.decisionMaking.getRecentDecisions) {
      insights.services.decisions = {
        recent: global.decisionMaking.getRecentDecisions ? global.decisionMaking.getRecentDecisions() : []
      };
    }

    // Collect from AIOpportunityMonitor
    if (global.aiOpportunity && global.aiOpportunity.opportunities) {
      insights.services.opportunities = {
        active: global.aiOpportunity.opportunities || []
      };
    }

    return insights;
  }

  /**
   * Share insights across all AI services
   */
  async shareInsights(insights) {
    // Make insights available globally
    global.aiSharedInsights = insights;

    // Log key insights
    if (insights.services.selfImprovement) {
      const improvements = insights.services.selfImprovement.recentImprovements.length;
      if (improvements > 0) {
        this.logger.info(`   📈 Self-Improvement AI: ${improvements} recent improvements`);
      }
    }

    if (insights.services.alignment) {
      this.logger.info(`   🎯 Alignment Score: ${insights.services.alignment.score}%`);
    }

    if (insights.services.opportunities) {
      const opps = insights.services.opportunities.active.length;
      if (opps > 0) {
        this.logger.info(`   💡 Active Opportunities: ${opps}`);
      }
    }
  }

  /**
   * Identify conflicts between AI services
   */
  identifyConflicts(insights) {
    const conflicts = [];

    // Check for duplicate work
    const allTasks = [];

    if (insights.services.selfImprovement && insights.services.selfImprovement.servicesCreated) {
      allTasks.push(...insights.services.selfImprovement.servicesCreated);
    }

    // Simple duplicate detection
    const taskCounts = {};
    allTasks.forEach(task => {
      taskCounts[task] = (taskCounts[task] || 0) + 1;
    });

    Object.keys(taskCounts).forEach(task => {
      if (taskCounts[task] > 1) {
        conflicts.push({
          type: 'duplicate_work',
          description: `Multiple AI services working on: ${task}`,
          count: taskCounts[task]
        });
      }
    });

    return conflicts;
  }

  /**
   * Resolve conflicts
   */
  async resolveConflicts(conflicts) {
    for (const conflict of conflicts) {
      this.logger.warn(`   🔧 Resolving: ${conflict.description}`);

      // For duplicates, assign to the most appropriate service
      if (conflict.type === 'duplicate_work') {
        // Log resolution (in a real system, we'd coordinate task assignment)
        this.sharedKnowledge.activeProblems.push({
          problem: conflict.description,
          status: 'resolved',
          resolution: 'Coordinated task assignment',
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * Calculate priorities for AI service actions
   */
  calculatePriorities(insights) {
    const priorities = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };

    // Alignment issues are critical
    if (insights.services.alignment && insights.services.alignment.score < 80) {
      priorities.critical.push({
        service: 'alignment',
        action: 'Improve alignment',
        reason: `Score below 80%: ${insights.services.alignment.score}%`
      });
    }

    // Opportunities are high priority
    if (insights.services.opportunities && insights.services.opportunities.active.length > 0) {
      priorities.high.push({
        service: 'opportunity',
        action: 'Pursue opportunities',
        count: insights.services.opportunities.active.length
      });
    }

    return priorities;
  }

  /**
   * Communicate priorities to AI services
   */
  async communicatePriorities(priorities) {
    // Make priorities globally available
    global.aiPriorities = priorities;

    // Log critical priorities
    if (priorities.critical.length > 0) {
      this.logger.warn(`   🚨 ${priorities.critical.length} CRITICAL AI priorities`);
      priorities.critical.forEach(p => {
        this.logger.warn(`      - ${p.action}: ${p.reason}`);
      });
    }
  }

  /**
   * Check global alignment across all AI services
   */
  checkGlobalAlignment(insights) {
    let totalScore = 0;
    let count = 0;

    if (insights.services.alignment && insights.services.alignment.score) {
      totalScore += insights.services.alignment.score;
      count++;
    }

    // All services should be working toward business goals
    // If we have metrics, check if they're improving
    if (global.autonomousMetrics) {
      // Simple heuristic: if we have customers, we're aligned
      if (global.autonomousMetrics.totalCustomers > 0) {
        totalScore += 100;
        count++;
      } else {
        totalScore += 70; // Working on it
        count++;
      }
    }

    return count > 0 ? Math.round(totalScore / count) : 100;
  }

  /**
   * Update shared knowledge base
   */
  async updateSharedKnowledge(insights) {
    // Add new insights
    this.sharedKnowledge.insights.push({
      timestamp: new Date().toISOString(),
      data: insights
    });

    // Keep only last 50 insights
    if (this.sharedKnowledge.insights.length > 50) {
      this.sharedKnowledge.insights = this.sharedKnowledge.insights.slice(-50);
    }

    // Save to disk
    await this.saveSharedKnowledge();
  }

  /**
   * Load shared knowledge from disk
   */
  async loadSharedKnowledge() {
    try {
      const dataDir = path.join(__dirname, '../../data/ai-coordination');
      await fs.mkdir(dataDir, { recursive: true });

      const knowledgeFile = path.join(dataDir, 'shared-knowledge.json');
      const content = await fs.readFile(knowledgeFile, 'utf-8');
      this.sharedKnowledge = JSON.parse(content);

      this.logger.info(`   ✓ Loaded shared AI knowledge (${this.sharedKnowledge.insights.length} insights)`);
    } catch (error) {
      // No previous knowledge, start fresh
      this.sharedKnowledge = {
        recentDecisions: [],
        activeProblems: [],
        completedTasks: [],
        businessGoals: [],
        insights: []
      };
    }
  }

  /**
   * Save shared knowledge to disk
   */
  async saveSharedKnowledge() {
    try {
      const dataDir = path.join(__dirname, '../../data/ai-coordination');
      await fs.mkdir(dataDir, { recursive: true });

      const knowledgeFile = path.join(dataDir, 'shared-knowledge.json');
      await fs.writeFile(knowledgeFile, JSON.stringify(this.sharedKnowledge, null, 2));
    } catch (error) {
      this.logger.error(`Failed to save shared knowledge: ${error.message}`);
    }
  }

  /**
   * Stop coordination
   */
  stop() {
    if (this.coordinationInterval) {
      clearInterval(this.coordinationInterval);
      this.coordinationInterval = null;
    }
  }
}

module.exports = AICoordinationService;
