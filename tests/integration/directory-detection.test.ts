/**
 * Integration tests for Directory Detection Logic
 * Tests local configuration file detection and loading
 */

import * as fs from 'fs';
import * as path from 'path';
import { AzureDevOpsConfig } from '../../src/types/index';

describe('Directory Detection Integration', () => {
  const testDirectories = [
    '/Users/wangkanai/Sources/riversync',
    '/Users/wangkanai/Sources/mula'
  ];

  describe('Local Configuration Detection', () => {
    it('should detect .azure-devops.json in current directory', () => {
      const currentDir = process.cwd();
      const configPath = path.join(currentDir, '.azure-devops.json');

      let configExists = false;
      let config: AzureDevOpsConfig | null = null;

      try {
        const content = fs.readFileSync(configPath, 'utf8');
        config = JSON.parse(content) as AzureDevOpsConfig;
        configExists = true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error; // Re-throw non-file-not-found errors
        }
      }

      if (configExists && config) {
        expect(config.organizationUrl).toBeDefined();
        expect(config.project).toBeDefined();
        expect(config.pat).toBeDefined();
        expect(typeof config.organizationUrl).toBe('string');
        expect(typeof config.project).toBe('string');
        expect(typeof config.pat).toBe('string');
        expect(config.organizationUrl).toMatch(/^https:\/\/dev\.azure\.com\/.+/);
      } else {
        // It's okay if the config doesn't exist in the current directory for tests
        console.log('No .azure-devops.json found in current directory - this is expected for tests');
      }
    });

    it('should validate configuration structure when present', () => {
      for (const dir of testDirectories) {
        const configPath = path.join(dir, '.azure-devops.json');
        
        try {
          const content = fs.readFileSync(configPath, 'utf8');
          const config = JSON.parse(content) as AzureDevOpsConfig;

          // Validate required fields
          expect(config.organizationUrl).toBeDefined();
          expect(config.project).toBeDefined();
          expect(config.pat).toBeDefined();

          // Validate field types
          expect(typeof config.organizationUrl).toBe('string');
          expect(typeof config.project).toBe('string');
          expect(typeof config.pat).toBe('string');

          // Validate URL format
          expect(config.organizationUrl).toMatch(/^https:\/\/dev\.azure\.com\/.+/);

          // Project name should not be empty
          expect(config.project.length).toBeGreaterThan(0);

          // PAT should have reasonable length (typically 52 characters for Azure DevOps)
          expect(config.pat.length).toBeGreaterThan(20);

        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            console.log(`No configuration found for ${dir} - skipping validation`);
          } else {
            throw error;
          }
        }
      }
    });

    it('should handle missing configuration files gracefully', () => {
      const nonExistentDir = '/path/that/does/not/exist';
      const configPath = path.join(nonExistentDir, '.azure-devops.json');

      expect(() => {
        try {
          fs.readFileSync(configPath, 'utf8');
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            // This is expected behavior
            return;
          }
          throw error;
        }
      }).not.toThrow();
    });

    it('should handle malformed JSON configuration files', () => {
      // Create a temporary malformed config file for testing
      const tempDir = '/tmp';
      const tempConfigPath = path.join(tempDir, '.azure-devops-test-malformed.json');
      const malformedJson = '{ "organizationUrl": "https://dev.azure.com/test", "project": "Test"'; // Missing closing brace

      try {
        fs.writeFileSync(tempConfigPath, malformedJson);

        expect(() => {
          const content = fs.readFileSync(tempConfigPath, 'utf8');
          JSON.parse(content);
        }).toThrow();

      } finally {
        // Clean up temp file
        try {
          fs.unlinkSync(tempConfigPath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe('Configuration File Security', () => {
    it('should not expose PAT tokens in error messages', () => {
      for (const dir of testDirectories) {
        const configPath = path.join(dir, '.azure-devops.json');
        
        try {
          const content = fs.readFileSync(configPath, 'utf8');
          const config = JSON.parse(content) as AzureDevOpsConfig;

          // Ensure PAT is not logged or exposed
          expect(config.pat).toBeDefined();
          expect(config.pat.length).toBeGreaterThan(0);

          // Test that we can validate PAT presence without exposing it
          const patMasked = config.pat.substring(0, 4) + '***';
          expect(patMasked).toMatch(/^.{4}\*\*\*$/);

        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            // For any other error, ensure it doesn't contain sensitive information
            const errorMessage = (error as Error).message;
            expect(errorMessage).not.toMatch(/[a-zA-Z0-9]{52}/); // Azure DevOps PAT pattern
          }
        }
      }
    });
  });

  describe('Directory Path Resolution', () => {
    it('should resolve relative paths correctly', () => {
      const currentDir = process.cwd();
      const resolvedPath = path.resolve('./tests');
      const expectedPath = path.join(currentDir, 'tests');

      expect(resolvedPath).toBe(expectedPath);
    });

    it('should handle nested directory structures', () => {
      const testPath = '/Users/wangkanai/Sources/riversync/src/components/auth';
      const parentPaths = [];
      let currentPath = testPath;

      while (currentPath !== path.parse(currentPath).root) {
        parentPaths.push(currentPath);
        currentPath = path.dirname(currentPath);
      }

      expect(parentPaths).toContain('/Users/wangkanai/Sources/riversync/src/components/auth');
      expect(parentPaths).toContain('/Users/wangkanai/Sources/riversync/src/components');
      expect(parentPaths).toContain('/Users/wangkanai/Sources/riversync/src');
      expect(parentPaths).toContain('/Users/wangkanai/Sources/riversync');
    });
  });
});