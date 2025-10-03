/**
 * DATABASE INITIALIZATION
 * Sets up SQLite database with all required tables
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/autonomous-business.sqlite');

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    console.log('🗄️  Initializing database...');
    console.log(`   Path: ${DB_PATH}`);

    // Ensure data directory exists
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('❌ Database connection failed:', err.message);
        reject(err);
        return;
      }

      console.log('✅ Connected to SQLite database');

      // Enable foreign keys
      db.run('PRAGMA foreign_keys = ON');

      // Create tables
      db.serialize(() => {
        // CUSTOMERS TABLE
        db.run(`
          CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            business_name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            phone TEXT,
            tier TEXT NOT NULL CHECK(tier IN ('standard', 'premium')),
            status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'cancelled', 'paused')),

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
            lifetime_value REAL DEFAULT 0.0
          )
        `, (err) => {
          if (err) console.error('Error creating customers table:', err);
          else console.log('   ✓ Customers table ready');
        });

        // LEADS TABLE
        db.run(`
          CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            place_id TEXT UNIQUE,
            business_name TEXT NOT NULL,
            email TEXT,
            phone TEXT,

            -- Business info
            industry TEXT,
            city TEXT,
            state TEXT,
            address TEXT,
            website TEXT,
            rating REAL,
            review_count INTEGER,

            -- Lead status
            status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'contacted', 'demo_sent', 'follow_up', 'converted', 'lost')),
            contacted BOOLEAN DEFAULT 0,
            contacted_at DATETIME,
            demo_sent BOOLEAN DEFAULT 0,
            demo_sent_at DATETIME,

            -- Intelligence
            intelligence_data TEXT, -- JSON blob
            lead_score REAL DEFAULT 0.0,

            -- Metadata
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            converted_to_customer_id INTEGER,

            FOREIGN KEY (converted_to_customer_id) REFERENCES customers(id)
          )
        `, (err) => {
          if (err) console.error('Error creating leads table:', err);
          else console.log('   ✓ Leads table ready');
        });

        // PAYMENTS TABLE
        db.run(`
          CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,

            -- Stripe info
            stripe_payment_id TEXT UNIQUE,
            stripe_invoice_id TEXT,

            -- Payment details
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'USD',
            status TEXT NOT NULL CHECK(status IN ('succeeded', 'pending', 'failed', 'refunded')),

            -- Metadata
            payment_method TEXT,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (customer_id) REFERENCES customers(id)
          )
        `, (err) => {
          if (err) console.error('Error creating payments table:', err);
          else console.log('   ✓ Payments table ready');
        });

        // DEMOS TABLE
        db.run(`
          CREATE TABLE IF NOT EXISTS demos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            demo_id TEXT UNIQUE NOT NULL,
            lead_id INTEGER,
            customer_id INTEGER,

            -- Demo details
            business_name TEXT NOT NULL,
            tier TEXT NOT NULL CHECK(tier IN ('standard', 'premium')),
            demo_url TEXT NOT NULL,
            file_path TEXT,

            -- Tracking
            views INTEGER DEFAULT 0,
            last_viewed_at DATETIME,
            converted BOOLEAN DEFAULT 0,

            -- Metadata
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (lead_id) REFERENCES leads(id),
            FOREIGN KEY (customer_id) REFERENCES customers(id)
          )
        `, (err) => {
          if (err) console.error('Error creating demos table:', err);
          else console.log('   ✓ Demos table ready');
        });

        // EMAILS TABLE
        db.run(`
          CREATE TABLE IF NOT EXISTS emails (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email_id TEXT UNIQUE NOT NULL,
            lead_id INTEGER,
            customer_id INTEGER,

            -- Email details
            to_email TEXT NOT NULL,
            subject TEXT NOT NULL,
            body TEXT,
            email_type TEXT, -- 'outreach', 'demo', 'follow_up', 'onboarding', 'retention'

            -- Tracking
            sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            opened BOOLEAN DEFAULT 0,
            opened_at DATETIME,
            clicked BOOLEAN DEFAULT 0,
            clicked_at DATETIME,
            bounced BOOLEAN DEFAULT 0,
            replied BOOLEAN DEFAULT 0,
            replied_at DATETIME,

            -- SendGrid tracking
            sendgrid_message_id TEXT,

            FOREIGN KEY (lead_id) REFERENCES leads(id),
            FOREIGN KEY (customer_id) REFERENCES customers(id)
          )
        `, (err) => {
          if (err) console.error('Error creating emails table:', err);
          else console.log('   ✓ Emails table ready');
        });

        // DOMAIN_PURCHASES TABLE
        db.run(`
          CREATE TABLE IF NOT EXISTS domain_purchases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,

            -- Domain details
            domain_name TEXT NOT NULL UNIQUE,
            registrar TEXT DEFAULT 'namecheap',
            purchase_price REAL,

            -- Status
            status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'expired', 'cancelled')),
            purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME,

            -- DNS
            dns_configured BOOLEAN DEFAULT 0,
            dns_configured_at DATETIME,

            FOREIGN KEY (customer_id) REFERENCES customers(id)
          )
        `, (err) => {
          if (err) console.error('Error creating domain_purchases table:', err);
          else console.log('   ✓ Domain purchases table ready');
        });

        // CUSTOMIZATION_REQUESTS TABLE
        db.run(`
          CREATE TABLE IF NOT EXISTS customization_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,

            -- Request details
            request_text TEXT NOT NULL,
            request_type TEXT, -- 'change_text', 'change_image', 'add_section', 'general'

            -- AI processing
            processed BOOLEAN DEFAULT 0,
            processed_at DATETIME,
            ai_response TEXT,

            -- Status
            status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),

            -- Metadata
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME,

            FOREIGN KEY (customer_id) REFERENCES customers(id)
          )
        `, (err) => {
          if (err) console.error('Error creating customization_requests table:', err);
          else console.log('   ✓ Customization requests table ready');
        });

        // SYSTEM_METRICS TABLE
        db.run(`
          CREATE TABLE IF NOT EXISTS system_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            metric_name TEXT NOT NULL,
            metric_value REAL NOT NULL,
            metric_date DATE NOT NULL,

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            UNIQUE(metric_name, metric_date)
          )
        `, (err) => {
          if (err) console.error('Error creating system_metrics table:', err);
          else console.log('   ✓ System metrics table ready');
        });

        // Create indexes for performance
        db.run('CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)');
        db.run('CREATE INDEX IF NOT EXISTS idx_customers_tier ON customers(tier)');
        db.run('CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status)');
        db.run('CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)');
        db.run('CREATE INDEX IF NOT EXISTS idx_leads_place_id ON leads(place_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_emails_lead_id ON emails(lead_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_emails_customer_id ON emails(customer_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_demos_lead_id ON demos(lead_id)');

        console.log('   ✓ Indexes created');

        console.log('');
        console.log('✅ Database initialization complete!');
        console.log('');

        db.close((err) => {
          if (err) {
            console.error('Error closing database:', err.message);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  });
}

// Run if called directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('🎉 Database ready for use!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Database initialization failed:', err);
      process.exit(1);
    });
}

module.exports = initializeDatabase;
