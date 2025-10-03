/**
 * CUSTOMER SUPPORT AI
 * Autonomous email support bot that handles customer inquiries
 * Uses OpenAI to understand and respond to support emails
 */

const OpenAI = require('openai');

class CustomerSupportAI {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.conversations = new Map();

    // Knowledge base for support bot
    this.knowledgeBase = {
      pricing: {
        standard: "$197/month for professional website",
        premium: "$297/month for premium website with AI images",
        includes: [
          "Professional website design",
          "AI-powered website generation",
          "Mobile-responsive design",
          "SEO optimization",
          "Free stock photos (Standard) or AI-generated images (Premium)",
          "Unlimited revisions within 24 hours",
          "Email support",
          "Website delivered in 24-48 hours"
        ],
        noSetupFees: true,
        noContracts: true,
        moneyBackGuarantee: "30-day money-back guarantee"
      },
      delivery: {
        timeline: "24-48 hours after payment",
        process: [
          "Payment processed through Stripe",
          "AI generates your professional website",
          "Website link sent to your email",
          "Unlimited revisions available"
        ]
      },
      revisions: {
        policy: "Unlimited revisions",
        howTo: "Simply reply to any email with requested changes",
        turnaround: "Changes made within 24 hours"
      },
      support: {
        email: "support@oatcode.com",
        responseTime: "Usually within 1-2 hours",
        availableChannels: ["Email"]
      },
      technical: {
        hosting: "Included in subscription",
        ssl: "Free SSL certificate included",
        domain: "Custom domain available (Premium plan)",
        mobileOptimized: true,
        seoOptimized: true
      },
      cancellation: {
        policy: "Cancel anytime, no contracts",
        refund: "30-day money-back guarantee if not satisfied"
      }
    };
  }

  /**
   * Main handler for customer inquiries
   */
  async handleInquiry({ message, subject, customerEmail, customerName, channel = 'email' }) {
    try {
      // Get conversation history
      const conversationId = customerEmail;
      const history = this.getConversation(conversationId);

      // Add customer message to history
      history.push({
        role: 'user',
        content: message,
        subject: subject,
        timestamp: new Date().toISOString()
      });

      // Analyze inquiry and determine intent
      const analysis = await this.analyzeInquiry(message, subject, history);

      // Generate appropriate response
      const response = await this.generateResponse(message, subject, history, analysis);

      // Add AI response to history
      history.push({
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString()
      });

      // Update conversation history
      this.conversations.set(conversationId, history);

      // Cleanup old conversations
      this.cleanupOldConversations();

      return {
        message: response.message,
        needsFollowUp: response.needsFollowUp,
        intent: analysis.intent,
        sentiment: analysis.sentiment
      };

    } catch (error) {
      console.error('❌ Support AI error:', error.message);

      // Fallback response
      return {
        message: `Thank you for contacting OatCode support!

I apologize, but I'm experiencing a temporary issue processing your request. Your message has been received and logged.

In the meantime:
- For pricing info: Standard plans start at $197/month, Premium at $297/month
- For website delivery: 24-48 hours after payment
- For revisions: Simply reply to any email with your changes
- For urgent issues: Your email has been flagged for priority review

We'll get back to you shortly!

Best regards,
OatCode Support Team
support@oatcode.com`,
        needsFollowUp: true,
        intent: 'unknown',
        sentiment: 'neutral'
      };
    }
  }

  /**
   * Analyze customer inquiry to determine intent and sentiment
   */
  async analyzeInquiry(message, subject, history) {
    try {
      const analysisPrompt = `Analyze this customer support inquiry and determine the intent and sentiment.

Subject: ${subject || 'None'}
Message: ${message}

Return a JSON object with:
- intent: one of [pricing, delivery, revision, technical, cancellation, complaint, question, other]
- sentiment: one of [positive, neutral, negative, urgent]
- requiresHumanEscalation: boolean (true if complex issue or angry customer)
- keyTopics: array of key topics mentioned`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an AI that analyzes customer support inquiries. Return only valid JSON.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(completion.choices[0].message.content);

    } catch (error) {
      console.error('Analysis error:', error.message);
      return {
        intent: 'question',
        sentiment: 'neutral',
        requiresHumanEscalation: false,
        keyTopics: []
      };
    }
  }

  /**
   * Generate response based on inquiry analysis
   */
  async generateResponse(message, subject, history, analysis) {
    try {
      const systemPrompt = `You are a friendly and helpful customer support AI for OatCode, a company that creates professional websites using AI.

KNOWLEDGE BASE:
${JSON.stringify(this.knowledgeBase, null, 2)}

GUIDELINES:
1. Be friendly, professional, and helpful
2. Answer questions accurately using the knowledge base
3. If you don't know something, offer to connect them with a human
4. Keep responses concise but complete
5. Always end with a helpful call-to-action
6. Use the customer's name if provided
7. Sign emails as "OatCode Support Team"

IMPORTANT:
- Pricing: Standard $197/month, Premium $297/month
- Delivery: 24-48 hours after payment
- Revisions: Unlimited, just reply to email
- Support: support@oatcode.com
- Payment: Secure via Stripe

Customer Intent: ${analysis.intent}
Customer Sentiment: ${analysis.sentiment}`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          ...history.slice(-10).map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const responseMessage = completion.choices[0].message.content;

      // Determine if follow-up needed
      const needsFollowUp = analysis.requiresHumanEscalation ||
                           analysis.sentiment === 'negative' ||
                           analysis.sentiment === 'urgent' ||
                           analysis.intent === 'complaint';

      return {
        message: responseMessage,
        needsFollowUp
      };

    } catch (error) {
      console.error('Response generation error:', error.message);
      throw error;
    }
  }

  /**
   * Get conversation history for a customer
   */
  getConversation(conversationId) {
    return this.conversations.get(conversationId) || [];
  }

  /**
   * Cleanup old conversations (older than 30 days)
   */
  cleanupOldConversations(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    for (const [conversationId, history] of this.conversations.entries()) {
      if (history.length > 0) {
        const lastMessage = history[history.length - 1];
        const lastMessageDate = new Date(lastMessage.timestamp);

        if (lastMessageDate < cutoffDate) {
          this.conversations.delete(conversationId);
        }
      }
    }
  }

  /**
   * Get statistics about support conversations
   */
  getStatistics() {
    const totalConversations = this.conversations.size;
    let totalMessages = 0;

    for (const history of this.conversations.values()) {
      totalMessages += history.length;
    }

    return {
      totalConversations,
      totalMessages,
      averageMessagesPerConversation: totalConversations > 0
        ? (totalMessages / totalConversations).toFixed(1)
        : 0
    };
  }
}

module.exports = CustomerSupportAI;
