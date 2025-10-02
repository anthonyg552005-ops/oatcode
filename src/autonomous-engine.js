/**
 * AUTONOMOUS AI ENGINE
 *
 * This is the central brain of the system that runs 24/7 and continuously:
 * - Learns from competitors
 * - Optimizes every aspect of the business
 * - Tests and improves automatically
 * - Makes intelligent decisions without human intervention
 *
 * Goal: Build the best website selling business by self-improvement for 1 week straight
 */

const cron = require('node-cron');
const moment = require('moment-timezone');
const winston = require('winston');
require('dotenv').config();

// Validate critical environment variables before starting
console.log('🔍 Validating environment variables...');
console.log('Environment check:');
console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? `Set (${process.env.OPENAI_API_KEY.substring(0, 20)}...)` : 'MISSING');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('- PORT:', process.env.PORT || '3000');

const requiredVars = ['OPENAI_API_KEY'];
const missingVars = requiredVars.filter(v => !process.env[v] || process.env[v].trim() === '');
if (missingVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('Please set these in Railway dashboard > Variables tab');
  console.error('All env vars:', Object.keys(process.env).filter(k => k.includes('API') || k.includes('KEY')).join(', '));
  process.exit(1);
}
console.log('✅ All required environment variables present\n');

// Core AI Agents
const CompetitorIntelligenceAgent = require('./ai-agents/CompetitorIntelligenceAgent');
const ContinuousOptimizationAgent = require('./ai-agents/ContinuousOptimizationAgent');
const SelfTestingAgent = require('./ai-agents/SelfTestingAgent');
const PricingOptimizationAgent = require('./ai-agents/PricingOptimizationAgent');
const StrategyEvolutionAgent = require('./ai-agents/StrategyEvolutionAgent');

// Services
const BusinessAutomationService = require('./services/BusinessAutomationService');
const MetricsCollectionService = require('./services/MetricsCollectionService');
const DecisionMakingService = require('./services/DecisionMakingService');
const FullAutonomousBusinessService = require('./services/FullAutonomousBusinessService');
const TestingPhaseService = require('./services/TestingPhaseService');
const AIOpportunityMonitor = require('./services/AIOpportunityMonitor');
const CriticalNeedsMonitor = require('./services/CriticalNeedsMonitor');
const PreLaunchResearchPhase = require('./services/PreLaunchResearchPhase');
const ProjectLearningService = require('./services/ProjectLearningService');
const MarketExpansionService = require('./services/MarketExpansionService');
const BusinessStatusReportService = require('./services/BusinessStatusReportService');
const DailyPresentationService = require('./services/DailyPresentationService');
const AutoDeploymentMonitorService = require('./services/AutoDeploymentMonitorService');
const SelfImprovementAIService = require('./services/SelfImprovementAIService');
const AIAlignmentMonitor = require('./services/AIAlignmentMonitor');
const AutoScalingStrategyService = require('./services/AutoScalingStrategyService');
const LowMaintenanceTargetingService = require('./services/LowMaintenanceTargetingService');
const AIDocumentationAssistant = require('./services/AIDocumentationAssistant');
const EmailSequenceService = require('./services/EmailSequenceService');
const SendGridService = require('./services/SendGridService');
const ConversionOptimizationService = require('./services/ConversionOptimizationService');
const LeadScoringService = require('./services/LeadScoringService');
const UpsellService = require('./services/UpsellService');
const CustomerSupportAI = require('./services/CustomerSupportAI');
const EmailOptimizationService = require('./services/EmailOptimizationService');
const CustomerRetentionService = require('./services/CustomerRetentionService');
const APIMonitoringService = require('./services/APIMonitoringService');
const EmailTrackingService = require('./services/EmailTrackingService');
const PhaseTrackingService = require('./services/PhaseTrackingService');
const IntelligentEscalationService = require('./services/IntelligentEscalationService');
const AdvancedAnalyticsService = require('./services/AdvancedAnalyticsService');
const ProjectNotesService = require('./services/ProjectNotesService');
const UrgencyEngine = require('./services/UrgencyEngine');
const AdvancedVisualGenerationService = require('./services/AdvancedVisualGenerationService');
const AICoordinationService = require('./services/AICoordinationService');
const QuietHoursProductivityService = require('./services/QuietHoursProductivityService');

// Phase 1 Autonomous Services (CRITICAL)
const AutoSSLRenewalService = require('./services/AutoSSLRenewalService');
const AutoDatabaseBackupService = require('./services/AutoDatabaseBackupService');
const AutoEmailDeliverabilityService = require('./services/AutoEmailDeliverabilityService');
const AutonomousHealthCheckService = require('./services/AutonomousHealthCheckService');
const AutoRepairService = require('./services/AutoRepairService');

