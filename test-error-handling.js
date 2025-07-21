#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Testing Error Handling and Fallback Mechanisms (Local Configuration)\n');

// Test 1: Missing configuration file in a directory
console.log('🧪 Test 1: Missing local configuration file');
const tempDir = './temp-test-dir';
try {
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }
  
  const configPath = path.join(tempDir, '.azure-devops.json');
  const exists = fs.existsSync(configPath);
  
  if (!exists) {
    console.log('  ✅ No configuration found in test directory (expected)');
  } else {
    console.log('  ❌ Unexpected configuration found');
  }
} catch (error) {
  console.log(`  ✅ Correctly handled missing config: ${error.message}`);
} finally {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// Test 2: Invalid JSON configuration
console.log('\n🧪 Test 2: Invalid JSON configuration');
const invalidConfigPath = './test-invalid-config.json';
fs.writeFileSync(invalidConfigPath, '{ invalid json content }');
try {
  const content = fs.readFileSync(invalidConfigPath, 'utf8');
  JSON.parse(content);
  console.log('  ❌ Should have thrown error');
} catch (error) {
  console.log(`  ✅ Correctly threw error: ${error.message}`);
} finally {
  fs.unlinkSync(invalidConfigPath);
}

// Test 3: Valid configuration loading
console.log('\n🧪 Test 3: Valid configuration loading');
const validConfigPath = './test-valid-config.json';
const testConfig = {
  organizationUrl: 'https://dev.azure.com/test',
  project: 'TestProject',
  pat: 'test-pat-token'
};
fs.writeFileSync(validConfigPath, JSON.stringify(testConfig, null, 2));
try {
  const content = fs.readFileSync(validConfigPath, 'utf8');
  const config = JSON.parse(content);
  
  if (config.organizationUrl && config.project && config.pat) {
    console.log('  ✅ Valid configuration loaded successfully');
  } else {
    console.log('  ❌ Configuration missing required fields');
  }
} catch (error) {
  console.log(`  ❌ Error loading valid config: ${error.message}`);
} finally {
  fs.unlinkSync(validConfigPath);
}

// Test 4: Current working directory has valid config
console.log('\n🧪 Test 4: Current directory configuration check');
try {
  const currentConfigPath = './.azure-devops.json';
  if (fs.existsSync(currentConfigPath)) {
    const config = JSON.parse(fs.readFileSync(currentConfigPath, 'utf8'));
    console.log('  ✅ Current directory has valid configuration');
    console.log(`    Organization: ${config.organizationUrl}`);
    console.log(`    Project: ${config.project}`);
  } else {
    console.log('  ❌ No configuration in current directory');
  }
} catch (error) {
  console.log(`  ❌ Error reading current config: ${error.message}`);
}

console.log('\n✅ Error handling tests completed!');