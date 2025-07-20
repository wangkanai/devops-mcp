/**
 * Directory Detection Logic
 * Detects current working directory and maps to appropriate Azure DevOps configuration
 */

import * as path from 'path';
import { AzureDevOpsConfig, ProjectMapping } from './types/index.js';

export class DirectoryDetector {
  private mappings: Map<string, AzureDevOpsConfig> = new Map();
  private defaultConfig?: AzureDevOpsConfig;

  constructor(mappings: ProjectMapping[], defaultConfig?: AzureDevOpsConfig) {
    // Normalize and store mappings for efficient lookup
    for (const mapping of mappings) {
      const normalizedPath = path.resolve(mapping.directory);
      this.mappings.set(normalizedPath, mapping.config);
    }
    this.defaultConfig = defaultConfig;
  }

  /**
   * Detect Azure DevOps configuration based on current directory
   * Supports nested directory matching with closest match priority
   */
  detectConfiguration(currentDirectory?: string): AzureDevOpsConfig | null {
    const workingDir = currentDirectory || process.cwd();
    const normalizedPath = path.resolve(workingDir);

    // Find the longest matching path (most specific match)
    let bestMatch: string | null = null;
    let bestMatchLength = 0;

    for (const [mappedPath] of this.mappings) {
      if (normalizedPath.startsWith(mappedPath)) {
        if (mappedPath.length > bestMatchLength) {
          bestMatch = mappedPath;
          bestMatchLength = mappedPath.length;
        }
      }
    }

    if (bestMatch) {
      return this.mappings.get(bestMatch) || null;
    }

    // Try parent directory search up to root
    return this.searchParentDirectories(normalizedPath);
  }

  /**
   * Search parent directories for a match
   */
  private searchParentDirectories(currentPath: string): AzureDevOpsConfig | null {
    let searchPath = currentPath;
    const root = path.parse(searchPath).root;

    while (searchPath !== root) {
      searchPath = path.dirname(searchPath);
      
      for (const [mappedPath, config] of this.mappings) {
        if (searchPath === mappedPath || searchPath.startsWith(mappedPath + path.sep)) {
          return config;
        }
      }
    }

    return this.defaultConfig || null;
  }

  /**
   * Get the project name for the current directory
   */
  getProjectContext(currentDirectory?: string): { projectName: string; organizationUrl: string } | null {
    const config = this.detectConfiguration(currentDirectory);
    if (!config) {
      return null;
    }

    return {
      projectName: config.project,
      organizationUrl: config.organizationUrl
    };
  }

  /**
   * Check if a directory is configured for Azure DevOps
   */
  isConfiguredDirectory(currentDirectory?: string): boolean {
    return this.detectConfiguration(currentDirectory) !== null;
  }

  /**
   * Get all configured directory mappings
   */
  getConfiguredDirectories(): string[] {
    return Array.from(this.mappings.keys());
  }

  /**
   * Add a new directory mapping
   */
  addMapping(directory: string, config: AzureDevOpsConfig): void {
    const normalizedPath = path.resolve(directory);
    this.mappings.set(normalizedPath, config);
  }

  /**
   * Remove a directory mapping
   */
  removeMapping(directory: string): boolean {
    const normalizedPath = path.resolve(directory);
    return this.mappings.delete(normalizedPath);
  }

  /**
   * Update default configuration
   */
  setDefaultConfig(config: AzureDevOpsConfig): void {
    this.defaultConfig = config;
  }
}