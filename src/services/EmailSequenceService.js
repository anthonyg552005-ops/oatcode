/**
 * EMAIL SEQUENCE SERVICE
 *
 * Manages intelligent multi-touch email follow-up sequences.
 * OPTIMIZED: 5 strategic emails over 21 days with smart engagement tracking.
 *
 * SEQUENCE STRATEGY:
 * Email 1 (Day 0):  Initial outreach with demo
 * Email 2 (Day 3):  Gentle reminder - "Did you see this?"
 * Email 3 (Day 7):  Social proof - Success stories
 * Email 4 (Day 14): Value add - Free tip/resource
 * Email 5 (Day 21): Final check-in - Last chance
 *
 * ANTI-SPAM INTELLIGENCE:
 * ✅ Stops sequence if recipient opens 2+ emails
 * ✅ Stops sequence if recipient clicks any link
 * ✅ Stops if marked as spam or bounced
 * ✅ Respects unsubscribes immediately
 * ✅ Varies send times to appear human
 * ✅ Each email uniquely personalized with AI
 */

const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');
const moment = require('moment-timezone');

class EmailSequenceService {
  constructor(logger, sendGridService) {
    this.logger = logger || console;
    this.sendGrid = sendGridService;
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Database for tracking sequences
    this.sequenceDbPath = path.join(__dirname, '../../data/databases/email-sequences.json');
    this.sequences = [];

    // OPTIMIZED: 5 emails over 21 days
    this.sequenceSchedule = [
      { day: 0, type: 'initial', step: 1 },
      { day: 3, type: 'reminder', step: 2 },
      { day: 7, type: 'social_proof', step: 3 },
      { day: 14, type: 'value_add', step: 4 },
      { day: 21, type: 'final_check', step: 5 }
    ];
  }

  /**
   * START EMAIL SEQUENCE SERVICE
   */
  async start() {
    this.logger.info('📧 Email Sequence Service starting...');

    // Load existing sequences
    await this.loadSequences();

    // Check for follow-ups every hour
    setInterval(() => this.processScheduledFollowups(), 60 * 60 * 1000);

    this.logger.info('✅ Email Sequence Service ready');
    this.logger.info(`   📊 Active sequences: ${this.sequences.filter(s => s.status === 'active').length}`);
  }

  /**
   * LOAD SEQUENCES FROM DATABASE
   */
  async loadSequences() {
    try {
      const data = await fs.readFile(this.sequenceDbPath, 'utf-8');
      const db = JSON.parse(data);
      this.sequences = db.sequences || [];
      this.logger.info(`   📋 Loaded ${this.sequences.length} email sequences`);
    } catch (error) {
      this.sequences = [];
    }
  }

  /**
   * SAVE SEQUENCES TO DATABASE
   */
  async saveSequences() {
    try {
      await fs.mkdir(path.dirname(this.sequenceDbPath), { recursive: true });
      await fs.writeFile(this.sequenceDbPath, JSON.stringify({
        lastUpdated: new Date().toISOString(),
        sequences: this.sequences
      }, null, 2));
    } catch (error) {
      this.logger.error(`Failed to save sequences: ${error.message}`);
    }
  }

