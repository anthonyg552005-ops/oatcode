class WebsiteSellingService {
  constructor() {
    this.scoringRules = {
      business_quality: {
        rating_excellent: { condition: 'rating >= 4.5', points: 25 },
        rating_good: { condition: 'rating >= 4.0', points: 15 },
        rating_average: { condition: 'rating >= 3.5', points: 5 },
        many_reviews: { condition: 'reviewCount >= 100', points: 20 },
        some_reviews: { condition: 'reviewCount >= 20', points: 10 },
        established: { condition: 'yearsInBusiness >= 3', points: 15 }
      },
      digital_presence: {
        no_website: { condition: '!hasWebsite', points: 40 },
        poor_website: { condition: 'websiteQuality === "poor"', points: 30 },
        outdated_website: { condition: 'websiteAge >= 5', points: 25 },
        no_mobile: { condition: '!mobileOptimized', points: 20 },
        no_ssl: { condition: '!hasSSL', points: 15 }
      },
      market_indicators: {
        high_competition: { condition: 'competitorCount >= 10', points: 15 },
        growing_area: { condition: 'areaGrowthRate >= 5', points: 20 },
        affluent_area: { condition: 'medianIncome >= 60000', points: 10 },
        business_district: { condition: 'isBusinessDistrict', points: 15 }
      },
      engagement_potential: {
        responsive_hours: { condition: 'hasBusinessHours', points: 10 },
        active_social: { condition: 'hasSocialMedia', points: 10 },
        recent_reviews: { condition: 'latestReview <= 30days', points: 15 },
        responds_to_reviews: { condition: 'respondsToReviews', points: 20 }
      }
    };

    this.industryMultipliers = {
      restaurant: 1.2,
      auto_repair: 1.1,
      dental_clinic: 1.3,
      law_firm: 1.4,
      real_estate: 1.1,
      beauty_salon: 1.0,
      fitness_center: 0.9,
      retail: 0.8
    };
  }

  calculateWebsiteScore(business) {
    let totalScore = 0;
    const scoringDetails = {};

    for (const [category, rules] of Object.entries(this.scoringRules)) {
      let categoryScore = 0;
      scoringDetails[category] = {};

      for (const [ruleName, rule] of Object.entries(rules)) {
        if (this.evaluateCondition(rule.condition, business)) {
          categoryScore += rule.points;
          scoringDetails[category][ruleName] = rule.points;
        }
      }

      totalScore += categoryScore;
    }

    const industryMultiplier = this.industryMultipliers[business.businessType] || 1.0;
    totalScore = Math.round(totalScore * industryMultiplier);

    const priority = this.calculatePriority(totalScore);

    return {
      score: Math.min(totalScore, 100),
      priority,
      industryMultiplier,
      scoringDetails,
      recommendations: this.generateRecommendations(business, totalScore)
    };
  }

  evaluateCondition(condition, business) {
    try {
      const conditions = {
        'rating >= 4.5': business.rating >= 4.5,
        'rating >= 4.0': business.rating >= 4.0,
        'rating >= 3.5': business.rating >= 3.5,
        'reviewCount >= 100': business.reviewCount >= 100,
        'reviewCount >= 20': business.reviewCount >= 20,
        '!hasWebsite': !business.hasWebsite,
        'websiteQuality === "poor"': business.websiteQuality === 'poor',
        'hasBusinessHours': business.businessHours && Object.keys(business.businessHours).length > 0
      };

      return conditions[condition] || false;
    } catch (error) {
      return false;
    }
  }

  calculatePriority(score) {
    if (score >= 80) return 'hot';
    if (score >= 60) return 'warm';
    if (score >= 40) return 'qualified';
    if (score >= 20) return 'cold';
    return 'unqualified';
  }

  generateRecommendations(business, score) {
    const recommendations = [];

    if (score >= 80) {
      recommendations.push({
        type: 'immediate_action',
        message: 'HIGH PRIORITY: Contact immediately with premium offer',
        action: 'call_immediately',
        urgency: 'high'
      });
    }

    if (!business.hasWebsite) {
      recommendations.push({
        type: 'opportunity',
        message: 'No website detected - prime candidate for our service',
        action: 'demo_website',
        urgency: 'medium'
      });
    }

    if (business.rating >= 4.5) {
      recommendations.push({
        type: 'approach',
        message: 'Use social proof and testimonials - they care about reputation',
        action: 'social_proof_campaign',
        urgency: 'low'
      });
    }

    if (business.reviewCount < 20) {
      recommendations.push({
        type: 'value_prop',
        message: 'Emphasize review generation and local SEO benefits',
        action: 'review_generation_pitch',
        urgency: 'medium'
      });
    }

    return recommendations;
  }

  segmentLeads(businesses) {
    const segments = {
      hot_prospects: [],
      warm_leads: [],
      qualified_leads: [],
      nurture_leads: [],
      unqualified: []
    };

    businesses.forEach(business => {
      const scoring = this.calculateWebsiteScore(business);
      const leadData = { ...business, scoring };

      switch (scoring.priority) {
        case 'hot':
          segments.hot_prospects.push(leadData);
          break;
        case 'warm':
          segments.warm_leads.push(leadData);
          break;
        case 'qualified':
          segments.qualified_leads.push(leadData);
          break;
        case 'cold':
          segments.nurture_leads.push(leadData);
          break;
        default:
          segments.unqualified.push(leadData);
      }
    });

    return segments;
  }

  generateCampaignStrategy(business, score) {
    const strategies = {
      hot: {
        approach: 'direct_call',
        timeline: 'immediate',
        template: 'premium_offer',
        follow_up_frequency: 'daily',
        max_attempts: 10,
        offer_type: 'full_service',
        urgency_level: 'high'
      },
      warm: {
        approach: 'email_then_call',
        timeline: '24_hours',
        template: 'value_proposition',
        follow_up_frequency: 'every_2_days',
        max_attempts: 7,
        offer_type: 'demo_focused',
        urgency_level: 'medium'
      },
      qualified: {
        approach: 'email_sequence',
        timeline: '3_days',
        template: 'educational',
        follow_up_frequency: 'weekly',
        max_attempts: 5,
        offer_type: 'standard',
        urgency_level: 'low'
      },
      cold: {
        approach: 'nurture_sequence',
        timeline: '1_week',
        template: 'awareness',
        follow_up_frequency: 'bi_weekly',
        max_attempts: 3,
        offer_type: 'basic',
        urgency_level: 'very_low'
      }
    };

    const priority = this.calculatePriority(score);
    return strategies[priority] || strategies.cold;
  }
}

module.exports = WebsiteSellingService;