# 📋 DevOps MCP Server - Complete Command Reference

> **Comprehensive guide for Claude users to effectively utilize all Azure DevOps MCP commands**

Complete reference for all MCP (Model Context Protocol) commands available in the `@wangkanai/devops-mcp` server with in-depth details, examples, and best practices.

---

## 📋 **Table of Contents**

- [🚀 Quick Start](#-quick-start)
- [🔧 Configuration](#-configuration)
- [📊 Command Categories](#-command-categories)
- [🛠️ Work Item Commands](#️-work-item-commands)
- [📦 Repository Commands](#-repository-commands)
- [🏗️ Build & Pipeline Commands](#️-build--pipeline-commands)
- [🔍 Context Commands](#-context-commands)
- [💡 Best Practices](#-best-practices)
- [🔄 Common Workflows](#-common-workflows)
- [❓ Troubleshooting](#-troubleshooting)

---

## 🚀 **Quick Start**

### Installation

```bash
# Claude Code (Recommended)
claude mcp add devops-mcp -- -y @wangkanai/devops-mcp

# Claude Desktop - Add to MCP settings
{
  "mcpServers": {
    "devops-mcp": {
      "command": "npx",
      "args": ["-y", "@wangkanai/devops-mcp"]
    }
  }
}
```

### Command Syntax

All commands follow the MCP protocol format:
```bash
mcp__devops-mcp__<command-name> [--parameter value] [--flag]
```

---

## 🔧 **Configuration**

The MCP server supports **directory-based authentication switching** using local `.azure-devops.json` files.

### Configuration File Format

Create a `.azure-devops.json` file in your repository root:

```json
{
  "organizationUrl": "https://dev.azure.com/your-organization",
  "project": "YourProjectName", 
  "pat": "your-personal-access-token-here",
  "description": "Azure DevOps configuration for this repository"
}
```

### Security Best Practice

```bash
# Always add to .gitignore to prevent committing PAT tokens
echo ".azure-devops.json" >> .gitignore
```

### PAT Token Permissions Required

Your Personal Access Token must have these permissions:
- **Work Items**: Read & Write
- **Code**: Read (for repositories)
- **Build**: Read & Execute (for pipelines)
- **Project and Team**: Read

---

## 📊 **Command Categories**

| Category             | Commands                                                                          | Purpose                           |
| -------------------- | --------------------------------------------------------------------------------- | --------------------------------- |
| **Work Items**       | `get-work-items`, `create-work-item`, `update-work-item`, `add-work-item-comment` | Manage work items and hierarchies |
| **Repository**       | `get-repositories`, `get-pull-requests`                                           | Repository and PR management      |
| **Build & Pipeline** | `get-builds`, `trigger-pipeline`, `get-pipeline-status`                           | CI/CD operations                  |
| **Context**          | `get-current-context`                                                             | Environment and configuration     |

---

## 🛠️ **Work Item Commands**

### 📋 `get-work-items`

**Purpose**: Retrieve work items using queries, specific IDs, or default recent items.

#### Parameters

| Parameter | Type     | Required | Description                           |
| --------- | -------- | -------- | ------------------------------------- |
| `wiql`    | string   | No       | Work Item Query Language (WIQL) query |
| `ids`     | number[] | No       | Specific work item IDs to retrieve    |
| `fields`  | string[] | No       | Fields to include in response         |

#### Usage Examples

```bash
# Get recent work items (default behavior)
mcp__devops-mcp__get-work-items

# Get specific work items by ID
mcp__devops-mcp__get-work-items --ids [1234, 1235, 1236]

# Get work items with specific fields
mcp__devops-mcp__get-work-items --ids [1234] --fields ["System.Id", "System.Title", "System.State", "System.Parent"]

# Query using WIQL
mcp__devops-mcp__get-work-items --wiql "SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.WorkItemType] = 'Bug' AND [System.State] = 'Active'"

# Get work items assigned to specific user
mcp__devops-mcp__get-work-items --wiql "SELECT [System.Id], [System.Title], [System.AssignedTo] FROM WorkItems WHERE [System.AssignedTo] = 'john.doe@company.com'"

# Get work items in specific iteration
mcp__devops-mcp__get-work-items --wiql "SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.IterationPath] UNDER 'ProjectName\\Sprint 1'"
```

#### Response Format

```json
{
  "count": 3,
  "value": [
    {
      "id": 1234,
      "fields": {
        "System.Id": 1234,
        "System.Title": "Fix authentication bug",
        "System.WorkItemType": "Bug",
        "System.State": "Active",
        "System.Parent": 1233,
        "System.AssignedTo": {
          "displayName": "John Doe",
          "uniqueName": "john.doe@company.com"
        }
      }
    }
  ]
}
```

---

### ✨ `create-work-item`

**Purpose**: Create new work items with full hierarchy support (Epic → Feature → User Story → Task).

#### Parameters

| Parameter       | Type   | Required | Description                                           |
| --------------- | ------ | -------- | ----------------------------------------------------- |
| `type`          | string | Yes      | Work item type (Epic, Feature, User Story, Task, Bug) |
| `title`         | string | Yes      | Work item title                                       |
| `description`   | string | No       | Work item description                                 |
| `assignedTo`    | string | No       | Email of assignee                                     |
| `tags`          | string | No       | Semicolon-separated tags                              |
| `parent`        | number | No       | **Parent work item ID for hierarchy**                 |
| `iterationPath` | string | No       | Sprint assignment (e.g., "ProjectName\\Sprint 1")     |
| `state`         | string | No       | Initial state (New, Active)                           |

#### Usage Examples

```bash
# Create a basic work item
mcp__devops-mcp__create-work-item --type "Task" --title "Implement user authentication"

# Create with full details
mcp__devops-mcp__create-work-item \
  --type "User Story" \
  --title "As a user, I want to login securely" \
  --description "Implement secure authentication with multi-factor support" \
  --assignedTo "developer@company.com" \
  --tags "authentication;security;mvp" \
  --iterationPath "MyProject\\Sprint 1" \
  --state "Active"

# Create Epic → Feature → User Story → Task hierarchy
# Step 1: Create Epic
mcp__devops-mcp__create-work-item --type "Epic" --title "User Management System"

# Step 2: Create Feature with Epic as parent (assuming Epic ID = 1100)
mcp__devops-mcp__create-work-item \
  --type "Feature" \
  --title "Authentication Module" \
  --parent 1100

# Step 3: Create User Story with Feature as parent (assuming Feature ID = 1101)
mcp__devops-mcp__create-work-item \
  --type "User Story" \
  --title "User Login Interface" \
  --parent 1101

# Step 4: Create Task with User Story as parent (assuming User Story ID = 1102)
mcp__devops-mcp__create-work-item \
  --type "Task" \
  --title "Design login form UI" \
  --parent 1102
```

#### Response Format

```json
{
  "success": true,
  "workItem": {
    "id": 1234,
    "title": "Implement user authentication",
    "type": "Task",
    "state": "New",
    "parent": 1102,
    "parentRelation": {
      "id": 1102,
      "url": "https://dev.azure.com/org/project/_apis/wit/workItems/1102",
      "comment": "Parent relationship set via MCP create-work-item command"
    },
    "iterationPath": "MyProject\\Sprint 1",
    "assignedTo": "developer@company.com",
    "url": "https://dev.azure.com/org/project/_workitems/edit/1234",
    "relations": 1
  },
  "message": "Work item created with parent relationship to work item 1102"
}
```

---

### 🔄 `update-work-item`

**Purpose**: Update existing work items including state changes, assignments, and hierarchy modifications.

#### Parameters

| Parameter       | Type   | Required | Description                          |
| --------------- | ------ | -------- | ------------------------------------ |
| `id`            | number | Yes      | Work item ID to update               |
| `title`         | string | No       | Updated title                        |
| `description`   | string | No       | Updated description                  |
| `state`         | string | No       | New state (Active, Resolved, Closed) |
| `assignedTo`    | string | No       | New assignee email                   |
| `parent`        | number | No       | New parent work item ID              |
| `iterationPath` | string | No       | New sprint assignment                |
| `tags`          | string | No       | Updated tags (semicolon-separated)   |
| `fields`        | object | No       | Generic field updates                |

#### Usage Examples

```bash
# Update work item state
mcp__devops-mcp__update-work-item --id 1234 --state "Active"

# Reassign work item
mcp__devops-mcp__update-work-item --id 1234 --assignedTo "newdeveloper@company.com"

# Move to different sprint
mcp__devops-mcp__update-work-item --id 1234 --iterationPath "MyProject\\Sprint 2"

# Update multiple fields
mcp__devops-mcp__update-work-item \
  --id 1234 \
  --title "Updated: Implement secure user authentication" \
  --state "Active" \
  --assignedTo "lead@company.com" \
  --tags "authentication;security;high-priority"

# Change parent relationship
mcp__devops-mcp__update-work-item --id 1234 --parent 1105

# Update custom fields
mcp__devops-mcp__update-work-item \
  --id 1234 \
  --fields '{"Custom.Priority": "High", "Custom.Component": "Authentication"}'
```

#### Common State Transitions

| Work Item Type | Common States                    |
| -------------- | -------------------------------- |
| **Epic**       | New → Active → Resolved → Closed |
| **Feature**    | New → Active → Resolved → Closed |
| **User Story** | New → Active → Resolved → Closed |
| **Task**       | New → Active → Closed            |
| **Bug**        | New → Active → Resolved → Closed |

---

### 💬 `add-work-item-comment`

**Purpose**: Add comments to work items for discussion, updates, and tracking.

#### Parameters

| Parameter | Type   | Required | Description  |
| --------- | ------ | -------- | ------------ |
| `id`      | number | Yes      | Work item ID |
| `comment` | string | Yes      | Comment text |

#### Usage Examples

```bash
# Add simple comment
mcp__devops-mcp__add-work-item-comment --id 1234 --comment "Started working on this task"

# Add detailed update
mcp__devops-mcp__add-work-item-comment \
  --id 1234 \
  --comment "Completed initial authentication research. Found that OAuth 2.0 with PKCE is the recommended approach for our use case. Will implement this solution next."

# Add status update
mcp__devops-mcp__add-work-item-comment \
  --id 1234 \
  --comment "Status Update: 70% complete. Login form implemented, working on password validation logic."
```

---

## 📦 **Repository Commands**

### 📁 `get-repositories`

**Purpose**: List all repositories in the Azure DevOps project.

#### Parameters

| Parameter      | Type    | Required | Description              |
| -------------- | ------- | -------- | ------------------------ |
| `includeLinks` | boolean | No       | Include repository links |

#### Usage Examples

```bash
# List all repositories
mcp__devops-mcp__get-repositories

# Include repository links
mcp__devops-mcp__get-repositories --includeLinks true
```

#### Response Format

```json
{
  "count": 3,
  "repositories": [
    {
      "id": "abc123",
      "name": "frontend-app",
      "url": "https://dev.azure.com/org/project/_git/frontend-app",
      "defaultBranch": "refs/heads/main",
      "size": 12543210
    }
  ]
}
```

---

### 🔀 `get-pull-requests`

**Purpose**: Retrieve pull requests with filtering options.

#### Parameters

| Parameter      | Type   | Required | Description                                  |
| -------------- | ------ | -------- | -------------------------------------------- |
| `repositoryId` | string | No       | Specific repository (default: all)           |
| `status`       | string | No       | PR status: active, completed, abandoned, all |
| `createdBy`    | string | No       | Filter by creator email                      |
| `top`          | number | No       | Number of PRs to return (default: 25)        |

#### Usage Examples

```bash
# Get active pull requests
mcp__devops-mcp__get-pull-requests

# Get all pull requests
mcp__devops-mcp__get-pull-requests --status "all"

# Get PRs by specific author
mcp__devops-mcp__get-pull-requests --createdBy "developer@company.com"

# Get PRs for specific repository
mcp__devops-mcp__get-pull-requests --repositoryId "frontend-app" --status "active"

# Limit results
mcp__devops-mcp__get-pull-requests --top 10
```

---

## 🏗️ **Build & Pipeline Commands**

### 🔨 `get-builds`

**Purpose**: Retrieve build information and history.

#### Parameters

| Parameter       | Type     | Required | Description                   |
| --------------- | -------- | -------- | ----------------------------- |
| `definitionIds` | number[] | No       | Specific build definition IDs |
| `top`           | number   | No       | Number of builds to return    |

#### Usage Examples

```bash
# Get recent builds (default: 10)
mcp__devops-mcp__get-builds

# Get builds for specific definitions
mcp__devops-mcp__get-builds --definitionIds [12, 15, 18]

# Get more build results
mcp__devops-mcp__get-builds --top 20
```

---

### 🚀 `trigger-pipeline`

**Purpose**: Trigger build pipelines with parameters.

#### Parameters

| Parameter        | Type   | Required | Description           |
| ---------------- | ------ | -------- | --------------------- |
| `definitionId`   | number | No*      | Build definition ID   |
| `definitionName` | string | No*      | Build definition name |
| `sourceBranch`   | string | No       | Branch to build       |
| `parameters`     | object | No       | Pipeline parameters   |

*Either `definitionId` or `definitionName` required

#### Usage Examples

```bash
# Trigger by definition ID
mcp__devops-mcp__trigger-pipeline --definitionId 42

# Trigger by definition name
mcp__devops-mcp__trigger-pipeline --definitionName "Frontend CI/CD"

# Trigger with specific branch
mcp__devops-mcp__trigger-pipeline \
  --definitionName "Frontend CI/CD" \
  --sourceBranch "feature/new-auth"

# Trigger with parameters
mcp__devops-mcp__trigger-pipeline \
  --definitionId 42 \
  --parameters '{"environment": "staging", "runTests": true}'
```

---

### 📊 `get-pipeline-status`

**Purpose**: Check build and pipeline status.

#### Parameters

| Parameter         | Type    | Required | Description                  |
| ----------------- | ------- | -------- | ---------------------------- |
| `buildId`         | number  | No*      | Specific build ID            |
| `definitionId`    | number  | No*      | Recent builds for definition |
| `includeTimeline` | boolean | No       | Include detailed timeline    |

*Either `buildId` or `definitionId` required

#### Usage Examples

```bash
# Check specific build status
mcp__devops-mcp__get-pipeline-status --buildId 12345

# Get recent builds for definition
mcp__devops-mcp__get-pipeline-status --definitionId 42

# Include detailed timeline
mcp__devops-mcp__get-pipeline-status --buildId 12345 --includeTimeline true
```

---

## 🔍 **Context Commands**

### 🌍 `get-current-context`

**Purpose**: Display current Azure DevOps configuration and context.

#### Parameters

| Parameter   | Type   | Required | Description                           |
| ----------- | ------ | -------- | ------------------------------------- |
| `directory` | string | No       | Directory to check (default: current) |

#### Usage Examples

```bash
# Get current context
mcp__devops-mcp__get-current-context

# Check specific directory
mcp__devops-mcp__get-current-context --directory "/path/to/project"
```

#### Response Format

```json
{
  "organizationUrl": "https://dev.azure.com/myorg",
  "project": "MyProject",
  "directory": "/Users/me/projects/myapp",
  "configurationSource": "local",
  "configFile": ".azure-devops.json"
}
```

---

## 💡 **Best Practices**

### 🔒 **Security**

```bash
# Always exclude config from version control
echo ".azure-devops.json" >> .gitignore

# Use minimal PAT permissions
# ✅ Work Items: Read & Write
# ✅ Code: Read  
# ✅ Build: Read & Execute
# ❌ Full Access (unnecessary)
```

### 🏗️ **Work Item Hierarchy**

```bash
# Follow Azure DevOps hierarchy best practices
Epic (Strategic Initiative)
├── Feature (Deliverable Functionality)
│   ├── User Story (User Value)
│   │   ├── Task (Implementation Work)
│   │   └── Task (Testing Work)
│   └── Bug (Defect)
└── Feature (Another Deliverable)
```

### 📋 **WIQL Query Tips**

```sql
-- Get work items by state
SELECT [System.Id], [System.Title] 
FROM WorkItems 
WHERE [System.State] = 'Active'

-- Get work items by assignee
SELECT [System.Id], [System.Title], [System.AssignedTo]
FROM WorkItems 
WHERE [System.AssignedTo] = 'user@company.com'

-- Get work items in iteration
SELECT [System.Id], [System.Title]
FROM WorkItems 
WHERE [System.IterationPath] UNDER 'ProjectName\\Sprint 1'

-- Get hierarchy relationships
SELECT [System.Id], [System.Title], [System.Parent]
FROM WorkItems 
WHERE [System.Parent] = 1234
```

---

## 🔄 **Common Workflows**

### 🆕 **Creating New Feature Development**

```bash
# 1. Create Epic for major initiative
epic_id=$(mcp__devops-mcp__create-work-item \
  --type "Epic" \
  --title "User Authentication System" \
  --description "Implement comprehensive user authentication")

# 2. Create Feature under Epic
feature_id=$(mcp__devops-mcp__create-work-item \
  --type "Feature" \
  --title "Login/Logout Functionality" \
  --parent $epic_id \
  --iterationPath "MyProject\\Sprint 1")

# 3. Create User Stories under Feature
story_id=$(mcp__devops-mcp__create-work-item \
  --type "User Story" \
  --title "As a user, I want to login with email/password" \
  --parent $feature_id \
  --assignedTo "developer@company.com")

# 4. Create implementation tasks
mcp__devops-mcp__create-work-item \
  --type "Task" \
  --title "Design login form UI" \
  --parent $story_id \
  --assignedTo "frontend@company.com"

mcp__devops-mcp__create-work-item \
  --type "Task" \
  --title "Implement authentication API" \
  --parent $story_id \
  --assignedTo "backend@company.com"
```

### 📈 **Sprint Management**

```bash
# Get all work items in current sprint
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo] FROM WorkItems WHERE [System.IterationPath] UNDER 'MyProject\\Current Sprint'"

# Move work items to next sprint
mcp__devops-mcp__update-work-item \
  --id 1234 \
  --iterationPath "MyProject\\Sprint 2"

# Update work item states for sprint completion
mcp__devops-mcp__update-work-item --id 1234 --state "Closed"
mcp__devops-mcp__update-work-item --id 1235 --state "Resolved"
```

### 🐛 **Bug Triage Workflow**

```bash
# Create bug report
bug_id=$(mcp__devops-mcp__create-work-item \
  --type "Bug" \
  --title "Login page crashes on Safari" \
  --description "Steps to reproduce: 1. Open Safari, 2. Navigate to login, 3. Enter credentials" \
  --tags "browser-compatibility;high-priority" \
  --assignedTo "qa@company.com")

# Add investigation comment
mcp__devops-mcp__add-work-item-comment \
  --id $bug_id \
  --comment "Reproduced issue. Appears to be related to Safari's handling of form validation."

# Assign to developer
mcp__devops-mcp__update-work-item \
  --id $bug_id \
  --assignedTo "developer@company.com" \
  --state "Active"

# Link to parent feature if relevant
mcp__devops-mcp__update-work-item \
  --id $bug_id \
  --parent $feature_id
```

### 🚀 **Deployment Pipeline**

```bash
# Trigger staging deployment
build_id=$(mcp__devops-mcp__trigger-pipeline \
  --definitionName "Staging Deployment" \
  --sourceBranch "develop" \
  --parameters '{"environment": "staging", "runTests": true}')

# Monitor deployment status
mcp__devops-mcp__get-pipeline-status \
  --buildId $build_id \
  --includeTimeline true

# Trigger production after staging success
mcp__devops-mcp__trigger-pipeline \
  --definitionName "Production Deployment" \
  --sourceBranch "main" \
  --parameters '{"environment": "production", "requireApproval": true}'
```

---

## ❓ **Troubleshooting**

### 🔧 **Common Issues**

#### **"No Azure DevOps configuration found"**
```bash
# Check current context
mcp__devops-mcp__get-current-context

# Ensure .azure-devops.json exists in current directory
ls -la .azure-devops.json

# Verify JSON format
cat .azure-devops.json | jq .
```

#### **"Authentication failed"**
```bash
# Verify PAT token has correct permissions
# Check token hasn't expired
# Ensure organization URL is correct format: https://dev.azure.com/orgname
```

#### **"Work item type not found"**
```bash
# Use exact work item types as configured in your Azure DevOps process:
# Agile Process: Epic, Feature, User Story, Task, Bug
# Scrum Process: Epic, Feature, Product Backlog Item, Task, Bug  
# CMMI Process: Epic, Feature, Requirement, Task, Bug
```

#### **"Parent relationship failed"**
```bash
# Ensure parent work item exists and is accessible
mcp__devops-mcp__get-work-items --ids [parent_id]

# Verify parent-child relationship is valid:
# Epic → Feature ✅
# Feature → User Story ✅  
# User Story → Task ✅
# Task → Epic ❌ (invalid hierarchy)
```

### 🔍 **Debug Commands**

```bash
# Check current configuration
mcp__devops-mcp__get-current-context

# List available repositories
mcp__devops-mcp__get-repositories

# Test basic connectivity
mcp__devops-mcp__get-work-items --wiql "SELECT TOP 1 [System.Id] FROM WorkItems"
```

---

## 📚 **Additional Resources**

- **Azure DevOps REST API**: [Official Documentation](https://docs.microsoft.com/en-us/rest/api/azure/devops/)
- **WIQL Reference**: [Query Language Guide](https://docs.microsoft.com/en-us/azure/devops/boards/queries/wiql-syntax)
- **Work Item Types**: [Process Template Guide](https://docs.microsoft.com/en-us/azure/devops/boards/work-items/guidance/choose-process)
- **PAT Tokens**: [Security Guide](https://docs.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate)

---

**Version**: 1.3.0+  
**Last Updated**: July 25, 2025  
**GitHub**: [wangkanai/devops-mcp](https://github.com/wangkanai/devops-mcp)  
**NPM**: [@wangkanai/devops-mcp](https://www.npmjs.com/package/@wangkanai/devops-mcp)

---

*This documentation is designed to help Claude users effectively leverage Azure DevOps integration through the MCP protocol. For issues or feature requests, please visit the GitHub repository.*