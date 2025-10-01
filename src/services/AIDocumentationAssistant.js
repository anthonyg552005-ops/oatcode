/**
 * AI DOCUMENTATION ASSISTANT
 *
 * Your personal AI note-taker and project organizer.
 * Constantly monitors the business, takes notes, organizes files,
 * and keeps everything documented and easy to access.
 *
 * RESPONSIBILITIES:
 * 1. Track all business activities automatically
 * 2. Take detailed notes on what's happening
 * 3. Organize files into logical structure
 * 4. Create and maintain documentation
 * 5. Generate summaries and reports
 * 6. Index everything for easy search
 * 7. Keep project knowledge base updated
 *
 * DOCUMENTATION STRUCTURE:
 * /docs
 *   /daily-notes         - Daily activity logs
 *   /weekly-summaries    - Weekly business summaries
 *   /decisions           - Major decisions made
 *   /architecture        - System architecture docs
 *   /services            - Service documentation
 *   /processes           - Business processes
 *   /metrics             - Performance metrics
 *   /customer-insights   - Customer learnings
 *   /strategy            - Strategic planning
 *   /changelog           - What changed and why
 */

const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');
const moment = require('moment-timezone');

class AIDocumentationAssistant {
  constructor(logger) {
    this.logger = logger;
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Documentation paths
    this.docsRoot = path.join(__dirname, '../../docs');
    this.paths = {
      dailyNotes: path.join(this.docsRoot, 'daily-notes'),
      weeklySummaries: path.join(this.docsRoot, 'weekly-summaries'),
      decisions: path.join(this.docsRoot, 'decisions'),
      architecture: path.join(this.docsRoot, 'architecture'),
      services: path.join(this.docsRoot, 'services'),
      processes: path.join(this.docsRoot, 'processes'),
      metrics: path.join(this.docsRoot, 'metrics'),
      customerInsights: path.join(this.docsRoot, 'customer-insights'),
      strategy: path.join(this.docsRoot, 'strategy'),
      changelog: path.join(this.docsRoot, 'changelog'),
      index: path.join(this.docsRoot, 'index')
    };

    // Activity log (in-memory, then saved)
    this.activityLog = [];
    this.lastSaveTime = null;

    // File index for easy searching
    this.fileIndex = {
      lastUpdated: null,
      files: []
    };
  }

  /**
   * START DOCUMENTATION ASSISTANT
   */
  async start() {
    this.logger.info('📝 AI Documentation Assistant starting...');

    // Create documentation structure
    await this.initializeDocumentationStructure();

    // Load existing activity log
    await this.loadActivityLog();

    // Update file index
    await this.updateFileIndex();

    // Generate today's notes file if doesn't exist
    await this.initializeDailyNotes();

    // Auto-save every 5 minutes
    setInterval(() => this.autoSave(), 5 * 60 * 1000);

    // Generate weekly summary every Sunday at 8 PM
    const cron = require('node-cron');
    cron.schedule('0 20 * * 0', () => this.generateWeeklySummary());

    this.logger.info('✅ AI Documentation Assistant ready');
    this.logger.info(`   📂 Documentation: ${this.docsRoot}`);
  }

