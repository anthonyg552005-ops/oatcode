/**
 * LOW-MAINTENANCE TARGETING SERVICE
 *
 * Focuses ONLY on businesses that need simple, set-and-forget websites.
 * These require minimal updates and support, maximizing AI autonomy.
 *
 * Strategy: Start with easiest businesses, expand to more complex later.
 *
 * LOW-MAINTENANCE (Phase 1 - NOW):
 * - Lawyers, dentists, plumbers, electricians, landscapers
 * - Content rarely changes
 * - No e-commerce
 * - No complex features
 * - Perfect for AI automation
 *
 * MEDIUM-MAINTENANCE (Phase 2 - LATER):
 * - Restaurants (menu updates)
 * - Real estate (listings)
 * - Salons (booking)
 *
 * HIGH-MAINTENANCE (Phase 3 - MUCH LATER):
 * - E-commerce stores
 * - News/blogs
 * - Dynamic content sites
 */

const OpenAI = require('openai');

class LowMaintenanceTargetingService {
  constructor(logger) {
    this.logger = logger;
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Business types ranked by maintenance level
    this.businessTypes = {
      // TIER 1: Ultra Low-Maintenance (START HERE)
      ultraLow: {
        priority: 1,
        maintenanceLevel: 'minimal',
        updateFrequency: 'yearly',
        supportNeeds: 'very low',
        types: [
          {
            name: 'Lawyers / Law Firms',
            searchTerms: ['lawyer', 'attorney', 'law firm', 'legal services'],
            websiteNeeds: ['contact form', 'practice areas', 'team bios', 'testimonials'],
            updateFrequency: 'Almost never (just team changes)',
            perfectFor: 'Set and forget - lawyers keep same site for years',
            pricing: 197, // Premium pricing for professionals
            churnRisk: 'very low'
          },
          {
            name: 'Dentists / Dental Clinics',
            searchTerms: ['dentist', 'dental clinic', 'orthodontist'],
            websiteNeeds: ['services list', 'contact form', 'hours', 'insurance info'],
            updateFrequency: 'Rarely (maybe new services)',
            perfectFor: 'Static content, no inventory, no bookings needed',
            pricing: 197,
            churnRisk: 'very low'
          },
          {
            name: 'Plumbers',
            searchTerms: ['plumber', 'plumbing services', 'emergency plumber'],
            websiteNeeds: ['services', 'contact', 'service area', 'emergency number'],
            updateFrequency: 'Never',
            perfectFor: 'Simple site, just needs to rank in Google',
            pricing: 147, // Lower price point for trades
            churnRisk: 'low'
          },
          {
            name: 'Electricians',
            searchTerms: ['electrician', 'electrical services', 'electrical contractor'],
            websiteNeeds: ['services', 'contact', 'licensing info', 'service area'],
            updateFrequency: 'Never',
            perfectFor: 'Set and forget - electricians not tech-savvy',
            pricing: 147,
            churnRisk: 'low'
          },
          {
            name: 'HVAC Services',
            searchTerms: ['hvac', 'air conditioning', 'heating repair', 'ac repair'],
            websiteNeeds: ['services', 'contact', 'emergency service', 'service area'],
            updateFrequency: 'Never',
            perfectFor: 'Seasonal business, site stays same year-round',
            pricing: 147,
            churnRisk: 'low'
          },
          {
            name: 'Landscapers',
            searchTerms: ['landscaping', 'lawn care', 'landscaper'],
            websiteNeeds: ['services', 'before/after gallery', 'contact', 'service area'],
            updateFrequency: 'Minimal (update gallery once/year)',
            perfectFor: 'Simple showcase site, rarely needs updates',
            pricing: 127,
            churnRisk: 'low'
          },
          {
            name: 'Roofing Companies',
            searchTerms: ['roofer', 'roofing company', 'roof repair'],
            websiteNeeds: ['services', 'materials', 'warranty info', 'contact'],
            updateFrequency: 'Never',
            perfectFor: 'Static content, just needs leads',
            pricing: 147,
            churnRisk: 'low'
          },
          {
            name: 'Insurance Agents',
            searchTerms: ['insurance agent', 'insurance agency'],
            websiteNeeds: ['insurance types', 'contact', 'quote form', 'about'],
            updateFrequency: 'Rarely',
            perfectFor: 'Professional site that stays constant',
            pricing: 197,
            churnRisk: 'very low'
          },
          {
            name: 'Accountants / CPAs',
            searchTerms: ['accountant', 'cpa', 'tax services', 'bookkeeping'],
            websiteNeeds: ['services', 'contact', 'credentials', 'client portal link'],
            updateFrequency: 'Almost never',
            perfectFor: 'Professional service, minimal changes',
            pricing: 197,
            churnRisk: 'very low'
          },
          {
            name: 'Chiropractors',
            searchTerms: ['chiropractor', 'chiropractic'],
            websiteNeeds: ['services', 'contact', 'new patient forms', 'insurance'],
            updateFrequency: 'Rarely',
            perfectFor: 'Medical practice, stable content',
            pricing: 197,
            churnRisk: 'very low'
          }
        ]
      },

      // TIER 2: Low-Maintenance (EXPAND LATER)
      low: {
        priority: 2,
        maintenanceLevel: 'low',
        updateFrequency: 'monthly',
        supportNeeds: 'low',
        types: [
          {
            name: 'Auto Repair Shops',
            searchTerms: ['auto repair', 'car repair', 'mechanic'],
            websiteNeeds: ['services', 'contact', 'hours', 'testimonials'],
            updateFrequency: 'Minimal (maybe add services)',
            pricing: 147,
            churnRisk: 'low'
          },
          {
            name: 'Pet Groomers',
            searchTerms: ['pet grooming', 'dog grooming'],
            websiteNeeds: ['services', 'pricing', 'contact', 'gallery'],
            updateFrequency: 'Quarterly (update gallery)',
            pricing: 127,
            churnRisk: 'medium'
          },
          {
            name: 'Cleaning Services',
            searchTerms: ['cleaning service', 'house cleaning', 'maid service'],
            websiteNeeds: ['services', 'pricing', 'contact', 'service area'],
            updateFrequency: 'Rarely',
            pricing: 127,
            churnRisk: 'medium'
          }
        ]
      },

      // TIER 3: Medium-Maintenance (FUTURE)
      medium: {
        priority: 3,
        maintenanceLevel: 'medium',
        updateFrequency: 'weekly',
        supportNeeds: 'medium',
        types: [
          {
            name: 'Restaurants',
            searchTerms: ['restaurant'],
            websiteNeeds: ['menu', 'hours', 'contact', 'reservations'],
            updateFrequency: 'Monthly (menu changes)',
            pricing: 197,
            churnRisk: 'medium',
            note: 'Skip for now - menus change too often'
          },
          {
            name: 'Real Estate Agents',
            searchTerms: ['real estate agent', 'realtor'],
            websiteNeeds: ['listings', 'contact', 'about', 'search'],
            updateFrequency: 'Weekly (new listings)',
            pricing: 247,
            churnRisk: 'high',
            note: 'Skip for now - requires MLS integration'
          },
          {
            name: 'Salons / Barbershops',
            searchTerms: ['salon', 'hair salon', 'barbershop'],
            websiteNeeds: ['services', 'pricing', 'booking', 'gallery'],
            updateFrequency: 'Monthly (promotions)',
            pricing: 147,
            churnRisk: 'medium',
            note: 'Could work if they handle booking externally'
          }
        ]
      },

      // TIER 4: High-Maintenance (AVOID FOR NOW)
      high: {
        priority: 4,
        maintenanceLevel: 'high',
        updateFrequency: 'daily',
        supportNeeds: 'high',
        types: [
          {
            name: 'E-commerce Stores',
            note: 'AVOID - Too much inventory management',
            churnRisk: 'very high'
          },
          {
            name: 'News Sites / Blogs',
            note: 'AVOID - Daily content updates required',
            churnRisk: 'very high'
          },
          {
            name: 'Event Venues',
            note: 'AVOID - Constantly changing schedules',
            churnRisk: 'high'
          }
        ]
      }
    };
  }