class AutonomousEngine {
  constructor() {
    this.startTime = new Date();
    this.isRunning = false;
    this.weekLongExperiment = true; // Run for 1 week straight

    // Configure logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'data/logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'data/logs/combined.log' }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });

    // Initialize AI Agents
    this.agents = {
      competitorIntelligence: new CompetitorIntelligenceAgent(this.logger),
      continuousOptimization: new ContinuousOptimizationAgent(this.logger),
      selfTesting: new SelfTestingAgent(this.logger),
      pricingOptimization: new PricingOptimizationAgent(this.logger),
      strategyEvolution: new StrategyEvolutionAgent(this.logger)
    };

    // Initialize Services
    this.services = {
      businessAutomation: new BusinessAutomationService(this.logger),
      metricsCollection: new MetricsCollectionService(this.logger),
      decisionMaking: new DecisionMakingService(this.logger, this.agents),
      fullAutonomousBusiness: new FullAutonomousBusinessService(this.logger),
      preLaunchResearch: new PreLaunchResearchPhase(this.logger),
      testingPhase: new TestingPhaseService(this.logger),
      opportunityMonitor: new AIOpportunityMonitor(this.logger),
      criticalNeeds: new CriticalNeedsMonitor(this.logger),
      projectLearning: new ProjectLearningService(this.logger),
      marketExpansion: new MarketExpansionService(this.logger),
      statusReports: new BusinessStatusReportService(this.logger),
      dailyPresentation: new DailyPresentationService(this.logger),
      deploymentMonitor: new AutoDeploymentMonitorService(this.logger, null), // notification service added later
      selfImprovement: new SelfImprovementAIService(this.logger),
      alignmentMonitor: new AIAlignmentMonitor(this.logger),
      scalingStrategy: new AutoScalingStrategyService(this.logger),
      lowMaintenanceTargeting: new LowMaintenanceTargetingService(this.logger),
      documentation: new AIDocumentationAssistant(this.logger),
      sendGrid: new SendGridService(),
      emailSequence: null, // Initialized after sendGrid

      // NEW: Business optimization services
      conversionOptimization: new ConversionOptimizationService(this.logger),
      leadScoring: new LeadScoringService(this.logger),
      upsell: new UpsellService(this.logger),
      customerSupport: new CustomerSupportAI(this.logger),
      emailOptimization: new EmailOptimizationService(this.logger),
      customerRetention: new CustomerRetentionService(this.logger),

      // Critical monitoring and tracking services
      apiMonitoring: new APIMonitoringService(),
      emailTracking: new EmailTrackingService(this.logger),
      phaseTracking: new PhaseTrackingService(this.logger),
      escalation: new IntelligentEscalationService(this.logger),
      analytics: new AdvancedAnalyticsService(),

      // Documentation and enhancement services
      projectNotes: new ProjectNotesService(this.logger),
      urgencyEngine: new UrgencyEngine(),
      advancedVisuals: new AdvancedVisualGenerationService(this.logger),

      // AI Coordination - makes all AI services work together
      aiCoordination: new AICoordinationService(this.logger),

      // Quiet Hours Productivity - maximizes productivity during non-emailing times
      quietHoursProductivity: new QuietHoursProductivityService(this.logger)
    };

    // Initialize email sequence (needs sendGrid) - wrapped in try/catch for resilience
    try {
      this.services.emailSequence = new EmailSequenceService(this.logger, this.services.sendGrid);
    } catch (error) {
      this.logger.error(`Failed to initialize EmailSequenceService: ${error.message}`);
      this.services.emailSequence = null;
    }

    // Initialize Phase 1 Critical Autonomous Services
    this.services.sslRenewal = new AutoSSLRenewalService(this.logger);
    this.services.databaseBackup = new AutoDatabaseBackupService(this.logger);
    this.services.emailDeliverability = new AutoEmailDeliverabilityService(this.logger, this.services.sendGrid);
    this.services.healthCheck = new AutonomousHealthCheckService(this.logger);
    this.services.autoRepair = new AutoRepairService(this.logger);

    // Performance metrics
    this.metrics = {
      totalDecisionsMade: 0,
      improvementsMade: 0,
      testsRun: 0,
      competitorsAnalyzed: 0,
      currentRevenue: 0,
      projectedRevenue: 0,
      conversionRate: 0,
      customerAcquisitionCost: 0,
      optimalPrice: 197 // Starting price
    };

    // Learning database
    this.knowledge = {
      competitorStrategies: [],
      successfulTactics: [],
      failedExperiments: [],
      customerInsights: [],
      marketTrends: []
    };
  }

