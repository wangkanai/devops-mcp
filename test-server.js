#!/usr/bin/env node

/**
 * Test script for Azure DevOps MCP Proxy Server
 * Simulates MCP client requests to test the server functionality
 */

const { spawn } = require('child_process');
const path = require('path');

async function testServer() {
  console.log('Starting Azure DevOps MCP Proxy Server test...');
  
  // Start the server
  const serverPath = path.join(__dirname, 'dist', 'index.js');
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'inherit']
  });

  // Test initialize request
  const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  };

  console.log('Sending initialize request...');
  server.stdin.write(JSON.stringify(initRequest) + '\n');

  // Test list tools request
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  };

  setTimeout(() => {
    console.log('Sending list tools request...');
    server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
  }, 1000);

  // Test get current context
  const contextRequest = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'get-current-context',
      arguments: {
        directory: '/Users/wangkanai/Sources/riversync'
      }
    }
  };

  setTimeout(() => {
    console.log('Sending get current context request...');
    server.stdin.write(JSON.stringify(contextRequest) + '\n');
  }, 2000);

  // Listen for responses
  server.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => {
      try {
        const response = JSON.parse(line);
        console.log('Server response:', JSON.stringify(response, null, 2));
      } catch (e) {
        console.log('Raw output:', line);
      }
    });
  });

  // Clean up after 10 seconds
  setTimeout(() => {
    console.log('Test completed, shutting down server...');
    server.kill();
    process.exit(0);
  }, 10000);

  server.on('error', (error) => {
    console.error('Server error:', error);
  });

  server.on('exit', (code) => {
    console.log(`Server exited with code ${code}`);
  });
}

testServer().catch(console.error);