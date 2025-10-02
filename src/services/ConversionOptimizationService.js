/**
 * CONVERSION OPTIMIZATION SERVICE
 *
 * A/B tests landing pages, emails, and pricing to maximize conversion rates
 */

class ConversionOptimizationService {
  constructor(logger) {
    this.logger = logger;
    this.experiments = [];
    this.results = [];
  }

  /**
   * Create new A/B test experiment
   */
  async createExperiment(name, variants) {
    const experiment = {
      id: Date.now(),
      name,
      variants,
      results: {},
      createdAt: new Date()
    };

    this.experiments.push(experiment);

    if (this.logger) {
      this.logger.info(`Created A/B test: ${name} with ${variants.length} variants`);
    }

    return experiment;
  }

  /**
   * Record conversion event
   */
  recordConversion(experimentId, variantId, converted) {
    const experiment = this.experiments.find(e => e.id === experimentId);

    if (!experiment) {
      return;
    }

    if (!experiment.results[variantId]) {
      experiment.results[variantId] = {
        views: 0,
        conversions: 0
      };
    }

    experiment.results[variantId].views++;

    if (converted) {
      experiment.results[variantId].conversions++;
    }
  }

  /**
   * Get winning variant
   */
  getWinningVariant(experimentId) {
    const experiment = this.experiments.find(e => e.id === experimentId);

    if (!experiment) {
      return null;
    }

    let winner = null;
    let maxConversionRate = 0;

    Object.keys(experiment.results).forEach(variantId => {
      const { views, conversions } = experiment.results[variantId];
      const conversionRate = views > 0 ? conversions / views : 0;

      if (conversionRate > maxConversionRate) {
        maxConversionRate = conversionRate;
        winner = variantId;
      }
    });

    return {
      variantId: winner,
      conversionRate: maxConversionRate
    };
  }

  /**
   * Get all experiment results
   */
  getResults() {
    return this.experiments.map(exp => ({
      id: exp.id,
      name: exp.name,
      results: exp.results,
      winner: this.getWinningVariant(exp.id)
    }));
  }
}

module.exports = ConversionOptimizationService;
