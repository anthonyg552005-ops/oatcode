require('dotenv').config();
const sgMail = require('@sendgrid/mail');

async function sendRealOutreach() {
  console.log('📧 Sending REAL OUTREACH EMAIL example...\n');

  if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ SENDGRID_API_KEY not found');
    process.exit(1);
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const msg = {
    to: 'anthonyg552005@gmail.com',
    from: 'hello@oatcode.com',
    subject: 'Your demo website is ready, Dr. Johnson',
    text: `Hi Dr. Johnson,

I was researching top-rated dental practices in Austin and came across Sunrise Dental Care. Your 4.5-star rating and 48 glowing reviews really stood out—it's clear you're providing exceptional care to your patients!

However, I noticed you don't have a website yet. In Austin's competitive dental market, you could be missing out on potential patients who are searching online for a dentist.

I'd love to help by creating a free demo website for Sunrise Dental Care. No strings attached—just want to show you what's possible.

✨ What's Included:
✅ Website delivered in 24-48 hours
✅ UNLIMITED revisions - make ANY changes you want
✅ Simply reply to any email with your changes (we update within 24 hours)
✅ Mobile-optimized, SEO-ready, SSL security included
✅ Email support@oatcode.com anytime for help

👉 View your free demos:

💡 Most of our clients choose Standard - it's perfect for local businesses. Premium is great if you want your own custom domain (like SunriseDentalCare.com) and unique AI-generated visuals.

📄 Standard Plan ($197/month) - MOST POPULAR
   Professional website with stock photos
   https://oatcode.com/demo-standard.html

✨ Premium Plan ($297/month)
   AI visuals + custom domain
   https://oatcode.com/demo-premium.html

If you like what you see, we can have you live online within 24-48 hours!

Best regards,
OatCode Team
hello@oatcode.com

Questions? Email support@oatcode.com

P.S. - The demo is 100% free to view. No credit card required, no pressure. And remember: unlimited revisions means you can customize EVERYTHING until it's perfect!`,
    html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background: #ffffff;
        }
    </style>
</head>
<body>
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center;">
            <div style="display: inline-block; width: 60px; height: 60px; background: #1E293B; border-radius: 50%; text-align: center; line-height: 60px; font-size: 36px; font-weight: bold; color: white; margin-bottom: 15px;">O</div>
            <h1 style="margin: 0; font-size: 24px;">🎁 Your Demo Website is Ready!</h1>
        </div>

        <!-- Content -->
        <div style="background: white; padding: 30px 20px;">
        <p>Hi <strong>Dr. Johnson</strong>,</p>

        <p>I was researching top-rated dental practices in Austin and came across <strong>Sunrise Dental Care</strong>. Your <span style="color: #f59e0b;">★ 4.5-star rating</span> and <strong>48 glowing reviews</strong> really stood out—it's clear you're providing exceptional care to your patients!</p>

        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            ⭐⭐⭐⭐⭐ <strong>4.5/5 stars</strong> (48 reviews)<br>
            <em>"Patients love your service in Austin!"</em>
        </div>

        <p>However, I noticed you don't have a website yet. In Austin's competitive dental market, you could be missing out on potential patients who are searching online for a dentist.</p>

        <p>I'd love to help by creating a demo website for Sunrise Dental Care. No strings attached—just want to show you what's possible.</p>

        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h3 style="margin: 0 0 15px 0; color: #059669;">✨ What's Included:</h3>
            <ul style="margin: 0; padding-left: 20px;">
                <li style="margin: 8px 0;">✅ Website delivered in 24-48 hours</li>
                <li style="margin: 8px 0;"><strong>✅ UNLIMITED revisions</strong> - make ANY changes you want</li>
                <li style="margin: 8px 0;">✅ Simply reply to any email with your changes (we update within 24 hours)</li>
                <li style="margin: 8px 0;">✅ Mobile-optimized, SEO-ready, SSL security included</li>
                <li style="margin: 8px 0;">✅ Email <strong>support@oatcode.com</strong> anytime for help</li>
            </ul>
        </div>

        <h3 style="text-align: center; margin: 30px 0 10px 0;">👉 View your demo options:</h3>

        <p style="text-align: center; font-size: 14px; color: #666; margin: 0 0 20px 0;"><em>💡 Most of our clients choose Standard - it's perfect for local businesses. Premium is great if you want your own custom domain (like SunriseDentalCare.com) and unique AI-generated visuals.</em></p>

        <div style="padding: 20px; border: 3px solid #667eea; border-radius: 8px; margin: 15px 0; background: rgba(102, 126, 234, 0.05);">
            <span style="background: #10b981; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; display: inline-block; margin-bottom: 10px;">MOST POPULAR</span>
            <h4 style="margin: 0 0 10px 0; color: #667eea;">📄 Standard Plan</h4>
            <p style="margin: 0 0 5px 0; color: #666;">Professional website with stock photos</p>
            <p style="margin: 0 0 15px 0; color: #667eea; font-weight: bold; font-size: 20px;">$197/month</p>
            <a href="https://oatcode.com/demo-standard.html" style="display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">View Standard Demo →</a>
        </div>

        <div style="padding: 20px; border: 2px solid #e5e7eb; border-radius: 8px; margin: 15px 0; background: #fafafa;">
            <h4 style="margin: 0 0 10px 0; color: #764ba2;">✨ Premium Plan</h4>
            <p style="margin: 0 0 5px 0; color: #666;">AI visuals + custom domain</p>
            <p style="margin: 0 0 15px 0; color: #764ba2; font-weight: bold; font-size: 20px;">$297/month</p>
            <a href="https://oatcode.com/demo-premium.html" style="display: inline-block; background: #764ba2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">View Premium Demo →</a>
        </div>

        <p style="text-align: center; margin-top: 20px;">If you like what you see, we can have you <strong>live online within 24-48 hours</strong>!</p>

        <p>Best regards,<br>
        <strong>OatCode Team</strong><br>
        hello@oatcode.com</p>

        <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">Questions? Email <strong>support@oatcode.com</strong></p>

        <p style="font-size: 14px; color: #6b7280; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <strong>P.S.</strong> - No credit card required to view the demos. And remember: <strong>unlimited revisions</strong> means you can customize EVERYTHING until it's perfect!
        </p>
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 14px;">
            <p style="margin: 0 0 10px 0;">This demo was created specifically for Sunrise Dental Care</p>
            <p style="margin: 0 0 10px 0;">Questions? Reply to this email or contact us at support@oatcode.com</p>
            <p style="margin: 0; font-size: 13px; color: #9ca3af;">Learn more at <a href="https://oatcode.com" style="color: #667eea; text-decoration: none;">oatcode.com</a></p>
        </div>
    </div>
</body>
</html>`,
    trackingSettings: {
      clickTracking: {
        enable: false
      }
    }
  };

  try {
    const result = await sgMail.send(msg);
    console.log('✅ Real outreach email sent!');
    console.log('   To: anthonyg552005@gmail.com');
    console.log('   Subject: Built you a free demo website, Dr. Johnson');
    console.log('');
    console.log('📋 This is EXACTLY what prospects receive!');
    console.log('');
    console.log('Check your email to see:');
    console.log('  1. Personalized greeting (Dr. Johnson)');
    console.log('  2. References their reviews (4.5 stars, 48 reviews)');
    console.log('  3. Identifies their pain point (no website)');
    console.log('  4. Offers free demo (no risk)');
    console.log('  5. Shows Standard vs Premium options');
    console.log('  6. Clear CTA button to view demo');
    console.log('');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

sendRealOutreach();
