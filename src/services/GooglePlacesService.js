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
   * Search specifically for low-maintenance business types
   * Uses targeting service to get recommended search terms
   */
  async searchLowMaintenanceBusinesses(location, phase = 'mvp', radius = 50000) {
    const searchTerms = this.lowMaintenanceTargeting.getSearchTermsForPhase(phase);

    this.logger.info(`🔍 Searching for low-maintenance businesses in ${location}`);
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

    // Filter to only low-maintenance
    const filtered = await this.lowMaintenanceTargeting.filterLowMaintenanceBusinesses(uniqueBusinesses);

    this.logger.info(`✅ Found ${filtered.length} low-maintenance businesses in ${location}`);

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