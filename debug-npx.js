#!/usr/bin/env node

/**
 * Debug script to understand NPX behavior with scoped packages
 */

const { execSync, spawn } = require('child_process');

console.log('🔍 Debugging NPX behavior with scoped packages\n');

// Test 1: Check what NPX actually installs
console.log('1. Testing NPX package resolution...');
try {
  const result = execSync('npm view @wangkanai/devops-mcp bin', { encoding: 'utf8' });
  console.log('✅ Published binaries:', result.trim());
} catch (error) {
  console.log('❌ Error viewing package:', error.message);
}

// Test 2: Check what NPX does step by step
console.log('\n2. Testing NPX execution with verbose output...');
const npxProcess = spawn('npx', ['--verbose', '@wangkanai/devops-mcp'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let stdout = '';
let stderr = '';

npxProcess.stdout.on('data', (data) => {
  stdout += data.toString();
});

npxProcess.stderr.on('data', (data) => {
  stderr += data.toString();
});

setTimeout(() => {
  npxProcess.kill('SIGTERM');
}, 5000);

npxProcess.on('close', (code) => {
  console.log('NPX stdout:', stdout);
  console.log('NPX stderr:', stderr);
  console.log('NPX exit code:', code);
  
  // Test 3: Compare with Microsoft's package
  console.log('\n3. Testing Microsoft\'s package for comparison...');
  const msProcess = spawn('npx', ['--verbose', '@azure-devops/mcp', '--help'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let msStdout = '';
  let msStderr = '';
  
  msProcess.stdout.on('data', (data) => {
    msStdout += data.toString();
  });
  
  msProcess.stderr.on('data', (data) => {
    msStderr += data.toString();
  });
  
  setTimeout(() => {
    msProcess.kill('SIGTERM');
  }, 5000);
  
  msProcess.on('close', (code) => {
    console.log('\n📊 Microsoft\'s package results:');
    console.log('MS stdout:', msStdout);
    console.log('MS stderr:', msStderr);
    console.log('MS exit code:', code);
    
    console.log('\n💡 Analysis complete. Compare the outputs to identify differences.');
  });
});