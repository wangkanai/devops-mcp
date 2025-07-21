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
  // Direct file access without existsSync to avoid race conditions
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(content);
    console.log('✅ Local configuration found:');
    console.log(`  Organization: ${config.organizationUrl}`);
    console.log(`  Project: ${config.project}`);
    console.log(`  Description: ${config.description}`);
    console.log(`  PAT Token: ${config.pat ? 'Present' : 'Missing'} (${config.pat ? config.pat.length : 0} chars)`);
  } catch (readError) {
    if (readError.code === 'ENOENT') {
      console.log('❌ No .azure-devops.json found in current directory');
    } else {
      console.log(`❌ Error reading configuration: ${readError.message}`);
    }
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
    // Direct file access without existsSync to avoid race conditions
    try {
      const content = fs.readFileSync(testConfigPath, 'utf8');
      const testConfig = JSON.parse(content);
      console.log(`  ✅ Configuration found: ${testConfig.organizationUrl}/${testConfig.project}`);
    } catch (readError) {
      if (readError.code === 'ENOENT') {
        console.log('  ❌ No .azure-devops.json found');
      } else {
        console.log(`  ❌ Invalid configuration: ${readError.message}`);
      }
    }
  }
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}

console.log('\n✅ Directory detection test completed successfully!');