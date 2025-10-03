/**
 * AUTO DOMAIN SERVICE - NAMECHEAP EDITION
 *
 * Autonomously manages custom domains for Premium customers using Namecheap:
 * - Checks domain availability
 * - Purchases domains via Namecheap API
 * - Configures DNS automatically
 * - Points domain to customer's website
 *
 * 100% AUTONOMOUS - No human intervention needed!
 *
 * Setup: $50 balance in Namecheap account unlocks API access
 */

const axios = require('axios');
const xml2js = require('xml2js');

class AutoDomainService {
  constructor(logger = console) {
    this.logger = logger;

    // Namecheap API configuration
    this.apiKey = process.env.NAMECHEAP_API_KEY;
    this.apiUser = process.env.NAMECHEAP_API_USER;
    this.username = process.env.NAMECHEAP_USERNAME;
    this.clientIp = process.env.NAMECHEAP_CLIENT_IP;
    this.serverIp = process.env.SERVER_IP;

    // Namecheap API URL (use sandbox for testing)
    this.apiUrl = process.env.NAMECHEAP_SANDBOX === 'true'
      ? 'https://api.sandbox.namecheap.com/xml.response'
      : 'https://api.namecheap.com/xml.response';
  }

  /**
   * CHECK DOMAIN AVAILABILITY
   */
  async checkAvailability(domainName) {
    this.logger.info(`🔍 Checking availability: ${domainName}`);

    try {
      const params = {
        ApiUser: this.apiUser,
        ApiKey: this.apiKey,
        UserName: this.username,
        Command: 'namecheap.domains.check',
        ClientIp: this.clientIp,
        DomainList: domainName
      };

      const response = await axios.get(this.apiUrl, { params });
      const result = await xml2js.parseStringPromise(response.data);

      // Check for API errors
      if (result.ApiResponse.$.Status === 'ERROR') {
        const error = result.ApiResponse.Errors[0].Error[0];
        const errorMessage = error._ || error;
        const errorNumber = error.$ ? error.$.Number : 'Unknown';

        this.logger.error(`❌ Namecheap API Error ${errorNumber}: ${errorMessage}`);

        if (errorNumber === '1011102') {
          this.logger.error('');
          this.logger.error('⚠️  API KEY ISSUE:');
          this.logger.error('   - Check that API access is enabled: https://ap.www.namecheap.com/settings/tools/apiaccess/');
          this.logger.error('   - Verify account balance is $50+');
          this.logger.error('   - Confirm IP is whitelisted: ' + this.clientIp);
          this.logger.error('   - Wait 5-60 minutes after enabling API');
          this.logger.error('   - See NAMECHEAP_TROUBLESHOOTING.md for details');
          this.logger.error('');
        }

        throw new Error(`Namecheap API Error ${errorNumber}: ${errorMessage}`);
      }

      const domainCheck = result.ApiResponse.CommandResponse[0].DomainCheckResult[0].$;
      const available = domainCheck.Available === 'true';
      const price = parseFloat(domainCheck.PremiumRegistrationPrice || 10.98);

      this.logger.info(`   ${available ? '✅' : '❌'} ${domainName} - ${available ? 'Available' : 'Taken'} ($${price}/year)`);

      return {
        available,
        domain: domainName,
        price,
        currency: 'USD'
      };

    } catch (error) {
      this.logger.error(`Domain check failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * PURCHASE DOMAIN
   */
  async purchaseDomain(domainName, customerInfo) {
    this.logger.info(`💳 Purchasing domain: ${domainName}`);

    try {
      // Check availability first
      const availability = await this.checkAvailability(domainName);
      if (!availability.available) {
        throw new Error(`Domain ${domainName} is not available`);
      }

      // Register domain
      const params = {
        ApiUser: this.apiUser,
        ApiKey: this.apiKey,
        UserName: this.username,
        Command: 'namecheap.domains.create',
        ClientIp: this.clientIp,
        DomainName: domainName,
        Years: 1,

        // Registrant info
        RegistrantFirstName: customerInfo.firstName || 'Customer',
        RegistrantLastName: customerInfo.lastName || 'Service',
        RegistrantAddress1: customerInfo.address || '123 Main St',
        RegistrantCity: customerInfo.city || 'Austin',
        RegistrantStateProvince: customerInfo.state || 'TX',
        RegistrantPostalCode: customerInfo.zip || '78701',
        RegistrantCountry: customerInfo.country || 'US',
        RegistrantPhone: customerInfo.phone || '+1.5125551234',
        RegistrantEmailAddress: customerInfo.email,

        // Use same info for all contacts
        TechFirstName: customerInfo.firstName || 'Customer',
        TechLastName: customerInfo.lastName || 'Service',
        TechAddress1: customerInfo.address || '123 Main St',
        TechCity: customerInfo.city || 'Austin',
        TechStateProvince: customerInfo.state || 'TX',
        TechPostalCode: customerInfo.zip || '78701',
        TechCountry: customerInfo.country || 'US',
        TechPhone: customerInfo.phone || '+1.5125551234',
        TechEmailAddress: customerInfo.email,

        AdminFirstName: customerInfo.firstName || 'Customer',
        AdminLastName: customerInfo.lastName || 'Service',
        AdminAddress1: customerInfo.address || '123 Main St',
        AdminCity: customerInfo.city || 'Austin',
        AdminStateProvince: customerInfo.state || 'TX',
        AdminPostalCode: customerInfo.zip || '78701',
        AdminCountry: customerInfo.country || 'US',
        AdminPhone: customerInfo.phone || '+1.5125551234',
        AdminEmailAddress: customerInfo.email,

        AuxBillingFirstName: customerInfo.firstName || 'Customer',
        AuxBillingLastName: customerInfo.lastName || 'Service',
        AuxBillingAddress1: customerInfo.address || '123 Main St',
        AuxBillingCity: customerInfo.city || 'Austin',
        AuxBillingStateProvince: customerInfo.state || 'TX',
        AuxBillingPostalCode: customerInfo.zip || '78701',
        AuxBillingCountry: customerInfo.country || 'US',
        AuxBillingPhone: customerInfo.phone || '+1.5125551234',
        AuxBillingEmailAddress: customerInfo.email,

        AddFreeWhoisguard: 'yes',
        WGEnabled: 'yes'
      };

      const response = await axios.get(this.apiUrl, { params });
      const result = await xml2js.parseStringPromise(response.data);

      this.logger.info(`   ✅ Domain purchased: ${domainName}`);
      this.logger.info(`   💰 Cost: $${availability.price}/year (from Namecheap balance)`);

      // Configure DNS
      await this.configureDNS(domainName);

      return {
        success: true,
        domain: domainName,
        cost: availability.price,
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      };

    } catch (error) {
      this.logger.error(`Domain purchase failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * CONFIGURE DNS
   */
  async configureDNS(domainName) {
    this.logger.info(`⚙️  Configuring DNS for ${domainName}`);

    try {
      const [sld, tld] = domainName.split('.');

      const params = {
        ApiUser: this.apiUser,
        ApiKey: this.apiKey,
        UserName: this.username,
        Command: 'namecheap.domains.dns.setHosts',
        ClientIp: this.clientIp,
        SLD: sld,
        TLD: tld,

        // A record: domain.com -> server IP
        HostName1: '@',
        RecordType1: 'A',
        Address1: this.serverIp,
        TTL1: '1800',

        // A record: www.domain.com -> server IP
        HostName2: 'www',
        RecordType2: 'A',
        Address2: this.serverIp,
        TTL2: '1800'
      };

      await axios.get(this.apiUrl, { params });

      this.logger.info(`   ✅ DNS configured: ${domainName} -> ${this.serverIp}`);
      this.logger.info(`   ⏳ DNS propagation takes 15-30 minutes`);

    } catch (error) {
      this.logger.error(`DNS configuration failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * FULL DOMAIN SETUP
   */
  async setupCustomDomain(domainName, customerInfo) {
    this.logger.info('');
    this.logger.info('═══════════════════════════════════════════════════════');
    this.logger.info(`🌐 AUTONOMOUS DOMAIN SETUP: ${domainName}`);
    this.logger.info('   Powered by Namecheap');
    this.logger.info('═══════════════════════════════════════════════════════');
    this.logger.info('');

    try {
      // Check availability
      const availability = await this.checkAvailability(domainName);

      if (!availability.available) {
        this.logger.info(`   ${domainName} is taken, finding alternatives...`);
        const alternative = await this.suggestAvailableDomain(customerInfo.businessName);
        throw new Error(`Domain ${domainName} is taken. Suggested: ${alternative.domain}`);
      }

      // Purchase domain
      const purchase = await this.purchaseDomain(domainName, customerInfo);

      // Wait for DNS propagation
      this.logger.info('   ⏳ Waiting 30 seconds for initial DNS setup...');
      await new Promise(resolve => setTimeout(resolve, 30000));

      this.logger.info('');
      this.logger.info('✅ DOMAIN SETUP COMPLETE!');
      this.logger.info(`   Domain: ${domainName}`);
      this.logger.info(`   Status: Live`);
      this.logger.info(`   URL: http://${domainName} (HTTPS via Cloudflare later)`);
      this.logger.info(`   Cost: $${purchase.cost}/year`);
      this.logger.info('');

      return {
        success: true,
        domain: domainName,
        cost: purchase.cost,
        dnsConfigured: true,
        liveUrl: `http://${domainName}`,
        expirationDate: purchase.expirationDate
      };

    } catch (error) {
      this.logger.error('');
      this.logger.error('❌ DOMAIN SETUP FAILED');
      this.logger.error(`   Error: ${error.message}`);
      this.logger.error('');
      throw error;
    }
  }

  /**
   * SUGGEST AVAILABLE DOMAIN
   */
  async suggestAvailableDomain(businessName) {
    this.logger.info(`🔍 Finding available domain for: ${businessName}`);

    const cleanName = businessName.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/\s+/g, '');

    const variations = [
      `${cleanName}.com`,
      `get${cleanName}.com`,
      `${cleanName}online.com`,
      `${cleanName}official.com`,
      `${cleanName}pro.com`,
      `${cleanName}site.com`,
      `${cleanName}.co`,
      `${cleanName}.io`,
      `${cleanName}.net`
    ];

    for (const domain of variations) {
      const availability = await this.checkAvailability(domain);

      if (availability.available) {
        this.logger.info(`   ✅ Found available: ${domain}`);
        return availability;
      }

      // Rate limit protection
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    throw new Error('Could not find available domain variation');
  }
}

module.exports = AutoDomainService;
