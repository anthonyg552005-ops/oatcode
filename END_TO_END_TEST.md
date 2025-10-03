# 🧪 END-TO-END CUSTOMER JOURNEY TEST

Test the complete customer experience from first contact to website delivery.

---

## 📋 TEST CHECKLIST

### ✅ Step 1: Support Email Inquiry (AI Bot)
**Test**: Customer asks a question via email

1. **Send email to**: support@oatcode.com
   - **From**: Your test email (e.g., testcustomer@gmail.com)
   - **Subject**: "Question about pricing"
   - **Body**: "Hi, I'm interested in getting a website. How much does it cost?"

2. **Expected Result**:
   - ✅ AI responds within 5 seconds
   - ✅ Email from "OatCode Support <noreply@oatcode.com>"
   - ✅ Professional pricing information included
   - ✅ Invitation to visit website and purchase

3. **Check**:
   ```bash
   # View server logs to confirm AI processed it
   ssh root@24.144.89.17 "pm2 logs oatcode-web --lines 20 | grep -i support"
   ```

---

### ✅ Step 2: Landing Page Visit
**Test**: Customer visits website

1. **Open**: http://24.144.89.17 (or your domain if configured)

2. **Expected Result**:
   - ✅ Professional landing page loads
   - ✅ Pricing clearly visible ($197 Standard, $297 Premium)
   - ✅ "Get Your Website" or "Purchase" buttons work
   - ✅ Mobile-responsive design

3. **Check**:
   - Does pricing match what AI support bot said?
   - Are buttons clickable?
   - Does page look professional?

---

### ✅ Step 3: Stripe Checkout
**Test**: Customer purchases a plan

1. **Click**: "Get Standard Plan" or "Get Premium Plan"

2. **Fill out Stripe checkout** (use test mode):
   - **Email**: testcustomer@gmail.com
   - **Card**: 4242 4242 4242 4242
   - **Expiry**: Any future date
   - **CVC**: Any 3 digits
   - **ZIP**: Any 5 digits

3. **Complete payment**

4. **Expected Result**:
   - ✅ Payment processes successfully
   - ✅ Redirects to success page
   - ✅ Success page shows "Your website is being created!"
   - ✅ Success page shows support@oatcode.com for questions

5. **Check server logs**:
   ```bash
   ssh root@24.144.89.17 "pm2 logs oatcode-web --lines 50 | grep -i 'checkout\|payment\|stripe'"
   ```

---

### ✅ Step 4: Website Generation (AI)
**Test**: AI generates website automatically

1. **Expected Result** (happens in background):
   - ✅ AI analyzes business info from checkout form
   - ✅ AI generates professional website (30-60 seconds)
   - ✅ Website deployed automatically
   - ✅ Unique URL created (e.g., demo-testcustomer-123.html)

2. **Check database**:
   ```bash
   ssh root@24.144.89.17 "sqlite3 /var/www/automatedwebsitescraper/data/autonomous-business.sqlite 'SELECT * FROM customers ORDER BY created_at DESC LIMIT 1;'"
   ```

3. **Check if website was created**:
   ```bash
   ssh root@24.144.89.17 "ls -lht /var/www/automatedwebsitescraper/public/*.html | head -5"
   ```

---

### ✅ Step 5: Delivery Email
**Test**: Customer receives website link via email

1. **Check email** (testcustomer@gmail.com)

2. **Expected Result**:
   - ✅ Email from "OatCode <noreply@oatcode.com>"
   - ✅ Subject: "Your Website is Ready!" (or similar)
   - ✅ Email contains:
     - Welcome message
     - Link to their website
     - Login credentials (if applicable)
     - Instructions
     - Support email (support@oatcode.com)

3. **If no email received, check logs**:
   ```bash
   ssh root@24.144.89.17 "pm2 logs oatcode-web --lines 50 | grep -i 'email\|sendgrid'"
   ```

---

### ✅ Step 6: Customer Receives Website
**Test**: Customer clicks link and sees their website

1. **Click website link** from delivery email

