/**
 * Tool Handlers for Azure DevOps Operations
 * Implements MCP tool handlers with dynamic environment switching
 */

import { AzureDevOpsConfig } from '../types/index.js';
import * as https from 'https';
import * as url from 'url';

export class ToolHandlers {
  private currentConfig: AzureDevOpsConfig | null = null;

  /**
   * Set the current Azure DevOps configuration
   */
  setCurrentConfig(config: AzureDevOpsConfig): void {
    this.currentConfig = config;
  }

  /**
   * Handle tool calls with current environment context
   */
  async handleToolCall(request: any): Promise<any> {
    if (!this.currentConfig) {
      throw new Error('No Azure DevOps configuration available');
    }

    const { name, arguments: args } = request.params;
    
    try {
      switch (name) {
        case 'get-work-items':
          return await this.getWorkItems(args || {});
        case 'create-work-item':
          return await this.createWorkItem(args || {});
        case 'get-repositories':
          return await this.getRepositories(args || {});
        case 'get-builds':
          return await this.getBuilds(args || {});
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      console.error(`Error in tool handler ${name}:`, error);
      return {
        content: [{
          type: 'text',
          text: `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }],
        isError: true,
      };
    }
  }

  /**
   * Make authenticated API request to Azure DevOps
   */
  private async makeApiRequest(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    if (!this.currentConfig) {
      throw new Error('No configuration available');
    }

    const { organizationUrl, pat, project } = this.currentConfig;
    const baseUrl = `${organizationUrl}/${project}/_apis`;
    const requestUrl = `${baseUrl}${endpoint}`;
    
    return new Promise((resolve, reject) => {
      const urlParts = new url.URL(requestUrl);
      const postData = body ? JSON.stringify(body) : undefined;
      
      const options = {
        hostname: urlParts.hostname,
        port: urlParts.port || 443,
        path: urlParts.pathname + urlParts.search,
        method,
        headers: {
          'Authorization': `Basic ${Buffer.from(`:${pat}`).toString('base64')}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(postData && { 'Content-Length': Buffer.byteLength(postData) }),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              const result = data ? JSON.parse(data) : {};
              resolve(result);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      if (postData) {
        req.write(postData);
      }
      
      req.end();
    });
  }

  /**
   * Get work items from Azure DevOps
   */
  private async getWorkItems(args: any): Promise<any> {
    try {
      let result;
      
      if (args.wiql) {
        // Query using WIQL
        const wiqlResult = await this.makeApiRequest('/wit/wiql?api-version=7.1', 'POST', {
          query: args.wiql
        });
        
        if (wiqlResult.workItems && wiqlResult.workItems.length > 0) {
          const ids = wiqlResult.workItems.map((wi: any) => wi.id);
          const fields = args.fields ? args.fields.join(',') : undefined;
          const fieldsParam = fields ? `&fields=${encodeURIComponent(fields)}` : '';
          
          result = await this.makeApiRequest(
            `/wit/workitems?ids=${ids.join(',')}${fieldsParam}&api-version=7.1`
          );
        } else {
          result = { value: [] };
        }
      } else if (args.ids && args.ids.length > 0) {
        // Get specific work items by ID
        const fields = args.fields ? args.fields.join(',') : undefined;
        const fieldsParam = fields ? `&fields=${encodeURIComponent(fields)}` : '';
        
        result = await this.makeApiRequest(
          `/wit/workitems?ids=${args.ids.join(',')}${fieldsParam}&api-version=7.1`
        );
      } else {
        // Default query for recent work items
        const defaultWiql = `SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo] FROM WorkItems WHERE [System.TeamProject] = '${this.currentConfig!.project}' ORDER BY [System.ChangedDate] DESC`;
        
        const wiqlResult = await this.makeApiRequest('/wit/wiql?api-version=7.1', 'POST', {
          query: defaultWiql
        });
        
        if (wiqlResult.workItems && wiqlResult.workItems.length > 0) {
          const ids = wiqlResult.workItems.slice(0, 20).map((wi: any) => wi.id); // Limit to 20 items
          result = await this.makeApiRequest(
            `/wit/workitems?ids=${ids.join(',')}&api-version=7.1`
          );
        } else {
          result = { value: [] };
        }
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2),
        }],
      };
    } catch (error) {
      throw new Error(`Failed to get work items: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new work item in Azure DevOps
   */
  private async createWorkItem(args: any): Promise<any> {
    if (!args.type || !args.title) {
      throw new Error('Work item type and title are required');
    }

    try {
      const operations = [
        {
          op: 'add',
          path: '/fields/System.Title',
          value: args.title
        }
      ];

      if (args.description) {
        operations.push({
          op: 'add',
          path: '/fields/System.Description',
          value: args.description
        });
      }

      if (args.assignedTo) {
        operations.push({
          op: 'add',
          path: '/fields/System.AssignedTo',
          value: args.assignedTo
        });
      }

      if (args.tags) {
        operations.push({
          op: 'add',
          path: '/fields/System.Tags',
          value: args.tags
        });
      }

      const result = await this.makeApiRequest(
        `/wit/workitems/${args.type}?api-version=7.1`,
        'POST',
        operations
      );

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            workItem: {
              id: result.id,
              title: result.fields['System.Title'],
              type: result.fields['System.WorkItemType'],
              state: result.fields['System.State'],
              url: result._links.html.href
            }
          }, null, 2),
        }],
      };
    } catch (error) {
      throw new Error(`Failed to create work item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get repositories from Azure DevOps project
   */
  private async getRepositories(args: any): Promise<any> {
    try {
      const result = await this.makeApiRequest('/git/repositories?api-version=7.1');

      const repositories = result.value.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        url: repo.webUrl,
        defaultBranch: repo.defaultBranch,
        size: repo.size,
        ...(args.includeLinks && { links: repo._links })
      }));

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            count: repositories.length,
            repositories
          }, null, 2),
        }],
      };
    } catch (error) {
      throw new Error(`Failed to get repositories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get build definitions and recent builds
   */
  private async getBuilds(args: any): Promise<any> {
    try {
      let endpoint = '/build/builds?api-version=7.1';
      
      const params = [];
      if (args.definitionIds && args.definitionIds.length > 0) {
        params.push(`definitions=${args.definitionIds.join(',')}`);
      }
      if (args.top) {
        params.push(`$top=${args.top}`);
      } else {
        params.push('$top=10'); // Default to 10 builds
      }
      
      if (params.length > 0) {
        endpoint += '&' + params.join('&');
      }

      const result = await this.makeApiRequest(endpoint);

      const builds = result.value.map((build: any) => ({
        id: build.id,
        buildNumber: build.buildNumber,
        status: build.status,
        result: build.result,
        definition: {
          id: build.definition.id,
          name: build.definition.name
        },
        startTime: build.startTime,
        finishTime: build.finishTime,
        url: build._links.web.href
      }));

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            count: builds.length,
            builds
          }, null, 2),
        }],
      };
    } catch (error) {
      throw new Error(`Failed to get builds: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}