#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Testing Directory Detection Logic (Local Configuration)\n');

try {
  // Test local configuration detection for current directory
  console.log('Testing current working directory:');
  const currentDir = process.cwd();
  console.log(`Current directory: ${currentDir}`);
  
  const configPath = path.join(currentDir, '.azure-devops.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('✅ Local configuration found:');
    console.log(`  Organization: ${config.organizationUrl}`);
    console.log(`  Project: ${config.project}`);
    console.log(`  Description: ${config.description}`);
    console.log(`  PAT Token: ${config.pat ? 'Present' : 'Missing'} (${config.pat ? config.pat.length : 0} chars)`);
  } else {
    console.log('❌ No .azure-devops.json found in current directory');
  }
  
  // Test other directories that should have configurations
  const testDirectories = [
    '/Users/wangkanai/Sources/riversync',
    '/Users/wangkanai/Sources/mula'
  ];
  
  console.log('\nTesting other configured directories:');
  for (const dir of testDirectories) {
    console.log(`\nDirectory: ${dir}`);
    const testConfigPath = path.join(dir, '.azure-devops.json');
    if (fs.existsSync(testConfigPath)) {
      try {
        const testConfig = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));
        console.log(`  ✅ Configuration found: ${testConfig.organizationUrl}/${testConfig.project}`);
      } catch (error) {
        console.log(`  ❌ Invalid configuration: ${error.message}`);
      }
    } else {
      console.log('  ❌ No .azure-devops.json found');
    }
  }
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}

console.log('\n✅ Directory detection test completed successfully!');