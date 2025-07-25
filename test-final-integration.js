#!/usr/bin/env node

/**
 * Final integration test for devops-mcp NPM package
 * Tests both NPX execution methods
 */

const { spawn } = require('child_process');

async function testNpxExecution(command, args, testName) {
  return new Promise((resolve) => {
    console.log(`\n🧪 Testing: ${testName}`);
    console.log(`Command: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    // Kill the process after 3 seconds since MCP servers run indefinitely
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
    }, 3000);
    
    child.on('close', (code) => {
      clearTimeout(timeout);
      
      const started = stdout.includes('Azure DevOps MCP Proxy Server started') || 
                     stderr.includes('Azure DevOps MCP Proxy Server started');
      const hasConfig = stdout.includes('No local configuration found') || 
                       stderr.includes('No local configuration found') ||
                       stdout.includes('Azure DevOps MCP Proxy initialized') ||
                       stderr.includes('Azure DevOps MCP Proxy initialized');
      
      if (started && hasConfig) {
        console.log('✅ SUCCESS: Server started correctly');
        resolve({ success: true, stdout, stderr });
      } else {
        console.log('❌ FAILED: Server did not start properly');
        console.log('stdout:', stdout);
        console.log('stderr:', stderr);
        resolve({ success: false, stdout, stderr });
      }
    });
    
    child.on('error', (error) => {
      clearTimeout(timeout);
      console.log('❌ ERROR:', error.message);
      resolve({ success: false, error: error.message });
    });
  });
}

async function runTests() {
  console.log('🚀 Testing devops-mcp NPX integration\n');
  
  // Test 1: npx devops-mcp (recommended)
  const test1 = await testNpxExecution('npx', ['devops-mcp'], 'npx devops-mcp');
  
  // Test 2: npx @wangkanai/devops-mcp (alternative)
  const test2 = await testNpxExecution('npx', ['@wangkanai/devops-mcp'], 'npx @wangkanai/devops-mcp');
  
  console.log('\n📊 Test Results Summary:');
  console.log(`  npx devops-mcp: ${test1.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  npx @wangkanai/devops-mcp: ${test2.success ? '✅ PASS' : '❌ FAIL'}`);
  
  if (test1.success && test2.success) {
    console.log('\n🎉 ALL TESTS PASSED! Claude MCP integration should work correctly.');
    console.log('\n💡 Recommended Claude MCP command:');
    console.log('   claude mcp add devops-mcp -- npx devops-mcp');
    console.log('\n💡 Alternative Claude MCP command:');
    console.log('   claude mcp add devops-mcp -- npx @wangkanai/devops-mcp');
  } else {
    console.log('\n❌ Some tests failed. Check the output above for details.');
  }
}

runTests().catch(console.error);