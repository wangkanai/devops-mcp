#!/usr/bin/env node

/**
 * Test script to verify MCP server communication
 */

const { spawn } = require('child_process');

function testMCPServer(command, args = []) {
  console.log(`Testing MCP server: ${command} ${args.join(' ')}`);
  
  return new Promise((resolve, reject) => {
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

    // Send MCP initialize request
    const initRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "test-client",
          version: "1.0.0"
        }
      }
    };

    setTimeout(() => {
      console.log('Sending initialize request...');
      child.stdin.write(JSON.stringify(initRequest) + '\n');
    }, 100);

    setTimeout(() => {
      child.kill();
      console.log('Stdout:', stdout);
      console.log('Stderr:', stderr);
      
      if (stdout.includes('"result"') && stdout.includes('"capabilities"')) {
        console.log('✅ MCP server responded correctly');
        resolve(true);
      } else {
        console.log('❌ MCP server did not respond correctly');
        resolve(false);
      }
    }, 2000);

    child.on('error', (error) => {
      console.log('Process error:', error.message);
      reject(error);
    });
  });
}

async function runTests() {
  console.log('=== Testing MCP Server Communication ===\n');

  // Test 1: Direct node execution
  console.log('Test 1: Direct node execution');
  try {
    await testMCPServer('node', ['dist/index.js']);
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: NPX execution
  console.log('Test 2: NPX execution');
  try {
    await testMCPServer('npx', ['@wangkanai/devops-mcp']);
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: NPX with devops-mcp binary
  console.log('Test 3: NPX with binary name');
  try {
    await testMCPServer('npx', ['devops-mcp']);
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }
}

if (require.main === module) {
  runTests().catch(console.error);
}