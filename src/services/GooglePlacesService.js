/**
 * Google Places Service
 * Find businesses for outreach
 */

const axios = require('axios');
const LowMaintenanceTargetingService = require('./LowMaintenanceTargetingService');

class GooglePlacesService {
  constructor(logger = console) {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY;
    this.enabled = !!this.apiKey;
    this.logger = logger;
    this.lowMaintenanceTargeting = new LowMaintenanceTargetingService(logger);

    if (!this.enabled) {
      console.warn('⚠️  Google Places API key not configured');
    }
  }

  /**
   * Search for businesses by type and location
   * Now filters for LOW-MAINTENANCE businesses only (lawyers, dentists, plumbers, etc.)
   */
  async searchBusinesses(query, location, radius = 50000, filterByMaintenance = true) {
    if (!this.enabled) {
      console.log(`🔍 [SIMULATION] Would search for: ${query} in ${location}`);
      return this.getMockBusinesses(query);
    }

    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
        params: {
          query: `${query} in ${location}`,
          key: this.apiKey,
          radius: radius
        }
      });

      const businesses = response.data.results.map(place => ({
        placeId: place.place_id,
        name: place.name,
        address: place.formatted_address,
        rating: place.rating,
        userRatingsTotal: place.user_ratings_total,
        types: place.types
      }));

      // Filter to only low-maintenance businesses
      if (filterByMaintenance) {
        const filtered = await this.lowMaintenanceTargeting.filterLowMaintenanceBusinesses(businesses);
        this.logger.info(`🎯 Filtered ${businesses.length} businesses → ${filtered.length} low-maintenance targets`);
        return filtered;
      }

      return businesses;

    } catch (error) {
      console.error('Google Places API error:', error.message);
      return [];
    }
  }

  /**
   * Search specifically for low-maintenance business types WITHOUT WEBSITES
   * This is the PRIMARY TARGET - easiest conversions!
   *
   * Strategy:
   * 1. Find low-maintenance businesses (lawyers, dentists, plumbers, etc.)
   * 2. Get their place details to check if they have a website
   * 3. ONLY return businesses WITHOUT websites (they need us most!)
   * 4. These businesses have Google My Business but no website = perfect target
   */
  async searchLowMaintenanceBusinesses(location, phase = 'mvp', radius = 50000) {
    const searchTerms = this.lowMaintenanceTargeting.getSearchTermsForPhase(phase);

    this.logger.info(`🔍 Searching for low-maintenance businesses WITHOUT websites in ${location}`);
    this.logger.info(`   Target types: ${searchTerms.slice(0, 5).join(', ')}... (${searchTerms.length} total)`);

    const allBusinesses = [];

    // Search for each low-maintenance business type
    for (const term of searchTerms) {
      const businesses = await this.searchBusinesses(term, location, radius, false);
      allBusinesses.push(...businesses);

      // Rate limit: wait 200ms between searches
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Remove duplicates by placeId
    const uniqueBusinesses = Array.from(
      new Map(allBusinesses.map(b => [b.placeId, b])).values()
    );

    this.logger.info(`   Found ${uniqueBusinesses.length} total businesses, checking for websites...`);

    // CRITICAL: Get place details to check for websites
    const businessesWithDetails = [];
    for (const business of uniqueBusinesses) {
      const details = await this.getPlaceDetails(business.placeId);

      if (details) {
        businessesWithDetails.push({
          ...business,
          ...details
        });
      }

      // Rate limit: wait 100ms between detail requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Filter to only businesses WITHOUT websites (HIGHEST PRIORITY)
    const noWebsiteBusinesses = businessesWithDetails.filter(b => !b.hasWebsite);

    this.logger.info(`   🎯 ${noWebsiteBusinesses.length} businesses WITHOUT websites (perfect targets!)`);

    // Further filter to only low-maintenance types
    const filtered = await this.lowMaintenanceTargeting.filterLowMaintenanceBusinesses(noWebsiteBusinesses);

    this.logger.info(`✅ Final count: ${filtered.length} low-maintenance businesses WITHOUT websites`);

    return filtered;
  }

  /**
   * Search for businesses WITH existing websites (Phase 2 expansion)
   * Only use this when expanding beyond no-website businesses
   */
  async searchBusinessesWithWebsites(location, phase = 'automation', radius = 50000) {
    const searchTerms = this.lowMaintenanceTargeting.getSearchTermsForPhase(phase);

    this.logger.info(`🔍 Searching for low-maintenance businesses WITH websites in ${location}`);

    const allBusinesses = [];

    for (const term of searchTerms) {
      const businesses = await this.searchBusinesses(term, location, radius, false);
      allBusinesses.push(...businesses);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const uniqueBusinesses = Array.from(
      new Map(allBusinesses.map(b => [b.placeId, b])).values()
    );

    // Get details and filter for businesses WITH websites
    const businessesWithDetails = [];
    for (const business of uniqueBusinesses) {
      const details = await this.getPlaceDetails(business.placeId);

      if (details && details.hasWebsite) {
        businessesWithDetails.push({
          ...business,
          ...details
        });
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const filtered = await this.lowMaintenanceTargeting.filterLowMaintenanceBusinesses(businessesWithDetails);

    this.logger.info(`✅ Found ${filtered.length} low-maintenance businesses WITH websites (upgrade targets)`);

    return filtered;
  }

  /**
   * Get place details
   */
  async getPlaceDetails(placeId) {
    if (!this.enabled) {
      return this.getMockPlaceDetails(placeId);
    }

    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
        params: {
          place_id: placeId,
          fields: 'name,formatted_address,formatted_phone_number,website,opening_hours,rating,reviews',
          key: this.apiKey
        }
      });

      const place = response.data.result;
      return {
        name: place.name,
        address: place.formatted_address,
        phone: place.formatted_phone_number,
        website: place.website,
        rating: place.rating,
        hasWebsite: !!place.website
      };

    } catch (error) {
      console.error('Google Places Details error:', error.message);
      return null;
    }
  }

  /**
   * Mock businesses for simulation mode
   */
  getMockBusinesses(query) {
    return [
      {
        placeId: 'mock-1',
        name: `${query} Business 1`,
        address: '123 Main St, Los Angeles, CA',
        rating: 4.2,
        userRatingsTotal: 45,
        types: ['restaurant', 'food']
      },
      {
        placeId: 'mock-2',
        name: `${query} Business 2`,
        address: '456 Oak Ave, Los Angeles, CA',
        rating: 4.5,
        userRatingsTotal: 78,
        types: ['store', 'point_of_interest']
      }
    ];
  }

  /**
   * Mock place details for simulation mode
   */
  getMockPlaceDetails(placeId) {
    return {
      name: 'Mock Business',
      address: '789 Test St, Los Angeles, CA',
      phone: '(555) 123-4567',
      website: null,
      rating: 4.3,
      hasWebsite: false
    };
  }
}

module.exports = GooglePlacesService;