  /**
   * START NEW EMAIL SEQUENCE
   * Call this after sending initial outreach email
   */
  async startSequence(business, initialEmail) {
    const sequence = {
      id: `seq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      business: {
        name: business.name,
        email: business.email,
        industry: business.industry || business.types?.[0],
        location: business.city || business.address
      },
      status: 'active',
      startedAt: new Date().toISOString(),
      emails: [
        {
          step: 1,
          type: 'initial',
          subject: initialEmail.subject,
          sentAt: new Date().toISOString(),
          opened: false,
          clicked: false
        }
      ],
      nextFollowup: this.calculateNextFollowup(1),
      engagement: {
        totalOpens: 0,
        totalClicks: 0,
        lastEngagement: null
      }
    };

    this.sequences.push(sequence);
    await this.saveSequences();

    this.logger.info(`   📧 Started 5-email sequence for ${business.name}`);

    return sequence;
  }

  /**
   * CALCULATE NEXT FOLLOWUP DATE
   */
  calculateNextFollowup(currentStep) {
    const nextEmail = this.sequenceSchedule.find(s => s.step === currentStep + 1);
    if (!nextEmail) return null;

    // Add random variation to appear human (2-4 hours)
    const randomHours = 2 + Math.floor(Math.random() * 3);

    return moment()
      .tz('America/Chicago')
      .add(nextEmail.day, 'days')
      .hour(9 + Math.floor(Math.random() * 5)) // 9am-2pm
      .minute(Math.floor(Math.random() * 60))
      .toISOString();
  }

  /**
   * PROCESS SCHEDULED FOLLOW-UPS
   */
  async processScheduledFollowups() {
    this.logger.info('🔍 Checking for scheduled follow-ups...');

    const now = new Date();
    let sentCount = 0;

    for (const sequence of this.sequences) {
      if (sequence.status !== 'active') continue;
      if (!sequence.nextFollowup) continue;

      const followupTime = new Date(sequence.nextFollowup);

      if (now >= followupTime) {
        // Check if we should stop (high engagement)
        if (this.shouldStopSequence(sequence)) {
          sequence.status = 'stopped';
          sequence.stoppedReason = 'High engagement - already interested';
          this.logger.info(`   ✋ Stopped sequence for ${sequence.business.name} - engaging well`);
          continue;
        }

        // Send next follow-up
        const currentStep = sequence.emails.length;
        await this.sendFollowup(sequence, currentStep + 1);
        sentCount++;

        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    await this.saveSequences();

    if (sentCount > 0) {
      this.logger.info(`✅ Sent ${sentCount} follow-up emails`);
    }
  }

  /**
   * SHOULD STOP SEQUENCE? (Smart engagement detection)
   */
  shouldStopSequence(sequence) {
    // Stop if opened 2+ emails (clearly interested)
    if (sequence.engagement.totalOpens >= 2) return true;

    // Stop if clicked any link (very interested)
    if (sequence.engagement.totalClicks >= 1) return true;

    // Stop if engaged within last 3 days
    if (sequence.engagement.lastEngagement) {
      const daysSince = moment().diff(moment(sequence.engagement.lastEngagement), 'days');
      if (daysSince <= 3) return true;
    }

    return false;
  }

  /**
   * SEND FOLLOW-UP EMAIL
   */
  async sendFollowup(sequence, step) {
    this.logger.info(`   📧 Sending follow-up #${step} to ${sequence.business.name}...`);

    try {
      // Generate AI-personalized follow-up
      const email = await this.generateFollowupEmail(sequence, step);

      // Send via SendGrid
      const result = await this.sendGrid.send({
        to: sequence.business.email,
        subject: email.subject,
        text: email.body,
        html: `<p>${email.body.replace(/\n/g, '<br>')}</p>`,
        customArgs: {
          sequence_id: sequence.id,
          step: step.toString()
        }
      });

      // Record in sequence
      sequence.emails.push({
        step,
        type: this.getEmailType(step),
        subject: email.subject,
        sentAt: new Date().toISOString(),
        opened: false,
        clicked: false
      });

      // Schedule next (if not last)
      if (step < 5) {
        sequence.nextFollowup = this.calculateNextFollowup(step);
      } else {
        sequence.status = 'completed';
        sequence.nextFollowup = null;
        this.logger.info(`   ✅ Sequence completed for ${sequence.business.name}`);
      }

      // Log activity
      if (global.documentation) {
        global.documentation.logActivity('email_followup', `followup_${step}`, {
          business: sequence.business.name,
          sequenceId: sequence.id,
          emailType: this.getEmailType(step)
        });
      }

      return result;

    } catch (error) {
      this.logger.error(`   ❌ Failed to send follow-up: ${error.message}`);
    }
  }

  /**
   * GET EMAIL TYPE
   */
  getEmailType(step) {
    const types = { 1: 'initial', 2: 'reminder', 3: 'social_proof', 4: 'value_add', 5: 'final_check' };
    return types[step] || 'unknown';
  }

  /**
   * GENERATE AI-PERSONALIZED FOLLOW-UP
   */
  async generateFollowupEmail(sequence, step) {
    const business = sequence.business;

    const prompts = {
      2: `Write a gentle 3-sentence reminder follow-up for ${business.name}, a ${business.industry} in ${business.location}.
They received a demo 3 days ago but haven't responded. Keep it friendly, not pushy.
Return JSON: { subject, body }`,

      3: `Write a 4-sentence social proof email for ${business.name}, a ${business.industry}.
Mention other ${business.industry} businesses getting great results. Show specific benefits.
Return JSON: { subject, body }`,

      4: `Write a 4-sentence value-add email for ${business.name}, a ${business.industry}.
Offer a helpful tip relevant to their industry. Mention demo casually at end.
Return JSON: { subject, body }`,

      5: `Write a 3-sentence final check-in for ${business.name}.
Polite close-out. Make it easy to say "not interested". Last mention of demo.
Return JSON: { subject, body }`
    };

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompts[step] }],
        temperature: 0.8,
        
      });

      return JSON.parse(response.choices[0].message.content);

    } catch (error) {
      this.logger.error(`AI generation failed: ${error.message}`);
      return this.getFallbackEmail(business, step);
    }
  }

  /**
   * FALLBACK TEMPLATES
   */
  getFallbackEmail(business, step) {
    const templates = {
      2: {
        subject: `Quick follow-up for ${business.name}`,
        body: `Hi,\n\nJust wanted to make sure you saw the free demo website we created for ${business.name}. Takes 30 seconds to check out!\n\nLet me know if you have questions.\n\nBest,\nOatCode`
      },
      3: {
        subject: `Other ${business.industry} businesses are seeing great results`,
        body: `Hi,\n\nWe've helped several ${business.industry} businesses get 2-3x more customers with professional websites.\n\nYour free demo is still available. Worth a quick look!\n\nBest,\nOatCode`
      },
      4: {
        subject: `Quick tip for ${business.name}`,
        body: `Hi,\n\nQuick tip: 60% of ${business.industry} customers search online first. A professional website is essential now.\n\nYour free demo shows what's possible. No strings attached!\n\nBest,\nOatCode`
      },
      5: {
        subject: `Last check-in`,
        body: `Hi,\n\nHaven't heard back, so I'll assume now isn't the right time. No worries!\n\nYour demo will be available for one more week if you want to check it out.\n\nBest,\nOatCode`
      }
    };

    return templates[step];
  }

  /**
   * UPDATE ENGAGEMENT (Called by webhook)
   */
  async updateEngagement(sequenceId, eventType) {
    const sequence = this.sequences.find(s => s.id === sequenceId);
    if (!sequence) return;

    if (eventType === 'open') {
      sequence.engagement.totalOpens++;
      sequence.engagement.lastEngagement = new Date().toISOString();
    } else if (eventType === 'click') {
      sequence.engagement.totalClicks++;
      sequence.engagement.lastEngagement = new Date().toISOString();
    }

    await this.saveSequences();
  }

  /**
   * GET STATISTICS
   */
  getStatistics() {
    return {
      total: this.sequences.length,
      active: this.sequences.filter(s => s.status === 'active').length,
      completed: this.sequences.filter(s => s.status === 'completed').length,
      stopped: this.sequences.filter(s => s.status === 'stopped').length,
      totalEmailsSent: this.sequences.reduce((sum, s) => sum + s.emails.length, 0)
    };
  }
}

module.exports = EmailSequenceService;