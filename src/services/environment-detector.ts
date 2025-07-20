/**
 * Environment Detection Service
 * Detects current working directory and maps to appropriate Azure DevOps configuration
 */

import { AzureDevOpsConfig, ProjectMapping } from '../types/index.js';

export class EnvironmentDetector {
  private mappings: ProjectMapping[] = [];

  constructor(mappings: ProjectMapping[]) {
    this.mappings = mappings;
  }

  /**
   * Detect Azure DevOps configuration based on current directory
   */
  detectEnvironment(currentDirectory: string): AzureDevOpsConfig | null {
    // TODO: Implement directory-based detection logic
    // TODO: Support nested directory matching
    // TODO: Add fallback to parent directory search
    
    for (const mapping of this.mappings) {
      if (currentDirectory.startsWith(mapping.directory)) {
        return mapping.config;
      }
    }
    
    return null;
  }

  /**
   * Add a new project mapping
   */
  addMapping(mapping: ProjectMapping): void {
    this.mappings.push(mapping);
  }

  /**
   * Get all configured mappings
   */
  getMappings(): ProjectMapping[] {
    return [...this.mappings];
  }
}