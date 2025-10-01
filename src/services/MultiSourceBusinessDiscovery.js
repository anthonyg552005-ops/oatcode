/**
 * MULTI-SOURCE BUSINESS DISCOVERY SERVICE
 *
 * Find businesses WITHOUT websites using CREATIVE methods:
 * - Google My Business (online but no website)
 * - Yelp listings (reviews but no website link)
 * - Yellow Pages (phone directory listings)
 * - Local business directories
 * - Social media profiles without website links
 * - Business license registrations
 * - Chamber of Commerce listings
 * - Industry associations
 * - LinkedIn company pages without websites
 * - Local news mentions
 * - Court records (lawyers without sites)
 * - Professional licensing boards
 *
 * STRATEGY: Cast a WIDE NET, gather ANY info we can find,
 * use AI to craft hyper-personalized outreach.
 */

const OpenAI = require('openai');
const axios = require('axios');

class MultiSourceBusinessDiscovery {
  constructor(logger) {
    this.logger = logger;
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    this.sources = {
      googlePlaces: { enabled: !!process.env.GOOGLE_PLACES_API_KEY, priority: 1 },
      yelp: { enabled: !!process.env.YELP_API_KEY, priority: 2 },
      yellowPages: { enabled: true, priority: 3 }, // Web scraping
      linkedin: { enabled: true, priority: 4 },
      socialMedia: { enabled: true, priority: 5 },
      publicRecords: { enabled: true, priority: 6 }
    };
  }

  /**
   * MAIN DISCOVERY METHOD
   * Find businesses without websites using ALL available sources
   */
  async findBusinessesWithoutWebsites(location, businessType, count = 50) {
    this.logger.info(`🔍 Multi-source discovery: Finding ${businessType} businesses without websites in ${location}`);
    this.logger.info(`   Using ${Object.keys(this.sources).length} different data sources...`);

    const allBusinesses = [];

    // Source 1: Google Places (we already have this)
    const googleBusinesses = await this.searchGooglePlaces(location, businessType);
    allBusinesses.push(...googleBusinesses);
    this.logger.info(`   ✓ Google Places: ${googleBusinesses.length} found`);

    // Source 2: Yelp API (if available)
    if (this.sources.yelp.enabled) {
      const yelpBusinesses = await this.searchYelp(location, businessType);
      allBusinesses.push(...yelpBusinesses);
      this.logger.info(`   ✓ Yelp: ${yelpBusinesses.length} found`);
    }

    // Source 3: Yellow Pages scraping
    const yellowPagesBusinesses = await this.searchYellowPages(location, businessType);
    allBusinesses.push(...yellowPagesBusinesses);
    this.logger.info(`   ✓ Yellow Pages: ${yellowPagesBusinesses.length} found`);

    // Source 4: LinkedIn company search
    const linkedinBusinesses = await this.searchLinkedIn(location, businessType);
    allBusinesses.push(...linkedinBusinesses);
    this.logger.info(`   ✓ LinkedIn: ${linkedinBusinesses.length} found`);

    // Source 5: Social media profiles
    const socialBusinesses = await this.searchSocialMedia(location, businessType);
    allBusinesses.push(...socialBusinesses);
    this.logger.info(`   ✓ Social Media: ${socialBusinesses.length} found`);

    // Remove duplicates (by name + location)
    const uniqueBusinesses = this.deduplicateBusinesses(allBusinesses);

    this.logger.info(`   📊 Total unique businesses: ${uniqueBusinesses.length}`);
    this.logger.info(`   🎯 Filtering to businesses WITHOUT websites...`);

    // Filter to only businesses without websites
    const noWebsiteBusinesses = uniqueBusinesses.filter(b => !b.hasWebsite);

    this.logger.info(`   ✅ ${noWebsiteBusinesses.length} businesses WITHOUT websites (perfect targets!)`);

    return noWebsiteBusinesses.slice(0, count);
  }

