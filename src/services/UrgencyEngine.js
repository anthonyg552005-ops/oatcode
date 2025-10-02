const axios = require('axios');
const sendGrid = require('@sendgrid/mail');

class UrgencyEngine {
  constructor() {
    this.urgencyTactics = {
      time_based: true,
      inventory_based: true,
      social_proof_based: true,
      seasonal_based: true
    };
    this.sendGridAPIKey = process.env.SENDGRID_API_KEY;
    sendGrid.setApiKey(this.sendGridAPIKey);
  }

  /**
   * Generate dynamic urgency messaging
   */
  async generateUrgencyMessage(business, context = {}) {
    const urgencyTypes = [
      this.generateTimeBasedUrgency(),
      this.generateCapacityBasedUrgency(),
      this.generateSeasonalUrgency(),
      this.generateCompetitorBasedUrgency(business),
      this.generateSocialProofUrgency()
    ];

    // Select best urgency based on context
    const selectedUrgency = this.selectBestUrgency(urgencyTypes, context);

    const urgencyMessage = {
      ...selectedUrgency,
      personalized_message: this.personalizeUrgency(selectedUrgency, business),
      countdown_timer: this.generateCountdownTimer(selectedUrgency),
      visual_elements: this.getUrgencyVisuals(selectedUrgency)
    };

    // Send urgency message via SendGrid
    await this.sendUrgencyEmail(business, urgencyMessage);

    return urgencyMessage;
  }

  /**
   * Send urgency message via SendGrid
   */
  async sendUrgencyEmail(business, urgencyMessage) {
    const email = {
      to: business.email,
      from: 'noreply@yourbusiness.com',
      subject: 'Limited Time Offer',
      text: urgencyMessage.personalized_message,
      html: `<strong>${urgencyMessage.personalized_message}</strong>`
    };

    await sendGrid.send(email);
  }

  /**
   * Competitor-based urgency
   */
  async generateCompetitorBasedUrgency(business) {
    // Fetch competitors using Google Places API
    const competitors = await axios.get(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${business.location.lat},${business.location.lng}&radius=5000&keyword=${business.businessType}&key=${process.env.GOOGLE_PLACES_API_KEY}`);
    const competitorCount = competitors.data.results.length;

    const competitorMessages = [
      {
        message: `While You Wait, ${competitorCount} Competitors Just Got New Websites This Week`,
        subtext: `Don't let them steal your customers`,
        urgency_level: 'high',
        call_to_action: 'Beat Your Competition'
      },
      {
        message: `${business.city} Businesses Are Going Digital Fast`,
        subtext: `Join the ${competitorCount} who increased revenue with professional websites`,
        urgency_level: 'medium',
        call_to_action: 'Stay Competitive'
      },
      {
        message: `Your Customers Are Already Searching Online`,
        subtext: `Make sure they find YOU, not your competition`,
        urgency_level: 'high',
        call_to_action: 'Capture Those Searches'
      }
    ];

    return this.selectRandomOffer(competitorMessages);
  }

  // ... rest of the code remains the same
}

module.exports = UrgencyEngine;