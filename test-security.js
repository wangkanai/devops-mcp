#!/usr/bin/env node

const { DirectoryDetector } = require('./dist/directory-detector.js');
const { ConfigLoader } = require('./dist/utils/config-loader.js');
const fs = require('fs');

console.log('Testing PAT Token Security and Configuration Isolation\n');

// Test 1: Configuration loading and PAT token presence
console.log('🔐 Test 1: Configuration loading and PAT token validation');
try {
  const config = ConfigLoader.loadConfig();
  
  console.log('  ✅ Configuration loaded successfully');
  console.log(`  📊 Mappings found: ${config.mappings.length}`);
  
  for (const mapping of config.mappings) {
    const hasValidPAT = mapping.config.pat && 
                       mapping.config.pat.length > 20 && 
                       mapping.config.pat !== 'DEFAULT_PAT_TOKEN';
    console.log(`  🔑 ${mapping.config.project}: ${hasValidPAT ? 'Valid PAT configured' : 'Invalid/missing PAT'}`);
    
    // Verify PAT is not logged in full
    const maskedPAT = mapping.config.pat ? `${mapping.config.pat.substring(0, 8)}***${mapping.config.pat.substring(mapping.config.pat.length - 4)}` : 'NOT_SET';
    console.log(`      Masked PAT: ${maskedPAT}`);
  }
  
} catch (error) {
  console.log(`  ❌ Configuration error: ${error.message}`);
}

// Test 2: Directory detector security - ensure PATs are not exposed through getProjectContext
console.log('\n🔐 Test 2: PAT token isolation in directory detection');
try {
  const config = ConfigLoader.loadConfig();
  const detector = new DirectoryDetector(config.mappings, config.defaultConfig);
  
  // Test each configured directory
  for (const mapping of config.mappings) {
    const context = detector.getProjectContext(mapping.directory);
    
    console.log(`  📁 ${mapping.directory}:`);
    console.log(`      Project: ${context.projectName}`);
    console.log(`      Organization: ${context.organizationUrl}`);
    
    // Security check: ensure PAT is not exposed
    const hasExposedPAT = JSON.stringify(context).includes(mapping.config.pat);
    console.log(`      🔒 PAT Security: ${hasExposedPAT ? '❌ EXPOSED' : '✅ SECURE'}`);
    
    // Check for any sensitive fields
    const sensitiveFields = ['pat', 'token', 'password', 'secret'];
    const contextKeys = Object.keys(context);
    const exposedSensitive = sensitiveFields.some(field => contextKeys.includes(field));
    console.log(`      🛡️  Sensitive fields: ${exposedSensitive ? '❌ PRESENT' : '✅ CLEAN'}`);
  }
  
} catch (error) {
  console.log(`  ❌ Directory detection error: ${error.message}`);
}

// Test 3: Configuration file permissions
console.log('\n🔐 Test 3: Configuration file security');
try {
  const configPath = './config/environments.json';
  const stats = fs.statSync(configPath);
  const permissions = (stats.mode & parseInt('777', 8)).toString(8);
  
  console.log(`  📄 Config file: ${configPath}`);
  console.log(`  🔐 Permissions: ${permissions}`);
  
  // Check if file is readable by others
  const isWorldReadable = (stats.mode & parseInt('044', 8)) !== 0;
  console.log(`  👁️  World readable: ${isWorldReadable ? '⚠️  YES (potential security risk)' : '✅ NO'}`);
  
  // Check if file is writable by group/others
  const isWorldWritable = (stats.mode & parseInt('022', 8)) !== 0;
  console.log(`  ✏️  World writable: ${isWorldWritable ? '❌ YES (security risk)' : '✅ NO'}`);
  
} catch (error) {
  console.log(`  ❌ File permission check error: ${error.message}`);
}

// Test 4: Environment variable isolation
console.log('\n🔐 Test 4: Environment variable isolation');
try {
  // Check that PAT tokens are not accidentally exposed in environment
  const envVars = Object.keys(process.env);
  const suspiciousEnvVars = envVars.filter(key => 
    key.toLowerCase().includes('pat') || 
    key.toLowerCase().includes('token') ||
    key.toLowerCase().includes('azure')
  );
  
  console.log(`  🌍 Environment variables checked: ${envVars.length}`);
  console.log(`  🔍 Suspicious variables found: ${suspiciousEnvVars.length}`);
  
  if (suspiciousEnvVars.length > 0) {
    console.log('  ⚠️  Potentially sensitive environment variables:');
    for (const envVar of suspiciousEnvVars) {
      const value = process.env[envVar];
      const maskedValue = value && value.length > 8 ? 
        `${value.substring(0, 4)}***${value.substring(value.length - 2)}` : 
        'EMPTY';
      console.log(`      ${envVar}: ${maskedValue}`);
    }
  }
  
} catch (error) {
  console.log(`  ❌ Environment check error: ${error.message}`);
}

// Test 5: Configuration validation against known security patterns
console.log('\n🔐 Test 5: Security pattern validation');
try {
  const config = ConfigLoader.loadConfig();
  
  for (const mapping of config.mappings) {
    const pat = mapping.config.pat;
    
    console.log(`  🔍 Validating ${mapping.config.project} PAT token:`);
    
    // Check PAT length (Azure DevOps PATs are typically 52+ characters)
    const hasValidLength = pat && pat.length >= 52;
    console.log(`      Length check: ${hasValidLength ? '✅ VALID' : '❌ TOO SHORT'}`);
    
    // Check for placeholder tokens
    const isPlaceholder = pat === 'YOUR_PAT_TOKEN' || pat === 'DEFAULT_PAT_TOKEN' || pat === '';
    console.log(`      Placeholder check: ${isPlaceholder ? '❌ PLACEHOLDER' : '✅ REAL TOKEN'}`);
    
    // Check character composition (Azure PATs are base64-like)
    const hasValidChars = pat && /^[A-Za-z0-9+/=]+$/.test(pat);
    console.log(`      Character validation: ${hasValidChars ? '✅ VALID' : '❌ INVALID CHARS'}`);
  }
  
} catch (error) {
  console.log(`  ❌ Security validation error: ${error.message}`);
}

console.log('\n✅ Security validation tests completed!');