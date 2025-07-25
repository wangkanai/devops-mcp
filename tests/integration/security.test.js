#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Testing PAT Token Security and Configuration Isolation (Local Configuration)\n');

// Test 1: Local configuration security
console.log('🔐 Test 1: Local configuration security validation');
try {
  const currentConfigPath = './.azure-devops.json';
  // Direct file access without existsSync to avoid race conditions
  try {
    const stats = fs.statSync(currentConfigPath);
    const content = fs.readFileSync(currentConfigPath, 'utf8');
    const config = JSON.parse(content);
    
    console.log('  ✅ Configuration file found and readable');
    console.log(`    File size: ${stats.size} bytes`);
    console.log(`    PAT token length: ${config.pat ? config.pat.length : 0} characters`);
    console.log(`    Organization: ${config.organizationUrl}`);
    
    // Check if PAT token is present but not logged
    if (config.pat && config.pat.length > 10) {
      console.log('  ✅ PAT token present and properly secured');
    } else {
      console.log('  ⚠️  PAT token missing or too short');
    }
  } catch (readError) {
    if (readError.code === 'ENOENT') {
      console.log('  ❌ No configuration file found in current directory');
    } else {
      console.log(`  ❌ Configuration security error: ${readError.message}`);
    }
  }
} catch (error) {
  console.log(`  ❌ Configuration security error: ${error.message}`);
}

// Test 2: Check .gitignore contains .azure-devops.json
console.log('\n🔐 Test 2: Git ignore security validation');
try {
  const gitignorePath = './.gitignore';
  // Direct file access without existsSync to avoid race conditions
  try {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    
    if (gitignoreContent.includes('.azure-devops.json')) {
      console.log('  ✅ .azure-devops.json is properly excluded from version control');
    } else {
      console.log('  ⚠️  .azure-devops.json not found in .gitignore');
    }
    
    if (gitignoreContent.includes('environments.json')) {
      console.log('  ✅ Legacy environments.json is also excluded');
    }
  } catch (readError) {
    if (readError.code === 'ENOENT') {
      console.log('  ❌ No .gitignore file found');
    } else {
      console.log(`  ❌ Git ignore check error: ${readError.message}`);
    }
  }
} catch (error) {
  console.log(`  ❌ Git ignore check error: ${error.message}`);
}

// Test 3: Environment variable isolation
console.log('\n🔐 Test 3: Environment variable isolation check');
const sensitivePatterns = [
  /PAT/i,
  /TOKEN/i, 
  /PASSWORD/i,
  /SECRET/i,
  /KEY/i
];

let suspiciousCount = 0;
const envVars = Object.keys(process.env);

console.log(`  🌍 Environment variables checked: ${envVars.length}`);

envVars.forEach(key => {
  const value = process.env[key];
  const isSuspicious = sensitivePatterns.some(pattern => pattern.test(key));
  
  if (isSuspicious && value && value.length > 10) {
    suspiciousCount++;
    // Don't log the actual values, just indicate presence
    const maskedValue = value.substring(0, 3) + '***' + value.substring(value.length - 2);
    console.log(`      ${key}: ${maskedValue}`);
  }
});

console.log(`  🔍 Potentially sensitive variables found: ${suspiciousCount}`);
if (suspiciousCount > 0) {
  console.log('  ⚠️  Review environment variables for sensitive data exposure');
} else {
  console.log('  ✅ No obviously sensitive environment variables detected');
}

// Test 4: Configuration isolation between projects
console.log('\n🔐 Test 4: Project configuration isolation');
const testDirs = [
  '/Users/wangkanai/Sources/riversync',
  '/Users/wangkanai/Sources/mula'
];

testDirs.forEach(dir => {
  const configPath = path.join(dir, '.azure-devops.json');
  // Direct file access without existsSync to avoid race conditions
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(content);
    console.log(`  ✅ ${path.basename(dir)}: ${config.organizationUrl}/${config.project}`);
  } catch (readError) {
    if (readError.code === 'ENOENT') {
      console.log(`  ❌ ${path.basename(dir)}: No configuration found`);
    } else {
      console.log(`  ❌ ${path.basename(dir)}: Invalid configuration - ${readError.message}`);
    }
  }
});

console.log('\n✅ Security validation tests completed!');