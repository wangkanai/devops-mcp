# Azure DevOps MCP Proxy Server

A dynamic Azure DevOps MCP (Model Context Protocol) proxy server that automatically switches authentication context based on the current working directory. This enables seamless integration with multiple Azure DevOps organizations and projects from a single MCP server.

## Features

- **Local Configuration Files**: Each repository contains `.azure-devops.json` configuration
- **Dynamic Environment Switching**: Automatically detects project context based on directory location
- **Multiple Project Support**: Supports unlimited projects with separate authentication
- **Comprehensive Azure DevOps Integration**: Work items, repositories, builds, and more
- **Zero Configuration Switching**: Seamless switching between projects with local config files
- **Secure Token Storage**: PAT tokens stored locally per repository (excluded from git)
- **Error Handling & Fallback**: Robust error handling with graceful degradation to environment variables

## Local Configuration

Each repository should contain a `.azure-devops.json` configuration file:

### Configuration File Structure
```json
{
  "organizationUrl": "https://dev.azure.com/your-org",
  "project": "YourProject",
  "pat": "your-pat-token-here",
  "description": "Azure DevOps configuration for this repository",
  "settings": {
    "timeout": 30000,
    "retries": 3,
    "apiVersion": "7.1"
  },
  "tools": {
    "workItems": true,
    "repositories": true,
    "builds": true,
    "pullRequests": true,
    "pipelines": true
  },
  "meta": {
    "configVersion": "1.0",
    "lastUpdated": "2025-07-21",
    "createdBy": "azure-devops-mcp-proxy"
  }
}
```

### Security Configuration
**Important**: Add `.azure-devops.json` to your `.gitignore` file:
```gitignore
# Azure DevOps MCP local configuration (contains PAT tokens)
.azure-devops.json
```

### Example Projects

#### RiverSync Project
- **Directory**: `/Users/wangkanai/Sources/riversync`
- **Configuration**: `.azure-devops.json` with RiverSync organization settings

#### Mula Project
- **Directory**: `/Users/wangkanai/Sources/mula`
- **Configuration**: `.azure-devops.json` with Mula organization settings

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start
```

## Development

```bash
# Development mode with auto-reload
npm run dev

# Type checking
npm run type-check

# Clean build artifacts
npm run clean
```

## Available Tools

### Work Items
- **get-work-items**: Retrieve work items using WIQL queries or specific IDs
- **create-work-item**: Create new work items with title, description, assignment, and tags

### Repositories
- **get-repositories**: List all repositories in the current project context

### Builds
- **get-builds**: Get build definitions and recent build history

### Context Management
- **get-current-context**: Get current Azure DevOps context based on directory

## Usage Examples

### Get Current Context
```json
{
  "name": "get-current-context",
  "arguments": {
    "directory": "/Users/wangkanai/Sources/riversync"
  }
}
```

### Query Work Items
```json
{
  "name": "get-work-items",
  "arguments": {
    "wiql": "SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.State] = 'Active'"
  }
}
```

### Create Work Item
```json
{
  "name": "create-work-item",
  "arguments": {
    "type": "Task",
    "title": "Implement new feature",
    "description": "Add authentication system",
    "assignedTo": "user@example.com"
  }
}
```

### Get Repositories
```json
{
  "name": "get-repositories",
  "arguments": {
    "includeLinks": true
  }
}
```

## Directory Detection Logic

The server uses intelligent directory detection:

1. **Exact Match**: Direct match of configured directory paths
2. **Nested Directory Support**: Detects parent project directories
3. **Longest Match Priority**: Most specific directory match takes precedence
4. **Parent Directory Search**: Searches up the directory tree for matches
5. **Fallback Configuration**: Uses default configuration when no match found

## Configuration File

Configuration is stored in `config/environments.json`:

```json
{
  "mappings": [
    {
      "directory": "/Users/wangkanai/Sources/riversync",
      "config": {
        "organizationUrl": "https://dev.azure.com/riversync",
        "pat": "YOUR_RIVERSYNC_PAT_TOKEN",
        "project": "RiverSync"
      }
    },
    {
      "directory": "/Users/wangkanai/Sources/mula",
      "config": {
        "organizationUrl": "https://dev.azure.com/mula-x",
        "pat": "YOUR_MULA_PAT_TOKEN",
        "project": "mula"
      }
    }
  ],
  "defaultConfig": {
    "organizationUrl": "https://dev.azure.com/default",
    "pat": "DEFAULT_PAT_TOKEN",
    "project": "DefaultProject"
  }
}
```

## Authentication

The server uses Personal Access Tokens (PAT) for Azure DevOps authentication. PAT tokens are configured per project in the environments.json file.

### PAT Token Requirements

PAT tokens should have the following scopes:
- **Work Items**: Read & Write
- **Code**: Read
- **Build**: Read
- **Project and Team**: Read

## Error Handling

The server includes comprehensive error handling:

- **Configuration Errors**: Graceful fallback when configuration is missing
- **Authentication Errors**: Clear error messages for authentication failures
- **API Errors**: Detailed error reporting for Azure DevOps API issues
- **Network Errors**: Retry logic and timeout handling

## Testing

Run the test script to verify server functionality:

```bash
# Build and test the server
npm run build
node test-server.js
```

## Architecture

### Core Components

- **AzureDevOpsMCPProxy**: Main server class with MCP protocol handling
- **DirectoryDetector**: Smart directory detection and configuration mapping
- **ToolHandlers**: Azure DevOps API integration and tool implementations
- **ConfigLoader**: Configuration file loading and validation

### Request Flow

1. **Tool Call Received**: MCP client sends tool call request
2. **Context Detection**: Directory detector identifies current project context
3. **Configuration Switch**: Server switches to appropriate Azure DevOps configuration
4. **API Request**: Tool handler makes authenticated API request to Azure DevOps
5. **Response Processing**: Response is formatted and returned to MCP client

## Integration with Claude Code

This MCP server is designed to work seamlessly with Claude Code for Azure DevOps operations:

1. **Automatic Context Switching**: When working in RiverSync or Mula project directories
2. **Transparent Authentication**: No manual configuration required
3. **Rich Tool Set**: Comprehensive Azure DevOps functionality
4. **Error Recovery**: Graceful handling of authentication and network issues

## Security Considerations

- PAT tokens are stored in configuration files (ensure proper file permissions)
- HTTPS is used for all Azure DevOps API communications
- Authentication is handled per-request with proper token encoding
- No token caching or persistence beyond configuration file

## Troubleshooting

### Common Issues

1. **Configuration Not Found**: Ensure `config/environments.json` exists and is valid
2. **Authentication Errors**: Verify PAT token permissions and expiration
3. **Directory Detection**: Check that you're in a configured project directory
4. **API Errors**: Verify Azure DevOps organization and project names

### Debug Mode

Enable debug logging by setting environment variable:

```bash
export DEBUG=azure-devops-mcp-proxy
npm start
```

## License

MIT License - see LICENSE file for details.