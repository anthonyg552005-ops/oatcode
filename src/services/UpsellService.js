const axios = require('axios');
const SendGridService = require('./SendGridService');
const GooglePlacesService = require('./GooglePlacesService');

class UpsellService {
  constructor() {
    this.upsellProducts = {
      premium_tier: {
        id: 'premium_tier',
        name: 'Premium Tier Upgrade',
        price: 100, // $297 - $197 difference
        description: 'Upgrade to Premium: Custom domain + AI visuals',
        features: [
          'Your own .com domain (we purchase and configure)',
          'Runway AI videos',
          'DALL-E 3 custom images',
          'AI-generated logo',
          'Unique brand colors',
          'Priority support'
        ],
        industry_fit: ['all'],
        success_rate: 0.42 // Higher value proposition drives good conversion
      }
    };

    this.sendGridService = new SendGridService();
    this.googlePlacesService = new GooglePlacesService();
  }

  async getUpsellRecommendations(customer) {
    const recommendations = [];

    const industryUpsells = this.getIndustryUpsells(customer.businessType);
    const revenueUpsells = this.getRevenueBasedUpsells(customer);
    const behaviorUpsells = this.getBehaviorBasedUpsells(customer);

    const allRecommendations = [...industryUpsells, ...revenueUpsells, ...behaviorUpsells];

    const scoredRecommendations = this.scoreAndRankUpsells(allRecommendations, customer);
    const topRecommendations = scoredRecommendations.slice(0, 3);

    for (let rec of topRecommendations) {
      const pitch = this.generateUpsellPitch(rec, customer);
      await this.sendGridService.sendEmail(pitch);
    }

    return topRecommendations;
  }

  // ... (other methods remain the same)

  async generateUpsellPitch(recommendation, customer) {
    const product = recommendation.product_details;

    const pitch = {
      subject: `${customer.businessName} - Ready to ${this.getActionWord(recommendation.product)}?`,
      headline: `${product.name} for ${customer.businessName}`,
      personalized_opening: this.getPersonalizedOpening(recommendation, customer),
      value_proposition: this.getValueProposition(recommendation, customer),
      social_proof: this.getSocialProof(recommendation.product, customer.businessType),
      pricing: this.getPricingMessage(product, customer),
      urgency: this.getUpsellUrgency(recommendation),
      call_to_action: `Add ${product.name} Now`,
      guarantee: '30-day money-back guarantee',
      implementation_timeline: recommendation.implementation_time
    };

    return pitch;
  }

  async calculateUpsellRevenue(customers) {
    let totalPotential = 0;
    let breakdown = {};

    for (let customer of customers) {
      const recommendations = await this.getUpsellRecommendations(customer);
      const customerPotential = recommendations.reduce((sum, rec) => {
        return sum + (rec.product_details.price * rec.success_probability);
      }, 0);

      totalPotential += customerPotential;

      recommendations.forEach(rec => {
        if (!breakdown[rec.product]) {
          breakdown[rec.product] = {
            potential_customers: 0,
            total_revenue: 0,
            product_name: rec.product_details.name
          };
        }
        breakdown[rec.product].potential_customers++;
        breakdown[rec.product].total_revenue += rec.product_details.price * rec.success_probability;
      });
    }

    return {
      total_monthly_potential: Math.round(totalPotential),
      total_annual_potential: Math.round(totalPotential * 12),
      breakdown,
      average_per_customer: Math.round(totalPotential / customers.length)
    };
  }

  // ... (other methods remain the same)
}

module.exports = UpsellService;