/**
 * Tests for enhanced iteration path handling in work item creation
 * Tests for TF401347 error fix
 */

import { ToolHandlers } from '../../src/handlers/tool-handlers';
import { AzureDevOpsConfig } from '../../src/types/index';

describe('Iteration Path Handling', () => {
  let toolHandlers: ToolHandlers;
  let mockConfig: AzureDevOpsConfig;

  beforeEach(() => {
    toolHandlers = new ToolHandlers();
    mockConfig = {
      organizationUrl: 'https://dev.azure.com/test-org',
      project: 'TestProject',
      pat: 'mock-pat-token'
    };
    toolHandlers.setCurrentConfig(mockConfig);

    // Reset console.log and console.error mocks
    jest.clearAllMocks();
  });

  describe('createWorkItem with iteration path', () => {
    test('should create work item with valid iteration path during creation', async () => {
      // Mock successful validation and creation
      const mockMakeRequest = jest.spyOn(toolHandlers as any, 'makeApiRequest');
      
      // Mock classification nodes call (first call in validateIterationPath)
      mockMakeRequest
        .mockResolvedValueOnce({
          path: 'TestProject\\Sprint 1',
          name: 'Sprint 1',
          children: []
        })
        // Mock work item creation success
        .mockResolvedValueOnce({
          id: 1234,
          fields: {
            'System.Title': 'Test Work Item',
            'System.WorkItemType': 'Task',
            'System.State': 'New',
            'System.IterationPath': 'TestProject\\Sprint 1'
          },
          _links: {
            html: { href: 'https://dev.azure.com/test-org/TestProject/_workitems/edit/1234' }
          },
          relations: []
        });

      const request = {
        params: {
          name: 'create-work-item',
          arguments: {
            type: 'Task',
            title: 'Test Work Item',
            iterationPath: 'TestProject\\Sprint 1'
          }
        }
      };

      const result = await toolHandlers.handleToolCall(request);
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(true);
      expect(response.workItem.id).toBe(1234);
      expect(response.workItem.iterationPath).toBe('TestProject\\Sprint 1');
      expect(response.iterationPathHandling.setDuringCreation).toBe(true);
      expect(response.iterationPathHandling.requested).toBe('TestProject\\Sprint 1');
      expect(response.iterationPathHandling.finalValue).toBe('TestProject\\Sprint 1');
    });

    test('should handle invalid iteration path with fallback to post-creation update', async () => {
      const mockMakeRequest = jest.spyOn(toolHandlers as any, 'makeApiRequest');
      
      // Mock iteration validation failure - first call for team settings, then classification nodes
      mockMakeRequest
        .mockResolvedValueOnce({ value: [] }) // Team settings empty
        .mockResolvedValueOnce({ children: [] }) // Classification nodes empty
        // Mock work item creation without iteration path
        .mockResolvedValueOnce({
          id: 1235,
          fields: {
            'System.Title': 'Test Work Item',
            'System.WorkItemType': 'Task',
            'System.State': 'New',
            'System.IterationPath': 'TestProject' // Default iteration
          },
          _links: {
            html: { href: 'https://dev.azure.com/test-org/TestProject/_workitems/edit/1235' }
          },
          relations: []
        })
        // Mock post-creation iteration path update success
        .mockResolvedValueOnce({})
        // Mock refresh work item after update
        .mockResolvedValueOnce({
          id: 1235,
          fields: {
            'System.Title': 'Test Work Item',
            'System.WorkItemType': 'Task',
            'System.State': 'New',
            'System.IterationPath': 'TestProject\\Sprint 2'
          },
          _links: {
            html: { href: 'https://dev.azure.com/test-org/TestProject/_workitems/edit/1235' }
          },
          relations: []
        });

      const request = {
        params: {
          name: 'create-work-item',
          arguments: {
            type: 'Task',
            title: 'Test Work Item',
            iterationPath: 'TestProject\\Sprint 2'
          }
        }
      };

      const result = await toolHandlers.handleToolCall(request);
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(true);
      expect(response.workItem.id).toBe(1235);
      expect(response.iterationPathHandling.setDuringCreation).toBe(false);
      expect(response.iterationPathHandling.requested).toBe('TestProject\\Sprint 2');
      expect(response.iterationPathHandling.finalValue).toBe('TestProject\\Sprint 2');
      expect(response.iterationPathHandling.validationError).toContain('does not exist');
    });

    test('should handle complete iteration path failure gracefully', async () => {
      const mockMakeRequest = jest.spyOn(toolHandlers as any, 'makeApiRequest');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock iteration validation failure - first call for team settings, then classification nodes
      mockMakeRequest
        .mockResolvedValueOnce({ value: [] }) // Team settings empty
        .mockResolvedValueOnce({ children: [] }) // Classification nodes empty
        // Mock work item creation without iteration path
        .mockResolvedValueOnce({
          id: 1236,
          fields: {
            'System.Title': 'Test Work Item',
            'System.WorkItemType': 'Task',
            'System.State': 'New',
            'System.IterationPath': 'TestProject' // Default iteration
          },
          _links: {
            html: { href: 'https://dev.azure.com/test-org/TestProject/_workitems/edit/1236' }
          },
          relations: []
        })
        // Mock post-creation update failure
        .mockRejectedValueOnce(new Error('HTTP 400: TF401347 - Invalid tree name given for work item 1236'));

      const request = {
        params: {
          name: 'create-work-item',
          arguments: {
            type: 'Task',
            title: 'Test Work Item',
            iterationPath: 'Invalid\\Path'
          }
        }
      };

      const result = await toolHandlers.handleToolCall(request);
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(true);
      expect(response.workItem.id).toBe(1236);
      expect(response.workItem.iterationPath).toBe('TestProject'); // Falls back to default
      expect(response.iterationPathHandling.setDuringCreation).toBe(false);
      expect(response.iterationPathHandling.requested).toBe('Invalid\\Path');
      expect(response.iterationPathHandling.finalValue).toBe('TestProject');
      
      // Verify warning was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WARNING] Failed to set iteration path post-creation')
      );
      
      consoleSpy.mockRestore();
    });

    test('should create work item successfully without iteration path', async () => {
      const mockMakeRequest = jest.spyOn(toolHandlers as any, 'makeApiRequest');
      
      // Mock work item creation without iteration path
      mockMakeRequest.mockResolvedValueOnce({
        id: 1237,
        fields: {
          'System.Title': 'Test Work Item',
          'System.WorkItemType': 'Task',
          'System.State': 'New',
          'System.IterationPath': 'TestProject'
        },
        _links: {
          html: { href: 'https://dev.azure.com/test-org/TestProject/_workitems/edit/1237' }
        },
        relations: []
      });

      const request = {
        params: {
          name: 'create-work-item',
          arguments: {
            type: 'Task',
            title: 'Test Work Item'
            // No iterationPath provided
          }
        }
      };

      const result = await toolHandlers.handleToolCall(request);
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(true);
      expect(response.workItem.id).toBe(1237);
      expect(response.workItem.iterationPath).toBe('TestProject');
      expect(response.iterationPathHandling).toBeUndefined(); // No iteration path handling info
    });

    test('should validate iteration path with various path formats', async () => {
      const mockMakeRequest = jest.spyOn(toolHandlers as any, 'makeApiRequest');
      
      // Mock classification nodes call (first call in validateIterationPath)
      mockMakeRequest
        .mockResolvedValueOnce({
          path: 'TestProject\\Sprint 1',
          name: 'Sprint 1',
          children: []
        })
        .mockResolvedValueOnce({
          id: 1238,
          fields: {
            'System.Title': 'Test Work Item',
            'System.WorkItemType': 'Task',
            'System.State': 'New',
            'System.IterationPath': 'TestProject\\Sprint 1'
          },
          _links: {
            html: { href: 'https://dev.azure.com/test-org/TestProject/_workitems/edit/1238' }
          },
          relations: []
        });

      const request = {
        params: {
          name: 'create-work-item',
          arguments: {
            type: 'Task',
            title: 'Test Work Item',
            iterationPath: 'TestProject/Sprint 1' // Forward slash format
          }
        }
      };

      const result = await toolHandlers.handleToolCall(request);
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(true);
      expect(response.iterationPathHandling.setDuringCreation).toBe(true);
    });
  });

  describe('validateIterationPath method', () => {
    test('should validate iteration path using classification nodes', async () => {
      const mockMakeRequest = jest.spyOn(toolHandlers as any, 'makeApiRequest');
      
      // Mock classification nodes call (first call in validateIterationPath)
      mockMakeRequest.mockResolvedValueOnce({
        path: 'TestProject\\Iteration\\Sprint 1',
        name: 'Sprint 1',
        children: []
      });

      await expect(
        (toolHandlers as any).validateIterationPath('TestProject\\Sprint 1')
      ).resolves.not.toThrow();
    });

    test('should fallback to team settings when classification nodes fail', async () => {
      const mockMakeRequest = jest.spyOn(toolHandlers as any, 'makeApiRequest');
      
      // Classification nodes fails
      mockMakeRequest
        .mockRejectedValueOnce(new Error('Classification nodes API failed'))
        // Team settings succeeds
        .mockResolvedValueOnce({
          value: [{
            path: 'TestProject\\Sprint 1',
            name: 'Sprint 1'
          }]
        });

      await expect(
        (toolHandlers as any).validateIterationPath('TestProject\\Sprint 1')
      ).resolves.not.toThrow();
    });

    test('should throw error when iteration path does not exist', async () => {
      const mockMakeRequest = jest.spyOn(toolHandlers as any, 'makeApiRequest');
      
      // Both team settings and classification nodes return empty
      mockMakeRequest
        .mockResolvedValueOnce({ value: [] })
        .mockResolvedValueOnce({ children: [] });

      await expect(
        (toolHandlers as any).validateIterationPath('NonExistent\\Sprint')
      ).rejects.toThrow("Iteration path 'NonExistent\\Sprint' does not exist in project 'TestProject'");
    });
  });

  describe('updateWorkItemIterationPath method', () => {
    test('should update work item iteration path successfully', async () => {
      const mockMakeRequest = jest.spyOn(toolHandlers as any, 'makeApiRequest');
      
      mockMakeRequest.mockResolvedValueOnce({});

      await expect(
        (toolHandlers as any).updateWorkItemIterationPath(1234, 'TestProject\\Sprint 2')
      ).resolves.not.toThrow();

      expect(mockMakeRequest).toHaveBeenCalledWith(
        '/wit/workitems/1234?api-version=7.1',
        'PATCH',
        [{
          op: 'replace',
          path: '/fields/System.IterationPath',
          value: 'TestProject\\Sprint 2'
        }]
      );
    });

    test('should throw error when update fails', async () => {
      const mockMakeRequest = jest.spyOn(toolHandlers as any, 'makeApiRequest');
      
      mockMakeRequest.mockRejectedValueOnce(new Error('HTTP 400: Invalid iteration path'));

      await expect(
        (toolHandlers as any).updateWorkItemIterationPath(1234, 'Invalid\\Path')
      ).rejects.toThrow('HTTP 400: Invalid iteration path');
    });
  });
});