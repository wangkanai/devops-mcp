/**
 * Type definitions for Azure DevOps MCP Proxy
 */

export interface AzureDevOpsConfig {
  organizationUrl: string;
  pat: string;
  project: string;
}

export interface ProjectMapping {
  directory: string;
  config: AzureDevOpsConfig;
}

export interface EnvironmentConfig {
  mappings: ProjectMapping[];
  defaultConfig?: AzureDevOpsConfig;
}

export interface ToolContext {
  currentDirectory: string;
  config: AzureDevOpsConfig;
}