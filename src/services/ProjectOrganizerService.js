/**
 * PROJECT ORGANIZER SERVICE
 *
 * Keeps your ENTIRE project organized automatically.
 * Scans all files, categorizes them, ensures proper structure,
 * and keeps everything clean and easy to navigate.
 *
 * RESPONSIBILITIES:
 * 1. Organize src/ files by category (services, agents, utilities, etc.)
 * 2. Maintain proper folder structure
 * 3. Enforce file naming conventions
 * 4. Clean up unused files
 * 5. Generate project structure documentation
 * 6. Auto-organize new files when created
 * 7. Keep public/ assets organized
 * 8. Maintain data/ files properly
 *
 * IDEAL PROJECT STRUCTURE:
 * /src
 *   /ai-agents          - AI decision-making agents
 *   /services           - Business services
 *     /core             - Core business services
 *     /automation       - Automation services
 *     /monitoring       - Monitoring & reporting
 *     /discovery        - Business discovery
 *   /utilities          - Helper functions
 *   /middleware         - Express middleware
 *   /routes             - API routes
 *   /models             - Data models
 *   app.js              - Main server
 *   autonomous-engine.js - Autonomous engine
 *
 * /public
 *   /css                - Stylesheets
 *   /js                 - Client-side JavaScript
 *   /images             - Images
 *   /templates          - HTML templates
 *
 * /data
 *   /logs               - Log files
 *   /databases          - JSON databases
 *   /cache              - Cached data
 *   /generated-sites    - Generated websites
 *
 * /docs                 - Documentation (managed by AIDocumentationAssistant)
 */

const fs = require('fs').promises;
const path = require('path');

class ProjectOrganizerService {
  constructor(logger) {
    this.logger = logger;

    this.projectRoot = path.join(__dirname, '../..');

    // Ideal folder structure
    this.idealStructure = {
      'src/ai-agents': 'AI decision-making agents',
      'src/services/core': 'Core business services (automation, metrics, etc.)',
      'src/services/automation': 'Automation services (outreach, email, etc.)',
      'src/services/monitoring': 'Monitoring & reporting services',
      'src/services/discovery': 'Business discovery services',
      'src/utilities': 'Helper functions and utilities',
      'src/middleware': 'Express middleware',
      'src/routes': 'API route handlers',
      'src/models': 'Data models and schemas',
      'public/css': 'Stylesheets',
      'public/js': 'Client-side JavaScript',
      'public/images': 'Images and assets',
      'public/templates': 'HTML templates',
      'data/logs': 'Application logs',
      'data/databases': 'JSON databases',
      'data/cache': 'Cached data',
      'data/generated-sites': 'Generated websites',
      'docs': 'Project documentation'
    };

    // File categorization rules
    this.categorizationRules = {
      // AI Agents
      'ai-agents': (filename) =>
        filename.includes('Agent') && !filename.includes('Service'),

      // Core Services
      'services/core': (filename) =>
        ['BusinessAutomation', 'MetricsCollection', 'DecisionMaking', 'FullAutonomousBusiness'].some(s => filename.includes(s)),

      // Automation Services
      'services/automation': (filename) =>
        ['Outreach', 'Email', 'SMS', 'AIWebsiteGeneration', 'EmailScheduling'].some(s => filename.includes(s)),

      // Monitoring Services
      'services/monitoring': (filename) =>
        ['StatusReport', 'Presentation', 'Alignment', 'Documentation', 'Learning'].some(s => filename.includes(s)),

      // Discovery Services
      'services/discovery': (filename) =>
        ['GooglePlaces', 'MultiSource', 'Discovery', 'Targeting'].some(s => filename.includes(s)),

      // Utilities
      'utilities': (filename) =>
        filename.includes('Helper') || filename.includes('Util') || filename.includes('Utils'),

      // Middleware
      'middleware': (filename) =>
        filename.includes('Middleware') || filename.includes('middleware'),

      // Routes
      'routes': (filename) =>
        filename.includes('Routes') || filename.includes('Router'),

      // Models
      'models': (filename) =>
        filename.includes('Model') || filename.includes('Schema')
    };
  }

  /**
   * START PROJECT ORGANIZER
   */
  async start() {
    this.logger.info('🗂️  Project Organizer starting...');

    // Create ideal folder structure
    await this.createIdealStructure();

    // Scan and organize existing files
    await this.scanAndOrganize();

    // Generate project structure documentation
    await this.generateStructureDocumentation();

    // Watch for new files (run organization every hour)
    setInterval(() => this.scanAndOrganize(), 60 * 60 * 1000);

    this.logger.info('✅ Project Organizer ready');
  }

