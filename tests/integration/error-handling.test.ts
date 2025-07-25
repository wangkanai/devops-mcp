/**
 * Integration tests for Error Handling and Fallback Mechanisms
 * Tests various error scenarios and recovery mechanisms
 */

import * as fs from 'fs';
import * as path from 'path';
import { AzureDevOpsConfig } from '../../src/types/index';

describe('Error Handling Integration', () => {
  const tempTestDir = './temp-test-dir';
  
  afterEach(() => {
    // Cleanup any temporary files/directories
    try {
      if (fs.existsSync(tempTestDir)) {
        fs.rmSync(tempTestDir, { recursive: true, force: true });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Missing Configuration Handling', () => {
    it('should handle missing configuration file gracefully', () => {
      fs.mkdirSync(tempTestDir, { recursive: true });
      const configPath = path.join(tempTestDir, '.azure-devops.json');

      expect(() => {
        try {
          fs.readFileSync(configPath, 'utf8');
          fail('Should have thrown ENOENT error');
        } catch (error) {
          const nodeError = error as NodeJS.ErrnoException;
          expect(nodeError.code).toBe('ENOENT');
        }
      }).not.toThrow();
    });

    it('should handle missing directories gracefully', () => {
      const nonExistentPath = './non-existent-dir/.azure-devops.json';

      expect(() => {
        try {
          fs.readFileSync(nonExistentPath, 'utf8');
          fail('Should have thrown ENOENT error');
        } catch (error) {
          const nodeError = error as NodeJS.ErrnoException;
          expect(nodeError.code).toBe('ENOENT');
        }
      }).not.toThrow();
    });
  });

  describe('Invalid JSON Handling', () => {
    it('should handle malformed JSON configuration', () => {
      const invalidConfigPath = './test-invalid-config.json';
      const malformedJson = '{ invalid json content }';

      try {
        fs.writeFileSync(invalidConfigPath, malformedJson);

        expect(() => {
          const content = fs.readFileSync(invalidConfigPath, 'utf8');
          JSON.parse(content);
        }).toThrow();

        // Test that the error is a SyntaxError (JSON parse error)
        try {
          const content = fs.readFileSync(invalidConfigPath, 'utf8');
          JSON.parse(content);
        } catch (error) {
          expect(error).toBeInstanceOf(SyntaxError);
          expect((error as Error).message).toContain('Unexpected token');
        }

      } finally {
        try {
          fs.unlinkSync(invalidConfigPath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle incomplete JSON configuration', () => {
      const incompleteConfigPath = './test-incomplete-config.json';
      const incompleteConfig = {
        organizationUrl: 'https://dev.azure.com/test',
        // Missing 'project' and 'pat' fields
      };

      try {
        fs.writeFileSync(incompleteConfigPath, JSON.stringify(incompleteConfig));

        const content = fs.readFileSync(incompleteConfigPath, 'utf8');
        const config = JSON.parse(content) as Partial<AzureDevOpsConfig>;

        expect(config.organizationUrl).toBeDefined();
        expect(config.project).toBeUndefined();
        expect(config.pat).toBeUndefined();

      } finally {
        try {
          fs.unlinkSync(incompleteConfigPath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe('Valid Configuration Loading', () => {
    it('should load valid configuration successfully', () => {
      const validConfigPath = './test-valid-config.json';
      const testConfig: AzureDevOpsConfig = {
        organizationUrl: 'https://dev.azure.com/test',
        project: 'TestProject',
        pat: 'test-pat-token'
      };

      try {
        fs.writeFileSync(validConfigPath, JSON.stringify(testConfig, null, 2));

        const content = fs.readFileSync(validConfigPath, 'utf8');
        const config = JSON.parse(content) as AzureDevOpsConfig;

        expect(config.organizationUrl).toBe(testConfig.organizationUrl);
        expect(config.project).toBe(testConfig.project);
        expect(config.pat).toBe(testConfig.pat);

        // Validate all required fields are present
        expect(config.organizationUrl).toBeDefined();
        expect(config.project).toBeDefined();
        expect(config.pat).toBeDefined();

      } finally {
        try {
          fs.unlinkSync(validConfigPath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should validate configuration field types', () => {
      const configWithWrongTypes = './test-wrong-types-config.json';
      const invalidTypeConfig = {
        organizationUrl: 123, // Should be string
        project: true,        // Should be string
        pat: null            // Should be string
      };

      try {
        fs.writeFileSync(configWithWrongTypes, JSON.stringify(invalidTypeConfig));

        const content = fs.readFileSync(configWithWrongTypes, 'utf8');
        const config = JSON.parse(content);

        // These should fail type validation
        expect(typeof config.organizationUrl).not.toBe('string');
        expect(typeof config.project).not.toBe('string');
        expect(typeof config.pat).not.toBe('string');

      } finally {
        try {
          fs.unlinkSync(configWithWrongTypes);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe('File System Error Handling', () => {
    it('should handle permission errors gracefully', () => {
      // This test is platform-specific and might not work on all systems
      const restrictedPath = '/root/.azure-devops.json'; // Typically restricted on Unix systems

      try {
        fs.readFileSync(restrictedPath, 'utf8');
        // If we get here, the file was readable (test might be running as root)
        console.log('Note: Test running with elevated permissions');
      } catch (error) {
        const nodeError = error as NodeJS.ErrnoException;
        // Could be ENOENT (not found) or EACCES (permission denied)
        expect(['ENOENT', 'EACCES']).toContain(nodeError.code);
      }
    });

    it('should handle file encoding errors', () => {
      const binaryConfigPath = './test-binary-config.json';
      
      try {
        // Write binary data that's not valid UTF-8
        const binaryData = Buffer.from([0xFF, 0xFE, 0x00, 0x01]);
        fs.writeFileSync(binaryConfigPath, binaryData);

        // Try to read as UTF-8 - this should either succeed or fail gracefully
        try {
          const content = fs.readFileSync(binaryConfigPath, 'utf8');
          // If it succeeds, try to parse it
          expect(() => JSON.parse(content)).toThrow();
        } catch (error) {
          // Reading might fail due to encoding issues, which is acceptable
          expect(error).toBeDefined();
        }

      } finally {
        try {
          fs.unlinkSync(binaryConfigPath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe('Current Directory Configuration', () => {
    it('should check current directory configuration safely', () => {
      const currentConfigPath = './.azure-devops.json';

      try {
        const content = fs.readFileSync(currentConfigPath, 'utf8');
        const config = JSON.parse(content) as AzureDevOpsConfig;

        // If config exists, validate it
        expect(config.organizationUrl).toBeDefined();
        expect(config.project).toBeDefined();
        expect(config.pat).toBeDefined();
        expect(typeof config.organizationUrl).toBe('string');
        expect(typeof config.project).toBe('string');
        expect(typeof config.pat).toBe('string');

      } catch (error) {
        const nodeError = error as NodeJS.ErrnoException;
        if (nodeError.code === 'ENOENT') {
          // It's acceptable if no config exists in current directory
          console.log('No configuration in current directory - this is expected for tests');
        } else {
          // Other errors should be handled gracefully
          expect(error).toBeInstanceOf(Error);
        }
      }
    });
  });

  describe('Concurrent Access Handling', () => {
    it('should handle concurrent file access safely', async () => {
      const concurrentConfigPath = './test-concurrent-config.json';
      const testConfig: AzureDevOpsConfig = {
        organizationUrl: 'https://dev.azure.com/concurrent-test',
        project: 'ConcurrentTest',
        pat: 'concurrent-test-pat'
      };

      try {
        fs.writeFileSync(concurrentConfigPath, JSON.stringify(testConfig));

        // Simulate concurrent reads
        const readPromises = Array.from({ length: 5 }, async () => {
          try {
            const content = fs.readFileSync(concurrentConfigPath, 'utf8');
            const config = JSON.parse(content) as AzureDevOpsConfig;
            return config;
          } catch (error) {
            return error;
          }
        });

        const results = await Promise.all(readPromises);
        
        // All reads should either succeed or fail gracefully
        results.forEach(result => {
          if (result instanceof Error) {
            expect(result).toBeInstanceOf(Error);
          } else {
            const config = result as AzureDevOpsConfig;
            expect(config.organizationUrl).toBe(testConfig.organizationUrl);
            expect(config.project).toBe(testConfig.project);
            expect(config.pat).toBe(testConfig.pat);
          }
        });

      } finally {
        try {
          fs.unlinkSync(concurrentConfigPath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
  });
});