#!/usr/bin/env node

const { DirectoryDetector } = require('./dist/directory-detector.js');
const { ConfigLoader } = require('./dist/utils/config-loader.js');

console.log('Testing Directory Detection Logic\n');

try {
  // Load configuration
  const envConfig = ConfigLoader.loadConfig();
  console.log('Loaded configuration:', JSON.stringify(envConfig, null, 2));
  
  // Create detector
  const detector = new DirectoryDetector(envConfig.mappings, envConfig.defaultConfig);
  
  // Test various directories
  const testDirectories = [
    '/Users/wangkanai/Sources/riversync',
    '/Users/wangkanai/Sources/mula',
    '/Users/wangkanai/Sources/azure-devops-mcp-proxy',
    '/Users/wangkanai/Sources',
    '/tmp'
  ];
  
  console.log('\nTesting directory detection:');
  for (const dir of testDirectories) {
    console.log(`\nDirectory: ${dir}`);
    const context = detector.getProjectContext(dir);
    if (context) {
      console.log(`  ✅ Detected: ${context.organizationUrl}/${context.projectName}`);
      console.log(`  📍 Context object:`, JSON.stringify(context, null, 4));
    } else {
      console.log('  ❌ No configuration found');
    }
  }
  
  // Test current working directory detection
  console.log('\n\nTesting current working directory detection:');
  const currentContext = detector.detectConfiguration();
  if (currentContext) {
    console.log(`  ✅ Current context: ${currentContext.organizationUrl}/${currentContext.project}`);
  } else {
    console.log('  ❌ No context detected for current directory');
  }
  
  // Test configured directories listing
  console.log('\n\nConfigured directories:');
  const configuredDirs = detector.getConfiguredDirectories();
  configuredDirs.forEach(dir => console.log(`  📁 ${dir}`));
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}

console.log('\n✅ Directory detection test completed successfully!');