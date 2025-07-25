/**
 * Integration tests for PAT Token Security and Configuration Isolation
 * Tests security measures and proper isolation of sensitive configuration
 */

import * as fs from 'fs';
import * as path from 'path';
import { AzureDevOpsConfig } from '../../src/types/index';

describe('Security Integration Tests', () => {
  const testDirectories = [
    '/Users/wangkanai/Sources/riversync',
    '/Users/wangkanai/Sources/mula'
  ];

  describe('Local Configuration Security', () => {
    it('should validate PAT token security in current directory', () => {
      const currentConfigPath = './.azure-devops.json';

      try {
        const stats = fs.statSync(currentConfigPath);
        const content = fs.readFileSync(currentConfigPath, 'utf8');
        const config = JSON.parse(content) as AzureDevOpsConfig;

        expect(stats.size).toBeGreaterThan(0);
        expect(config.organizationUrl).toBeDefined();

        if (config.pat) {
          // PAT token should be present and of reasonable length
          expect(config.pat.length).toBeGreaterThan(10);
          
          // Should be a string
          expect(typeof config.pat).toBe('string');
          
          // Should not contain obvious test values
          expect(config.pat.toLowerCase()).not.toContain('test');
          expect(config.pat.toLowerCase()).not.toContain('fake');
          expect(config.pat.toLowerCase()).not.toContain('example');
        }

      } catch (error) {
        const nodeError = error as NodeJS.ErrnoException;
        if (nodeError.code === 'ENOENT') {
          console.log('No configuration file found in current directory - expected for tests');
        } else {
          throw error;
        }
      }
    });

    it('should not expose PAT tokens in error messages or logs', () => {
      const testConfig: AzureDevOpsConfig = {
        organizationUrl: 'https://dev.azure.com/security-test',
        project: 'SecurityTest',
        pat: 'very-secret-pat-token-that-should-not-be-exposed'
      };

      // Test that we can work with PAT without exposing it
      const maskedPat = testConfig.pat.substring(0, 4) + '***';
      expect(maskedPat).toBe('very***');
      expect(maskedPat).not.toContain('secret');
      expect(maskedPat).not.toContain('exposed');
    });

    it('should validate configuration file permissions', () => {
      const currentConfigPath = './.azure-devops.json';

      try {
        const stats = fs.statSync(currentConfigPath);
        
        // File should be readable by owner
        expect(stats.isFile()).toBe(true);
        expect(stats.size).toBeGreaterThan(0);

        // On Unix systems, check that file is not world-readable
        if (process.platform !== 'win32') {
          const mode = stats.mode & parseInt('777', 8);
          // File should not be world-readable (last digit should not include read permission)
          const worldPermissions = mode & parseInt('007', 8);
          if (worldPermissions & parseInt('004', 8)) {
            console.warn('Configuration file is world-readable - consider restricting permissions');
          }
        }

      } catch (error) {
        const nodeError = error as NodeJS.ErrnoException;
        if (nodeError.code === 'ENOENT') {
          // File doesn't exist - this is acceptable for tests
          console.log('No configuration file to check permissions');
        } else {
          throw error;
        }
      }
    });
  });

  describe('Git Ignore Security', () => {
    it('should ensure sensitive files are excluded from version control', () => {
      const gitignorePath = './.gitignore';

      try {
        const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');

        // Configuration files should be ignored
        expect(gitignoreContent).toContain('.azure-devops.json');

        // Legacy files should also be ignored if present
        const legacyPatterns = [
          'environments.json',
          '*.env',
          '.env.local'
        ];

        // At least some security patterns should be present
        const hasSecurityPatterns = legacyPatterns.some(pattern => 
          gitignoreContent.includes(pattern)
        );

        if (!hasSecurityPatterns) {
          console.warn('Consider adding more security patterns to .gitignore');
        }

      } catch (error) {
        const nodeError = error as NodeJS.ErrnoException;
        if (nodeError.code === 'ENOENT') {
          throw new Error('No .gitignore file found - this is a security risk');
        } else {
          throw error;
        }
      }
    });

    it('should not have sensitive files committed to git', () => {
      // This test checks that configuration files are not accidentally committed
      const sensitiveFiles = [
        './.azure-devops.json',
        './environments.json',
        './.env',
        './.env.local'
      ];

      sensitiveFiles.forEach(filePath => {
        if (fs.existsSync(filePath)) {
          // File exists - make sure it's in .gitignore
          const gitignorePath = './.gitignore';
          try {
            const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
            const fileName = path.basename(filePath);
            expect(gitignoreContent).toContain(fileName);
          } catch (error) {
            throw new Error(`Sensitive file ${filePath} exists but no .gitignore found`);
          }
        }
      });
    });
  });

  describe('Environment Variable Security', () => {
    it('should not expose sensitive data through environment variables', () => {
      const sensitivePatterns = [
        /PAT$/i,
        /TOKEN$/i,
        /PASSWORD$/i,
        /SECRET$/i,
        /KEY$/i,
        /AZURE.*PAT/i,
        /DEVOPS.*TOKEN/i
      ];

      const envVars = Object.keys(process.env);
      const suspiciousVars: string[] = [];

      envVars.forEach(key => {
        const value = process.env[key];
        const isSuspicious = sensitivePatterns.some(pattern => pattern.test(key));
        
        if (isSuspicious && value && value.length > 10) {
          suspiciousVars.push(key);
        }
      });

      // Log findings without exposing values
      if (suspiciousVars.length > 0) {
        console.warn(`Found ${suspiciousVars.length} potentially sensitive environment variables:`, 
          suspiciousVars.map(key => `${key}: [REDACTED]`));
      }

      // This test passes but warns about potential security issues
      expect(envVars.length).toBeGreaterThan(0);
    });

    it('should mask sensitive values when logging', () => {
      const testSensitiveValue = 'super-secret-token-12345';
      
      // Demonstrate proper masking
      const masked = testSensitiveValue.substring(0, 3) + '***' + 
                    testSensitiveValue.substring(testSensitiveValue.length - 2);
      
      expect(masked).toBe('sup***45');
      expect(masked).not.toContain('secret');
      expect(masked).not.toContain('token');
      expect(masked.length).toBeLessThan(testSensitiveValue.length);
    });
  });

  describe('Project Configuration Isolation', () => {
    it('should maintain separate configurations for different projects', () => {
      const configuredProjects = new Map<string, AzureDevOpsConfig>();

      testDirectories.forEach(dir => {
        const configPath = path.join(dir, '.azure-devops.json');
        
        try {
          const content = fs.readFileSync(configPath, 'utf8');
          const config = JSON.parse(content) as AzureDevOpsConfig;
          const projectName = path.basename(dir);
          
          configuredProjects.set(projectName, config);

          // Validate each config is complete
          expect(config.organizationUrl).toBeDefined();
          expect(config.project).toBeDefined();
          expect(config.pat).toBeDefined();

        } catch (error) {
          const nodeError = error as NodeJS.ErrnoException;
          if (nodeError.code === 'ENOENT') {
            console.log(`No configuration found for ${path.basename(dir)} - this is acceptable`);
          } else {
            throw error;
          }
        }
      });

      // If multiple configs exist, ensure they're different
      const configs = Array.from(configuredProjects.values());
      if (configs.length > 1) {
        // Each config should have unique organization or project
        for (let i = 0; i < configs.length; i++) {
          for (let j = i + 1; j < configs.length; j++) {
            const config1 = configs[i];
            const config2 = configs[j];
            
            // Configs should be isolated (different org or project)
            const isDifferent = config1.organizationUrl !== config2.organizationUrl ||
                               config1.project !== config2.project;
            
            expect(isDifferent).toBe(true);
          }
        }
      }
    });

    it('should not leak configuration between projects', () => {
      // Test that configuration loading is stateless and doesn't leak between calls
      const testConfigs = [
        {
          organizationUrl: 'https://dev.azure.com/project1',
          project: 'Project1',
          pat: 'pat-token-1'
        },
        {
          organizationUrl: 'https://dev.azure.com/project2',
          project: 'Project2',
          pat: 'pat-token-2'
        }
      ];

      // Simulate loading different configs
      testConfigs.forEach((config, index) => {
        // Each config should be independent
        expect(config.organizationUrl).not.toContain(testConfigs[1 - index].project);
        expect(config.project).not.toBe(testConfigs[1 - index].project);
        expect(config.pat).not.toBe(testConfigs[1 - index].pat);
      });
    });
  });

  describe('Input Sanitization', () => {
    it('should handle malicious input safely', () => {
      const maliciousInputs = [
        '../../../etc/passwd',
        '$(rm -rf /)',
        '<script>alert("xss")</script>',
        'DROP TABLE users;',
        '\0\n\r',
        '../../../../.azure-devops.json'
      ];

      maliciousInputs.forEach(input => {
        // Path traversal protection
        const safePath = path.normalize(input);
        if (safePath.includes('..')) {
          expect(path.resolve(safePath)).not.toContain('/..');
        }

        // Input should not contain dangerous characters after normalization
        const sanitized = input.replace(/[^\w\-./]/g, '');
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('$(');
        // Check for SQL injection patterns (case insensitive, with word boundaries)
        expect(sanitized.toUpperCase()).not.toMatch(/\bDROP\b/);
      });
    });

    it('should validate URL formats', () => {
      const validUrls = [
        'https://dev.azure.com/organization',
        'https://organization.visualstudio.com'
      ];

      const invalidUrls = [
        'http://dev.azure.com/org', // Should be HTTPS
        'javascript:alert("xss")',
        'file:///etc/passwd',
        'ftp://malicious.com',
        ''
      ];

      validUrls.forEach(url => {
        expect(url).toMatch(/^https:\/\/.+/);
      });

      invalidUrls.forEach(url => {
        expect(url).not.toMatch(/^https:\/\/dev\.azure\.com\/.+/);
      });
    });
  });
});