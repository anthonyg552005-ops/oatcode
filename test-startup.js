#!/usr/bin/env node
/**
 * Test Startup Script
 * Tests if all services can be initialized properly before deployment
 */

require('dotenv').config();

console.log('🔍 Testing Autonomous Engine Startup...\n');

// Test 1: Environment Variables
console.log('1️⃣  Checking Environment Variables:');
const requiredEnvVars = [
  'OPENAI_API_KEY',
  'SENDGRID_API_KEY',
  'GOOGLE_PLACES_API_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN'
];

let envErrors = 0;
requiredEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`   ✅ ${varName} is set (${process.env[varName].substring(0, 10)}...)`);
  } else {
    console.log(`   ❌ ${varName} is MISSING`);
    envErrors++;
  }
});

if (envErrors > 0) {
  console.log(`\n❌ ${envErrors} environment variable(s) missing. Exiting.\n`);
  process.exit(1);
}

// Test 2: Required Services
console.log('\n2️⃣  Testing Service Imports:');
try {
  const SendGridService = require('./src/services/SendGridService');
  console.log('   ✅ SendGridService');

  const GooglePlacesService = require('./src/services/GooglePlacesService');
  console.log('   ✅ GooglePlacesService');

  const EmailSchedulingService = require('./src/services/EmailSchedulingService');
  console.log('   ✅ EmailSchedulingService');

  console.log('\n3️⃣  Testing Service Instantiation:');
  const sendgrid = new SendGridService();
  console.log('   ✅ SendGridService instantiated');

  const places = new GooglePlacesService();
  console.log('   ✅ GooglePlacesService instantiated');

  console.log('\n✅ All services loaded successfully!\n');
} catch (error) {
  console.log(`\n❌ Service loading failed: ${error.message}`);
  console.log(error.stack);
  process.exit(1);
}

// Test 3: OpenAI Connection
console.log('4️⃣  Testing OpenAI Connection:');
const OpenAI = require('openai');
try {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  console.log('   ✅ OpenAI client instantiated');
  console.log('\n✅ All tests passed! Ready to start autonomous engine.\n');
} catch (error) {
  console.log(`   ❌ OpenAI initialization failed: ${error.message}`);
  process.exit(1);
}
