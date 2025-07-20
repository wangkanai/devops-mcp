/**
 * Configuration Loader Utility
 * Loads and validates environment configuration from JSON files
 */

import * as fs from 'fs';
import * as path from 'path';
import { EnvironmentConfig } from '../types/index.js';

export class ConfigLoader {
  private static readonly DEFAULT_CONFIG_PATH = path.join(__dirname, '../../config/environments.json');

  /**
   * Load environment configuration from file
   */
  static loadConfig(configPath?: string): EnvironmentConfig {
    const filePath = configPath || this.DEFAULT_CONFIG_PATH;
    
    try {
      const configData = fs.readFileSync(filePath, 'utf8');
      const config = JSON.parse(configData) as EnvironmentConfig;
      
      this.validateConfig(config);
      return config;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load configuration from ${filePath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Validate configuration structure
   */
  private static validateConfig(config: EnvironmentConfig): void {
    if (!config.mappings || !Array.isArray(config.mappings)) {
      throw new Error('Configuration must have a mappings array');
    }

    for (const mapping of config.mappings) {
      if (!mapping.directory || !mapping.config) {
        throw new Error('Each mapping must have directory and config properties');
      }
      
      if (!mapping.config.organizationUrl || !mapping.config.pat || !mapping.config.project) {
        throw new Error('Each config must have organizationUrl, pat, and project properties');
      }
    }
  }

  /**
   * Check if configuration file exists
   */
  static configExists(configPath?: string): boolean {
    const filePath = configPath || this.DEFAULT_CONFIG_PATH;
    return fs.existsSync(filePath);
  }
}