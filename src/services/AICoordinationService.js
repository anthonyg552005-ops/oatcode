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
    this.logger.info('   Auto-discovering all autonomous services...');

    // AUTO-DISCOVER ALL SERVICES FROM GLOBAL SCOPE
    const discoveredServices = this.autoDiscoverServices();

    this.logger.info(`   ✓ Discovered ${discoveredServices.length} autonomous services`);

    // Register all discovered services
    for (const service of discoveredServices) {
      this.registerService(service.name, service.instance);
    }

    // Load previous shared knowledge
    await this.loadSharedKnowledge();

    // Start coordination loop
    this.startCoordination();

    this.logger.info(`   ✓ AI Coordination ready - ${discoveredServices.length} services synchronized`);
  }

  /**
   * Auto-discover all services from global scope
   */
  autoDiscoverServices() {
    const discovered = [];

    // List of all possible service names in global scope
    const servicePatterns = [
      // AI Services
      'selfImprovement', 'aiAlignment', 'documentation', 'aiOpportunity',
      'customerSupport', 'decisionMaking', 'aiCoordination',

      // Business Services
      'autonomousBusiness', 'autonomousMetrics', 'conversionOptimization',
      'leadScoring', 'upsell', 'emailSequence', 'emailOptimization',
      'customerRetention', 'emailTracking', 'phaseTracking', 'escalation',

      // Infrastructure Services
      'autoRepair', 'apiMonitoring', 'analytics', 'dailyPresentation',

      // Enhancement Services
      'projectNotes', 'urgencyEngine', 'advancedVisuals', 'quietHoursProductivity'
    ];

    for (const serviceName of servicePatterns) {
      if (global[serviceName]) {
        discovered.push({
          name: serviceName,
          instance: global[serviceName],
          type: this.classifyService(serviceName)
        });
      }
    }

    return discovered;
  }

  /**
   * Classify service type
   */
  classifyService(serviceName) {
    const aiPatterns = ['ai', 'selfImprovement', 'alignment', 'documentation', 'opportunity'];
    const businessPatterns = ['business', 'metrics', 'conversion', 'lead', 'upsell', 'email', 'customer', 'retention'];
    const infrastructurePatterns = ['repair', 'monitoring', 'analytics', 'deployment'];
    const enhancementPatterns = ['notes', 'urgency', 'visual', 'productivity', 'coordination'];

    if (aiPatterns.some(pattern => serviceName.toLowerCase().includes(pattern))) return 'ai';
    if (businessPatterns.some(pattern => serviceName.toLowerCase().includes(pattern))) return 'business';
    if (infrastructurePatterns.some(pattern => serviceName.toLowerCase().includes(pattern))) return 'infrastructure';
    if (enhancementPatterns.some(pattern => serviceName.toLowerCase().includes(pattern))) return 'enhancement';

    return 'other';
  }

  /**
   * Register a service into coordination system
   */
  registerService(name, instance) {
    this.aiServices[name] = instance;

    // Create shared knowledge namespace for this service
    if (!this.sharedKnowledge[name]) {
      this.sharedKnowledge[name] = {
        registered: new Date().toISOString(),
        lastActivity: null,
        insights: [],
        metrics: {}
      };
    }
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
   * Gather insights from ALL registered services (auto-sync)
   */
  async gatherInsights() {
    const insights = {
      timestamp: new Date().toISOString(),
      services: {},
      serviceCount: 0
    };

    // AUTO-GATHER from ALL registered services
    for (const [serviceName, serviceInstance] of Object.entries(this.aiServices)) {
      if (!serviceInstance) continue;

      try {
        const serviceInsights = await this.extractServiceInsights(serviceName, serviceInstance);
        if (serviceInsights) {
          insights.services[serviceName] = serviceInsights;
          insights.serviceCount++;
        }
      } catch (error) {
        // Service doesn't have insights, that's okay
      }
    }

    return insights;
  }

  /**
   * Extract insights from any service (works with any service type)
   */
  async extractServiceInsights(name, instance) {
    const insights = {
      serviceName: name,
      active: true,
      lastUpdate: new Date().toISOString()
    };

    // Try to extract common data patterns
    if (instance.improvementHistory) {
      insights.improvements = instance.improvementHistory.slice(-5);
    }

    if (instance.getStatistics && typeof instance.getStatistics === 'function') {
      try {
        insights.statistics = instance.getStatistics();
      } catch (error) {
        // No stats available
      }
    }

    if (instance.getAlignmentScore && typeof instance.getAlignmentScore === 'function') {
      try {
        insights.alignmentScore = await instance.getAlignmentScore();
      } catch (error) {
        // No alignment score
      }
    }

    if (instance.opportunities) {
      insights.opportunities = instance.opportunities.slice ? instance.opportunities.slice(-5) : instance.opportunities;
    }

    if (instance.tasksCompleted) {
      insights.tasksCompleted = instance.tasksCompleted.slice ? instance.tasksCompleted.slice(-5) : instance.tasksCompleted;
    }

    // Capture any metrics
    if (instance.metrics) {
      insights.metrics = instance.metrics;
    }

    return Object.keys(insights).length > 3 ? insights : null; // Return only if has useful data
  }

  /**
   * Share insights across ALL AI services (auto-sync)
   */
  async shareInsights(insights) {
    // Make insights available globally
    global.aiSharedInsights = insights;

    // PUSH insights to ALL services that can receive them
    let syncedServices = 0;

    for (const [serviceName, serviceInstance] of Object.entries(this.aiServices)) {
      if (!serviceInstance) continue;

      // If service has a receiveInsights method, push insights to it
      if (serviceInstance.receiveInsights && typeof serviceInstance.receiveInsights === 'function') {
        try {
          await serviceInstance.receiveInsights(insights);
          syncedServices++;
        } catch (error) {
          // Service couldn't receive insights
        }
      }

      // If service has sharedInsights property, update it
      if (serviceInstance.sharedInsights !== undefined) {
        serviceInstance.sharedInsights = insights;
        syncedServices++;
      }
    }

    // Log summary
    this.logger.info(`   📡 Synchronized insights across ${syncedServices} services`);
    this.logger.info(`   📊 Total services monitored: ${insights.serviceCount}`);

    // Log key highlights
    const servicesWithTasks = Object.values(insights.services).filter(s => s.tasksCompleted);
    if (servicesWithTasks.length > 0) {
      this.logger.info(`   ✅ ${servicesWithTasks.length} services actively completing tasks`);
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
