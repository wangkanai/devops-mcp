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
        name: 'azure-devops-mcp-proxy',
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
   * Initialize configuration from environments.json
   */
  private initializeConfiguration(): void {
    try {
      const envConfig = ConfigLoader.loadConfig();
      this.directoryDetector = new DirectoryDetector(
        envConfig.mappings,
        envConfig.defaultConfig
      );
      console.error('Configuration loaded successfully');
    } catch (error) {
      console.error('Failed to load configuration:', error);
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
            },
            required: ['type', 'title'],
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
    const detectedConfig = this.directoryDetector.detectConfiguration();
    
    if (detectedConfig && (!this.currentConfig || 
        this.currentConfig.organizationUrl !== detectedConfig.organizationUrl ||
        this.currentConfig.project !== detectedConfig.project)) {
      
      this.currentConfig = detectedConfig;
      this.toolHandlers.setCurrentConfig(detectedConfig);
      
      console.error(`Switched to Azure DevOps context: ${detectedConfig.organizationUrl}/${detectedConfig.project}`);
    }
  }

  /**
   * Handle get-current-context tool call
   */
  private handleGetCurrentContext(args?: any): any {
    const directory = args?.directory;
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
          directory: directory || process.cwd(),
          configuredDirectories: this.directoryDetector.getConfiguredDirectories(),
        }, null, 2),
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