  /**
   * START THE AUTONOMOUS ENGINE
   * This kicks off a week-long autonomous operation
   */
  async start() {
    if (this.isRunning) {
      this.logger.warn('🤖 Autonomous Engine already running');
      return;
    }

    this.isRunning = true;
    this.logger.info('');
    this.logger.info('╔═══════════════════════════════════════════════════════════╗');
    this.logger.info('║   🤖 AUTONOMOUS AI ENGINE - STARTING UP                  ║');
    this.logger.info('║   Building the Best Website Selling Business Ever        ║');
    this.logger.info('║   Mode: 1 Week Autonomous Operation                       ║');
    this.logger.info('╚═══════════════════════════════════════════════════════════╝');
    this.logger.info('');

    // Display mission
    this.logger.info('🎯 MISSION:');
    this.logger.info('   • Run ENTIRE business autonomously (zero human intervention)');
    this.logger.info('   • Automatically find customers, send outreach, close sales');
    this.logger.info('   • AI handles 100% of customer support and service');
    this.logger.info('   • Learn from the best website sellers');
    this.logger.info('   • Automatically test and optimize everything');
    this.logger.info('   • Scale to maximize revenue');
    this.logger.info('   • Run completely autonomously for 1 week');
    this.logger.info('');

    // Initialize all systems
    await this.initializeSystems();

    // Start all AI agents
    await this.startAIAgents();

    // Schedule autonomous operations
    this.scheduleAutonomousOperations();

    // Start web server for monitoring
    await this.startMonitoringServer();

    // Run initial analysis
    await this.runInitialAnalysis();

    // PHASE 1: 7-DAY PRE-LAUNCH RESEARCH & TESTING
    if (process.env.SKIP_RESEARCH !== 'true') {
      this.logger.info('');
      this.logger.info('🔬 PHASE 1: 7-DAY PRE-LAUNCH RESEARCH & TESTING');
      this.logger.info('⚠️  NO REAL CUSTOMERS - Pure research, testing, and improvement');
      this.logger.info('');

      const researchResults = await this.services.preLaunchResearch.startPreLaunchPhase();

      if (!researchResults.readyForLaunch) {
        this.logger.error('❌ Research phase failed - system not ready!');
        this.logger.error('   Review research results and fix issues');
        return;
      }

      this.logger.info('');
      this.logger.info('🎉 7-DAY RESEARCH COMPLETE - SYSTEM BATTLE-TESTED');
      this.logger.info('✅ Ready for internal testing phase!');
      this.logger.info('');
    }

    // PHASE 2: 2-DAY INTERNAL TESTING PHASE
    if (process.env.SKIP_TESTING !== 'true') {
      this.logger.info('');
      this.logger.info('🧪 PHASE 2: 2-DAY INTERNAL TESTING PHASE');
      this.logger.info('⚠️  NO REAL CUSTOMERS WILL BE CONTACTED DURING TESTING');
      this.logger.info('');

      const testingResults = await this.services.testingPhase.startTestingPhase();

      if (!testingResults.readyForProduction) {
        this.logger.error('❌ Testing failed - system not ready!');
        this.logger.error('   Review test results and fix issues');
        return;
      }

      this.logger.info('');
      this.logger.info('🎉 TESTING COMPLETE - SYSTEM VALIDATED');
      this.logger.info('✅ Ready to contact real customers!');
      this.logger.info('');
    }

    // PHASE 3: PRODUCTION - CONTINUOUS AUTONOMOUS OPERATION
    this.logger.info('');
    this.logger.info('🚀 PHASE 3: PRODUCTION - CONTINUOUS AUTONOMOUS OPERATION');
    this.logger.info('💼 NOW CONTACTING REAL CUSTOMERS');
    this.logger.info('');

    // Expose for control API
    global.autonomousBusiness = this.services.fullAutonomousBusiness;

    await this.services.fullAutonomousBusiness.startAutonomousOperation();

    this.logger.info('');
    this.logger.info('✅ All systems operational - Autonomous Engine is now running!');
    this.logger.info('💡 The AI is now running the ENTIRE business autonomously');
    this.logger.info('🤖 Zero human intervention needed - AI handles everything!');
    this.logger.info('📊 Monitor progress at http://localhost:3000/autonomous-dashboard');
    this.logger.info('');
  }

