/**
 * Tool Handlers for Azure DevOps Operations
 * Implements MCP tool handlers with dynamic environment switching
 * Enhanced with iteration path TF401347 error fix
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
        case 'update-work-item':
          return await this.updateWorkItem(args || {});
        case 'add-work-item-comment':
          return await this.addWorkItemComment(args || {});
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
          'Content-Type': method === 'PATCH' && endpoint.includes('/wit/workitems/')
            ? 'application/json-patch+json'
            : 'application/json',
          'Accept': 'application/json',
          // For preview APIs, we need to properly handle the API version in the URL, not headers
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
   * Normalize iteration path format for Azure DevOps API compatibility
   * Format: ProjectName\SprintName (NOT ProjectName\Iteration\SprintName)
   * Azure DevOps REST API expects direct hierarchy without 'Iteration' component
   * Fixed TF401347 error by using correct \Iteration\ prefix format
   */
  private normalizeIterationPath(iterationPath: string): string {
    // Remove leading/trailing whitespace
    let normalized = iterationPath.trim();
    
    // Convert forward slashes to backslashes for consistency with Azure DevOps
    normalized = normalized.replace(/\//g, '\\');
    
    // Remove leading backslash if present
    if (normalized.startsWith('\\')) {
      normalized = normalized.substring(1);
    }
    
    // Handle different input scenarios
    const projectName = this.currentConfig!.project;
    
    // Case 1: Path starts with project name and has proper Iteration prefix
    if (normalized.startsWith(`${projectName}\\Iteration\\`)) {
      console.log(`[DEBUG] Path already in correct format with Iteration prefix: ${normalized}`);
      return normalized;
    }
    
    // Case 2: Path starts with project but missing Iteration component
    if (normalized.startsWith(`${projectName}\\`) && !normalized.includes('\\Iteration\\')) {
      // Insert Iteration component after project name
      const pathParts = normalized.split('\\');
      if (pathParts.length >= 2) {
        pathParts.splice(1, 0, 'Iteration');
        normalized = pathParts.join('\\');
        console.log(`[DEBUG] Added Iteration component to path: ${normalized}`);
        return normalized;
      }
    }
    
    // Case 3: Has Iteration prefix but missing project name (Iteration\SprintName)
    if (normalized.startsWith('Iteration\\')) {
      normalized = `${projectName}\\${normalized}`;
      console.log(`[DEBUG] Added project name prefix to Iteration path: ${normalized}`);
      return normalized;
    }
    
    // Case 4: Just the sprint name (SprintName or Sprint 3)
    if (!normalized.includes('\\')) {
      normalized = `${projectName}\\Iteration\\${normalized}`;
      console.log(`[DEBUG] Added full project and Iteration prefix to sprint: ${normalized}`);
      return normalized;
    }
    
    // Case 5: Starts with something else - ensure proper format
    if (!normalized.startsWith(projectName)) {
      // Check if it already has an Iteration component
      if (normalized.includes('\\Iteration\\')) {
        normalized = `${projectName}\\${normalized}`;
      } else {
        // Add both project name and Iteration component
        normalized = `${projectName}\\Iteration\\${normalized}`;
      }
      console.log(`[DEBUG] Added project name prefix with Iteration: ${normalized}`);
    }
    
    console.log(`[DEBUG] Normalized iteration path from '${iterationPath}' to '${normalized}'`);
    return normalized;
  }

  /**
   * Validate if an iteration path exists in the project using improved logic
   */
  private async validateIterationPath(iterationPath: string): Promise<string> {
    try {
      const normalizedPath = this.normalizeIterationPath(iterationPath);
      
      // Approach 1: Get project classification nodes with deep traversal
      try {
        const classificationNodes = await this.makeApiRequest('/wit/classificationnodes/iterations?api-version=7.1&$depth=10');
        
        const findInNodes = (node: any, targetPath: string): boolean => {
          // Check current node path
          if (node.path === targetPath) {
            console.log(`[DEBUG] Found exact path match: ${node.path}`);
            return true;
          }
          
          // Check alternative path formats (direct hierarchy without Iteration component)
          const alternativePaths = [
            node.path,
            node.name,
            `${this.currentConfig!.project}\\${node.name}`,
            node.structureType === 'iteration' ? node.path : null
          ].filter(Boolean);
          
          for (const altPath of alternativePaths) {
            if (altPath === targetPath || 
                altPath?.replace(/\\/g, '/') === targetPath.replace(/\\/g, '/')) {
              console.log(`[DEBUG] Found alternative path match: ${altPath} -> ${targetPath}`);
              return true;
            }
          }
          
          // Recursively check children
          if (node.children && node.children.length > 0) {
            for (const child of node.children) {
              if (findInNodes(child, targetPath)) {
                return true;
              }
            }
          }
          
          return false;
        };
        
        if (classificationNodes && findInNodes(classificationNodes, normalizedPath)) {
          console.log(`[DEBUG] Iteration path '${normalizedPath}' validated successfully`);
          return normalizedPath;
        }
        
        // Also try with original path format
        if (normalizedPath !== iterationPath && findInNodes(classificationNodes, iterationPath)) {
          console.log(`[DEBUG] Original iteration path '${iterationPath}' validated successfully`);
          return iterationPath;
        }
        
      } catch (classificationError) {
        console.log(`[DEBUG] Classification nodes query failed: ${classificationError instanceof Error ? classificationError.message : 'Unknown error'}`);
      }
      
      // Approach 2: Get team iterations (fallback)
      try {
        const iterations = await this.makeApiRequest('/work/teamsettings/iterations?api-version=7.1');
        
        const pathExists = iterations.value.some((iteration: any) => {
          const possiblePaths = [
            iteration.path,
            iteration.name,
            `${this.currentConfig!.project}\\${iteration.name}`,
            `${this.currentConfig!.project}/${iteration.name}`
          ].filter(Boolean);
          
          return possiblePaths.some(path => 
            path === normalizedPath || 
            path === iterationPath ||
            path?.replace(/\\/g, '/') === normalizedPath.replace(/\\/g, '/') ||
            path?.replace(/\\/g, '/') === iterationPath.replace(/\\/g, '/')
          );
        });
        
        if (pathExists) {
          console.log(`[DEBUG] Iteration path validated via team iterations`);
          return normalizedPath;
        }
      } catch (teamError) {
        console.log(`[DEBUG] Team iterations query failed: ${teamError instanceof Error ? teamError.message : 'Unknown error'}`);
      }
      
      // If both validation attempts failed to find the path, it doesn't exist
      console.log(`[DEBUG] Could not validate iteration path '${iterationPath}', normalized format '${normalizedPath}' does not exist`);
      console.log(`[DEBUG] SUGGESTION: Ensure the iteration '${normalizedPath}' exists in Azure DevOps project settings`);
      console.log(`[DEBUG] Expected format: ProjectName\\SprintName (e.g., '${this.currentConfig!.project}\\Sprint 1')`);
      throw new Error(`Iteration path '${iterationPath}' does not exist in project '${this.currentConfig!.project}'`);
      
    } catch (error) {
      // If there was an error that's not related to path validation (e.g., auth, network),
      // check if it's our custom "doesn't exist" error, if so re-throw it
      if (error instanceof Error && error.message.includes('does not exist in project')) {
        throw error;
      }
      
      // For other errors (network, auth, etc.), return normalized path with warning
      const normalizedPath = this.normalizeIterationPath(iterationPath);
      console.log(`[DEBUG] Validation error for path '${iterationPath}': ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.log(`[DEBUG] Using normalized path due to validation service unavailability`);
      return normalizedPath;
    }
  }

  /**
   * Update work item iteration path post-creation
   */
  private async updateWorkItemIterationPath(workItemId: number, iterationPath: string): Promise<void> {
    const operations = [{
      op: 'replace',
      path: '/fields/System.IterationPath',
      value: iterationPath
    }];

    await this.makeApiRequest(
      `/wit/workitems/${workItemId}?api-version=7.1`,
      'PATCH',
      operations
    );
  }

  /**
   * Validate work item state for the given work item type
   * Prevents invalid state errors by checking supported states
   */
  private async validateWorkItemState(workItemType: string, state: string): Promise<string> {
    try {
      // Get work item type definition to check valid states
      const typeDefinition = await this.makeApiRequest(
        `/wit/workitemtypes/${encodeURIComponent(workItemType)}?api-version=7.1`
      );

      // Extract valid states from the work item type definition
      const validStates = typeDefinition.states?.map((s: any) => s.name) || [];
      
      if (validStates.length > 0 && !validStates.includes(state)) {
        console.log(`[DEBUG] Invalid state '${state}' for work item type '${workItemType}'. Valid states: [${validStates.join(', ')}]`);
        
        // Common state mappings for fallback
        const stateMappings: { [key: string]: { [key: string]: string } } = {
          'Bug': {
            'Removed': 'Resolved',
            'removed': 'Resolved'
          },
          'Task': {
            'Removed': 'Done',
            'removed': 'Done'
          },
          'User Story': {
            'Removed': 'Resolved',
            'removed': 'Resolved'
          }
        };

        const fallbackState = stateMappings[workItemType]?.[state] || validStates[0] || 'Active';
        console.log(`[DEBUG] Using fallback state '${fallbackState}' instead of '${state}' for work item type '${workItemType}'`);
        return fallbackState;
      }

      console.log(`[DEBUG] State '${state}' is valid for work item type '${workItemType}'`);
      return state;
    } catch (error) {
      // If validation fails, return the original state and let Azure DevOps handle it
      console.log(`[DEBUG] Could not validate state '${state}' for work item type '${workItemType}': ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.log(`[DEBUG] Proceeding with original state - Azure DevOps will validate`);
      return state;
    }
  }

  /**
   * Create a new work item in Azure DevOps with enhanced iteration path handling
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

      // Support parent relationship during creation using relations API
      if (args.parent) {
        // Validate parent ID is a number
        const parentId = parseInt(args.parent, 10);
        if (isNaN(parentId) || parentId <= 0) {
          throw new Error(`Invalid parent work item ID: ${args.parent}. Must be a positive integer.`);
        }
        
        const parentUrl = `${this.currentConfig!.organizationUrl}/${this.currentConfig!.project}/_apis/wit/workItems/${parentId}`;
        console.log(`[DEBUG] Setting parent relationship to work item ${parentId} using URL: ${parentUrl}`);
        
        operations.push({
          op: 'add',
          path: '/relations/-',
          value: {
            rel: 'System.LinkTypes.Hierarchy-Reverse',
            url: parentUrl,
            attributes: {
              comment: `Parent relationship set via MCP create-work-item command`
            }
          }
        });
      }

      // Enhanced iteration path handling with normalization and validation
      let iterationPathHandled = false;
      let iterationPathError = null;
      let finalIterationPath = null;

      if (args.iterationPath) {
        try {
          // Validate and normalize the iteration path
          finalIterationPath = await this.validateIterationPath(args.iterationPath);
          
          // Add normalized path to the creation operations
          operations.push({
            op: 'add',
            path: '/fields/System.IterationPath',
            value: finalIterationPath
          });
          iterationPathHandled = true;
          console.log(`[DEBUG] Iteration path normalized to '${finalIterationPath}' and will be set during creation`);
        } catch (validationError) {
          iterationPathError = validationError;
          finalIterationPath = this.normalizeIterationPath(args.iterationPath);
          console.log(`[DEBUG] Iteration path validation failed: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`);
          console.log(`[DEBUG] Will attempt to set normalized path '${finalIterationPath}' after work item creation`);
        }
      }

      // Support state during creation with validation
      if (args.state) {
        // Validate state for work item type to prevent TF401347-like errors
        const validatedState = await this.validateWorkItemState(args.type, args.state);
        operations.push({
          op: 'add',
          path: '/fields/System.State',
          value: validatedState
        });
      }

      // Debug logging to validate the endpoint construction
      const endpoint = `/wit/workitems/$${args.type}?api-version=7.1`;
      console.log(`[DEBUG] Creating work item with endpoint: ${endpoint}`);
      console.log(`[DEBUG] Full URL will be: ${this.currentConfig!.organizationUrl}/${this.currentConfig!.project}/_apis${endpoint}`);
      
      // Create the work item
      const result = await this.makeApiRequest(
        endpoint,
        'PATCH',
        operations
      );

      // Handle iteration path post-creation if it wasn't set during creation
      if (args.iterationPath && !iterationPathHandled && finalIterationPath) {
        try {
          console.log(`[DEBUG] Attempting to set normalized iteration path '${finalIterationPath}' post-creation for work item ${result.id}`);
          await this.updateWorkItemIterationPath(result.id, finalIterationPath);
          
          // Refresh the work item to get updated fields
          const updatedResult = await this.makeApiRequest(`/wit/workitems/${result.id}?api-version=7.1`);
          Object.assign(result, updatedResult);
          
          console.log(`[DEBUG] Successfully set iteration path post-creation`);
        } catch (postCreationError) {
          console.error(`[WARNING] Failed to set iteration path post-creation: ${postCreationError instanceof Error ? postCreationError.message : 'Unknown error'}`);
          // Don't fail the entire operation, just log the warning
        }
      }

      // Extract parent information from relations
      let parentInfo = null;
      if (result.relations && result.relations.length > 0) {
        const parentRelation = result.relations.find((rel: any) =>
          rel.rel === 'System.LinkTypes.Hierarchy-Reverse'
        );
        if (parentRelation) {
          // Extract parent ID from URL (e.g., .../workItems/1562 -> 1562)
          const match = parentRelation.url.match(/workItems\/(\d+)$/);
          parentInfo = {
            id: match ? parseInt(match[1], 10) : null,
            url: parentRelation.url,
            comment: parentRelation.attributes?.comment
          };
        }
      }

      // Prepare response with enhanced error reporting
      const response: any = {
        success: true,
        workItem: {
          id: result.id,
          title: result.fields['System.Title'],
          type: result.fields['System.WorkItemType'],
          state: result.fields['System.State'],
          parent: result.fields['System.Parent'] || parentInfo?.id || null,
          parentRelation: parentInfo,
          iterationPath: result.fields['System.IterationPath'],
          assignedTo: result.fields['System.AssignedTo']?.displayName || result.fields['System.AssignedTo'],
          url: result._links.html.href,
          relations: result.relations?.length || 0
        },
        message: args.parent ? `Work item created with parent relationship to work item ${args.parent}` : 'Work item created successfully'
      };

      // Add iteration path handling details to response
      if (args.iterationPath) {
        response.iterationPathHandling = {
          requested: args.iterationPath,
          normalized: finalIterationPath,
          setDuringCreation: iterationPathHandled,
          finalValue: result.fields['System.IterationPath']
        };
        
        if (iterationPathError) {
          response.iterationPathHandling.validationError = iterationPathError instanceof Error ? iterationPathError.message : 'Unknown validation error';
        }
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response, null, 2),
        }],
      };
    } catch (error) {
      throw new Error(`Failed to create work item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update an existing work item in Azure DevOps
   */
  private async updateWorkItem(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Work item ID is required');
    }

    if (!args.fields && !args.parent && !args.iterationPath && !args.state && !args.assignedTo && !args.title && !args.description && !args.tags) {
      throw new Error('At least one field to update must be provided');
    }

    try {
      const operations = [];

      // Handle individual field updates
      if (args.title) {
        operations.push({
          op: 'replace',
          path: '/fields/System.Title',
          value: args.title
        });
      }

      if (args.description) {
        operations.push({
          op: 'replace',
          path: '/fields/System.Description',
          value: args.description
        });
      }

      if (args.state) {
        // Get current work item to determine its type for state validation
        let workItemType = 'Task'; // Default fallback
        try {
          const currentWorkItem = await this.makeApiRequest(`/wit/workitems/${args.id}?api-version=7.1`);
          workItemType = currentWorkItem.fields['System.WorkItemType'] || 'Task';
        } catch (error) {
          console.log(`[DEBUG] Could not fetch work item type for validation, using default: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        // Validate state for work item type to prevent invalid state errors
        const validatedState = await this.validateWorkItemState(workItemType, args.state);
        operations.push({
          op: 'replace',
          path: '/fields/System.State',
          value: validatedState
        });
      }

      if (args.assignedTo) {
        operations.push({
          op: 'replace',
          path: '/fields/System.AssignedTo',
          value: args.assignedTo
        });
      }

      if (args.tags) {
        operations.push({
          op: 'replace',
          path: '/fields/System.Tags',
          value: args.tags
        });
      }

      // Handle parent relationship using relations API
      if (args.parent) {
        // Validate parent ID is a number
        const parentId = parseInt(args.parent, 10);
        if (isNaN(parentId) || parentId <= 0) {
          throw new Error(`Invalid parent work item ID: ${args.parent}. Must be a positive integer.`);
        }
        
        const parentUrl = `${this.currentConfig!.organizationUrl}/${this.currentConfig!.project}/_apis/wit/workItems/${parentId}`;
        console.log(`[DEBUG] Setting parent relationship to work item ${parentId} using URL: ${parentUrl}`);
        
        operations.push({
          op: 'add',
          path: '/relations/-',
          value: {
            rel: 'System.LinkTypes.Hierarchy-Reverse',
            url: parentUrl,
            attributes: {
              comment: `Parent relationship updated via MCP update-work-item command`
            }
          }
        });
      }

      // Handle iteration path assignment with normalization (System.IterationPath)
      if (args.iterationPath) {
        const normalizedIterationPath = this.normalizeIterationPath(args.iterationPath);
        operations.push({
          op: 'replace',
          path: '/fields/System.IterationPath',
          value: normalizedIterationPath
        });
        console.log(`[DEBUG] Iteration path normalized from '${args.iterationPath}' to '${normalizedIterationPath}' for update`);
      }

      // Handle generic field updates with intelligent field name resolution
      if (args.fields && typeof args.fields === 'object') {
        Object.entries(args.fields).forEach(([fieldName, fieldValue]) => {
          // Enhanced intelligent field name resolution - preserve all existing namespaces
          let normalizedFieldName = fieldName;
          
          // CRITICAL: Never modify Microsoft.VSTS fields - they must be preserved exactly as-is
          if (fieldName.startsWith('Microsoft.VSTS.')) {
            normalizedFieldName = fieldName; // Preserve Microsoft.VSTS fields exactly
          }
          // CRITICAL: Never modify System. fields - they are already correct
          else if (fieldName.startsWith('System.')) {
            normalizedFieldName = fieldName; // Preserve System. fields exactly
          }
          // Only add System. prefix for simple field names that don't already have a namespace
          else if (!fieldName.includes('.')) {
            // Check if it's a known field that should have System. prefix
            const systemFields = ['Title', 'Description', 'State', 'AssignedTo', 'Tags', 'IterationPath', 'AreaPath'];
            if (systemFields.includes(fieldName)) {
              normalizedFieldName = `System.${fieldName}`;
            }
            // Other simple fields without dots remain unchanged (e.g., BusinessValue, Priority)
          }
          // For any other field with a namespace (e.g., Custom.Field), preserve as-is
          
          operations.push({
            op: 'replace',
            path: `/fields/${normalizedFieldName}`,
            value: fieldValue
          });
        });
      }

      if (operations.length === 0) {
        throw new Error('No valid update operations specified');
      }

      // Debug logging to validate the endpoint construction
      const endpoint = `/wit/workitems/${args.id}?api-version=7.1`;
      console.log(`[DEBUG] Updating work item ${args.id} with endpoint: ${endpoint}`);
      console.log(`[DEBUG] Operations:`, JSON.stringify(operations, null, 2));
      
      const result = await this.makeApiRequest(
        endpoint,
        'PATCH',
        operations
      );

      // Extract parent information from relations
      let parentInfo = null;
      if (result.relations && result.relations.length > 0) {
        const parentRelation = result.relations.find((rel: any) =>
          rel.rel === 'System.LinkTypes.Hierarchy-Reverse'
        );
        if (parentRelation) {
          // Extract parent ID from URL (e.g., .../workItems/1562 -> 1562)
          const match = parentRelation.url.match(/workItems\/(\d+)$/);
          parentInfo = {
            id: match ? parseInt(match[1], 10) : null,
            url: parentRelation.url,
            comment: parentRelation.attributes?.comment
          };
        }
      }

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
              parent: result.fields['System.Parent'] || parentInfo?.id || null,
              parentRelation: parentInfo,
              iterationPath: result.fields['System.IterationPath'],
              assignedTo: result.fields['System.AssignedTo']?.displayName || result.fields['System.AssignedTo'],
              url: result._links.html.href,
              relations: result.relations?.length || 0
            },
            operations: operations.length,
            message: args.parent ? `Work item updated with parent relationship to work item ${args.parent}` : `Successfully updated work item ${args.id}`
          }, null, 2),
        }],
      };
    } catch (error) {
      throw new Error(`Failed to update work item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add a comment to an existing work item in Azure DevOps
   * Fixed API version compatibility issue - using 6.0 for comments
   */
  private async addWorkItemComment(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Work item ID is required');
    }

    if (!args.comment) {
      throw new Error('Comment text is required');
    }

    try {
      const commentData = {
        text: args.comment
      };

      // Use API version 6.0-preview.4 for comments - required for work item comments endpoint
      const endpoint = `/wit/workitems/${args.id}/comments?api-version=6.0-preview.4`;
      console.log(`[DEBUG] Adding comment to work item ${args.id} with endpoint: ${endpoint}`);
      
      const result = await this.makeApiRequest(
        endpoint,
        'POST',
        commentData
      );

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            comment: {
              id: result.id,
              workItemId: args.id,
              text: result.text,
              createdBy: result.createdBy?.displayName || result.createdBy,
              createdDate: result.createdDate,
              url: result.url
            },
            message: `Successfully added comment to work item ${args.id}`
          }, null, 2),
        }],
      };
    } catch (error) {
      // Provide specific guidance for API version issues
      if (error instanceof Error && error.message.includes('preview')) {
        throw new Error(`Failed to add work item comment - API version issue: ${error.message}. Try using a different API version.`);
      }
      throw new Error(`Failed to add work item comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
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