  /**
   * CREATE IDEAL FOLDER STRUCTURE
   */
  async createIdealStructure() {
    for (const [folderPath, description] of Object.entries(this.idealStructure)) {
      const fullPath = path.join(this.projectRoot, folderPath);

      try {
        await fs.mkdir(fullPath, { recursive: true });

        // Create README in each folder explaining its purpose
        const readmePath = path.join(fullPath, 'README.md');
        const readmeExists = await fs.access(readmePath).then(() => true).catch(() => false);

        if (!readmeExists) {
          await fs.writeFile(readmePath, `# ${path.basename(folderPath)}\n\n${description}\n`);
        }
      } catch (error) {
        // Folder might already exist
      }
    }

    this.logger.info('   ✓ Created ideal folder structure');
  }

  /**
   * SCAN AND ORGANIZE ALL FILES
   */
  async scanAndOrganize() {
    this.logger.info('🔍 Scanning project files for organization...');

    const srcPath = path.join(this.projectRoot, 'src');

    // Get all files in src/
    const files = await this.getAllFiles(srcPath);

    const organizationPlan = [];

    for (const file of files) {
      const relativePath = path.relative(srcPath, file);
      const filename = path.basename(file);

      // Skip if already in correct location
      const currentFolder = path.dirname(relativePath);

      // Determine ideal location
      const idealLocation = this.determineIdealLocation(filename);

      if (idealLocation && currentFolder !== idealLocation) {
        organizationPlan.push({
          current: file,
          ideal: path.join(srcPath, idealLocation, filename),
          filename,
          from: currentFolder,
          to: idealLocation
        });
      }
    }

    if (organizationPlan.length > 0) {
      this.logger.info(`   📦 Found ${organizationPlan.length} files to organize`);

      // Log the plan (but don't auto-move yet - safer to review first)
      for (const item of organizationPlan) {
        this.logger.info(`   • ${item.filename}: ${item.from || 'root'} → ${item.to}`);
      }

      // Save reorganization plan
      await this.saveReorganizationPlan(organizationPlan);
    } else {
      this.logger.info('   ✅ All files are properly organized');
    }
  }

  /**
   * GET ALL FILES RECURSIVELY
   */
  async getAllFiles(dir, fileList = []) {
    const files = await fs.readdir(dir, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(dir, file.name);

      if (file.isDirectory()) {
        await this.getAllFiles(fullPath, fileList);
      } else if (file.name.endsWith('.js')) {
        fileList.push(fullPath);
      }
    }

    return fileList;
  }

  /**
   * DETERMINE IDEAL LOCATION FOR A FILE
   */
  determineIdealLocation(filename) {
    // Check each categorization rule
    for (const [category, rule] of Object.entries(this.categorizationRules)) {
      if (rule(filename)) {
        return category;
      }
    }

    // If it's a service but doesn't match specific categories, put in services/
    if (filename.includes('Service')) {
      return 'services';
    }

    // Default: leave in root of src/
    return null;
  }

  /**
   * SAVE REORGANIZATION PLAN
   */
  async saveReorganizationPlan(plan) {
    const planPath = path.join(this.projectRoot, 'docs', 'reorganization-plan.md');

    let content = `# Project Reorganization Plan

**Generated:** ${new Date().toISOString()}
**Files to organize:** ${plan.length}

This plan shows how to reorganize files for better structure.
Review and manually apply if desired.

---

`;

    for (const item of plan) {
      content += `\n## ${item.filename}\n`;
      content += `**Current:** \`${item.from || 'src/'}\`\n`;
      content += `**Recommended:** \`${item.to}\`\n`;
      content += `\n\`\`\`bash\n`;
      content += `mv "${item.current}" "${item.ideal}"\n`;
      content += `\`\`\`\n`;
    }

    await fs.writeFile(planPath, content);
    this.logger.info(`   💾 Saved reorganization plan to docs/reorganization-plan.md`);
  }

