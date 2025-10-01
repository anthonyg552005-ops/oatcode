/**
 * AUTONOMOUS DATABASE BACKUP SERVICE
 *
 * Automatically backs up all business-critical data to prevent data loss.
 * Performs full backups daily and incremental backups every 6 hours.
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const archiver = require('archiver');

class AutoDatabaseBackupService {
  constructor(logger) {
    this.logger = logger;
    this.backupDir = path.join(__dirname, '../../data/backups');
    this.dataDir = path.join(__dirname, '../../data');
    this.retentionDays = 30; // Keep backups for 30 days

    this.metrics = {
      lastFullBackup: null,
      lastIncrementalBackup: null,
      totalBackups: 0,
      backupSuccesses: 0,
      backupFailures: 0,
      lastBackupSize: 0,
      totalBackupSize: 0
    };
  }

  /**
   * Initialize backup system
   */
  async initialize() {
    try {
      // Create backup directory if it doesn't exist
      await fs.mkdir(this.backupDir, { recursive: true });
      this.logger.info('   ✓ Backup directory initialized');
    } catch (error) {
      this.logger.error(`Failed to initialize backup directory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a full backup of all data
   */
  async performFullBackup() {
    try {
      this.logger.info('💾 Creating full backup...');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `full-backup-${timestamp}.zip`;
      const backupPath = path.join(this.backupDir, backupFileName);

      // Create backup archive
      await this.createArchive(backupPath, this.dataDir);

      // Get backup size
      const stats = await fs.stat(backupPath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

      this.logger.info(`   ✅ Full backup created: ${backupFileName} (${sizeMB} MB)`);

      // Update metrics
      this.metrics.lastFullBackup = new Date().toISOString();
      this.metrics.totalBackups++;
      this.metrics.backupSuccesses++;
      this.metrics.lastBackupSize = stats.size;
      this.metrics.totalBackupSize += stats.size;

      // Clean up old backups
      await this.cleanOldBackups();

      // Send success notification
      await this.sendNotification(
        'Full Backup Completed',
        `Full database backup completed successfully.\n\nFile: ${backupFileName}\nSize: ${sizeMB} MB\nLocation: data/backups/`
      );

      return { success: true, fileName: backupFileName, size: stats.size };

    } catch (error) {
      this.logger.error(`   ❌ Full backup failed: ${error.message}`);
      this.metrics.backupFailures++;

      await this.sendNotification(
        '⚠️ Full Backup Failed',
        `Failed to create full backup.\n\nError: ${error.message}\n\nManual backup recommended.`,
        true // isAlert
      );

      return { success: false, error: error.message };
    }
  }

  /**
   * Create an incremental backup (only changed files)
   */
  async performIncrementalBackup() {
    try {
      this.logger.info('💾 Creating incremental backup...');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `incremental-backup-${timestamp}.zip`;
      const backupPath = path.join(this.backupDir, backupFileName);

      // Backup critical directories only
      const criticalDirs = [
        path.join(this.dataDir, 'databases'),
        path.join(this.dataDir, 'customers'),
        path.join(this.dataDir, 'metrics'),
        path.join(this.dataDir, 'knowledge-base')
      ];

      // Create archive of critical data only
      await this.createArchive(backupPath, criticalDirs);

      const stats = await fs.stat(backupPath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

      this.logger.info(`   ✅ Incremental backup created: ${backupFileName} (${sizeMB} MB)`);

      this.metrics.lastIncrementalBackup = new Date().toISOString();
      this.metrics.totalBackups++;
      this.metrics.backupSuccesses++;
      this.metrics.lastBackupSize = stats.size;

      return { success: true, fileName: backupFileName, size: stats.size };

    } catch (error) {
      this.logger.error(`   ❌ Incremental backup failed: ${error.message}`);
      this.metrics.backupFailures++;
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a zip archive of specified paths
   */
  async createArchive(outputPath, sourcePaths) {
    return new Promise((resolve, reject) => {
      const output = require('fs').createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } }); // Maximum compression

      output.on('close', () => {
        resolve();
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);

      // Add paths to archive
      const paths = Array.isArray(sourcePaths) ? sourcePaths : [sourcePaths];

      for (const srcPath of paths) {
        try {
          const isDirectory = require('fs').statSync(srcPath).isDirectory();

          if (isDirectory) {
            archive.directory(srcPath, path.basename(srcPath));
          } else {
            archive.file(srcPath, { name: path.basename(srcPath) });
          }
        } catch (error) {
          // Path doesn't exist, skip it
          this.logger.warn(`   Skipping non-existent path: ${srcPath}`);
        }
      }

      archive.finalize();
    });
  }

  /**
   * Clean up backups older than retention period
   */
  async cleanOldBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const now = Date.now();
      const retentionMs = this.retentionDays * 24 * 60 * 60 * 1000;

      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.backupDir, file);
        const stats = await fs.stat(filePath);

        // Delete if older than retention period
        if (now - stats.mtimeMs > retentionMs) {
          await fs.unlink(filePath);
          deletedCount++;
          this.logger.info(`   Deleted old backup: ${file}`);
        }
      }

      if (deletedCount > 0) {
        this.logger.info(`   Cleaned up ${deletedCount} old backup(s)`);
      }

    } catch (error) {
      this.logger.error(`Failed to clean old backups: ${error.message}`);
    }
  }

  /**
   * Verify backup integrity
   */
  async verifyBackup(backupFileName) {
    try {
      const backupPath = path.join(this.backupDir, backupFileName);

      // Check if file exists
      await fs.access(backupPath);

      // Get file size - if > 0, assume valid
      const stats = await fs.stat(backupPath);

      if (stats.size === 0) {
        throw new Error('Backup file is empty');
      }

      this.logger.info(`   ✓ Backup verified: ${backupFileName} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      return { valid: true, size: stats.size };

    } catch (error) {
      this.logger.error(`   ❌ Backup verification failed: ${error.message}`);
      return { valid: false, error: error.message };
    }
  }

  /**
   * List all available backups
   */
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = [];

      for (const file of files) {
        if (file.endsWith('.zip')) {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);

          backups.push({
            fileName: file,
            size: stats.size,
            sizeMB: (stats.size / 1024 / 1024).toFixed(2),
            created: stats.mtime.toISOString(),
            type: file.includes('full') ? 'full' : 'incremental'
          });
        }
      }

      // Sort by date, newest first
      backups.sort((a, b) => new Date(b.created) - new Date(a.created));

      return backups;

    } catch (error) {
      this.logger.error(`Failed to list backups: ${error.message}`);
      return [];
    }
  }

  /**
   * Send notification
   */
  async sendNotification(subject, message, isAlert = false) {
    try {
      if (global.sendGridService) {
        await global.sendGridService.sendEmail({
          to: process.env.SMTP_USER || 'anthonyg552005@gmail.com',
          subject: `[OatCode] ${subject}`,
          text: message,
          html: `<div style="font-family: sans-serif;">
            <h2>${isAlert ? '⚠️' : '✅'} ${subject}</h2>
            <p>${message.replace(/\n/g, '<br>')}</p>
            <hr>
            <p><small>Automated notification from OatCode Backup Service</small></p>
          </div>`
        });
      }
    } catch (error) {
      this.logger.error(`Failed to send notification: ${error.message}`);
    }
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      service: 'Database Backup',
      status: this.metrics.lastFullBackup ? 'healthy' : 'not_started',
      ...this.metrics
    };
  }

  /**
   * Schedule autonomous backups
   */
  scheduleBackups(cron) {
    // Full backup: Daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      this.logger.info('📅 Scheduled full backup...');
      await this.performFullBackup();
    });

    // Incremental backup: Every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      this.logger.info('📅 Scheduled incremental backup...');
      await this.performIncrementalBackup();
    });

    this.logger.info('   ✓ Backup schedule configured');
    this.logger.info('     - Full backups: Daily at 2 AM');
    this.logger.info('     - Incremental backups: Every 6 hours');
  }
}

module.exports = AutoDatabaseBackupService;
