/**
 * Azure DevOps MCP Proxy Server
 * Main entry point for the dynamic Azure DevOps MCP proxy
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { DirectoryDetector } from './directory-detector.js';
import { ConfigLoader } from './utils/config-loader.js';
import { LocalConfigLoader } from './utils/local-config-loader.js';
import { ToolHandlers } from './handlers/tool-handlers.js';
import { AzureDevOpsConfig } from './types/index.js';

class AzureDevOpsMCPProxy {
  private server: Server;
  private directoryDetector!: DirectoryDetector;
  private toolHandlers: ToolHandlers;
  private currentConfig: AzureDevOpsConfig | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'devops-enhanced-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.toolHandlers = new ToolHandlers();
    this.initializeConfiguration();
    this.setupHandlers();
  }

  /**
   * Initialize configuration from local .azure-devops.json files
   */
  private initializeConfiguration(): void {
    try {
      // Try loading local configuration first
      this.currentConfig = LocalConfigLoader.findLocalConfig();
      
      if (this.currentConfig) {
        this.toolHandlers.setCurrentConfig(this.currentConfig);
        console.log('Azure DevOps MCP Proxy initialized with local configuration:', {
          organizationUrl: this.currentConfig.organizationUrl,
          project: this.currentConfig.project,
          directory: process.cwd()
        });
        return;
      }

      // Fallback to environment-based configuration
      console.log('No local configuration found, trying environment-based config...');
      const envConfig = ConfigLoader.loadConfig();
      this.directoryDetector = new DirectoryDetector(
        envConfig.mappings,
        envConfig.defaultConfig
      );
      
      this.currentConfig = this.directoryDetector.detectConfiguration();
      if (this.currentConfig) {
        this.toolHandlers.setCurrentConfig(this.currentConfig);
        console.log('Azure DevOps MCP Proxy initialized with environment configuration:', {
          organizationUrl: this.currentConfig.organizationUrl,
          project: this.currentConfig.project
        });
      } else {
        console.warn('No Azure DevOps configuration detected for current directory');
        console.log('Consider creating a .azure-devops.json file in your repository');
      }
    } catch (error) {
      console.error('Failed to initialize configuration:', error);
      // Initialize with empty configuration as fallback
      this.directoryDetector = new DirectoryDetector([]);
    }
  }

  /**
   * Setup MCP server handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = [
        {
          name: 'get-work-items',
          description: 'Get work items from Azure DevOps',
          inputSchema: {
            type: 'object',
            properties: {
              wiql: {
                type: 'string',
                description: 'Work Item Query Language (WIQL) query',
              },
              ids: {
                type: 'array',
                items: { type: 'number' },
                description: 'Specific work item IDs to retrieve',
              },
              fields: {
                type: 'array',
                items: { type: 'string' },
                description: 'Fields to include in the response',
              },
            },
          },
        },
        {
          name: 'create-work-item',
          description: 'Create a new work item in Azure DevOps',
          inputSchema: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                description: 'Work item type (e.g., Task, Bug, User Story)',
              },
              title: {
                type: 'string',
                description: 'Work item title',
              },
              description: {
                type: 'string',
                description: 'Work item description',
              },
              assignedTo: {
                type: 'string',
                description: 'Email of the person to assign the work item to',
              },
              tags: {
                type: 'string',
                description: 'Semicolon-separated tags',
              },
              parent: {
                type: 'number',
                description: 'Parent work item ID for establishing hierarchy during creation',
              },
              iterationPath: {
                type: 'string',
                description: 'Iteration path for sprint assignment (e.g., ProjectName\\Sprint 1)',
              },
              state: {
                type: 'string',
                description: 'Initial work item state (e.g., New, Active)',
              },
            },
            required: ['type', 'title'],
          },
        },
        {
          name: 'update-work-item',
          description: 'Update an existing work item in Azure DevOps',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'number',
                description: 'Work item ID to update',
              },
              title: {
                type: 'string',
                description: 'Updated work item title',
              },
              description: {
                type: 'string',
                description: 'Updated work item description',
              },
              state: {
                type: 'string',
                description: 'Updated work item state (e.g., Active, Resolved, Closed)',
              },
              assignedTo: {
                type: 'string',
                description: 'Email of the person to assign the work item to',
              },
              parent: {
                type: 'number',
                description: 'Parent work item ID for establishing hierarchy',
              },
              iterationPath: {
                type: 'string',
                description: 'Iteration path for sprint assignment (e.g., ProjectName\\Sprint 1)',
              },
              tags: {
                type: 'string',
                description: 'Semicolon-separated tags',
              },
              fields: {
                type: 'object',
                description: 'Generic field updates as key-value pairs',
              },
            },
            required: ['id'],
          },
        },
        {
          name: 'add-work-item-comment',
          description: 'Add a comment to an existing work item in Azure DevOps',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'number',
                description: 'Work item ID to add comment to',
              },
              comment: {
                type: 'string',
                description: 'Comment text to add',
              },
            },
            required: ['id', 'comment'],
          },
        },
        {
          name: 'get-repositories',
          description: 'Get repositories from Azure DevOps project',
          inputSchema: {
            type: 'object',
            properties: {
              includeLinks: {
                type: 'boolean',
                description: 'Include repository links in response',
              },
            },
          },
        },
        {
          name: 'get-builds',
          description: 'Get build definitions and recent builds',
          inputSchema: {
            type: 'object',
            properties: {
              definitionIds: {
                type: 'array',
                items: { type: 'number' },
                description: 'Specific build definition IDs',
              },
              top: {
                type: 'number',
                description: 'Number of builds to return',
              },
            },
          },
        },
        {
          name: 'get-pull-requests',
          description: 'Get pull requests from Azure DevOps repository',
          inputSchema: {
            type: 'object',
            properties: {
              repositoryId: {
                type: 'string',
                description: 'Repository ID or name (optional, defaults to all repos)',
              },
              status: {
                type: 'string',
                enum: ['active', 'completed', 'abandoned', 'all'],
                description: 'Pull request status filter (default: active)',
              },
              createdBy: {
                type: 'string',
                description: 'Filter by creator (user ID or email)',
              },
              top: {
                type: 'number',
                description: 'Number of pull requests to return (default: 25)',
              },
            },
          },
        },
        {
          name: 'trigger-pipeline',
          description: 'Trigger a build pipeline in Azure DevOps',
          inputSchema: {
            type: 'object',
            properties: {
              definitionId: {
                type: 'number',
                description: 'Build definition ID to trigger',
              },
              definitionName: {
                type: 'string',
                description: 'Build definition name (alternative to ID)',
              },
              sourceBranch: {
                type: 'string',
                description: 'Source branch to build (default: default branch)',
              },
              parameters: {
                type: 'object',
                description: 'Pipeline parameters as key-value pairs',
              },
            },
          },
        },
        {
          name: 'get-pipeline-status',
          description: 'Get status of a specific build or pipeline',
          inputSchema: {
            type: 'object',
            properties: {
              buildId: {
                type: 'number',
                description: 'Specific build ID to check status',
              },
              definitionId: {
                type: 'number',
                description: 'Get latest builds for this definition ID',
              },
              includeTimeline: {
                type: 'boolean',
                description: 'Include detailed timeline information',
              },
            },
          },
        },
        {
          name: 'get-current-context',
          description: 'Get current Azure DevOps context based on directory',
          inputSchema: {
            type: 'object',
            properties: {
              directory: {
                type: 'string',
                description: 'Directory path to check (defaults to current working directory)',
              },
            },
          },
        },
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        // Detect current environment context
        await this.updateCurrentContext();

        if (!this.currentConfig) {
          return {
            content: [{
              type: 'text',
              text: 'Error: No Azure DevOps configuration found for current directory. Please ensure you are in a configured project directory.',
            }],
            isError: true,
          };
        }

        // Handle special context tool
        if (request.params.name === 'get-current-context') {
          return this.handleGetCurrentContext(request.params.arguments);
        }

        // Route to tool handlers with current context
        return await this.toolHandlers.handleToolCall(request);
      } catch (error) {
        console.error('Tool call error:', error);
        return {
          content: [{
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
          }],
          isError: true,
        };
      }
    });
  }

  /**
   * Update current Azure DevOps context based on working directory
   */
  private async updateCurrentContext(): Promise<void> {
    // Skip update if using local configuration (no directory detector)
    if (!this.directoryDetector) {
      return;
    }

    const detectedConfig = this.directoryDetector.detectConfiguration();
    
    if (detectedConfig && (!this.currentConfig || 
        this.currentConfig.organizationUrl !== detectedConfig.organizationUrl ||
        this.currentConfig.project !== detectedConfig.project)) {
      
      this.currentConfig = detectedConfig;
      this.toolHandlers.setCurrentConfig(detectedConfig);
      
      console.log(`Switched to Azure DevOps context: ${detectedConfig.organizationUrl}/${detectedConfig.project}`);
    }
  }

  /**
   * Handle get-current-context tool call
   */
  private handleGetCurrentContext(args?: any): any {
    const directory = args?.directory || process.cwd();
    
    // If using local configuration, return current config
    if (!this.directoryDetector && this.currentConfig) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            organizationUrl: this.currentConfig.organizationUrl,
            project: this.currentConfig.project,
            directory: directory,
            configurationSource: 'local',
            configFile: '.azure-devops.json'
          }, null, 2),
        }],
      };
    }

    // Fall back to directory detector if available
    if (this.directoryDetector) {
      const context = this.directoryDetector.getProjectContext(directory);
      
      if (!context) {
        return {
          content: [{
            type: 'text',
            text: 'No Azure DevOps context configured for the specified directory.',
          }],
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            organizationUrl: context.organizationUrl,
            project: context.projectName,
            directory: directory,
            configurationSource: 'environment',
            configuredDirectories: this.directoryDetector.getConfiguredDirectories(),
          }, null, 2),
        }],
      };
    }

    return {
      content: [{
        type: 'text',
        text: 'No Azure DevOps configuration found.',
      }],
    };
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Azure DevOps MCP Proxy Server started');
  }
}

async function main() {
  const proxy = new AzureDevOpsMCPProxy();
  await proxy.start();
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export { main, AzureDevOpsMCPProxy };