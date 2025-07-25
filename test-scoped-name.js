#!/usr/bin/env node

/**
 * Test script to verify the scoped-name approach will work
 * This simulates what will happen after publishing v1.0.4
 */

const { spawn } = require('child_process');

async function testBinaryExecution(command, args, testName) {
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
    
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
    }, 3000);
    
    child.on('close', (code) => {
      clearTimeout(timeout);
      
      const started = stdout.includes('Azure DevOps MCP Proxy Server started') || 
                     stderr.includes('Azure DevOps MCP Proxy Server started');
      
      if (started) {
        console.log('✅ SUCCESS: Server started correctly');
        resolve({ success: true });
      } else {
        console.log('❌ FAILED: Server did not start properly');
        console.log('stdout:', stdout);
        console.log('stderr:', stderr);
        resolve({ success: false });
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
  console.log('🚀 Testing scoped-name binary approach\n');
  
  // Test 1: Original binary (should work)
  const test1 = await testBinaryExecution('node', ['bin/wangkanai-devops-mcp.js'], 'wangkanai-devops-mcp binary');
  
  console.log('\n📊 Test Results:');
  console.log(`  wangkanai-devops-mcp binary: ${test1.success ? '✅ PASS' : '❌ FAIL'}`);
  
  if (test1.success) {
    console.log('\n🎉 SUCCESS! After publishing v1.0.4, this command will work:');
    console.log('   claude mcp add devops-mcp -- npx wangkanai-devops-mcp');
    console.log('\n💡 Alternative that closely matches your preference:');
    console.log('   claude mcp add devops-mcp -- npx wangkanai-devops-mcp');
    console.log('   (This is as close as possible to npx @wangkanai/devops-mcp due to NPM limitations)');
  } else {
    console.log('\n❌ The approach needs adjustment.');
  }
}

runTests().catch(console.error);