# Claude MCP Usage Guide

Quick reference for using the devops-mcp package with Claude Code.

## 🚀 Quick Start

### 1. Install and Add to Claude Code
```bash
claude mcp add devops-mcp -- -y @wangkanai/devops-mcp
```

### 1b. Claude Desktop Installation
For Claude Desktop users, add this configuration to your MCP settings:

```json
{
  "mcpServers": {
    "devops-mcp": {
      "command": "npx",
      "args": ["-y", "@wangkanai/devops-mcp"]
    }
  }
}
```

**Claude Desktop MCP Settings Location:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### 2. Configure Authentication
Create `.azure-devops.json` in your project directory:
```json
{
  "organizationUrl": "https://dev.azure.com/your-org",
  "project": "YourProject",
  "pat": "your-pat-token-here"
}
```

### 3. Verify Installation
```bash
mcp__devops-mcp__get-current-context
```

## 📋 Command Reference

### Work Item Management

#### Create Work Items
```bash
# Basic work item
mcp__devops-mcp__create-work-item \
  --type "Task" \
  --title "Implement new feature"

# Work item with full details
mcp__devops-mcp__create-work-item \
  --type "User Story" \
  --title "User login functionality" \
  --description "Implement OAuth-based user authentication" \
  --assignedTo "developer@company.com" \
  --parent 1234 \
  --iterationPath "MyProject\\Sprint 1" \
  --state "New"
```

#### Update Work Items
```bash
# Update basic fields
mcp__devops-mcp__update-work-item \
  --id 1235 \
  --state "Active" \
  --assignedTo "newdev@company.com"

# Establish parent relationship
mcp__devops-mcp__update-work-item \
  --id 1236 \
  --parent 1235

# Move to different sprint
mcp__devops-mcp__update-work-item \
  --id 1236 \
  --iterationPath "MyProject\\Sprint 2"
```

#### Add Comments
```bash
mcp__devops-mcp__add-work-item-comment \
  --id 1236 \
  --comment "Completed OAuth provider integration, ready for testing"
```

#### Query Work Items
```bash
# Get recent work items
mcp__devops-mcp__get-work-items

# Get specific work items
mcp__devops-mcp__get-work-items --ids [1234,1235,1236]

# Custom WIQL query
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.State] = 'Active'"
```

### Repository Operations

```bash
# List all repositories
mcp__devops-mcp__get-repositories

# List repositories with links
mcp__devops-mcp__get-repositories --includeLinks true
```

### Pull Request Management

```bash
# Get active pull requests
mcp__devops-mcp__get-pull-requests

# Get completed pull requests
mcp__devops-mcp__get-pull-requests --status "completed"

# Filter by repository
mcp__devops-mcp__get-pull-requests --repositoryId "my-repo"
```

### Build & Pipeline Operations

```bash
# Get recent builds
mcp__devops-mcp__get-builds

# Get builds for specific definition
mcp__devops-mcp__get-builds --definitionIds [123]

# Trigger a pipeline
mcp__devops-mcp__trigger-pipeline \
  --definitionName "CI/CD Pipeline" \
  --sourceBranch "feature/new-feature"

# Check pipeline status
mcp__devops-mcp__get-pipeline-status --buildId 5678
```

### Context Management

```bash
# Get current context
mcp__devops-mcp__get-current-context

# Check specific directory context
mcp__devops-mcp__get-current-context \
  --directory "/path/to/project"
```

## 🔄 Workflow Examples

### Epic → Feature → Story → Task Hierarchy

```bash
# 1. Create Epic
mcp__devops-mcp__create-work-item \
  --type "Epic" \
  --title "User Authentication System"
# Returns: Epic ID 1001

# 2. Create Feature under Epic
mcp__devops-mcp__create-work-item \
  --type "Feature" \
  --title "OAuth Integration" \
  --parent 1001 \
  --iterationPath "MyProject\\Sprint 1"
# Returns: Feature ID 1002

# 3. Create User Story under Feature
mcp__devops-mcp__create-work-item \
  --type "User Story" \
  --title "Google OAuth Login" \
  --parent 1002 \
  --iterationPath "MyProject\\Sprint 1"
# Returns: Story ID 1003

# 4. Create Task under User Story
mcp__devops-mcp__create-work-item \
  --type "Task" \
  --title "Implement OAuth provider configuration" \
  --parent 1003 \
  --iterationPath "MyProject\\Sprint 1" \
  --assignedTo "developer@company.com"
# Returns: Task ID 1004
```

### Sprint Management

```bash
# Move work items to new sprint
mcp__devops-mcp__update-work-item \
  --id 1003 \
  --iterationPath "MyProject\\Sprint 2"

mcp__devops-mcp__update-work-item \
  --id 1004 \
  --iterationPath "MyProject\\Sprint 2"

# Update work item states
mcp__devops-mcp__update-work-item \
  --id 1004 \
  --state "Active"

# Add progress comments
mcp__devops-mcp__add-work-item-comment \
  --id 1004 \
  --comment "Started OAuth provider configuration. Estimated 50% complete."
```

### Release Pipeline

```bash
# Trigger build
mcp__devops-mcp__trigger-pipeline \
  --definitionName "Release Pipeline" \
  --sourceBranch "main"

# Monitor build progress
mcp__devops-mcp__get-pipeline-status \
  --buildId 5678 \
  --includeTimeline true

# Update related work items
mcp__devops-mcp__update-work-item \
  --id 1004 \
  --state "Resolved"

mcp__devops-mcp__add-work-item-comment \
  --id 1004 \
  --comment "Deployed to production in build #5678"
```

## 🔧 Troubleshooting

### Check Configuration
```bash
# Verify current context
mcp__devops-mcp__get-current-context

# Check if .azure-devops.json exists
ls -la .azure-devops.json
```

### Test Connectivity
```bash
# Test basic work item query
mcp__devops-mcp__get-work-items

# Test repository access
mcp__devops-mcp__get-repositories
```

### Debug Issues
```bash
# Enable debug mode
export DEBUG=devops-mcp
mcp__devops-mcp__get-current-context
```

## 📚 Additional Resources

- [NPM Publishing Guide](./NPM-PUBLISHING.md)
- [GitHub Repository](https://github.com/wangkanai/devops-mcp)
- [Azure DevOps REST API Documentation](https://docs.microsoft.com/en-us/rest/api/azure/devops/)

---

**Note**: Replace `your-org`, `YourProject`, and PAT tokens with your actual Azure DevOps configuration.