  /**
   * GENERATE PROJECT STRUCTURE DOCUMENTATION
   */
  async generateStructureDocumentation() {
    const docPath = path.join(this.projectRoot, 'docs', 'PROJECT-STRUCTURE.md');

    let content = `# Project Structure

**Last Updated:** ${new Date().toISOString()}

This document describes the organization of the codebase.

---

## 📁 Folder Structure

\`\`\`
automatedwebsitescraper/
├── src/                      # Source code
│   ├── ai-agents/            # AI decision-making agents
│   ├── services/             # Business services
│   │   ├── core/             # Core services (automation, metrics)
│   │   ├── automation/       # Automation services (outreach, email)
│   │   ├── monitoring/       # Monitoring & reporting
│   │   └── discovery/        # Business discovery
│   ├── utilities/            # Helper functions
│   ├── middleware/           # Express middleware
│   ├── routes/               # API routes
│   ├── models/               # Data models
│   ├── app.js                # Main Express server
│   └── autonomous-engine.js  # Autonomous business engine
│
├── public/                   # Static assets
│   ├── css/                  # Stylesheets
│   ├── js/                   # Client-side scripts
│   ├── images/               # Images
│   └── templates/            # HTML templates
│
├── data/                     # Runtime data
│   ├── logs/                 # Application logs
│   ├── databases/            # JSON databases
│   ├── cache/                # Cached data
│   └── generated-sites/      # Generated websites
│
├── docs/                     # Documentation
│   ├── daily-notes/          # Daily activity logs
│   ├── weekly-summaries/     # Weekly reports
│   ├── decisions/            # Decision docs
│   └── ...                   # More categories
│
├── package.json              # Dependencies
├── .env                      # Environment variables
└── README.md                 # Project README
\`\`\`

---

## 🗂️ File Organization Rules

### AI Agents (\`src/ai-agents/\`)
Files ending with \`Agent.js\` that make autonomous decisions.

**Examples:**
- CompetitorIntelligenceAgent.js
- ContinuousOptimizationAgent.js
- PricingOptimizationAgent.js

### Core Services (\`src/services/core/\`)
Fundamental business services that the entire system depends on.

**Examples:**
- BusinessAutomationService.js
- MetricsCollectionService.js
- DecisionMakingService.js
- FullAutonomousBusinessService.js

### Automation Services (\`src/services/automation/\`)
Services that handle automated tasks like outreach and email.

**Examples:**
- OutreachService.js
- SendGridService.js
- EmailSchedulingService.js
- AIWebsiteGenerationService.js

### Monitoring Services (\`src/services/monitoring/\`)
Services that monitor, report, and track the business.

**Examples:**
- BusinessStatusReportService.js
- DailyPresentationService.js
- AIAlignmentMonitor.js
- AIDocumentationAssistant.js
- ProjectLearningService.js

### Discovery Services (\`src/services/discovery/\`)
Services that find and research businesses.

**Examples:**
- GooglePlacesService.js
- MultiSourceBusinessDiscovery.js
- LowMaintenanceTargetingService.js

### Utilities (\`src/utilities/\`)
Helper functions, utilities, and shared code.

### Middleware (\`src/middleware/\`)
Express middleware for authentication, logging, etc.

### Routes (\`src/routes/\`)
API route handlers.

### Models (\`src/models/\`)
Data models and schemas.

---

## 📋 Naming Conventions

- **Services:** \`*Service.js\` (e.g., OutreachService.js)
- **AI Agents:** \`*Agent.js\` (e.g., PricingOptimizationAgent.js)
- **Utilities:** \`*Helper.js\` or \`*Utils.js\`
- **Routes:** \`*Routes.js\` or \`*Router.js\`
- **Models:** \`*Model.js\` or \`*Schema.js\`

---

## 🔄 How Organization Works

The Project Organizer Service automatically:

1. **Scans** all files in \`src/\`
2. **Categorizes** them based on naming and purpose
3. **Suggests** reorganization if needed
4. **Generates** reorganization plan in \`docs/\`
5. **Updates** this documentation

Files are categorized based on their name and purpose, ensuring
the codebase stays clean and navigable.

---

**Maintained by:** AI Documentation Assistant & Project Organizer
`;

    await fs.writeFile(docPath, content);
    this.logger.info('   ✓ Generated PROJECT-STRUCTURE.md');
  }

  /**
   * GET CURRENT PROJECT STATISTICS
   */
  async getProjectStatistics() {
    const stats = {
      totalFiles: 0,
      byCategory: {},
      byExtension: {},
      totalLines: 0,
      lastOrganized: null
    };

    const srcPath = path.join(this.projectRoot, 'src');
    const files = await this.getAllFiles(srcPath);

    stats.totalFiles = files.length;

    for (const file of files) {
      const ext = path.extname(file);
      stats.byExtension[ext] = (stats.byExtension[ext] || 0) + 1;

      const category = this.determineIdealLocation(path.basename(file)) || 'root';
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

      // Count lines
      try {
        const content = await fs.readFile(file, 'utf-8');
        stats.totalLines += content.split('\n').length;
      } catch (error) {
        // Skip files that can't be read
      }
    }

    return stats;
  }
}

module.exports = ProjectOrganizerService;
