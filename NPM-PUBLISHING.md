# NPM Publishing Guide for devops-mcp

This document provides step-by-step instructions for publishing the devops-mcp package to NPM and using it with Claude's MCP system.

## 📦 Publishing to NPM

### Prerequisites

1. **NPM Account**: Create an account at [npmjs.com](https://www.npmjs.com/)
2. **NPM CLI**: Ensure you have npm CLI installed and logged in
3. **Two-Factor Authentication**: Enable 2FA for your NPM account (recommended)

### Publishing Steps

#### 1. Login to NPM
```bash
npm login
```
Enter your NPM credentials when prompted.

#### 2. Verify Package Configuration
```bash
# Check package.json is correctly configured
cat package.json

# Verify build artifacts exist
npm run build
ls -la dist/

# Test the package locally
npm pack --dry-run
```

#### 3. Version Management
```bash
# For patch releases (bug fixes)
npm version patch

# For minor releases (new features)
npm version minor

# For major releases (breaking changes)
npm version major

# Or set version manually
npm version 1.0.1
```

#### 4. Publish to NPM
```bash
# First time publishing
npm publish

# For scoped packages (recommended)
npm publish --access public
```

#### 5. Verify Publication
```bash
# Check if package is published
npm view @wangkanai/devops-mcp

# Check package info
npm info @wangkanai/devops-mcp
```

### Automated Publishing with GitHub Actions

The repository includes automated npm publishing via `.github/workflows/npm-publish.yml`:

**Features:**
- Triggers on push to `main` branch
- Tests on multiple Node.js versions (18, 20, 22)
- Only publishes when `package.json` version changes
- Automatically creates git tags for new versions
- Comprehensive testing before publishing

**Setup Requirements:**
1. Add `NPM_TOKEN` secret to repository settings
2. Update version in `package.json` before pushing to main
3. Workflow automatically handles the rest

## 🚀 Using with Claude MCP

### Installation Methods

#### Method 1: Direct NPX Installation (Recommended)
```bash
claude mcp add devops-mcp -- npx devops-mcp
```

**Note**: NPM automatically maps the scoped package `@wangkanai/devops-mcp` to binary name `devops-mcp`. You can also use:
```bash
claude mcp add devops-mcp -- npx -y @wangkanai/devops-mcp
```

#### Method 2: Global Installation
```bash
# Install globally first
npm install -g @wangkanai/devops-mcp

# Add to Claude MCP
claude mcp add devops-mcp -- devops-mcp
```

#### Method 3: Local Installation
```bash
# Install locally in a project
npm install @wangkanai/devops-mcp

# Add to Claude MCP with absolute path
claude mcp add devops-mcp -- npx -y @wangkanai/devops-mcp
```

### Configuration

#### 1. Create Local Configuration
In each Azure DevOps project directory, create `.azure-devops.json`:

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
    "lastUpdated": "2025-07-25",
    "createdBy": "devops-mcp"
  }
}
```

#### 2. Secure Configuration
```bash
# Add to .gitignore
echo ".azure-devops.json" >> .gitignore

# Set restrictive permissions
chmod 600 .azure-devops.json
```

### Verification

#### 1. Test MCP Server
```bash
# Verify server starts correctly
npx -y @wangkanai/devops-mcp

# Test with Claude Code
claude mcp list
```

#### 2. Test Commands
```bash
# Test context detection
mcp__devops-mcp__get-current-context

# Test work item creation
mcp__devops-mcp__create-work-item --type "Task" --title "Test Item"

# Test work item updates
mcp__devops-mcp__update-work-item --id 1234 --state "Active"
```

## 🔧 Claude MCP Integration

### Server Configuration

Claude will automatically configure the MCP server when added. The configuration will be similar to:

```json
{
  "mcpServers": {
    "devops-mcp": {
      "command": "npx",
      "args": ["@wangkanai/devops-mcp"],
      "env": {}
    }
  }
}
```

### Available Commands

Once installed, the following commands will be available in Claude:

#### Work Item Management
- `mcp__devops-mcp__get-work-items` - Retrieve work items
- `mcp__devops-mcp__create-work-item` - Create new work items
- `mcp__devops-mcp__update-work-item` - Update existing work items
- `mcp__devops-mcp__add-work-item-comment` - Add comments to work items

#### Repository Operations
- `mcp__devops-mcp__get-repositories` - List repositories
- `mcp__devops-mcp__get-pull-requests` - List pull requests

#### Build & Pipeline Management
- `mcp__devops-mcp__get-builds` - List builds
- `mcp__devops-mcp__trigger-pipeline` - Trigger pipelines
- `mcp__devops-mcp__get-pipeline-status` - Check pipeline status

#### Context Management
- `mcp__devops-mcp__get-current-context` - Get current Azure DevOps context

### Usage Examples

#### Create Work Item Hierarchy
```bash
# Create Epic
mcp__devops-mcp__create-work-item \
  --type "Epic" \
  --title "User Authentication System"

# Create Feature with parent relationship
mcp__devops-mcp__create-work-item \
  --type "Feature" \
  --title "OAuth Integration" \
  --parent 1234 \
  --iterationPath "MyProject\\Sprint 1"

# Update existing work item
mcp__devops-mcp__update-work-item \
  --id 1235 \
  --state "Active" \
  --assignedTo "developer@company.com"
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Package Not Found
```bash
# Verify package is published
npm view @wangkanai/devops-mcp

# Check NPM registry
npm config get registry
```

#### 2. Installation Fails
```bash
# Clear npm cache
npm cache clean --force

# Try with verbose logging
npm install @wangkanai/devops-mcp --verbose
```

#### 3. Claude MCP Issues
```bash
# Check Claude MCP status
claude mcp list

# Remove and re-add server
claude mcp remove devops-mcp
claude mcp add devops-mcp -- npx -y @wangkanai/devops-mcp
```

#### 4. Configuration Issues
```bash
# Verify configuration
mcp__devops-mcp__get-current-context

# Check file permissions
ls -la .azure-devops.json
```

### Debug Mode
```bash
# Enable debug logging
export DEBUG=devops-mcp
npx -y @wangkanai/devops-mcp
```

## 📈 Updates and Versioning

### Updating the Package
```bash
# Update to latest version
npm update -g @wangkanai/devops-mcp

# Or reinstall specific version
npm install -g @wangkanai/devops-mcp@1.0.1
```

### Version History
- `1.0.0` - Initial release with core Azure DevOps functionality
- `1.0.1` - Added update-work-item and add-work-item-comment commands

### Breaking Changes
Major version updates may include breaking changes. Check the changelog before updating.

---

**Support**: For issues and questions, visit the [GitHub repository](https://github.com/wangkanai/devops-mcp) or file an issue.