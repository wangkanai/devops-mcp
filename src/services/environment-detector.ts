/**
 * Environment Detection Service
 * Detects current working directory and maps to appropriate Azure DevOps configuration
 * @deprecated Use DirectoryDetector instead
 */

import { AzureDevOpsConfig, ProjectMapping } from '../types/index.js';
import { DirectoryDetector } from '../directory-detector.js';

export class EnvironmentDetector {
  private directoryDetector: DirectoryDetector;

  constructor(mappings: ProjectMapping[], defaultConfig?: AzureDevOpsConfig) {
    this.directoryDetector = new DirectoryDetector(mappings, defaultConfig);
  }

  /**
   * Detect Azure DevOps configuration based on current directory
   */
  detectEnvironment(currentDirectory: string): AzureDevOpsConfig | null {
    return this.directoryDetector.detectConfiguration(currentDirectory);
  }

  /**
   * Add a new project mapping
   */
  addMapping(mapping: ProjectMapping): void {
    this.directoryDetector.addMapping(mapping.directory, mapping.config);
  }

  /**
   * Get all configured mappings
   */
  getMappings(): string[] {
    return this.directoryDetector.getConfiguredDirectories();
  }

  /**
   * Get project context for directory
   */
  getProjectContext(currentDirectory?: string): { projectName: string; organizationUrl: string } | null {
    return this.directoryDetector.getProjectContext(currentDirectory);
  }

  /**
   * Check if directory is configured
   */
  isConfiguredDirectory(currentDirectory?: string): boolean {
    return this.directoryDetector.isConfiguredDirectory(currentDirectory);
  }
}