  /**
   * Search Google Places
   */
  async searchGooglePlaces(location, businessType) {
    // This integrates with existing GooglePlacesService
    // Returns businesses from Google My Business
    return []; // Handled by GooglePlacesService
  }

  /**
   * Search Yelp API
   * Yelp has businesses with reviews but often no website link
   */
  async searchYelp(location, businessType) {
    if (!process.env.YELP_API_KEY) {
      return [];
    }

    try {
      const response = await axios.get('https://api.yelp.com/v3/businesses/search', {
        headers: {
          'Authorization': `Bearer ${process.env.YELP_API_KEY}`
        },
        params: {
          term: businessType,
          location: location,
          limit: 50
        }
      });

      return response.data.businesses
        .filter(b => !b.url || !b.url.includes('http')) // No website URL
        .map(b => ({
          name: b.name,
          phone: b.phone,
          address: b.location.display_address.join(', '),
          rating: b.rating,
          reviewCount: b.review_count,
          hasWebsite: false,
          source: 'yelp',
          categories: b.categories.map(c => c.title),
          additionalInfo: {
            yelpUrl: b.url,
            yelpRating: b.rating,
            yelpReviews: b.review_count
          }
        }));

    } catch (error) {
      this.logger.error(`Yelp search error: ${error.message}`);
      return [];
    }
  }

  /**
   * Search Yellow Pages
   * Old-school directory, many businesses listed without websites
   */
  async searchYellowPages(location, businessType) {
    // Use AI to search Yellow Pages via web scraping or their API
    // Yellow Pages has TONS of businesses without websites

    this.logger.info(`   Searching Yellow Pages for ${businessType} in ${location}...`);

    // TODO: Implement Yellow Pages scraping
    // For now, return empty array
    return [];
  }

  /**
   * Search LinkedIn
   * Company pages often exist without website links
   */
  async searchLinkedIn(location, businessType) {
    // LinkedIn has company pages for businesses
    // Many small businesses have LinkedIn but no website

    this.logger.info(`   Searching LinkedIn companies: ${businessType} in ${location}...`);

    // Use AI to search LinkedIn via scraping or API
    // TODO: Implement LinkedIn company search
    return [];
  }

  /**
   * Search Social Media (Facebook, Instagram)
   * Many businesses have Facebook pages but no website
   */
  async searchSocialMedia(location, businessType) {
    this.logger.info(`   Searching social media for ${businessType} in ${location}...`);

    // Strategy:
    // 1. Search Facebook for business pages in location
    // 2. Check if they have website link
    // 3. If no website, add to list

    // TODO: Implement Facebook Business search
    return [];
  }

  /**
   * Deduplicate businesses from multiple sources
   */
  deduplicateBusinesses(businesses) {
    const seen = new Map();

    for (const business of businesses) {
      // Create unique key from name + location
      const key = `${business.name.toLowerCase().trim()}-${business.address?.toLowerCase().trim()}`;

      if (!seen.has(key)) {
        seen.set(key, business);
      } else {
        // Merge data from multiple sources
        const existing = seen.get(key);
        seen.set(key, {
          ...existing,
          ...business,
          sources: [...(existing.sources || [existing.source]), business.source],
          additionalInfo: {
            ...existing.additionalInfo,
            ...business.additionalInfo
          }
        });
      }
    }

    return Array.from(seen.values());
  }

