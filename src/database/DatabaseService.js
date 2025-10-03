/**
 * DATABASE SERVICE
 * Provides easy access to SQLite database with promise-based API
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/autonomous-business.sqlite');

class DatabaseService {
  constructor() {
    this.db = null;
  }

  /**
   * Connect to database
   */
  connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          reject(err);
        } else {
          this.db.run('PRAGMA foreign_keys = ON');
          resolve();
        }
      });
    });
  }

  /**
   * Run a query (INSERT, UPDATE, DELETE)
   */
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  /**
   * Get a single row
   */
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  /**
   * Get all rows
   */
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  /**
   * CUSTOMER METHODS
   */

  async createCustomer(data) {
    const sql = `
      INSERT INTO customers (
        business_name, email, phone, tier, status,
        website_url, custom_domain, demo_url,
        stripe_customer_id, stripe_subscription_id, monthly_price,
        industry, city, state, address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      data.businessName,
      data.email,
      data.phone || null,
      data.tier,
      data.status || 'active',
      data.websiteUrl || null,
      data.customDomain || null,
      data.demoUrl || null,
      data.stripeCustomerId || null,
      data.stripeSubscriptionId || null,
      data.monthlyPrice,
      data.industry || null,
      data.city || null,
      data.state || null,
      data.address || null
    ];

    const result = await this.run(sql, params);
    return this.getCustomer(result.lastID);
  }

  async getCustomer(id) {
    return this.get('SELECT * FROM customers WHERE id = ?', [id]);
  }

  async getCustomerByEmail(email) {
    return this.get('SELECT * FROM customers WHERE email = ?', [email]);
  }

  async getAllCustomers(status = null) {
    if (status) {
      return this.all('SELECT * FROM customers WHERE status = ? ORDER BY created_at DESC', [status]);
    }
    return this.all('SELECT * FROM customers ORDER BY created_at DESC');
  }

  async updateCustomer(id, data) {
    const updates = [];
    const params = [];

    Object.keys(data).forEach(key => {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      updates.push(`${dbKey} = ?`);
      params.push(data[key]);
    });

    params.push(id);

    const sql = `UPDATE customers SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    await this.run(sql, params);
    return this.getCustomer(id);
  }

  async upsertCustomer(data) {
    // Check if customer exists by email
    const existing = await this.getCustomerByEmail(data.email);

    if (existing) {
      // Update existing customer
      console.log(`   Updating existing customer: ${data.email} (ID: ${existing.id})`);
      return this.updateCustomer(existing.id, data);
    } else {
      // Create new customer
      return this.createCustomer(data);
    }
  }

  /**
   * LEAD METHODS
   */

  async createLead(data) {
    const sql = `
      INSERT INTO leads (
        place_id, business_name, email, phone,
        industry, city, state, address, website,
        rating, review_count, status, lead_score, intelligence_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      data.placeId,
      data.businessName || data.name,
      data.email || null,
      data.phone || null,
      data.industry || null,
      data.city || null,
      data.state || null,
      data.address || null,
      data.website || null,
      data.rating || null,
      data.reviewCount || 0,
      data.status || 'new',
      data.leadScore || 0,
      data.intelligenceData ? JSON.stringify(data.intelligenceData) : null
    ];

    try {
      const result = await this.run(sql, params);
      return this.getLead(result.lastID);
    } catch (err) {
      // If duplicate place_id, return existing
      if (err.message.includes('UNIQUE constraint failed')) {
        return this.getLeadByPlaceId(data.placeId);
      }
      throw err;
    }
  }

  async getLead(id) {
    return this.get('SELECT * FROM leads WHERE id = ?', [id]);
  }

  async getLeadByPlaceId(placeId) {
    return this.get('SELECT * FROM leads WHERE place_id = ?', [placeId]);
  }

  async getUncontactedLeads(limit = 10) {
    return this.all('SELECT * FROM leads WHERE contacted = 0 ORDER BY lead_score DESC LIMIT ?', [limit]);
  }

  async updateLead(id, data) {
    const updates = [];
    const params = [];

    Object.keys(data).forEach(key => {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      updates.push(`${dbKey} = ?`);
      params.push(data[key]);
    });

    params.push(id);

    const sql = `UPDATE leads SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    await this.run(sql, params);
    return this.getLead(id);
  }

  /**
   * PAYMENT METHODS
   */

  async createPayment(data) {
    const sql = `
      INSERT INTO payments (
        customer_id, stripe_payment_id, stripe_invoice_id,
        amount, currency, status, payment_method, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      data.customerId,
      data.stripePaymentId || null,
      data.stripeInvoiceId || null,
      data.amount,
      data.currency || 'USD',
      data.status || 'succeeded',
      data.paymentMethod || null,
      data.description || null
    ];

    const result = await this.run(sql, params);
    return result.lastID;
  }

  async getPaymentsByCustomer(customerId) {
    return this.all('SELECT * FROM payments WHERE customer_id = ? ORDER BY created_at DESC', [customerId]);
  }

  /**
   * DEMO METHODS
   */

  async createDemo(data) {
    const sql = `
      INSERT INTO demos (
        demo_id, lead_id, customer_id, business_name, tier, demo_url, file_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      data.demoId,
      data.leadId || null,
      data.customerId || null,
      data.businessName,
      data.tier,
      data.demoUrl,
      data.filePath || null
    ];

    const result = await this.run(sql, params);
    return result.lastID;
  }

  async getDemo(demoId) {
    return this.get('SELECT * FROM demos WHERE demo_id = ?', [demoId]);
  }

  async trackDemoView(demoId) {
    await this.run(
      'UPDATE demos SET views = views + 1, last_viewed_at = CURRENT_TIMESTAMP WHERE demo_id = ?',
      [demoId]
    );
  }

  /**
   * EMAIL METHODS
   */

  async createEmail(data) {
    const sql = `
      INSERT INTO emails (
        email_id, lead_id, customer_id, to_email, subject, body,
        email_type, sendgrid_message_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      data.emailId,
      data.leadId || null,
      data.customerId || null,
      data.toEmail,
      data.subject,
      data.body || null,
      data.emailType || 'outreach',
      data.sendgridMessageId || null
    ];

    const result = await this.run(sql, params);
    return result.lastID;
  }

  async trackEmailOpened(emailId) {
    await this.run(
      'UPDATE emails SET opened = 1, opened_at = CURRENT_TIMESTAMP WHERE email_id = ?',
      [emailId]
    );
  }

  async trackEmailClicked(emailId) {
    await this.run(
      'UPDATE emails SET clicked = 1, clicked_at = CURRENT_TIMESTAMP WHERE email_id = ?',
      [emailId]
    );
  }

  /**
   * DOMAIN PURCHASE METHODS
   */

  async createDomainPurchase(data) {
    const sql = `
      INSERT INTO domain_purchases (
        customer_id, domain_name, registrar, purchase_price,
        status, expires_at, dns_configured, dns_configured_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      data.customerId,
      data.domainName,
      data.registrar || 'namecheap',
      data.purchasePrice || 0,
      data.status || 'active',
      data.expiresAt || null,
      data.dnsConfigured ? 1 : 0,
      data.dnsConfiguredAt || null
    ];

    const result = await this.run(sql, params);
    return result.lastID;
  }

  /**
   * METRICS METHODS
   */

  async recordMetric(name, value, date = null) {
    const sql = `
      INSERT OR REPLACE INTO system_metrics (metric_name, metric_value, metric_date)
      VALUES (?, ?, ?)
    `;

    const metricDate = date || new Date().toISOString().split('T')[0];
    await this.run(sql, [name, value, metricDate]);
  }

  async getMetrics(name, days = 30) {
    const sql = `
      SELECT * FROM system_metrics
      WHERE metric_name = ?
      AND metric_date >= date('now', '-' || ? || ' days')
      ORDER BY metric_date DESC
    `;

    return this.all(sql, [name, days]);
  }

  /**
   * STATS METHODS
   */

  async getStats() {
    const [customers, leads, revenue, demos] = await Promise.all([
      this.get('SELECT COUNT(*) as count FROM customers'),
      this.get('SELECT COUNT(*) as count FROM leads'),
      this.get('SELECT SUM(amount) as total FROM payments WHERE status = "succeeded"'),
      this.get('SELECT COUNT(*) as count FROM demos')
    ]);

    return {
      totalCustomers: customers.count,
      totalLeads: leads.count,
      totalRevenue: revenue.total || 0,
      totalDemos: demos.count
    };
  }

  /**
   * Close database connection
   */
  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// Export singleton instance
const db = new DatabaseService();
module.exports = db;
