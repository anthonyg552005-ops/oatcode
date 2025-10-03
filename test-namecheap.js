/**
 * Test Namecheap API Integration
 */

require('dotenv').config();
const AutoDomainService = require('./src/services/AutoDomainService');

async function testNamecheapAPI() {
  console.log('🧪 Testing Namecheap API Integration...\n');

  const service = new AutoDomainService(console);

  try {
    // Test domain availability check
    const result = await service.checkAvailability('test-oatcode-example.com');

    console.log('\n✅ Namecheap API is working!');
    console.log('Domain check result:', result);
    console.log('\n🎉 Integration test passed!');

  } catch (error) {
    console.error('\n❌ API test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testNamecheapAPI();
