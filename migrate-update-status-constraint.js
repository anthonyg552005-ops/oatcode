/**
 * DATABASE MIGRATION
 * Updates customers table status constraint to allow 'pending_delivery'
 * SQLite requires recreating the table to modify CHECK constraints
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

  db.serialize(() => {
    // Step 1: Create new table with updated constraint
    console.log('1️⃣  Creating new customers table with updated status constraint...');
    db.run(`
      CREATE TABLE customers_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT,
        tier TEXT NOT NULL CHECK(tier IN ('standard', 'premium')),
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'cancelled', 'paused', 'pending_delivery')),

        -- Website info
        website_url TEXT,
        custom_domain TEXT,
        demo_url TEXT,

        -- Billing
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        monthly_price REAL NOT NULL,
        billing_cycle_day INTEGER,

        -- Business details
        industry TEXT,
        city TEXT,
        state TEXT,
        address TEXT,

        -- Metadata
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_contact_at DATETIME,
        next_checkin_at DATETIME,

        -- Retention tracking
        satisfaction_score REAL DEFAULT 5.0,
        churn_risk REAL DEFAULT 0.0,
        lifetime_value REAL DEFAULT 0.0,

        -- Delivery scheduling
        delivery_scheduled_for DATETIME
      )
    `, (err) => {
      if (err) {
        console.error('❌ Failed to create new table:', err.message);
        db.close();
        process.exit(1);
      }
      console.log('   ✅ New table created\n');

      // Step 2: Copy data from old table
      console.log('2️⃣  Copying data from old table...');
      db.run(`
        INSERT INTO customers_new
        SELECT * FROM customers
      `, (err) => {
        if (err) {
          console.error('❌ Failed to copy data:', err.message);
          db.close();
          process.exit(1);
        }
        console.log('   ✅ Data copied\n');

        // Step 3: Drop old table
        console.log('3️⃣  Dropping old table...');
        db.run('DROP TABLE customers', (err) => {
          if (err) {
            console.error('❌ Failed to drop old table:', err.message);
            db.close();
            process.exit(1);
          }
          console.log('   ✅ Old table dropped\n');

          // Step 4: Rename new table
          console.log('4️⃣  Renaming new table...');
          db.run('ALTER TABLE customers_new RENAME TO customers', (err) => {
            if (err) {
              console.error('❌ Failed to rename table:', err.message);
              db.close();
              process.exit(1);
            }
            console.log('   ✅ Table renamed\n');

            // Step 5: Recreate indexes
            console.log('5️⃣  Recreating indexes...');
            db.run('CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)');
            db.run('CREATE INDEX IF NOT EXISTS idx_customers_tier ON customers(tier)');
            db.run('CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status)', (err) => {
              if (err) {
                console.error('❌ Failed to create indexes:', err.message);
                db.close();
                process.exit(1);
              }
              console.log('   ✅ Indexes created\n');

              console.log('🎉 Migration complete!');
              console.log('');
              console.log('📋 Changes made:');
              console.log('   • Updated status constraint to allow: active, cancelled, paused, pending_delivery');
              console.log('   • Added delivery_scheduled_for column');
              console.log('   • Preserved all existing data');
              console.log('');

              db.close((err) => {
                if (err) {
                  console.error('Error closing database:', err.message);
                  process.exit(1);
                }
                process.exit(0);
              });
            });
          });
        });
      });
    });
  });
});
