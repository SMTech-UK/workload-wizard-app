#!/usr/bin/env node

/**
 * Test script to verify PostHog proxy is working
 * Run this after starting your dev server
 */

const http = require('http');
const https = require('https');

const DEV_SERVER_URL = 'http://localhost:3000';
const PROXY_PATH = '/e/capture/';

console.log('🧪 Testing PostHog Proxy Configuration...\n');

// Test 1: Check if dev server is running
console.log('1. Testing dev server connectivity...');
const testDevServer = () => {
  return new Promise((resolve) => {
    const req = http.get(`${DEV_SERVER_URL}/`, (res) => {
      console.log(`   ✅ Dev server responding (${res.statusCode})`);
      resolve(true);
    });
    
    req.on('error', (err) => {
      console.log(`   ❌ Dev server not responding: ${err.message}`);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log('   ❌ Dev server timeout');
      resolve(false);
    });
  });
};

// Test 2: Check if proxy endpoint is accessible
console.log('2. Testing proxy endpoint...');
const testProxyEndpoint = () => {
  return new Promise((resolve) => {
    const req = http.get(`${DEV_SERVER_URL}${PROXY_PATH}`, (res) => {
      console.log(`   ✅ Proxy endpoint responding (${res.statusCode})`);
      resolve(true);
    });
    
    req.on('error', (err) => {
      console.log(`   ❌ Proxy endpoint error: ${err.message}`);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log('   ❌ Proxy endpoint timeout');
      resolve(false);
    });
  });
};

// Test 3: Check if static assets proxy works
console.log('3. Testing static assets proxy...');
const testStaticProxy = () => {
  return new Promise((resolve) => {
    const req = http.get(`${DEV_SERVER_URL}/e/static/`, (res) => {
      console.log(`   ✅ Static assets proxy responding (${res.statusCode})`);
      resolve(true);
    });
    
    req.on('error', (err) => {
      console.log(`   ❌ Static assets proxy error: ${err.message}`);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log('   ❌ Static assets proxy timeout');
      resolve(false);
    });
  });
};

// Run all tests
async function runTests() {
  const devServerOk = await testDevServer();
  
  if (!devServerOk) {
    console.log('\n❌ Dev server is not running. Please start it with: npm run dev');
    process.exit(1);
  }
  
  await testProxyEndpoint();
  await testStaticProxy();
  
  console.log('\n📋 Next Steps:');
  console.log('1. Add NEXT_PUBLIC_TEST_PROXY=true to your .env.local file');
  console.log('2. Restart your dev server');
  console.log('3. Visit http://localhost:3000/feature-flag-test');
  console.log('4. Check browser console for PostHog configuration logs');
  console.log('5. Verify "Enabled (/e)" status appears on the test page');
  
  console.log('\n🔍 To verify proxy is working:');
  console.log('- Open browser dev tools → Network tab');
  console.log('- Refresh the feature flag test page');
  console.log('- Look for requests to /e/* endpoints');
  console.log('- These should be proxied to PostHog successfully');
}

runTests().catch(console.error);
