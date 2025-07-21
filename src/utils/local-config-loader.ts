/**
 * Local Configuration Loader
 * Reads .azure-devops.json files from repository directories
 */

import * as fs from 'fs';
import * as path from 'path';
import { AzureDevOpsConfig } from '../types/index.js';

export interface LocalAzureDevOpsConfig {
  organizationUrl: string;
  project: string;
  pat: string;
  description?: string;
  settings?: {
    timeout?: number;
    retries?: number;
    apiVersion?: string;
  };
  tools?: {
    workItems?: boolean;
    repositories?: boolean;
    builds?: boolean;
    pullRequests?: boolean;
    pipelines?: boolean;
  };
  meta?: {
    configVersion?: string;
    lastUpdated?: string;
    createdBy?: string;
  };
}

export class LocalConfigLoader {
  private static readonly CONFIG_FILE_NAME = '.azure-devops.json';

  /**
   * Load Azure DevOps configuration from local file in current directory
   */
  static loadLocalConfig(directory?: string): AzureDevOpsConfig | null {
    const workingDir = directory || process.cwd();
    const configPath = path.join(workingDir, this.CONFIG_FILE_NAME);

    try {
      if (!fs.existsSync(configPath)) {
        console.log(`No local Azure DevOps config found in ${workingDir}`);
        return null;
      }

      const configData = fs.readFileSync(configPath, 'utf8');
      const localConfig = JSON.parse(configData) as LocalAzureDevOpsConfig;

      // Validate required fields
      if (!localConfig.organizationUrl || !localConfig.project || !localConfig.pat) {
        throw new Error('Missing required fields: organizationUrl, project, or pat');
      }

      // Convert to internal config format
      const config: AzureDevOpsConfig = {
        organizationUrl: localConfig.organizationUrl,
        project: localConfig.project,
        pat: localConfig.pat
      };

      console.log(`Loaded Azure DevOps config from ${configPath}`);
      console.log(`Organization: ${config.organizationUrl}`);
      console.log(`Project: ${config.project}`);
      
      return config;
    } catch (error) {
      console.error(`Failed to load local config from ${configPath}:`, error);
      return null;
    }
  }

  /**
   * Check if local configuration file exists in directory
   */
  static hasLocalConfig(directory?: string): boolean {
    const workingDir = directory || process.cwd();
    const configPath = path.join(workingDir, this.CONFIG_FILE_NAME);
    return fs.existsSync(configPath);
  }

  /**
   * Search for configuration file in current directory and parent directories
   */
  static findLocalConfig(startDirectory?: string): AzureDevOpsConfig | null {
    let currentDir = startDirectory || process.cwd();
    const rootDir = path.parse(currentDir).root;

    while (currentDir !== rootDir) {
      const config = this.loadLocalConfig(currentDir);
      if (config) {
        return config;
      }

      // Move to parent directory
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        break; // Reached root
      }
      currentDir = parentDir;
    }

    console.log('No Azure DevOps configuration found in current directory tree');
    return null;
  }

  /**
   * Validate local configuration structure
   */
  static validateLocalConfig(config: LocalAzureDevOpsConfig): boolean {
    const requiredFields = ['organizationUrl', 'project', 'pat'];
    
    for (const field of requiredFields) {
      if (!(field in config) || !config[field as keyof LocalAzureDevOpsConfig]) {
        console.error(`Missing required field: ${field}`);
        return false;
      }
    }

    // Validate organization URL format
    try {
      const url = new URL(config.organizationUrl);
      if (!url.hostname.includes('dev.azure.com')) {
        console.error('Invalid organization URL: must be Azure DevOps URL');
        return false;
      }
    } catch {
      console.error('Invalid organization URL format');
      return false;
    }

    return true;
  }

  /**
   * Create example configuration file
   */
  static createExampleConfig(directory?: string): void {
    const workingDir = directory || process.cwd();
    const configPath = path.join(workingDir, this.CONFIG_FILE_NAME);

    const exampleConfig: LocalAzureDevOpsConfig = {
      organizationUrl: "https://dev.azure.com/your-org",
      project: "YourProject",
      pat: "your-pat-token-here",
      description: "Azure DevOps configuration for this repository",
      settings: {
        timeout: 30000,
        retries: 3,
        apiVersion: "7.1"
      },
      tools: {
        workItems: true,
        repositories: true,
        builds: true,
        pullRequests: true,
        pipelines: true
      },
      meta: {
        configVersion: "1.0",
        lastUpdated: new Date().toISOString().split('T')[0],
        createdBy: "azure-devops-mcp-proxy"
      }
    };

    try {
      fs.writeFileSync(configPath, JSON.stringify(exampleConfig, null, 2));
      console.log(`Created example configuration at ${configPath}`);
    } catch (error) {
      console.error(`Failed to create example configuration:`, error);
    }
  }
}