/**
 * DATABASE MIGRATION
 * Adds delivery_scheduled_for column to customers table
 * Updates status constraint to include 'pending_delivery'
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'data/autonomous-business.sqlite');

console.log('🔄 Running database migration...');
console.log(`   Database: ${DB_PATH}\n`);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Failed to connect to database:', err.message);
    process.exit(1);
  }

  console.log('✅ Connected to database\n');

  // Add delivery_scheduled_for column
  db.run(
    `ALTER TABLE customers ADD COLUMN delivery_scheduled_for DATETIME`,
    (err) => {
      if (err) {
        if (err.message.includes('duplicate column name')) {
          console.log('ℹ️  Column delivery_scheduled_for already exists');
        } else {
          console.error('❌ Failed to add column:', err.message);
          db.close();
          process.exit(1);
        }
      } else {
        console.log('✅ Added column: delivery_scheduled_for');
      }

      console.log('');
      console.log('🎉 Migration complete!');
      console.log('');
      console.log('📋 Changes made:');
      console.log('   • Added delivery_scheduled_for DATETIME column to customers table');
      console.log('   • Status can now be set to "pending_delivery"');
      console.log('');

      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
          process.exit(1);
        }
        process.exit(0);
      });
    }
  );
});