2. **Expected Result**:
   - ✅ Professional website loads
   - ✅ Customized for their business
   - ✅ Mobile-responsive
   - ✅ Includes requested features
   - ✅ Looks professional and complete

3. **Test mobile**:
   - Open website on phone or use Chrome DevTools mobile view
   - Confirm it looks good on mobile

---

### ✅ Step 7: Customer Support (Round 2)
**Test**: Customer requests a change via support email

1. **Send email to**: support@oatcode.com
   - **Subject**: "Website revision request"
   - **Body**: "I love the website! Can you change the header color to blue?"

2. **Expected Result**:
   - ✅ AI responds within 5 seconds
   - ✅ Professional response about revision process
   - ✅ Confirms unlimited revisions
   - ✅ Instructions on how to submit changes

---

## 🎯 COMPLETE CUSTOMER JOURNEY

```
1. Customer → support@oatcode.com (question)
   ↓
2. AI Support Bot → responds with pricing info
   ↓
3. Customer → visits website (24.144.89.17)
   ↓
4. Customer → clicks "Get Standard/Premium Plan"
   ↓
5. Stripe Checkout → processes payment ($197 or $297)
   ↓
6. Webhook → triggers website generation
   ↓
7. AI → generates professional website (30-60 sec)
   ↓
8. System → sends delivery email with website link
   ↓
9. Customer → receives website
   ↓
10. Customer → emails support@oatcode.com for changes
    ↓
11. AI Support Bot → handles revision requests
```

---

## 🔍 HOW TO RUN FULL TEST

### Quick Test (5 minutes):

```bash
# Step 1: Send support email
# (Use Gmail to send to support@oatcode.com)

# Step 2: Visit landing page
open http://24.144.89.17

# Step 3: Purchase with test card (4242 4242 4242 4242)

# Step 4: Check if website was created
ssh root@24.144.89.17 "ls -lht /var/www/automatedwebsitescraper/public/*.html | head -3"

# Step 5: Check logs for any errors
ssh root@24.144.89.17 "pm2 logs oatcode-web --lines 100"
```

---

## ❌ TROUBLESHOOTING

### Email not received?
```bash
# Check SendGrid logs
ssh root@24.144.89.17 "pm2 logs oatcode-web | grep -i 'sendgrid\|email'"

# Check if SENDGRID_API_KEY is set
ssh root@24.144.89.17 "cat /var/www/automatedwebsitescraper/.env | grep SENDGRID"
```

### Website not generated?
```bash
# Check if payment was recorded
ssh root@24.144.89.17 "sqlite3 /var/www/automatedwebsitescraper/data/autonomous-business.sqlite 'SELECT * FROM payments;'"

# Check OpenAI API logs
ssh root@24.144.89.17 "pm2 logs oatcode-web | grep -i 'openai\|website generation'"
```

### Payment not working?
```bash
# Check Stripe webhook
ssh root@24.144.89.17 "pm2 logs oatcode-web | grep -i stripe"

# Verify Stripe keys are set
ssh root@24.144.89.17 "cat /var/www/automatedwebsitescraper/.env | grep STRIPE"
```

---

## ✅ SUCCESS CRITERIA

**Test passes when ALL of these work:**

- [x] AI support email responds within 5 seconds ✅
- [ ] Landing page loads and looks professional
- [ ] Stripe checkout processes test payment
- [ ] Success page shows after payment
- [ ] Website generates automatically (30-60 sec)
- [ ] Delivery email sent to customer
- [ ] Website link works and looks professional
- [ ] Website is mobile-responsive
- [ ] Support email handles revision requests
- [ ] All steps logged in database

---

## 🚀 AFTER SUCCESSFUL TEST

Once all tests pass:

1. ✅ Switch Stripe from test mode to live mode
2. ✅ Update domain (point oatcode.com to server)
3. ✅ Enable autonomous lead generation
4. ✅ Start autonomous outreach engine
5. ✅ Monitor dashboard for customers

**You're ready to launch! 🎉**