  /**
   * CREATE DOCUMENTATION FOLDER STRUCTURE
   */
  async initializeDocumentationStructure() {
    for (const [name, dirPath] of Object.entries(this.paths)) {
      try {
        await fs.mkdir(dirPath, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }
    }

    // Create README in docs root
    const readmePath = path.join(this.docsRoot, 'README.md');
    const readmeExists = await fs.access(readmePath).then(() => true).catch(() => false);

    if (!readmeExists) {
      await fs.writeFile(readmePath, this.generateDocsReadme());
    }
  }

  /**
   * LOG ACTIVITY
   * Call this whenever something important happens
   */
  logActivity(category, action, details = {}) {
    const activity = {
      timestamp: new Date().toISOString(),
      category, // 'outreach', 'customer', 'system', 'optimization', 'decision', etc.
      action,   // 'sent_email', 'signed_customer', 'deployed', 'optimized_pricing', etc.
      details,
      date: moment().tz('America/Chicago').format('YYYY-MM-DD'),
      time: moment().tz('America/Chicago').format('HH:mm:ss')
    };

    this.activityLog.push(activity);

    // Also append to today's notes
    this.appendToDailyNotes(activity);

    return activity;
  }

  /**
   * INITIALIZE TODAY'S NOTES FILE
   */
  async initializeDailyNotes() {
    const today = moment().tz('America/Chicago').format('YYYY-MM-DD');
    const notesPath = path.join(this.paths.dailyNotes, `${today}.md`);

    const exists = await fs.access(notesPath).then(() => true).catch(() => false);

    if (!exists) {
      const header = `# Daily Notes - ${moment().tz('America/Chicago').format('MMMM D, YYYY')}

## Summary
*AI-generated summary will appear here at end of day*

## Activities

`;
      await fs.writeFile(notesPath, header);
      this.logger.info(`   📝 Created daily notes: ${today}.md`);
    }
  }

  /**
   * APPEND TO DAILY NOTES
   */
  async appendToDailyNotes(activity) {
    const today = moment().tz('America/Chicago').format('YYYY-MM-DD');
    const notesPath = path.join(this.paths.dailyNotes, `${today}.md`);

    const entry = `\n### ${activity.time} - ${activity.action}\n**Category:** ${activity.category}\n${JSON.stringify(activity.details, null, 2)}\n`;

    try {
      await fs.appendFile(notesPath, entry);
    } catch (error) {
      this.logger.error(`Failed to append to daily notes: ${error.message}`);
    }
  }

  /**
   * AUTO-SAVE ACTIVITY LOG
   */
  async autoSave() {
    if (this.activityLog.length === 0) {
      return;
    }

    const logPath = path.join(this.docsRoot, 'activity-log.json');

    try {
      await fs.writeFile(logPath, JSON.stringify({
        lastSaved: new Date().toISOString(),
        activities: this.activityLog
      }, null, 2));

      this.lastSaveTime = new Date();
    } catch (error) {
      this.logger.error(`Failed to save activity log: ${error.message}`);
    }
  }

  /**
   * LOAD ACTIVITY LOG
   */
  async loadActivityLog() {
    const logPath = path.join(this.docsRoot, 'activity-log.json');

    try {
      const data = await fs.readFile(logPath, 'utf-8');
      const parsed = JSON.parse(data);
      this.activityLog = parsed.activities || [];
      this.logger.info(`   📋 Loaded ${this.activityLog.length} activities from log`);
    } catch (error) {
      // File doesn't exist yet
      this.activityLog = [];
    }
  }

  /**
   * GENERATE AI SUMMARY OF DAY
   */
  async generateDailySummary(date = null) {
    const targetDate = date || moment().tz('America/Chicago').format('YYYY-MM-DD');
    const activities = this.activityLog.filter(a => a.date === targetDate);

    if (activities.length === 0) {
      return 'No activities recorded today.';
    }

    const prompt = `Analyze the following business activities and generate a concise executive summary.

Activities for ${targetDate}:
${JSON.stringify(activities, null, 2)}

Generate a summary that includes:
1. Key accomplishments
2. Important metrics (emails sent, customers, revenue, etc.)
3. Notable decisions or changes
4. Issues or challenges encountered
5. Next steps or recommendations

Keep it concise but informative (3-5 paragraphs).`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5
      });

      const summary = response.choices[0].message.content;

      // Update daily notes with summary
      const notesPath = path.join(this.paths.dailyNotes, `${targetDate}.md`);
      const content = await fs.readFile(notesPath, 'utf-8');
      const updatedContent = content.replace(
        '*AI-generated summary will appear here at end of day*',
        summary
      );
      await fs.writeFile(notesPath, updatedContent);

