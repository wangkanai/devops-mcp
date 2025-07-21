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
        case 'get-pull-requests':
          return await this.getPullRequests(args || {});
        case 'trigger-pipeline':
          return await this.triggerPipeline(args || {});
        case 'get-pipeline-status':
          return await this.getPipelineStatus(args || {});
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      // Sanitize tool name to prevent log injection
      const sanitizedName = typeof name === 'string' ? name.replace(/[\r\n\t]/g, '_') : 'unknown';
      console.error(`Error in tool handler ${sanitizedName}:`, error instanceof Error ? error.message : 'Unknown error');
      return {
        content: [{
          type: 'text',
          text: `Error executing ${sanitizedName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

  /**
   * Get pull requests from Azure DevOps repositories
   */
  private async getPullRequests(args: any): Promise<any> {
    try {
      let endpoint = '/git/pullrequests?api-version=7.1';
      
      const params = [];
      
      // Status filter (default to active)
      const status = args.status || 'active';
      if (status !== 'all') {
        params.push(`searchCriteria.status=${status}`);
      }
      
      // Creator filter
      if (args.createdBy) {
        params.push(`searchCriteria.creatorId=${encodeURIComponent(args.createdBy)}`);
      }
      
      // Repository filter
      if (args.repositoryId) {
        params.push(`searchCriteria.repositoryId=${encodeURIComponent(args.repositoryId)}`);
      }
      
      // Top (limit) parameter
      const top = args.top || 25;
      params.push(`$top=${top}`);
      
      if (params.length > 0) {
        endpoint += '&' + params.join('&');
      }

      const result = await this.makeApiRequest(endpoint);

      const pullRequests = result.value.map((pr: any) => ({
        id: pr.pullRequestId,
        title: pr.title,
        description: pr.description,
        status: pr.status,
        createdBy: {
          displayName: pr.createdBy.displayName,
          uniqueName: pr.createdBy.uniqueName
        },
        creationDate: pr.creationDate,
        repository: {
          id: pr.repository.id,
          name: pr.repository.name
        },
        sourceRefName: pr.sourceRefName,
        targetRefName: pr.targetRefName,
        url: pr._links?.web?.href || `${this.currentConfig!.organizationUrl}/${this.currentConfig!.project}/_git/${pr.repository.name}/pullrequest/${pr.pullRequestId}`,
        isDraft: pr.isDraft || false,
        mergeStatus: pr.mergeStatus
      }));

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            count: pullRequests.length,
            status: status,
            pullRequests
          }, null, 2),
        }],
      };
    } catch (error) {
      throw new Error(`Failed to get pull requests: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Trigger a build pipeline in Azure DevOps
   */
  private async triggerPipeline(args: any): Promise<any> {
    try {
      let definitionId = args.definitionId;
      
      // If definition name is provided instead of ID, look up the ID
      if (!definitionId && args.definitionName) {
        const definitions = await this.makeApiRequest('/build/definitions?api-version=7.1');
        const definition = definitions.value.find((def: any) => 
          def.name.toLowerCase() === args.definitionName.toLowerCase()
        );
        
        if (!definition) {
          throw new Error(`Build definition '${args.definitionName}' not found`);
        }
        
        definitionId = definition.id;
      }
      
      if (!definitionId) {
        throw new Error('Either definitionId or definitionName must be provided');
      }

      // Prepare the build request
      const buildRequest: any = {
        definition: {
          id: definitionId
        }
      };

      // Add source branch if specified
      if (args.sourceBranch) {
        buildRequest.sourceBranch = args.sourceBranch.startsWith('refs/') 
          ? args.sourceBranch 
          : `refs/heads/${args.sourceBranch}`;
      }

      // Add parameters if specified
      if (args.parameters && typeof args.parameters === 'object') {
        buildRequest.parameters = JSON.stringify(args.parameters);
      }

      const result = await this.makeApiRequest(
        '/build/builds?api-version=7.1',
        'POST',
        buildRequest
      );

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            build: {
              id: result.id,
              buildNumber: result.buildNumber,
              status: result.status,
              queueTime: result.queueTime,
              definition: {
                id: result.definition.id,
                name: result.definition.name
              },
              sourceBranch: result.sourceBranch,
              url: result._links?.web?.href || `${this.currentConfig!.organizationUrl}/${this.currentConfig!.project}/_build/results?buildId=${result.id}`,
              requestedBy: {
                displayName: result.requestedBy?.displayName || 'API Request',
                uniqueName: result.requestedBy?.uniqueName || 'api'
              }
            }
          }, null, 2),
        }],
      };
    } catch (error) {
      throw new Error(`Failed to trigger pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get pipeline status and detailed information
   */
  private async getPipelineStatus(args: any): Promise<any> {
    try {
      if (args.buildId) {
        // Get specific build details
        const build = await this.makeApiRequest(`/build/builds/${args.buildId}?api-version=7.1`);
        
        let timeline = null;
        if (args.includeTimeline) {
          try {
            timeline = await this.makeApiRequest(`/build/builds/${args.buildId}/timeline?api-version=7.1`);
          } catch (timelineError) {
            // Sanitize error message to prevent log injection
            const sanitizedError = timelineError instanceof Error ? timelineError.message.replace(/[\r\n\t]/g, '_') : 'Unknown timeline error';
            console.error('Failed to get timeline:', sanitizedError);
            // Continue without timeline if it fails
          }
        }

        const buildInfo = {
          id: build.id,
          buildNumber: build.buildNumber,
          status: build.status,
          result: build.result,
          definition: {
            id: build.definition.id,
            name: build.definition.name
          },
          sourceBranch: build.sourceBranch,
          sourceVersion: build.sourceVersion,
          queueTime: build.queueTime,
          startTime: build.startTime,
          finishTime: build.finishTime,
          url: build._links?.web?.href,
          requestedBy: {
            displayName: build.requestedBy?.displayName,
            uniqueName: build.requestedBy?.uniqueName
          },
          ...(timeline && { 
            timeline: timeline.records?.map((record: any) => ({
              name: record.name,
              type: record.type,
              state: record.state,
              result: record.result,
              startTime: record.startTime,
              finishTime: record.finishTime,
              percentComplete: record.percentComplete
            }))
          })
        };

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(buildInfo, null, 2),
          }],
        };
      } else if (args.definitionId) {
        // Get latest builds for a specific definition
        const builds = await this.makeApiRequest(
          `/build/builds?definitions=${args.definitionId}&$top=5&api-version=7.1`
        );

        const buildsInfo = builds.value.map((build: any) => ({
          id: build.id,
          buildNumber: build.buildNumber,
          status: build.status,
          result: build.result,
          sourceBranch: build.sourceBranch,
          queueTime: build.queueTime,
          startTime: build.startTime,
          finishTime: build.finishTime,
          url: build._links?.web?.href
        }));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              definitionId: args.definitionId,
              recentBuilds: buildsInfo
            }, null, 2),
          }],
        };
      } else {
        throw new Error('Either buildId or definitionId must be provided');
      }
    } catch (error) {
      throw new Error(`Failed to get pipeline status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}