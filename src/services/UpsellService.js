const axios = require('axios');
const SendGridService = require('./SendGridService');
const GooglePlacesService = require('./GooglePlacesService');

class UpsellService {
  constructor() {
    this.upsellProducts = {
      custom_domain: {
        id: 'custom_domain',
        name: 'Premium Custom Domain',
        price: 47,
        description: 'Professional yourname.com address (instead of subdomain)',
        features: ['Custom domain setup', 'Professional email', 'SSL certificate'],
        industry_fit: ['all'],
        success_rate: 0.68
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