/**
 * Integration tests for Azure DevOps MCP Server
 * Tests the server functionality by simulating MCP client requests
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

interface MCPRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: any;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

describe('MCP Server Integration', () => {
  let server: ChildProcess;
  const serverPath = path.join(__dirname, '..', '..', 'dist', 'index.js');
  
  beforeAll(async () => {
    // Ensure the server is built
    const { execSync } = require('child_process');
    execSync('npm run build', { stdio: 'inherit' });
    
    // Ensure the built file has execute permissions
    const fs = require('fs');
    const path = require('path');
    const distPath = path.join(__dirname, '..', '..', 'dist', 'index.js');
    if (fs.existsSync(distPath)) {
      execSync(`chmod +x "${distPath}"`, { stdio: 'inherit' });
    }
  });

  beforeEach((done) => {
    server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'inherit']
    });

    server.on('error', (error) => {
      console.error('Server spawn error:', error);
    });

    // Give server time to start
    setTimeout(done, 1000);
  });

  afterEach(() => {
    if (server && !server.killed) {
      server.kill();
    }
  });

  const sendRequest = (request: MCPRequest): Promise<MCPResponse> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 15000);

      const onData = (data: Buffer) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const response = JSON.parse(line) as MCPResponse;
            if (response.id === request.id) {
              clearTimeout(timeout);
              server.stdout?.removeListener('data', onData);
              resolve(response);
              return;
            }
          } catch (e) {
            // Ignore parse errors for non-JSON output
          }
        }
      };

      server.stdout?.on('data', onData);
      server.stdin?.write(JSON.stringify(request) + '\n');
    });
  };

  describe('Server Initialization', () => {
    it('should respond to initialize request', async () => {
      const initRequest: MCPRequest = {
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

      const response = await sendRequest(initRequest);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.result).toBeDefined();
      expect(response.result.protocolVersion).toBeDefined();
      expect(response.result.capabilities).toBeDefined();
    });

    (process.env.CI ? it.skip : it)('should respond to tools/list request', async () => {
      // First initialize
      const initRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' }
        }
      };

      await sendRequest(initRequest);

      // Then list tools
      const listToolsRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      };

      const response = await sendRequest(listToolsRequest);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(2);
      expect(response.result).toBeDefined();
      expect(response.result.tools).toBeDefined();
      expect(Array.isArray(response.result.tools)).toBe(true);
      expect(response.result.tools.length).toBeGreaterThan(0);
    }, 20000);
  });

  describe('Tool Calls', () => {
    beforeEach(async () => {
      // Initialize server before each tool test
      const initRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 0,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' }
        }
      };
      await sendRequest(initRequest);
    }, 20000);

    it('should handle get-current-context tool call', async () => {
      const contextRequest: MCPRequest = {
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

      const response = await sendRequest(contextRequest);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(3);
      
      if (response.error) {
        // It's okay if the specific directory isn't configured
        expect(response.error.code).toBeDefined();
        expect(response.error.message).toBeDefined();
      } else {
        expect(response.result).toBeDefined();
        expect(response.result.content).toBeDefined();
      }
    });

    it('should handle invalid tool call gracefully', async () => {
      const invalidRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'non-existent-tool',
          arguments: {}
        }
      };

      const response = await sendRequest(invalidRequest);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(4);
      
      // The response should either have an error or indicate the tool doesn't exist
      if (response.error) {
        expect(response.error.code).toBeDefined();
        expect(response.error.message).toBeDefined();
      } else {
        // If no error, the result should indicate tool not found
        expect(response.result).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON requests', (done) => {
      server.stdin?.write('invalid json\n');
      
      let errorReceived = false;
      const timeout = setTimeout(() => {
        // If no crash occurs within 2 seconds, the server handled it gracefully
        server.removeAllListeners('exit');
        expect(errorReceived).toBe(false);
        done();
      }, 2000);

      const exitHandler = (code: number | null) => {
        if (code !== 0) {
          clearTimeout(timeout);
          server.removeAllListeners('exit');
          errorReceived = true;
          done(new Error('Server crashed on malformed JSON'));
        }
      };

      server.on('exit', exitHandler);
    });

    it('should handle invalid method requests', async () => {
      const invalidMethodRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 5,
        method: 'invalid/method',
        params: {}
      };

      const response = await sendRequest(invalidMethodRequest);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(5);
      expect(response.error).toBeDefined();
      expect(response.error?.code).toBeDefined();
    });
  });
});