  /**
   * GATHER INTELLIGENCE ON BUSINESS
   * Use AI to research business online and gather ANY info for personalization
   */
  async gatherBusinessIntelligence(business) {
    this.logger.info(`🔬 Gathering intelligence on: ${business.name}`);

    const intelligence = {
      business: business.name,
      basicInfo: {
        name: business.name,
        address: business.address,
        phone: business.phone,
        type: business.categories || business.types,
        hasWebsite: business.hasWebsite
      },
      onlinePresence: {},
      personalizedInsights: [],
      emailHooks: []
    };

    // Use AI to search for business online and gather info
    const prompt = `You are a business intelligence researcher. Find ANY information about this business online that could be used for personalized outreach.

Business: ${business.name}
Location: ${business.address}
Type: ${business.categories || business.types}

Search for:
1. Google Reviews mentions (what customers say)
2. Yelp reviews (common complaints or praises)
3. Social media presence (Facebook, Instagram, LinkedIn)
4. News mentions (local press, awards, events)
5. Business owner name (if mentioned anywhere)
6. Years in business
7. Competitors in area
8. Industry trends affecting them
9. Community involvement
10. Unique selling points mentioned online

Return JSON:
{
  "ownerName": "name if found",
  "yearsInBusiness": "X years" or "unknown",
  "onlinePresence": ["Google My Business", "Yelp", "Facebook"],
  "reviews": {
    "average": 4.5,
    "commonPraises": ["great service", "friendly"],
    "commonComplaints": ["hard to find online"]
  },
  "uniqueInsights": ["Award winner 2023", "Family owned"],
  "emailHooks": [
    "I noticed you have great reviews on Yelp (4.5 stars!)",
    "Saw you're family-owned and serving the community for 15 years",
    "Your customers love your service but mentioned it's hard to find you online"
  ]
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        
      });

      const insights = JSON.parse(response.choices[0].message.content);

      intelligence.onlinePresence = insights.onlinePresence || [];
      intelligence.personalizedInsights = insights.uniqueInsights || [];
      intelligence.emailHooks = insights.emailHooks || [];
      intelligence.reviews = insights.reviews;
      intelligence.ownerName = insights.ownerName;
      intelligence.yearsInBusiness = insights.yearsInBusiness;

      this.logger.info(`   ✅ Found ${intelligence.emailHooks.length} personalization hooks`);

      return intelligence;

    } catch (error) {
      this.logger.error(`Intelligence gathering failed: ${error.message}`);
      return intelligence;
    }
  }

  /**
   * CREATIVE LEAD SOURCES
   * Brainstorm and implement creative ways to find businesses
   */
  async getCreativeLeadSources(location, businessType) {
    const creativeSources = [
      {
        name: 'Local Chamber of Commerce',
        method: 'Scrape member directory',
        potential: 'High - many members lack websites'
      },
      {
        name: 'Professional Licensing Boards',
        method: 'State licensing databases (lawyers, doctors, contractors)',
        potential: 'Very High - public records, many without sites'
      },
      {
        name: 'Court Records',
        method: 'Lawyer/attorney listings in court filings',
        potential: 'High - solo practitioners often have no website'
      },
      {
        name: 'Industry Associations',
        method: 'Member directories (bar association, dental association, etc.)',
        potential: 'High - comprehensive lists'
      },
      {
        name: 'Local News Archives',
        method: 'Business mentions in local news without website links',
        potential: 'Medium - shows active businesses'
      },
      {
        name: 'BBB Directory',
        method: 'Better Business Bureau accredited businesses',
        potential: 'High - credible businesses'
      },
      {
        name: 'Craigslist Services',
        method: 'Local services section (plumbers, electricians posting)',
        potential: 'Very High - direct leads, often no website'
      },
      {
        name: 'Nextdoor Recommendations',
        method: 'Community recommendations for local services',
        potential: 'High - trusted by neighbors'
      },
      {
        name: 'Google Maps without websites',
        method: 'Filter Google Maps businesses missing website field',
        potential: 'Very High - already validated by Google'
      },
      {
        name: 'Phone Directory APIs',
        method: 'Whitepages, Yellow Pages bulk data',
        potential: 'Extremely High - millions of businesses'
      }
    ];

    this.logger.info('💡 Creative Lead Sources Available:');
    creativeSources.forEach(source => {
      this.logger.info(`   - ${source.name}: ${source.potential}`);
    });

    return creativeSources;
  }
}

module.exports = MultiSourceBusinessDiscovery;