  /**
   * Initialize all subsystems
   */
  async initializeSystems() {
    this.logger.info('⚙️  Initializing Systems...');

    try {
      // Initialize database
      await this.services.businessAutomation.initializeDatabase();
      this.logger.info('   ✓ Database initialized');

      // Initialize metrics tracking
      await this.services.metricsCollection.initialize();
      this.logger.info('   ✓ Metrics tracking ready');

      // Initialize Project Learning Service
      await this.services.projectLearning.initialize();
      this.logger.info('   ✓ Project Learning Service ready (monitoring website-scraper)');

      // Start Business Status Reports (3-hour updates to Anthony)
      this.services.statusReports.start();
      this.logger.info('   ✓ Business Status Reports enabled (every 3 hours)');

      // Expose daily presentation service globally
      global.dailyPresentation = this.services.dailyPresentation;
      this.logger.info('   ✓ Daily Presentation Service ready');

      // Expose new business optimization services globally
      global.conversionOptimization = this.services.conversionOptimization;
      global.leadScoring = this.services.leadScoring;
      global.upsell = this.services.upsell;
      global.customerSupport = this.services.customerSupport;
      global.emailOptimization = this.services.emailOptimization;
      this.logger.info('   ✓ Conversion Optimization Service ready (A/B testing, analytics)');
      this.logger.info('   ✓ Lead Scoring Service ready (prioritizes best prospects)');
      this.logger.info('   ✓ Upsell Service ready (Standard → Premium upgrades)');
      this.logger.info('   ✓ Customer Support AI ready (handles inquiries 24/7)');
      this.logger.info('   ✓ Email Optimization Service ready (improves open/click rates)');

      // Initialize Customer Retention Service (automated check-ins + website updates)
      await this.services.customerRetention.initialize();
      global.customerRetention = this.services.customerRetention;
      this.logger.info('   ✓ Customer Retention Service ready (automated check-ins, feedback processing, website updates)');

      // Initialize Email Tracking Service (tracks email funnel)
      await this.services.emailTracking.initialize();
      global.emailTracking = this.services.emailTracking;
      this.logger.info('   ✓ Email Tracking Service ready (tracks sent → delivered → opened → clicked → purchased)');

      // Initialize Phase Tracking Service (research vs production)
      await this.services.phaseTracking.initialize();
      global.phaseTracking = this.services.phaseTracking;
      this.logger.info('   ✓ Phase Tracking Service ready (tracks business phase for dashboard)');

      // Initialize Intelligent Escalation Service (decides when to alert human)
      global.escalation = this.services.escalation;
      this.logger.info('   ✓ Intelligent Escalation Service ready (handles 99.9% of issues, escalates critical only)');

      // Initialize Advanced Analytics Service (business metrics)
      global.analytics = this.services.analytics;
      this.logger.info('   ✓ Advanced Analytics Service ready (tracks all business metrics)');

      // API Monitoring starts automatically in constructor
      global.apiMonitoring = this.services.apiMonitoring;
      this.logger.info('   ✓ API Monitoring Service active (monitors OpenAI, SendGrid, Twilio usage)');

      // Initialize Project Notes Service (documents all decisions/learnings)
      await this.services.projectNotes.initialize();
      global.projectNotes = this.services.projectNotes;
      this.logger.info('   ✓ Project Notes Service ready (auto-documents development, decisions, learnings)');

      // Initialize Urgency Engine (adds urgency to sales messaging)
      global.urgencyEngine = this.services.urgencyEngine;
      this.logger.info('   ✓ Urgency Engine ready (generates urgency messaging for sales)');

      // Initialize Advanced Visual Generation Service (for Premium tier websites)
      await this.services.advancedVisuals.initialize();
      global.advancedVisuals = this.services.advancedVisuals;
      this.logger.info('   ✓ Advanced Visual Generation Service ready (Runway ML + DALL-E 3 for Premium)');

      // Initialize AI Coordination Service (makes all AI services work together)
      await this.services.aiCoordination.initialize();
      global.aiCoordination = this.services.aiCoordination;
      this.logger.info('   ✓ AI Coordination Service ready (central nervous system for all AIs)');

      // Initialize Quiet Hours Productivity Service (works during non-emailing times)
      await this.services.quietHoursProductivity.initialize();
      global.quietHoursProductivity = this.services.quietHoursProductivity;
      this.logger.info('   ✓ Quiet Hours Productivity ready (maximizes work during off-hours)');

      // Start Auto-Deployment Monitor (watches for crashes and auto-fixes)
      this.services.deploymentMonitor.start();
      this.logger.info('   ✓ Auto-Deployment Monitor active (checks every 60s)');

      // Start Auto-Repair Service (monitors logs and fixes common issues autonomously)
      this.services.autoRepair.start();
      global.autoRepair = this.services.autoRepair;
      this.logger.info('   ✓ Auto-Repair Service active (scans hourly, fixes git config, code errors, etc.)');

      // Start Self-Improvement AI (continuously creates new services to improve business)
      this.services.selfImprovement.start();
      this.logger.info('   ✓ Self-Improvement AI active (analyzes daily, creates optimization services)');

      // Start AI Alignment Monitor (ensures we stay true to original vision)
      this.services.alignmentMonitor.start();
      this.logger.info('   ✓ AI Alignment Monitor watching original vision');

      // Start Autonomous Scaling Strategy (1 city → 50+ cities → international)
      await this.services.scalingStrategy.start();
      this.logger.info('   ✓ Autonomous Scaling Strategy managing expansion');

      // Initialize Low-Maintenance Targeting (focus on set-and-forget businesses)
      this.logger.info('   ✓ Low-Maintenance Targeting ready (lawyers, dentists, plumbers, etc.)');

      // Start AI Documentation Assistant (your personal note-taker)
      await this.services.documentation.start();
      global.documentation = this.services.documentation;
      this.logger.info('   ✓ AI Documentation Assistant ready (taking notes and organizing)');

      // Start Email Sequence Service (5-email follow-up over 21 days)
      if (this.services.emailSequence) {
        try {
          await this.services.emailSequence.start();
          global.emailSequence = this.services.emailSequence;
          this.logger.info('   ✓ Email Sequence Service ready (5 follow-ups over 21 days with smart tracking)');
        } catch (error) {
          this.logger.error(`Failed to start EmailSequenceService: ${error.message}`);
          global.emailSequence = null;
        }
      } else {
        this.logger.warn('   ⚠️  Email Sequence Service not available (initialization failed)');
      }

      // Load existing knowledge
      await this.loadKnowledgeBase();
      this.logger.info('   ✓ Knowledge base loaded');

      // Initialize business automation
      await this.services.businessAutomation.initialize();
      this.logger.info('   ✓ Business automation ready');

    } catch (error) {
      this.logger.error(`❌ System initialization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Start all AI agents
   */
  async startAIAgents() {
    this.logger.info('');
    this.logger.info('🧠 Starting AI Agents...');

    for (const [name, agent] of Object.entries(this.agents)) {
      try {
        await agent.initialize();
        this.logger.info(`   ✓ ${name} agent activated`);
      } catch (error) {
        this.logger.error(`   ✗ ${name} agent failed: ${error.message}`);
      }
    }
  }

  /**
   * Schedule all autonomous operations
   */
  async scheduleAutonomousOperations() {
    this.logger.info('');
    this.logger.info('📅 Scheduling Autonomous Operations...');

    // Every 30 minutes: Analyze competitors
    cron.schedule('*/30 * * * *', async () => {
      try {
        this.logger.info('🔍 Running competitor analysis...');
        await this.agents.competitorIntelligence.analyzeTopCompetitors();
        this.metrics.competitorsAnalyzed++;
      } catch (error) {
        this.logger.error(`Competitor analysis failed: ${error.message}`);
      }
    });
    this.logger.info('   ✓ Competitor analysis: Every 30 minutes');

    // Every hour: Optimize everything
    cron.schedule('0 * * * *', async () => {
      this.logger.info('⚡ Running continuous optimization...');
      await this.agents.continuousOptimization.optimizeEverything();
      this.metrics.improvementsMade++;
    });
    this.logger.info('   ✓ Continuous optimization: Every hour');

    // Every 2 hours: Run A/B tests
    cron.schedule('0 */2 * * *', async () => {
      this.logger.info('🧪 Running autonomous tests...');
      await this.agents.selfTesting.runAllTests();
      this.metrics.testsRun++;
    });
    this.logger.info('   ✓ A/B testing: Every 2 hours');

    // Every 4 hours: Optimize pricing
    cron.schedule('0 */4 * * *', async () => {
      this.logger.info('💰 Optimizing pricing strategy...');
      const newPrice = await this.agents.pricingOptimization.optimizePricing();
      if (newPrice) {
        this.metrics.optimalPrice = newPrice;
        this.logger.info(`   💡 New optimal price: $${newPrice}/month`);
      }
    });
    this.logger.info('   ✓ Pricing optimization: Every 4 hours');

    // Every 6 hours: Evolve strategy
    cron.schedule('0 */6 * * *', async () => {
      this.logger.info('🧬 Evolving business strategy...');
      await this.agents.strategyEvolution.evolveStrategy();
    });
    this.logger.info('   ✓ Strategy evolution: Every 6 hours');

    // Every hour: Check for critical needs (blocking issues)
    cron.schedule('0 * * * *', async () => {
      this.logger.info('🚨 Checking for critical resource needs...');

      // Update critical needs monitor with usage data
      this.services.criticalNeeds.updateUsage({
        emailsSentToday: this.services.fullAutonomousBusiness?.stats?.emailsSent || 0,
        openaiCreditsUsed: this.metrics.openaiCreditsUsed || 0,
        demosServed: this.services.fullAutonomousBusiness?.stats?.demosCreated || 0,
        customersOnboarded: this.services.fullAutonomousBusiness?.stats?.customersSigned || 0
      });

      await this.services.criticalNeeds.checkCriticalNeeds();
    });
    this.logger.info('   ✓ Critical needs monitoring: Every hour');

    // Every 6 hours: Check for AI enhancement opportunities
    cron.schedule('0 */6 * * *', async () => {
      this.logger.info('🔍 Checking for AI enhancement opportunities...');

      // Update opportunity monitor with latest metrics
      this.services.opportunityMonitor.updateMetrics({
        leadsContacted: this.services.fullAutonomousBusiness?.stats?.leadsGenerated || 0,
        websitesGenerated: this.services.fullAutonomousBusiness?.stats?.demosCreated || 0,
        conversationsHad: this.services.fullAutonomousBusiness?.stats?.supportTicketsResolved || 0,
        payingCustomers: this.services.fullAutonomousBusiness?.stats?.customersSigned || 0,
        monthlyRecurringRevenue: this.services.fullAutonomousBusiness?.stats?.revenue || 0,
        daysRunning: Math.floor((Date.now() - this.startTime) / (1000 * 60 * 60 * 24)),
        demosGenerated: this.services.fullAutonomousBusiness?.stats?.demosCreated || 0,
        conversionRate: this.metrics.conversionRate || 0,
        churnRate: 0 // TODO: Track actual churn
      });

      await this.services.opportunityMonitor.checkOpportunities();
    });
    this.logger.info('   ✓ AI opportunity monitoring: Every 6 hours');

    // Daily at 3 AM: Scan website-scraper project for new systems/improvements
    cron.schedule('0 3 * * *', async () => {
      this.logger.info('🧠 Scanning website-scraper project for improvements...');
      await this.services.projectLearning.scanSourceProject();

      // Generate adoption report
      const report = await this.services.projectLearning.generateAdoptionReport();
      this.logger.info(`   📊 Systems adopted: ${report.totalSystemsAdopted}`);
      this.logger.info(`   🔍 Systems identified: ${report.systemsIdentified}`);
    });
    this.logger.info('   ✓ Project learning: Daily at 3 AM');

    // Daily at 6 AM: Check if ready for market expansion (month 2-3)
    cron.schedule('0 6 * * *', async () => {
      this.logger.info('🎯 Checking market expansion readiness...');

      const businessMetrics = {
        daysRunning: Math.floor((Date.now() - this.startTime) / (1000 * 60 * 60 * 24)),
        payingCustomers: this.services.fullAutonomousBusiness?.stats?.customersSigned || 0,
        monthlyRecurringRevenue: this.services.fullAutonomousBusiness?.stats?.revenue || 0,
        conversionRate: this.metrics.conversionRate || 0,
        customerSatisfaction: 4.5 // TODO: Track actual satisfaction from feedback
      };

      const readiness = await this.services.marketExpansion.checkExpansionReadiness(businessMetrics);

      if (readiness.ready) {
        await this.services.marketExpansion.expandToPhase2(businessMetrics);
      }
    });
    this.logger.info('   ✓ Market expansion check: Daily at 6 AM');

    // Daily at 8 PM CT: Generate and send daily presentation
    cron.schedule('0 20 * * *', async () => {
      this.logger.info('📊 Generating daily CEO presentation...');

      // Update final metrics for the day
      this.services.dailyPresentation.updateMetrics({
        leadsGenerated: this.services.fullAutonomousBusiness?.stats?.leadsGenerated || 0,
        emailsSent: this.services.fullAutonomousBusiness?.stats?.emailsSent || 0,
        websitesCreated: this.services.fullAutonomousBusiness?.stats?.demosCreated || 0,
        customersAcquired: this.services.fullAutonomousBusiness?.stats?.customersSigned || 0,
        revenue: this.services.fullAutonomousBusiness?.stats?.revenue || 0,
        startDate: this.startTime.toISOString()
      });

      // Generate demo websites for Anthony to test (Standard + Premium)
      this.logger.info('   🎨 Creating test demo websites for business review...');
      try {
        const DemoComparisonService = require('./services/DemoComparisonService');
        const demoService = new DemoComparisonService(this.logger);

        const testBusiness = {
          businessName: 'Daily Test Restaurant',
          industry: 'restaurant',
          location: 'Orange County, CA',
          description: 'Fine dining restaurant serving fresh, local cuisine'
        };

        const demoComparison = await demoService.generateDemoComparison(testBusiness);

        this.services.dailyPresentation.addWebsiteExample(
          'Test Restaurant (Standard Plan)',
          'Restaurant',
          demoComparison.standardUrl,
          ['Stock photos', 'Professional design', 'Mobile responsive', 'SEO optimized', '$197/month']
        );

        this.services.dailyPresentation.addWebsiteExample(
          'Test Restaurant (Premium Plan)',
          'Restaurant',
          demoComparison.premiumUrl,
          ['Runway AI videos', 'DALL-E 3 custom images', 'AI branding', 'Premium features', '$297/month']
        );

        this.logger.info(`   ✅ Demo comparison ready: ${demoComparison.comparisonUrl}`);
      } catch (error) {
        this.logger.error(`   ⚠️  Demo generation failed: ${error.message}`);
      }

      // Add future plans
      this.services.dailyPresentation.addFuturePlan(
        'Continue Autonomous Growth',
        'AI will continue analyzing competitors, optimizing campaigns, and growing the business autonomously.',
        'Next 24 hours'
      );

      // Send presentation
      await this.services.dailyPresentation.sendDailyPresentation();

      // Also save to public folder for web viewing
      await this.services.dailyPresentation.savePresentationToFile();
    }, {
      timezone: 'America/Chicago' // 8 PM Central Time
    });
    this.logger.info('   ✓ Daily CEO presentation: 8 PM CT daily');

    // Daily at 10 AM: Process customer check-in emails (Day 3, Day 14, Day 30, etc.)
    cron.schedule('0 10 * * *', async () => {
      this.logger.info('📧 Processing customer retention check-ins...');
      try {
        const checkInsSent = await this.services.customerRetention.processDailyCheckIns();
        this.logger.info(`   ✅ Sent ${checkInsSent} customer check-in emails`);

        // Update retention metrics
        const stats = await this.services.customerRetention.getStats();
        this.logger.info(`   📊 Retention stats: ${stats.activeSubscriptions} active, ${stats.responseRate}% response rate`);
      } catch (error) {
        this.logger.error(`   ❌ Customer retention check-ins failed: ${error.message}`);
      }
    });
    this.logger.info('   ✓ Customer retention check-ins: 10 AM daily (auto-emails at Day 3, 14, 30, etc.)');

    // Every 15 minutes: Make autonomous decisions
    cron.schedule('*/15 * * * *', async () => {
      await this.makeAutonomousDecisions();
    });
    this.logger.info('   ✓ Decision making: Every 15 minutes');

    // Every 5 minutes: Collect metrics
    cron.schedule('*/5 * * * *', async () => {
      await this.collectAndAnalyzeMetrics();
    });
    this.logger.info('   ✓ Metrics collection: Every 5 minutes');

    // Daily: Generate progress report
    cron.schedule('0 0 * * *', async () => {
      await this.generateDailyReport();
    });
    this.logger.info('   ✓ Daily progress report: Midnight');

    // Initialize Phase 1 Critical Services
    this.logger.info('');
    this.logger.info('🔐 Initializing Critical Autonomous Services...');

    // SSL Certificate Renewal Service
    this.services.sslRenewal.scheduleChecks(cron);

    // Database Backup Service
    try {
      await this.services.databaseBackup.initialize();
      this.services.databaseBackup.scheduleBackups(cron);
    } catch (error) {
      this.logger.error(`Failed to initialize backup service: ${error.message}`);
    }

    // Email Deliverability Monitoring
    this.services.emailDeliverability.scheduleChecks(cron);

    // Health Check Service (writes status every 30 seconds)
    this.services.healthCheck.startHeartbeat(cron);
    await this.services.healthCheck.writeHealthStatus();

    this.logger.info('   ✅ Critical services initialized');
  }

  /**
   * Run initial analysis to understand the market
   */
  async runInitialAnalysis() {
    this.logger.info('');
    this.logger.info('🔬 Running Initial Market Analysis...');

    try {
      // Analyze top competitors
      this.logger.info('   → Analyzing top website selling companies...');
      const competitors = await this.agents.competitorIntelligence.analyzeTopCompetitors();
      this.logger.info(`   ✓ Analyzed ${competitors.length} competitors`);

      // Determine optimal starting price
      this.logger.info('   → Calculating optimal pricing...');
      const optimalPrice = await this.agents.pricingOptimization.calculateInitialPrice();
      this.metrics.optimalPrice = optimalPrice;
      this.logger.info(`   ✓ Optimal starting price: $${optimalPrice}/month`);

      // Identify best strategies
      this.logger.info('   → Identifying winning strategies...');
      const strategies = await this.agents.strategyEvolution.identifyBestStrategies();
      this.logger.info(`   ✓ Found ${strategies.length} proven strategies`);

      // Run initial tests
      this.logger.info('   → Running initial system tests...');
      const testResults = await this.agents.selfTesting.runInitialTests();
      this.logger.info(`   ✓ Tests passed: ${testResults.passed}/${testResults.total}`);

    } catch (error) {
      this.logger.error(`Initial analysis error: ${error.message}`);
    }
  }

  /**
   * Make autonomous decisions every 15 minutes
   * This is where the AI decides what to do next
   */
  async makeAutonomousDecisions() {
    try {
      const decision = await this.services.decisionMaking.makeDecision(this.metrics, this.knowledge);

      if (decision.action) {
        this.logger.info(`🤖 AUTONOMOUS DECISION: ${decision.action}`);
        this.logger.info(`   Reason: ${decision.reason}`);
        this.logger.info(`   Expected Impact: ${decision.expectedImpact}`);

        // Execute the decision
        await this.executeDecision(decision);
        this.metrics.totalDecisionsMade++;
      }
    } catch (error) {
      this.logger.error(`Decision making error: ${error.message}`);
    }
  }

  /**
   * Execute a decision made by the AI
   */
  async executeDecision(decision) {
    switch (decision.type) {
      case 'pricing_change':
        await this.services.businessAutomation.updatePricing(decision.newPrice);
        break;
      case 'strategy_pivot':
        await this.services.businessAutomation.updateStrategy(decision.newStrategy);
        break;
      case 'scale_up':
        await this.services.businessAutomation.scaleOperations(decision.scaleFactor);
        break;
      case 'test_new_feature':
        await this.agents.selfTesting.testFeature(decision.feature);
        break;
      case 'adopt_competitor_tactic':
        await this.services.businessAutomation.implementTactic(decision.tactic);
        break;
      default:
        this.logger.warn(`Unknown decision type: ${decision.type}`);
    }
  }

  /**
   * Collect and analyze metrics
   */
  async collectAndAnalyzeMetrics() {
    try {
      const newMetrics = await this.services.metricsCollection.collectMetrics();

      // Update current metrics
      Object.assign(this.metrics, newMetrics);

      // Analyze trends
      const trends = await this.services.metricsCollection.analyzeTrends();

      // Log significant changes
      if (trends.significantChanges.length > 0) {
        this.logger.info('📊 Significant metric changes detected:');
        trends.significantChanges.forEach(change => {
          this.logger.info(`   ${change.metric}: ${change.change}`);
        });
      }
    } catch (error) {
      this.logger.error(`Metrics collection error: ${error.message}`);
    }
  }

  /**
   * Generate daily progress report
   */
  async generateDailyReport() {
    const daysRunning = Math.floor((Date.now() - this.startTime) / (1000 * 60 * 60 * 24));

    this.logger.info('');
    this.logger.info('═══════════════════════════════════════════════════════');
    this.logger.info(`📊 DAILY PROGRESS REPORT - Day ${daysRunning + 1}/7`);
    this.logger.info('═══════════════════════════════════════════════════════');
    this.logger.info('');
    this.logger.info('🤖 AI Performance:');
    this.logger.info(`   • Autonomous decisions made: ${this.metrics.totalDecisionsMade}`);
    this.logger.info(`   • Improvements implemented: ${this.metrics.improvementsMade}`);
    this.logger.info(`   • Tests executed: ${this.metrics.testsRun}`);
    this.logger.info(`   • Competitors analyzed: ${this.metrics.competitorsAnalyzed}`);
    this.logger.info('');
    this.logger.info('💰 Business Metrics:');
    this.logger.info(`   • Current revenue: $${this.metrics.currentRevenue.toLocaleString()}`);
    this.logger.info(`   • Projected revenue: $${this.metrics.projectedRevenue.toLocaleString()}`);
    this.logger.info(`   • Conversion rate: ${this.metrics.conversionRate}%`);
    this.logger.info(`   • Optimal price: $${this.metrics.optimalPrice}/month`);
    this.logger.info(`   • CAC: $${this.metrics.customerAcquisitionCost}`);
    this.logger.info('');
    this.logger.info('🧠 Knowledge Gained:');
    this.logger.info(`   • Competitor strategies learned: ${this.knowledge.competitorStrategies.length}`);
    this.logger.info(`   • Successful tactics: ${this.knowledge.successfulTactics.length}`);
    this.logger.info(`   • Failed experiments: ${this.knowledge.failedExperiments.length}`);
    this.logger.info('');

    // Save report to file
    await this.saveReportToFile(daysRunning + 1);
  }

  /**
   * Save report to file
   */
  async saveReportToFile(day) {
    const fs = require('fs').promises;
    const report = {
      day,
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      knowledge: {
        strategiesLearned: this.knowledge.competitorStrategies.length,
        successfulTactics: this.knowledge.successfulTactics.length,
        failedExperiments: this.knowledge.failedExperiments.length
      }
    };

    await fs.writeFile(
      `data/metrics/day-${day}-report.json`,
      JSON.stringify(report, null, 2)
    );
  }

  /**
   * Load existing knowledge base
   */
  async loadKnowledgeBase() {
    // Load from previous runs if available
    // This allows the AI to learn from past experiences
  }

  /**
   * Start monitoring web server
   */
  async startMonitoringServer() {
    const app = require('./app');

    // Make metrics available to app
    global.autonomousMetrics = this.metrics;
    global.autonomousAgents = this.agents;

    // Dashboard API endpoint
    const express = require('express');
    app.get('/api/metrics', (req, res) => {
      res.json({
        status: 'running',
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        metrics: this.metrics,
        agents: Object.keys(this.agents).map(name => ({
          name,
          status: 'active'
        })),
        recentDecisions: this.getRecentDecisions(),
        knowledge: {
          strategiesLearned: this.knowledge.competitorStrategies.length,
          successfulTactics: this.knowledge.successfulTactics.length
        }
      });
    });

    // Metrics endpoint
    app.get('/metrics', (req, res) => {
      res.json(this.metrics);
    });

    // Knowledge base endpoint
    app.get('/knowledge', (req, res) => {
      res.json(this.knowledge);
    });

    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, '0.0.0.0', () => {
      this.logger.info(`🌐 Monitoring server running on port ${PORT}`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        this.logger.warn(`⚠️  Port ${PORT} is already in use. Server may already be running.`);
        // Don't crash - the autonomous engine can still run without the monitoring server
      } else {
        this.logger.error(`❌ Server error: ${error.message}`);
        throw error;
      }
    });
  }

  /**
   * Get recent decisions
   */
  getRecentDecisions() {
    // Return last 10 decisions
    return [];
  }

  /**
   * Stop the autonomous engine
   */
  stop() {
    this.isRunning = false;
    this.logger.info('');
    this.logger.info('🛑 Stopping Autonomous Engine...');

    // Stop status reports
    if (this.services.statusReports) {
      this.services.statusReports.stop();
    }

    this.logger.info('');
    this.logger.info('📊 Final Statistics:');
    this.logger.info(`   • Total decisions made: ${this.metrics.totalDecisionsMade}`);
    this.logger.info(`   • Total improvements: ${this.metrics.improvementsMade}`);
    this.logger.info(`   • Total tests run: ${this.metrics.testsRun}`);
    this.logger.info('');
    this.logger.info('✅ Shutdown complete');
  }
}

// Start the engine
const engine = new AutonomousEngine();
engine.start().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  engine.stop();
  process.exit(0);
});

module.exports = AutonomousEngine;