      return summary;

    } catch (error) {
      this.logger.error(`Failed to generate daily summary: ${error.message}`);
      return 'Summary generation failed.';
    }
  }

  /**
   * GENERATE WEEKLY SUMMARY
   */
  async generateWeeklySummary() {
    this.logger.info('📊 Generating weekly summary...');

    const endDate = moment().tz('America/Chicago');
    const startDate = endDate.clone().subtract(7, 'days');

    const weekActivities = this.activityLog.filter(a => {
      const activityDate = moment(a.date);
      return activityDate.isBetween(startDate, endDate, null, '[]');
    });

    const prompt = `Analyze the following week of business activities and generate a comprehensive weekly summary.

Week: ${startDate.format('MMM D')} - ${endDate.format('MMM D, YYYY')}
Total Activities: ${weekActivities.length}

Activities:
${JSON.stringify(weekActivities, null, 2)}

Generate a summary that includes:
1. Week Overview (high-level accomplishments)
2. Key Metrics (customers acquired, revenue, emails sent, etc.)
3. Major Decisions or Changes
4. Challenges Encountered and Solutions
5. System Performance and Optimizations
6. Customer Insights and Feedback
7. Strategic Recommendations for Next Week

Format as markdown with headers and bullet points.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5
      });

      const summary = response.choices[0].message.content;

      // Save weekly summary
      const fileName = `week-${startDate.format('YYYY-MM-DD')}_to_${endDate.format('YYYY-MM-DD')}.md`;
      const summaryPath = path.join(this.paths.weeklySummaries, fileName);

      await fs.writeFile(summaryPath, `# Weekly Summary\n${startDate.format('MMM D')} - ${endDate.format('MMM D, YYYY')}\n\n${summary}`);

      this.logger.info(`✅ Weekly summary saved: ${fileName}`);

      return summary;

    } catch (error) {
      this.logger.error(`Failed to generate weekly summary: ${error.message}`);
      return null;
    }
  }

  /**
   * DOCUMENT A DECISION
   */
  async documentDecision(decision) {
    const timestamp = moment().tz('America/Chicago').format('YYYY-MM-DD_HH-mm-ss');
    const fileName = `decision-${timestamp}.md`;
    const filePath = path.join(this.paths.decisions, fileName);

    const content = `# Decision: ${decision.title}

**Date:** ${moment().tz('America/Chicago').format('MMMM D, YYYY h:mm A')}
**Category:** ${decision.category || 'General'}

## Context
${decision.context || 'No context provided'}

## Decision
${decision.decision}

## Reasoning
${decision.reasoning || 'No reasoning provided'}

## Expected Impact
${decision.impact || 'To be determined'}

## Alternatives Considered
${decision.alternatives || 'None'}

## Status
${decision.status || 'Implemented'}
`;

    await fs.writeFile(filePath, content);
    this.logger.info(`   📋 Documented decision: ${decision.title}`);

    // Log activity
    this.logActivity('decision', decision.title, {
      category: decision.category,
      status: decision.status
    });

    return filePath;
  }

  /**
   * UPDATE FILE INDEX (for easy searching)
   */
  async updateFileIndex() {
    this.logger.info('   🔍 Updating file index...');

    const files = [];

    // Recursively find all markdown files
    const findMarkdownFiles = async (dir, baseDir = dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await findMarkdownFiles(fullPath, baseDir);
        } else if (entry.name.endsWith('.md')) {
          const relativePath = path.relative(baseDir, fullPath);
          const content = await fs.readFile(fullPath, 'utf-8');
          const firstLine = content.split('\n')[0].replace(/^#\s*/, '');

          files.push({
            path: relativePath,
            fullPath,
            name: entry.name,
            title: firstLine || entry.name,
            size: (await fs.stat(fullPath)).size,
            modified: (await fs.stat(fullPath)).mtime
          });
        }
      }
    };

    await findMarkdownFiles(this.docsRoot);

    this.fileIndex = {
      lastUpdated: new Date().toISOString(),
      totalFiles: files.length,
      files: files.sort((a, b) => b.modified - a.modified)
    };

    // Save index
    const indexPath = path.join(this.paths.index, 'file-index.json');
    await fs.writeFile(indexPath, JSON.stringify(this.fileIndex, null, 2));

    // Generate searchable markdown index
    await this.generateMarkdownIndex();

    this.logger.info(`   ✅ Indexed ${files.length} documentation files`);
  }

  /**
   * GENERATE MARKDOWN INDEX
   */
  async generateMarkdownIndex() {
    const indexPath = path.join(this.docsRoot, 'INDEX.md');

    let content = `# Documentation Index

**Last Updated:** ${moment().tz('America/Chicago').format('MMMM D, YYYY h:mm A')}
**Total Files:** ${this.fileIndex.totalFiles}

---

`;

    // Group by directory
    const byDirectory = {};

    for (const file of this.fileIndex.files) {
      const dir = path.dirname(file.path);
      if (!byDirectory[dir]) {
        byDirectory[dir] = [];
      }
      byDirectory[dir].push(file);
    }

    // Write grouped files
    for (const [dir, files] of Object.entries(byDirectory).sort()) {
      content += `\n## ${dir.replace(/\//g, ' / ')}\n\n`;

      for (const file of files) {
        const modifiedStr = moment(file.modified).tz('America/Chicago').format('MMM D, YYYY');
        content += `- [${file.title}](${file.path}) *(${modifiedStr})*\n`;
      }
    }

    await fs.writeFile(indexPath, content);
  }

  /**
   * GENERATE DOCS README
   */
  generateDocsReadme() {
    return `# 🤖 OatCode Documentation

This directory contains all business documentation automatically generated and organized by the AI Documentation Assistant.

## 📁 Structure

- **daily-notes/** - Daily activity logs with AI summaries
- **weekly-summaries/** - Weekly business performance summaries
- **decisions/** - Major business decisions and their reasoning
- **architecture/** - System architecture and design docs
- **services/** - Individual service documentation
- **processes/** - Business processes and workflows
- **metrics/** - Performance metrics and analytics
- **customer-insights/** - Customer learnings and feedback
- **strategy/** - Strategic planning and roadmaps
- **changelog/** - What changed and why
- **index/** - Searchable file index

## 🔍 Finding Information

1. Check [INDEX.md](INDEX.md) for a complete list of all documentation
2. Browse daily-notes/ for specific date activities
3. Check weekly-summaries/ for high-level overviews
4. Search decisions/ for strategic choices made

## 🤖 AI Assistant

The AI Documentation Assistant automatically:
- Tracks all business activities
- Generates daily and weekly summaries
- Documents major decisions
- Organizes files logically
- Keeps everything searchable and accessible

**Last Updated:** ${moment().tz('America/Chicago').format('MMMM D, YYYY h:mm A')}
`;
  }

  /**
   * SEARCH DOCUMENTATION
   */
  async searchDocs(query) {
    const results = [];

    for (const file of this.fileIndex.files) {
      try {
        const content = await fs.readFile(file.fullPath, 'utf-8');

        if (content.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            file: file.name,
            path: file.path,
            title: file.title,
            matches: this.getMatchingLines(content, query)
          });
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    return results;
  }

  /**
   * GET MATCHING LINES FROM CONTENT
   */
  getMatchingLines(content, query) {
    const lines = content.split('\n');
    const matches = [];

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(query.toLowerCase())) {
        matches.push({
          line: i + 1,
          text: lines[i].trim()
        });
      }
    }

    return matches.slice(0, 5); // Return first 5 matches
  }
}

module.exports = AIDocumentationAssistant;
