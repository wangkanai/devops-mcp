#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Testing Error Handling and Fallback Mechanisms (Local Configuration)\n');

// Test 1: Missing configuration file in a directory
console.log('🧪 Test 1: Missing local configuration file');
const tempDir = './temp-test-dir';
try {
  // Use mkdir with recursive option to handle race conditions
  fs.mkdirSync(tempDir, { recursive: true });
  
  const configPath = path.join(tempDir, '.azure-devops.json');
  
  // Use direct file access instead of existsSync to avoid TOCTOU race conditions
  try {
    fs.readFileSync(configPath, 'utf8');
    console.log('  ❌ Unexpected configuration found');
  } catch (readError) {
    if (readError.code === 'ENOENT') {
      console.log('  ✅ No configuration found in test directory (expected)');
    } else {
      console.log(`  ✅ Correctly handled missing config: ${readError.message}`);
    }
  }
} catch (error) {
  console.log(`  ✅ Correctly handled missing config: ${error.message}`);
} finally {
  // Use rmSync with force option to handle missing directory
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (cleanupError) {
    // Ignore cleanup errors in test
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
  // Direct file access without existsSync to avoid race conditions
  try {
    const content = fs.readFileSync(currentConfigPath, 'utf8');
    const config = JSON.parse(content);
    console.log('  ✅ Current directory has valid configuration');
    console.log(`    Organization: ${config.organizationUrl}`);
    console.log(`    Project: ${config.project}`);
  } catch (readError) {
    if (readError.code === 'ENOENT') {
      console.log('  ❌ No configuration in current directory');
    } else {
      console.log(`  ❌ Error reading current config: ${readError.message}`);
    }
  }
} catch (error) {
  console.log(`  ❌ Error reading current config: ${error.message}`);
}

console.log('\n✅ Error handling tests completed!');