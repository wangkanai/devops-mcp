#!/usr/bin/env node

const { DirectoryDetector } = require('./dist/directory-detector.js');
const { ConfigLoader } = require('./dist/utils/config-loader.js');
const fs = require('fs');
const path = require('path');

console.log('Testing Error Handling and Fallback Mechanisms\n');

// Test 1: Missing configuration file
console.log('🧪 Test 1: Missing configuration file');
try {
  ConfigLoader.loadConfig('/nonexistent/path/config.json');
  console.log('  ❌ Should have thrown error');
} catch (error) {
  console.log(`  ✅ Correctly threw error: ${error.message}`);
}

// Test 2: Invalid JSON configuration
console.log('\n🧪 Test 2: Invalid JSON configuration');
const invalidConfigPath = './test-invalid-config.json';
fs.writeFileSync(invalidConfigPath, '{ invalid json content }');
try {
  ConfigLoader.loadConfig(invalidConfigPath);
  console.log('  ❌ Should have thrown error');
} catch (error) {
  console.log(`  ✅ Correctly threw error: ${error.message}`);
} finally {
  fs.unlinkSync(invalidConfigPath);
}

// Test 3: Empty configuration
console.log('\n🧪 Test 3: Empty configuration');
const emptyConfigPath = './test-empty-config.json';
fs.writeFileSync(emptyConfigPath, '{}');
try {
  const config = ConfigLoader.loadConfig(emptyConfigPath);
  console.log('  ✅ Handled empty config:', JSON.stringify(config, null, 2));
} catch (error) {
  console.log(`  ⚠️  Error with empty config: ${error.message}`);
} finally {
  fs.unlinkSync(emptyConfigPath);
}

// Test 4: Directory detector with empty mappings
console.log('\n🧪 Test 4: Directory detector with empty mappings');
try {
  const detector = new DirectoryDetector([]);
  const context = detector.detectConfiguration();
  console.log(`  ✅ Empty mappings handled: ${context ? 'Has default' : 'No context'}`);
} catch (error) {
  console.log(`  ❌ Error with empty mappings: ${error.message}`);
}

// Test 5: Invalid directory path
console.log('\n🧪 Test 5: Invalid directory path');
try {
  const envConfig = ConfigLoader.loadConfig();
  const detector = new DirectoryDetector(envConfig.mappings, envConfig.defaultConfig);
  const context = detector.getProjectContext('/this/path/does/not/exist');
  console.log(`  ✅ Invalid path handled: ${context ? 'Has context' : 'No context'}`);
} catch (error) {
  console.log(`  ❌ Error with invalid path: ${error.message}`);
}

// Test 6: Configuration validation
console.log('\n🧪 Test 6: Configuration validation');
try {
  const config = ConfigLoader.loadConfig();
  const requiredFields = ['mappings'];
  const missingFields = requiredFields.filter(field => !config[field]);
  
  if (missingFields.length > 0) {
    console.log(`  ⚠️  Missing required fields: ${missingFields.join(', ')}`);
  } else {
    console.log('  ✅ All required fields present');
  }
  
  // Validate mapping structure
  let validMappings = 0;
  for (const mapping of config.mappings || []) {
    if (mapping.directory && mapping.config && mapping.config.organizationUrl && mapping.config.project) {
      validMappings++;
    }
  }
  console.log(`  ✅ Valid mappings: ${validMappings}/${config.mappings?.length || 0}`);
  
} catch (error) {
  console.log(`  ❌ Configuration validation error: ${error.message}`);
}

console.log('\n✅ Error handling tests completed!');