  /**
   * Get current target businesses based on phase
   */
  getCurrentTargets(phase = 'mvp') {
    // Start with ultra-low maintenance only
    if (phase === 'mvp' || phase === 'automation') {
      return this.businessTypes.ultraLow.types;
    }

    // Expand to low-maintenance in scale phase
    if (phase === 'scale') {
      return [
        ...this.businessTypes.ultraLow.types,
        ...this.businessTypes.low.types
      ];
    }

    // Add medium-maintenance only in international phase (proven systems)
    if (phase === 'international') {
      return [
        ...this.businessTypes.ultraLow.types,
        ...this.businessTypes.low.types,
        ...this.businessTypes.medium.types.filter(t => !t.note?.includes('AVOID'))
      ];
    }

    return this.businessTypes.ultraLow.types;
  }

  /**
   * Analyze if a business is low-maintenance using AI
   */
  async analyzeMaintenanceLevel(businessType, industry) {
    const prompt = `Analyze if this business needs a low-maintenance or high-maintenance website.

Business Type: ${businessType}
Industry: ${industry}

Low-Maintenance Indicators:
- Static content (rarely changes)
- No inventory/products to manage
- No complex booking systems
- No daily updates needed
- Professional services
- Simple contact/info site

High-Maintenance Indicators:
- E-commerce (inventory)
- Daily content updates
- Complex booking/scheduling
- Frequent menu/listing changes
- Social media integration needs

Return JSON:
{
  "maintenanceLevel": "ultra-low/low/medium/high",
  "reasoning": "Why this classification",
  "updateFrequency": "How often updates needed",
  "recommendation": "good-fit/maybe/avoid",
  "concerns": ["any maintenance concerns"]
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      this.logger.error(`AI analysis failed: ${error.message}`);
      return { maintenanceLevel: 'unknown', recommendation: 'maybe' };
    }
  }

  /**
   * Filter businesses to only low-maintenance ones
   */
  async filterLowMaintenanceBusinesses(businesses) {
    const filtered = [];

    for (const business of businesses) {
      // Quick check: Is this business type in our ultra-low list?
      const isUltraLow = this.businessTypes.ultraLow.types.some(type =>
        type.searchTerms.some(term =>
          business.types?.some(bt => bt.toLowerCase().includes(term))
        )
      );

      if (isUltraLow) {
        filtered.push({
          ...business,
          maintenanceLevel: 'ultra-low',
          recommended: true
        });
      } else {
        // Use AI to analyze if not in our list
        const analysis = await this.analyzeMaintenanceLevel(
          business.name,
          business.types?.join(', ')
        );

        if (analysis.recommendation === 'good-fit') {
          filtered.push({
            ...business,
            maintenanceLevel: analysis.maintenanceLevel,
            maintenanceReasoning: analysis.reasoning,
            recommended: true
          });
        }
      }
    }

    return filtered;
  }

  /**
   * Get recommended search terms for current phase
   */
  getSearchTermsForPhase(phase = 'mvp') {
    const targets = this.getCurrentTargets(phase);
    const allTerms = [];

    targets.forEach(type => {
      allTerms.push(...type.searchTerms);
    });

    return [...new Set(allTerms)]; // Remove duplicates
  }

  /**
   * Get pricing recommendation based on business type
   */
  getPricingForBusinessType(businessType) {
    // Check all tiers
    for (const tier of Object.values(this.businessTypes)) {
      const match = tier.types?.find(t =>
        t.searchTerms?.some(term =>
          businessType.toLowerCase().includes(term)
        )
      );

      if (match) {
        return {
          monthlyPrice: match.pricing,
          tier: tier.maintenanceLevel,
          churnRisk: match.churnRisk
        };
      }
    }

    // Default
    return { monthlyPrice: 147, tier: 'unknown', churnRisk: 'medium' };
  }

  /**
   * Explain why we're focusing on low-maintenance
   */
  getStrategyExplanation() {
    return {
      strategy: 'Low-Maintenance First',
      reasoning: [
        'Set and forget - minimal support needed',
        'AI can handle everything autonomously',
        'Low churn - professionals keep sites for years',
        'High margins - simple to deliver, premium pricing',
        'Proven model - these businesses need sites but hate tech',
        'Scalable - can serve 100s without increasing workload'
      ],
      progression: {
        phase1: 'Ultra-low maintenance only (lawyers, dentists, plumbers)',
        phase2: 'Add low maintenance (auto repair, pet groomers)',
        phase3: 'Add medium maintenance ONLY when systems proven',
        never: 'E-commerce, news sites, daily-update businesses'
      },
      targetCustomerProfile: {
        ideal: 'Local professional service with stable business',
        needs: 'Simple website to get found on Google',
        budget: '$150-200/month is nothing to them',
        techLevel: 'Low - they just want it to work',
        updateNeeds: 'Yearly at most, usually never',
        supportNeeds: 'Minimal - site just works'
      }
    };
  }
}

module.exports = LowMaintenanceTargetingService;
