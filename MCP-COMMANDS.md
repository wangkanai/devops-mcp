# 📋 DevOps MCP Server - Complete Command Reference

> **Comprehensive guide for Claude users to effectively utilize all Azure DevOps MCP commands with in-depth details, examples, and best practices**

Complete reference for all MCP (Model Context Protocol) commands available in the `@wangkanai/devops-mcp` server with detailed parameters, response formats, real-world examples, and advanced usage patterns.

---

## 📋 **Table of Contents**

- [🚀 Quick Start](#-quick-start)
- [🔧 Configuration](#-configuration)
- [📊 Command Categories](#-command-categories)
- [🛠️ Work Item Commands](#️-work-item-commands)
- [📦 Repository Commands](#-repository-commands)
- [🏗️ Build & Pipeline Commands](#️-build--pipeline-commands)
- [🔍 Context Commands](#-context-commands)
- [🎯 Advanced Query Patterns](#-advanced-query-patterns)
- [💡 Best Practices](#-best-practices)
- [🔄 Common Workflows](#-common-workflows)
- [❓ Troubleshooting](#-troubleshooting)
- [📚 Additional Resources](#-additional-resources)

---

## 🚀 **Quick Start**

### Installation Methods

#### Claude Code (Recommended)
```bash
# Install and add to Claude Code MCP
claude mcp add devops-mcp -- -y @wangkanai/devops-mcp
```

#### Claude Desktop
Add to your MCP settings file:

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

### Command Syntax

All commands follow the MCP protocol format:

```bash
mcp__devops-mcp__<command-name> [--parameter value] [--flag]
```

### Verification

```bash
# Test installation and connectivity
mcp__devops-mcp__get-current-context

# Expected output: Current Azure DevOps configuration details
```

---

## 🔧 **Configuration**

### Directory-Based Authentication
The MCP server supports **intelligent directory-based authentication switching** using local `.azure-devops.json` files.

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

### Security Best Practices

```bash
# Always add to .gitignore to prevent committing PAT tokens
echo ".azure-devops.json" >> .gitignore

# Verify file is ignored
git status --ignored
```

### PAT Token Requirements

Your Personal Access Token must have these specific permissions:

| Permission | Access Level | Purpose |
|------------|-------------|---------|
| **Work Items** | Read & Write | Create, update, query work items |
| **Code** | Read | Access repositories and pull requests |
| **Build** | Read & Execute | Trigger pipelines and monitor builds |
| **Project and Team** | Read | Get project context and team information |

**❌ Avoid**: Full Access permissions (unnecessary security risk)

---

## 📊 **Command Categories**

| Category | Commands | Purpose | Common Use Cases |
|----------|----------|---------|------------------|
| **Work Items** | `get-work-items`, `create-work-item`, `update-work-item`, `add-work-item-comment` | Manage work items and hierarchies | Sprint planning, feature development, bug tracking |
| **Repository** | `get-repositories`, `get-pull-requests` | Repository and PR management | Code review, repository analysis, branch management |
| **Build & Pipeline** | `get-builds`, `trigger-pipeline`, `get-pipeline-status` | CI/CD operations | Deployment automation, build monitoring, release management |
| **Context** | `get-current-context` | Environment and configuration | Multi-project switching, authentication validation |

---

## 🛠️ **Work Item Commands**

### 📋 `get-work-items`

**Purpose**: Retrieve work items using flexible queries, specific IDs, or intelligent defaults with comprehensive field support.

#### Parameters

| Parameter | Type | Required | Description | Example Values |
|-----------|------|----------|-------------|----------------|
| `wiql` | string | No | Work Item Query Language (WIQL) query | `"SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Active'"` |
| `ids` | number[] | No | Specific work item IDs to retrieve | `[1234, 1235, 1236]` |
| `fields` | string[] | No | Fields to include in response | `["System.Id", "System.Title", "System.State"]` |

#### Default Behavior
When called without parameters, returns the 50 most recently modified work items in the current project.

#### Usage Examples

```bash
# Get recent work items (default behavior)
mcp__devops-mcp__get-work-items

# Get specific work items by ID
mcp__devops-mcp__get-work-items --ids [1234, 1235, 1236]

# Get work items with specific fields only
mcp__devops-mcp__get-work-items \
  --ids [1234] \
  --fields ["System.Id", "System.Title", "System.State", "System.Parent", "System.AssignedTo"]

# Query active bugs using WIQL
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title], [Microsoft.VSTS.Common.Priority] FROM WorkItems WHERE [System.WorkItemType] = 'Bug' AND [System.State] = 'Active'"

# Get work items assigned to current user
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title], [System.AssignedTo] FROM WorkItems WHERE [System.AssignedTo] = @me"

# Get work items in specific iteration with hierarchy
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title], [System.Parent], [System.WorkItemType] FROM WorkItems WHERE [System.IterationPath] UNDER 'ProjectName\\Sprint 1'"

# Find work items by tags
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title], [System.Tags] FROM WorkItems WHERE [System.Tags] CONTAINS 'high-priority'"

# Get recently modified work items (last 7 days)
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title], [System.ChangedDate], [System.ChangedBy] FROM WorkItems WHERE [System.ChangedDate] >= @today-7"
```

#### Response Format

```json
{
  "success": true,
  "count": 3,
  "value": [
    {
      "id": 1234,
      "fields": {
        "System.Id": 1234,
        "System.Title": "Implement OAuth authentication",
        "System.WorkItemType": "User Story",
        "System.State": "Active",
        "System.Parent": 1100,
        "System.AssignedTo": {
          "displayName": "John Doe",
          "uniqueName": "john.doe@company.com",
          "imageUrl": "https://dev.azure.com/_apis/GraphProfile/MemberAvatars/..."
        },
        "System.Tags": "authentication;security;mvp",
        "System.IterationPath": "MyProject\\Sprint 1",
        "Microsoft.VSTS.Common.Priority": 2,
        "System.CreatedDate": "2025-01-15T10:30:00.000Z",
        "System.ChangedDate": "2025-01-20T14:45:00.000Z"
      },
      "relations": [
        {
          "rel": "System.LinkTypes.Hierarchy-Reverse",
          "url": "https://dev.azure.com/org/project/_apis/wit/workItems/1100",
          "attributes": {
            "comment": "Parent Epic: User Authentication System"
          }
        }
      ]
    }
  ],
  "queryType": "flat",
  "queryResultType": "workItem"
}
```

#### Common Field Names Reference

| Category | Field Name | Description |
|----------|------------|-------------|
| **Core** | `System.Id` | Work item ID |
| **Core** | `System.Title` | Work item title |
| **Core** | `System.WorkItemType` | Type (Epic, Feature, User Story, Task, Bug) |
| **Core** | `System.State` | Current state (New, Active, Resolved, Closed) |
| **Hierarchy** | `System.Parent` | Parent work item ID |
| **Assignment** | `System.AssignedTo` | Assigned user |
| **Sprint** | `System.IterationPath` | Sprint/iteration assignment |
| **Priority** | `Microsoft.VSTS.Common.Priority` | Priority level (1-4) |
| **Dates** | `System.CreatedDate` | Creation date |
| **Dates** | `System.ChangedDate` | Last modified date |
| **Classification** | `System.Tags` | Semicolon-separated tags |

---

### ✨ `create-work-item`

**Purpose**: Create new work items with full hierarchy support, comprehensive metadata, and intelligent parent relationship management.

#### Parameters

| Parameter | Type | Required | Description | Example Values |
|-----------|------|----------|-------------|----------------|
| `type` | string | Yes | Work item type | `"Epic"`, `"Feature"`, `"User Story"`, `"Task"`, `"Bug"` |
| `title` | string | Yes | Work item title | `"Implement user authentication"` |
| `description` | string | No | Detailed description | `"Implement OAuth 2.0 with PKCE for secure authentication"` |
| `assignedTo` | string | No | Email of assignee | `"developer@company.com"` |
| `tags` | string | No | Semicolon-separated tags | `"authentication;security;mvp"` |
| `parent` | number | No | **Parent work item ID for hierarchy** | `1100` |
| `iterationPath` | string | No | Sprint assignment | `"ProjectName\\Sprint 1"` |
| `state` | string | No | Initial state | `"New"`, `"Active"` |
| `fields` | object | No | Custom field values | `{"Custom.Component": "Authentication"}` |

#### Work Item Type Hierarchy Rules

```
Epic (Strategic Initiative)
├── Feature (Deliverable Functionality)
│   ├── User Story (User Value) / Product Backlog Item (Scrum)
│   │   ├── Task (Implementation Work)
│   │   └── Bug (Defect)
│   └── Bug (Feature-level Defect)
└── Bug (Epic-level Defect)
```

#### Usage Examples

```bash
# Create a basic work item
mcp__devops-mcp__create-work-item \
  --type "Task" \
  --title "Implement user authentication API endpoint"

# Create work item with comprehensive details
mcp__devops-mcp__create-work-item \
  --type "User Story" \
  --title "As a user, I want to login securely with my email and password" \
  --description "Implement secure authentication using OAuth 2.0 with PKCE extension for enhanced security. Include password complexity validation and account lockout protection." \
  --assignedTo "frontend@company.com" \
  --tags "authentication;security;user-experience;mvp" \
  --iterationPath "MyProject\\Sprint 1" \
  --state "Active"

# Create complete Epic → Feature → User Story → Task hierarchy
# Step 1: Create Epic
mcp__devops-mcp__create-work-item \
  --type "Epic" \
  --title "User Management System" \
  --description "Comprehensive user management including authentication, authorization, and profile management"

# Step 2: Create Feature under Epic (assuming Epic ID = 1100)
mcp__devops-mcp__create-work-item \
  --type "Feature" \
  --title "Authentication Module" \
  --description "Core authentication functionality including login, logout, and session management" \
  --parent 1100 \
  --iterationPath "MyProject\\Sprint 1"

# Step 3: Create User Story under Feature (assuming Feature ID = 1101)
mcp__devops-mcp__create-work-item \
  --type "User Story" \
  --title "User Login Interface" \
  --description "As a user, I want to login with my credentials so that I can access my account securely" \
  --parent 1101 \
  --assignedTo "frontend@company.com" \
  --iterationPath "MyProject\\Sprint 1"

# Step 4: Create Tasks under User Story (assuming User Story ID = 1102)
mcp__devops-mcp__create-work-item \
  --type "Task" \
  --title "Design login form UI components" \
  --description "Create responsive login form with email, password fields, and submit button. Include validation feedback." \
  --parent 1102 \
  --assignedTo "frontend@company.com" \
  --tags "ui;frontend;design" \
  --iterationPath "MyProject\\Sprint 1"

mcp__devops-mcp__create-work-item \
  --type "Task" \
  --title "Implement authentication service integration" \
  --description "Integrate frontend form with backend authentication API. Handle success/error responses." \
  --parent 1102 \
  --assignedTo "frontend@company.com" \
  --tags "integration;frontend;api" \
  --iterationPath "MyProject\\Sprint 1"

# Create bug with detailed reproduction steps
mcp__devops-mcp__create-work-item \
  --type "Bug" \
  --title "Login form validation fails on Safari 16+" \
  --description "Steps to reproduce: 1. Open Safari 16.5+ on macOS, 2. Navigate to login page, 3. Enter invalid email format, 4. Expected: Validation error shown, Actual: Form submits without validation" \
  --assignedTo "qa@company.com" \
  --tags "browser-compatibility;validation;critical" \
  --state "Active"

# Create work item with custom fields
mcp__devops-mcp__create-work-item \
  --type "Feature" \
  --title "Advanced Search Functionality" \
  --description "Implement elasticsearch-based advanced search with filters and faceted navigation" \
  --fields '{"Custom.Component": "Search", "Custom.EstimatedHours": 40, "Microsoft.VSTS.Common.BusinessValue": 100}'
```

#### Response Format

```json
{
  "success": true,
  "workItem": {
    "id": 1234,
    "title": "Implement user authentication API endpoint",
    "type": "Task",
    "state": "New",
    "parent": 1102,
    "parentRelation": {
      "id": 1102,
      "url": "https://dev.azure.com/org/project/_apis/wit/workItems/1102",
      "comment": "Parent relationship established via MCP create-work-item command"
    },
    "iterationPath": "MyProject\\Sprint 1",
    "assignedTo": {
      "displayName": "Jane Developer",
      "uniqueName": "developer@company.com"
    },
    "tags": "authentication;security;mvp",
    "url": "https://dev.azure.com/org/project/_workitems/edit/1234",
    "relations": 1,
    "createdDate": "2025-01-27T10:30:00.000Z",
    "createdBy": {
      "displayName": "Claude MCP",
      "uniqueName": "mcp-service"
    }
  },
  "message": "Work item created successfully with parent relationship to work item 1102",
  "hierarchyValidated": true
}
```

#### Process-Specific Work Item Types

| Process Template | Available Types |
|------------------|-----------------|
| **Agile** | Epic, Feature, User Story, Task, Bug |
| **Scrum** | Epic, Feature, Product Backlog Item, Task, Bug |
| **CMMI** | Epic, Feature, Requirement, Task, Bug |

---

### 🔄 `update-work-item`

**Purpose**: Update existing work items including state transitions, assignments, hierarchy modifications, and custom field updates.

#### Parameters

| Parameter | Type | Required | Description | Example Values |
|-----------|------|----------|-------------|----------------|
| `id` | number | Yes | Work item ID to update | `1234` |
| `title` | string | No | Updated title | `"Updated: Implement secure authentication"` |
| `description` | string | No | Updated description | `"Enhanced description with security requirements"` |
| `state` | string | No | New state | `"Active"`, `"Resolved"`, `"Closed"` |
| `assignedTo` | string | No | New assignee email | `"newdeveloper@company.com"` |
| `parent` | number | No | New parent work item ID | `1105` |
| `iterationPath` | string | No | New sprint assignment | `"MyProject\\Sprint 2"` |
| `tags` | string | No | Updated tags | `"authentication;security;high-priority"` |
| `fields` | object | No | Generic field updates | `{"Custom.Priority": "High"}` |

#### State Transition Rules

| Work Item Type | Valid State Transitions |
|----------------|------------------------|
| **Epic** | New → Active → Resolved → Closed |
| **Feature** | New → Active → Resolved → Closed |
| **User Story** | New → Active → Resolved → Closed |
| **Task** | New → Active → Closed |
| **Bug** | New → Active → Resolved → Closed |

#### Usage Examples

```bash
# Update work item state
mcp__devops-mcp__update-work-item \
  --id 1234 \
  --state "Active"

# Reassign work item to different developer
mcp__devops-mcp__update-work-item \
  --id 1234 \
  --assignedTo "senior-developer@company.com"

# Move work item to different sprint
mcp__devops-mcp__update-work-item \
  --id 1234 \
  --iterationPath "MyProject\\Sprint 2"

# Update multiple fields simultaneously
mcp__devops-mcp__update-work-item \
  --id 1234 \
  --title "Updated: Implement secure OAuth 2.0 authentication" \
  --state "Active" \
  --assignedTo "lead-developer@company.com" \
  --tags "authentication;oauth;security;high-priority" \
  --iterationPath "MyProject\\Current Sprint"

# Change parent relationship (move to different epic/feature)
mcp__devops-mcp__update-work-item \
  --id 1234 \
  --parent 1105

# Update custom fields
mcp__devops-mcp__update-work-item \
  --id 1234 \
  --fields '{"Custom.Priority": "High", "Custom.Component": "Authentication", "Microsoft.VSTS.Common.BusinessValue": 200}'

# Close completed work item
mcp__devops-mcp__update-work-item \
  --id 1234 \
  --state "Closed" \
  --description "Implementation completed. OAuth 2.0 authentication successfully deployed to production."

# Resolve bug with resolution details
mcp__devops-mcp__update-work-item \
  --id 1235 \
  --state "Resolved" \
  --fields '{"Microsoft.VSTS.Common.ResolvedReason": "Fixed", "Microsoft.VSTS.Common.ResolvedBy": "developer@company.com"}'

# Move work item and update assignee for sprint planning
mcp__devops-mcp__update-work-item \
  --id 1236 \
  --iterationPath "MyProject\\Sprint 3" \
  --assignedTo "new-team-member@company.com" \
  --tags "training;onboarding;low-priority"
```

#### Response Format

```json
{
  "success": true,
  "workItem": {
    "id": 1234,
    "title": "Updated: Implement secure OAuth 2.0 authentication",
    "type": "Task",
    "state": "Active",
    "previousState": "New",
    "assignedTo": {
      "displayName": "Lead Developer",
      "uniqueName": "lead-developer@company.com"
    },
    "previousAssignedTo": {
      "displayName": "Jane Developer", 
      "uniqueName": "developer@company.com"
    },
    "iterationPath": "MyProject\\Current Sprint",
    "tags": "authentication;oauth;security;high-priority",
    "lastModified": "2025-01-27T14:30:00.000Z",
    "modifiedBy": {
      "displayName": "Claude MCP",
      "uniqueName": "mcp-service"
    }
  },
  "changes": [
    {
      "field": "System.State",
      "oldValue": "New",
      "newValue": "Active"
    },
    {
      "field": "System.AssignedTo",
      "oldValue": "developer@company.com",
      "newValue": "lead-developer@company.com"
    }
  ],
  "message": "Work item updated successfully with 2 field changes"
}
```

---

### 💬 `add-work-item-comment`

**Purpose**: Add detailed comments to work items for discussion, progress updates, status tracking, and team communication.

#### Parameters

| Parameter | Type | Required | Description | Example Values |
|-----------|------|----------|-------------|----------------|
| `id` | number | Yes | Work item ID | `1234` |
| `comment` | string | Yes | Comment text (supports markdown) | `"Started implementation of OAuth integration"` |

#### Comment Best Practices

- **Progress Updates**: Regular status updates with percentage complete
- **Technical Details**: Implementation notes, architecture decisions
- **Blockers**: Clear description of blockers and resolution needs
- **Testing Results**: Test outcomes, bug reproduction steps
- **Collaboration**: @mention team members for notifications

#### Usage Examples

```bash
# Add simple progress comment
mcp__devops-mcp__add-work-item-comment \
  --id 1234 \
  --comment "Started working on OAuth integration. Initial research completed."

# Add detailed technical update
mcp__devops-mcp__add-work-item-comment \
  --id 1234 \
  --comment "## Progress Update - Day 2

**Completed:**
- OAuth provider configuration for Google and Microsoft
- Base authentication service architecture
- Database schema for user sessions

**In Progress:**
- Frontend login component integration
- Token refresh mechanism

**Next Steps:**
- Complete unit tests for auth service
- Integration testing with frontend

**Estimated Completion:** 75%"

# Add blocker notification
mcp__devops-mcp__add-work-item-comment \
  --id 1234 \
  --comment "🚨 **BLOCKER IDENTIFIED**

Waiting for security team approval on OAuth redirect URLs. 
- Submitted request: #SEC-2025-001
- Expected resolution: 2-3 business days
- Impact: Delays integration testing by 1 week

@security-team @project-manager"

# Add testing results
mcp__devops-mcp__add-work-item-comment \
  --id 1234 \
  --comment "## Testing Results ✅

**Unit Tests:** 45/45 passing
**Integration Tests:** 12/12 passing  
**Browser Compatibility:**
- ✅ Chrome 119+
- ✅ Firefox 118+
- ✅ Safari 16.5+
- ✅ Edge 119+

**Performance:** Login response time: 245ms avg

Ready for code review and deployment."

# Add deployment notification
mcp__devops-mcp__add-work-item-comment \
  --id 1234 \
  --comment "🚀 **DEPLOYED TO PRODUCTION**

- Build: #5678
- Deployment Time: 2025-01-27 14:30 UTC
- Release Notes: OAuth authentication now available
- Monitoring: All systems green ✅

Feature is now available to all users."

# Add code review feedback
mcp__devops-mcp__add-work-item-comment \
  --id 1234 \
  --comment "## Code Review Feedback

**Strengths:**
- Clean separation of concerns
- Comprehensive error handling
- Good test coverage

**Suggestions:**
- Add input validation for edge cases
- Consider caching for better performance
- Update documentation for new API endpoints

**Status:** Approved with minor changes"
```

#### Response Format

```json
{
  "success": true,
  "comment": {
    "id": 12345,
    "workItemId": 1234,
    "text": "Started working on OAuth integration. Initial research completed.",
    "createdDate": "2025-01-27T10:30:00.000Z",
    "createdBy": {
      "displayName": "Claude MCP",
      "uniqueName": "mcp-service"
    },
    "url": "https://dev.azure.com/org/project/_workitems/edit/1234"
  },
  "message": "Comment added successfully to work item 1234"
}
```

---

## 📦 **Repository Commands**

### 📁 `get-repositories`

**Purpose**: List all repositories in the Azure DevOps project with comprehensive metadata and optional link information.

#### Parameters

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `includeLinks` | boolean | No | Include repository URLs and clone links | `false` |

#### Usage Examples

```bash
# List all repositories (basic information)
mcp__devops-mcp__get-repositories

# Include repository links and clone URLs
mcp__devops-mcp__get-repositories --includeLinks true
```

#### Response Format

```json
{
  "success": true,
  "count": 3,
  "repositories": [
    {
      "id": "abc123-def456-ghi789",
      "name": "frontend-app",
      "url": "https://dev.azure.com/org/project/_git/frontend-app",
      "webUrl": "https://dev.azure.com/org/project/_git/frontend-app",
      "defaultBranch": "refs/heads/main",
      "size": 12543210,
      "isDisabled": false,
      "project": {
        "id": "proj123-456",
        "name": "MyProject"
      },
      "remoteUrl": "https://org@dev.azure.com/org/project/_git/frontend-app",
      "sshUrl": "git@ssh.dev.azure.com:v3/org/project/frontend-app"
    },
    {
      "id": "xyz789-abc123-def456",
      "name": "backend-api",
      "url": "https://dev.azure.com/org/project/_git/backend-api",
      "webUrl": "https://dev.azure.com/org/project/_git/backend-api", 
      "defaultBranch": "refs/heads/main",
      "size": 8765432,
      "isDisabled": false,
      "project": {
        "id": "proj123-456",
        "name": "MyProject"
      },
      "remoteUrl": "https://org@dev.azure.com/org/project/_git/backend-api",
      "sshUrl": "git@ssh.dev.azure.com:v3/org/project/backend-api"
    }
  ]
}
```

---

### 🔀 `get-pull-requests`

**Purpose**: Retrieve pull requests with advanced filtering, status tracking, and detailed metadata for code review workflows.

#### Parameters

| Parameter | Type | Required | Description | Example Values |
|-----------|------|----------|-------------|----------------|
| `repositoryId` | string | No | Specific repository name or ID | `"frontend-app"` |
| `status` | string | No | PR status filter | `"active"`, `"completed"`, `"abandoned"`, `"all"` |
| `createdBy` | string | No | Filter by creator email | `"developer@company.com"` |
| `top` | number | No | Number of PRs to return | `25` (default), max `100` |

#### Pull Request Status Values

| Status | Description | Use Case |
|--------|-------------|----------|
| `active` | Open and ready for review | Default view for current work |
| `completed` | Merged or completed | Historical analysis, metrics |
| `abandoned` | Closed without merging | Cleanup, cancelled features |
| `all` | All pull requests | Comprehensive analysis |

#### Usage Examples

```bash
# Get active pull requests (default)
mcp__devops-mcp__get-pull-requests

# Get all pull requests including completed and abandoned
mcp__devops-mcp__get-pull-requests --status "all"

# Get completed pull requests for metrics analysis
mcp__devops-mcp__get-pull-requests --status "completed" --top 50

# Get PRs by specific developer
mcp__devops-mcp__get-pull-requests \
  --createdBy "developer@company.com" \
  --status "active"

# Get PRs for specific repository
mcp__devops-mcp__get-pull-requests \
  --repositoryId "frontend-app" \
  --status "active"

# Get recent PRs across all repositories
mcp__devops-mcp__get-pull-requests \
  --status "all" \
  --top 20

# Get abandoned PRs for cleanup analysis
mcp__devops-mcp__get-pull-requests \
  --status "abandoned" \
  --top 10
```

#### Response Format

```json
{
  "success": true,
  "count": 5,
  "pullRequests": [
    {
      "pullRequestId": 42,
      "title": "Feature: Add OAuth authentication",
      "description": "Implements OAuth 2.0 authentication with Google and Microsoft providers. Includes comprehensive testing and documentation.",
      "status": "active",
      "createdBy": {
        "displayName": "Jane Developer",
        "uniqueName": "jane@company.com"
      },
      "creationDate": "2025-01-25T09:30:00.000Z",
      "sourceRefName": "refs/heads/feature/oauth-auth",
      "targetRefName": "refs/heads/main",
      "repository": {
        "id": "abc123-def456",
        "name": "frontend-app",
        "url": "https://dev.azure.com/org/project/_git/frontend-app"
      },
      "reviewers": [
        {
          "displayName": "Senior Developer",
          "uniqueName": "senior@company.com",
          "vote": 5,
          "hasDeclined": false,
          "isRequired": true
        },
        {
          "displayName": "Security Lead",
          "uniqueName": "security@company.com", 
          "vote": 0,
          "hasDeclined": false,
          "isRequired": true
        }
      ],
      "url": "https://dev.azure.com/org/project/_git/frontend-app/pullrequest/42",
      "workItemRefs": [
        {
          "id": "1234",
          "url": "https://dev.azure.com/org/project/_apis/wit/workItems/1234"
        }
      ],
      "commits": [
        {
          "commitId": "a1b2c3d4e5f6",
          "comment": "Add OAuth provider configuration",
          "author": {
            "name": "Jane Developer",
            "email": "jane@company.com"
          }
        }
      ]
    }
  ],
  "queryType": "active",
  "totalCount": 15
}
```

#### Reviewer Vote Values

| Vote | Meaning | Description |
|------|---------|-------------|
| `10` | Approved with suggestions | Ready to merge with minor comments |
| `5` | Approved | Ready to merge |
| `0` | No response | Not yet reviewed |
| `-5` | Waiting for author | Changes requested |
| `-10` | Rejected | Significant issues, do not merge |

---

## 🏗️ **Build & Pipeline Commands**

### 🔨 `get-builds`

**Purpose**: Retrieve build information, history, and status with filtering options for CI/CD monitoring and analysis.

#### Parameters

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `definitionIds` | number[] | No | Specific build definition IDs | All definitions |
| `top` | number | No | Number of builds to return | `10` |

#### Usage Examples

```bash
# Get recent builds (last 10)
mcp__devops-mcp__get-builds

# Get builds for specific definitions
mcp__devops-mcp__get-builds --definitionIds [12, 15, 18]

# Get more build results for analysis
mcp__devops-mcp__get-builds --top 50

# Get builds from specific definition only
mcp__devops-mcp__get-builds --definitionIds [42] --top 20
```

#### Response Format

```json
{
  "success": true,
  "count": 10,
  "builds": [
    {
      "id": 5678,
      "buildNumber": "20250127.1",
      "status": "completed",
      "result": "succeeded", 
      "definition": {
        "id": 42,
        "name": "Frontend CI/CD Pipeline"
      },
      "sourceBranch": "refs/heads/main",
      "sourceVersion": "a1b2c3d4e5f6789012345678901234567890abcd",
      "queueTime": "2025-01-27T10:00:00.000Z",
      "startTime": "2025-01-27T10:01:00.000Z",
      "finishTime": "2025-01-27T10:15:00.000Z",
      "duration": "00:14:32",
      "requestedBy": {
        "displayName": "Jane Developer",
        "uniqueName": "jane@company.com"
      },
      "reason": "manual",
      "repository": {
        "id": "abc123-def456",
        "name": "frontend-app"
      },
      "url": "https://dev.azure.com/org/project/_build/results?buildId=5678"
    }
  ]
}
```

#### Build Status Values

| Status | Description |
|--------|-------------|
| `inProgress` | Currently running |
| `completed` | Finished (check result) |
| `cancelling` | Being cancelled |
| `postponed` | Delayed/queued |
| `notStarted` | Waiting to start |

#### Build Result Values

| Result | Description |
|--------|-------------|
| `succeeded` | Successful completion |
| `partiallySucceeded` | Completed with warnings |
| `failed` | Failed with errors |
| `canceled` | Cancelled by user |

---

### 🚀 `trigger-pipeline`

**Purpose**: Trigger build pipelines with parameters, branch selection, and environment configuration for automated deployments.

#### Parameters

| Parameter | Type | Required | Description | Example Values |
|-----------|------|----------|-------------|----------------|
| `definitionId` | number | No* | Build definition ID | `42` |
| `definitionName` | string | No* | Build definition name | `"Frontend CI/CD Pipeline"` |
| `sourceBranch` | string | No | Branch to build | `"main"`, `"develop"`, `"feature/auth"` |
| `parameters` | object | No | Pipeline parameters | `{"environment": "staging"}` |

*Either `definitionId` or `definitionName` is required

#### Usage Examples

```bash
# Trigger pipeline by definition ID
mcp__devops-mcp__trigger-pipeline --definitionId 42

# Trigger pipeline by name (more readable)
mcp__devops-mcp__trigger-pipeline \
  --definitionName "Frontend CI/CD Pipeline"

# Trigger with specific branch
mcp__devops-mcp__trigger-pipeline \
  --definitionName "Frontend CI/CD Pipeline" \
  --sourceBranch "feature/new-authentication"

# Trigger with environment parameters
mcp__devops-mcp__trigger-pipeline \
  --definitionId 42 \
  --parameters '{"environment": "staging", "runTests": true, "skipSmokeTests": false}'

# Trigger production deployment with approval
mcp__devops-mcp__trigger-pipeline \
  --definitionName "Production Deployment" \
  --sourceBranch "main" \
  --parameters '{"environment": "production", "requireApproval": true, "deploymentSlot": "blue"}'

# Trigger hotfix deployment
mcp__devops-mcp__trigger-pipeline \
  --definitionName "Hotfix Pipeline" \
  --sourceBranch "hotfix/critical-security-fix" \
  --parameters '{"fastTrack": true, "skipNonCriticalTests": true}'
```

#### Response Format

```json
{
  "success": true,
  "build": {
    "id": 5679,
    "buildNumber": "20250127.2",
    "status": "inProgress",
    "definition": {
      "id": 42,
      "name": "Frontend CI/CD Pipeline"
    },
    "sourceBranch": "refs/heads/feature/new-authentication",
    "queueTime": "2025-01-27T14:30:00.000Z",
    "requestedBy": {
      "displayName": "Claude MCP",
      "uniqueName": "mcp-service"
    },
    "reason": "manual",
    "parameters": {
      "environment": "staging",
      "runTests": true
    },
    "url": "https://dev.azure.com/org/project/_build/results?buildId=5679"
  },
  "message": "Pipeline triggered successfully",
  "estimatedDuration": "15 minutes"
}
```

---

### 📊 `get-pipeline-status`

**Purpose**: Check build and pipeline status with detailed timeline information for monitoring and troubleshooting.

#### Parameters

| Parameter | Type | Required | Description | Example Values |
|-----------|------|----------|-------------|----------------|
| `buildId` | number | No* | Specific build ID | `5679` |
| `definitionId` | number | No* | Recent builds for definition | `42` |
| `includeTimeline` | boolean | No | Include detailed timeline | `true` |

*Either `buildId` or `definitionId` is required

#### Usage Examples

```bash
# Check specific build status
mcp__devops-mcp__get-pipeline-status --buildId 5679

# Get recent builds for definition
mcp__devops-mcp__get-pipeline-status --definitionId 42

# Include detailed timeline for troubleshooting
mcp__devops-mcp__get-pipeline-status \
  --buildId 5679 \
  --includeTimeline true

# Monitor pipeline definition status
mcp__devops-mcp__get-pipeline-status \
  --definitionId 42 \
  --includeTimeline true
```

#### Response Format

```json
{
  "success": true,
  "build": {
    "id": 5679,
    "buildNumber": "20250127.2",
    "status": "completed",
    "result": "succeeded",
    "definition": {
      "id": 42,
      "name": "Frontend CI/CD Pipeline"
    },
    "sourceBranch": "refs/heads/feature/new-authentication",
    "queueTime": "2025-01-27T14:30:00.000Z",
    "startTime": "2025-01-27T14:31:00.000Z",
    "finishTime": "2025-01-27T14:45:00.000Z",
    "duration": "00:14:32"
  },
  "timeline": {
    "records": [
      {
        "id": "step1",
        "name": "Checkout",
        "type": "Task",
        "state": "completed",
        "result": "succeeded",
        "startTime": "2025-01-27T14:31:00.000Z",
        "finishTime": "2025-01-27T14:31:30.000Z",
        "duration": "00:00:30"
      },
      {
        "id": "step2", 
        "name": "Install Dependencies",
        "type": "Task",
        "state": "completed",
        "result": "succeeded",
        "startTime": "2025-01-27T14:31:30.000Z",
        "finishTime": "2025-01-27T14:33:00.000Z",
        "duration": "00:01:30"
      },
      {
        "id": "step3",
        "name": "Run Tests",
        "type": "Task",
        "state": "completed", 
        "result": "succeeded",
        "startTime": "2025-01-27T14:33:00.000Z",
        "finishTime": "2025-01-27T14:40:00.000Z",
        "duration": "00:07:00"
      }
    ]
  }
}
```

---

## 🔍 **Context Commands**

### 🌍 `get-current-context`

**Purpose**: Display current Azure DevOps configuration, authentication context, and project information for multi-project workflows.

#### Parameters

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `directory` | string | No | Directory to check | Current working directory |

#### Usage Examples

```bash
# Get current context
mcp__devops-mcp__get-current-context

# Check specific directory context
mcp__devops-mcp__get-current-context \
  --directory "/path/to/project"

# Check parent directory context
mcp__devops-mcp__get-current-context \
  --directory "../other-project"
```

#### Response Format

```json
{
  "success": true,
  "context": {
    "organizationUrl": "https://dev.azure.com/myorg",
    "organization": "myorg",
    "project": "MyProject",
    "directory": "/Users/developer/projects/myapp",
    "configurationSource": "local",
    "configFile": ".azure-devops.json",
    "configPath": "/Users/developer/projects/myapp/.azure-devops.json",
    "authenticated": true,
    "permissions": {
      "workItems": "read-write",
      "code": "read",
      "build": "read-execute",
      "project": "read"
    },
    "lastValidated": "2025-01-27T14:30:00.000Z"
  },
  "message": "Configuration loaded successfully from local file"
}
```

#### Configuration Source Types

| Source | Description | Priority |
|--------|-------------|----------|
| `local` | `.azure-devops.json` in current directory | Highest |
| `parent` | `.azure-devops.json` in parent directory | Medium |
| `environment` | Environment variables | Low |
| `default` | Default configuration | Lowest |

---

## 🎯 **Advanced Query Patterns**

### WIQL (Work Item Query Language) Reference

#### Basic Query Structure
```sql
SELECT [fields] 
FROM WorkItems 
WHERE [conditions]
ORDER BY [field] [ASC|DESC]
```

#### Essential Field References

| Category | Field Name | Example Usage |
|----------|------------|---------------|
| **Identity** | `System.Id` | `SELECT [System.Id] FROM WorkItems` |
| **Content** | `System.Title` | `WHERE [System.Title] CONTAINS 'authentication'` |
| **Type** | `System.WorkItemType` | `WHERE [System.WorkItemType] = 'Bug'` |
| **Status** | `System.State` | `WHERE [System.State] IN ('Active', 'New')` |
| **Assignment** | `System.AssignedTo` | `WHERE [System.AssignedTo] = @me` |
| **Hierarchy** | `System.Parent` | `WHERE [System.Parent] = 1100` |
| **Sprint** | `System.IterationPath` | `WHERE [System.IterationPath] UNDER 'Project\\Sprint 1'` |
| **Dates** | `System.CreatedDate` | `WHERE [System.CreatedDate] >= @today-7` |
| **Priority** | `Microsoft.VSTS.Common.Priority` | `WHERE [Microsoft.VSTS.Common.Priority] <= 2` |

#### Advanced Query Examples

```bash
# Get active work items assigned to current user
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title], [System.State] 
          FROM WorkItems 
          WHERE [System.AssignedTo] = @me 
          AND [System.State] = 'Active'"

# Find high-priority bugs in current sprint
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title], [Microsoft.VSTS.Common.Priority] 
          FROM WorkItems 
          WHERE [System.WorkItemType] = 'Bug' 
          AND [Microsoft.VSTS.Common.Priority] <= 2 
          AND [System.IterationPath] UNDER 'MyProject\\Current Sprint'"

# Get work items by tag and state
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title], [System.Tags], [System.State] 
          FROM WorkItems 
          WHERE [System.Tags] CONTAINS 'authentication' 
          AND [System.State] IN ('Active', 'New')"

# Find work items modified in last week
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title], [System.ChangedDate], [System.ChangedBy] 
          FROM WorkItems 
          WHERE [System.ChangedDate] >= @today-7 
          ORDER BY [System.ChangedDate] DESC"

# Get hierarchy - Epic with all child Features
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title], [System.WorkItemType] 
          FROM WorkItems 
          WHERE [System.Parent] = 1100 
          OR [System.Id] = 1100"

# Find unassigned work items in current sprint
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title], [System.IterationPath] 
          FROM WorkItems 
          WHERE [System.AssignedTo] = '' 
          AND [System.IterationPath] UNDER 'MyProject\\Current Sprint'"

# Get blocked work items
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title], [System.Tags] 
          FROM WorkItems 
          WHERE [System.Tags] CONTAINS 'blocked' 
          AND [System.State] = 'Active'"
```

#### Date and Time Functions

| Function | Description | Example |
|----------|-------------|---------|
| `@today` | Current date | `[System.CreatedDate] = @today` |
| `@today-N` | N days ago | `[System.ChangedDate] >= @today-7` |
| `@me` | Current user | `[System.AssignedTo] = @me` |

---

## 💡 **Best Practices**

### 🔒 **Security & Authentication**

```bash
# Always exclude config from version control
echo ".azure-devops.json" >> .gitignore

# Verify sensitive files are ignored
git status --ignored | grep azure-devops

# Use minimal PAT permissions
# ✅ Work Items: Read & Write
# ✅ Code: Read
# ✅ Build: Read & Execute  
# ✅ Project and Team: Read
# ❌ Full Access (unnecessary)
```

### 🏗️ **Work Item Hierarchy Management**

#### Recommended Hierarchy Structure
```
Epic (Strategic Initiative - 3-6 months)
├── Feature (Deliverable Functionality - 2-4 weeks)
│   ├── User Story (User Value - 1-2 weeks)
│   │   ├── Task (Implementation Work - 1-3 days)
│   │   └── Task (Testing Work - 1-2 days)
│   └── Bug (Defect - Variable)
└── Feature (Another Deliverable)
```

#### Hierarchy Creation Best Practices

```bash
# 1. Start with Epic for major initiative
mcp__devops-mcp__create-work-item \
  --type "Epic" \
  --title "User Authentication System" \
  --description "Comprehensive user authentication and authorization system"

# 2. Break into Features (deliverable chunks)
mcp__devops-mcp__create-work-item \
  --type "Feature" \
  --title "OAuth 2.0 Integration" \
  --parent [epic_id] \
  --description "OAuth integration with major providers"

# 3. Create User Stories (user value)
mcp__devops-mcp__create-work-item \
  --type "User Story" \
  --title "As a user, I want to login with Google" \
  --parent [feature_id] \
  --description "Single sign-on with Google OAuth"

# 4. Add Tasks (implementation work)
mcp__devops-mcp__create-work-item \
  --type "Task" \
  --title "Implement Google OAuth provider" \
  --parent [story_id] \
  --assignedTo "developer@company.com"
```

### 📋 **Query Optimization**

#### Efficient WIQL Queries

```bash
# ✅ GOOD: Specific field selection
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.State] = 'Active'"

# ❌ AVOID: Selecting all fields (slower)
mcp__devops-mcp__get-work-items \
  --wiql "SELECT * FROM WorkItems WHERE [System.State] = 'Active'"

# ✅ GOOD: Use iteration path for sprint queries
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.IterationPath] UNDER 'Project\\Sprint 1'"

# ✅ GOOD: Filter by specific work item types
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.WorkItemType] IN ('User Story', 'Task')"
```

### 🏷️ **Tagging Strategy**

```bash
# Use consistent, hierarchical tags
--tags "domain;subdomain;priority"

# Examples:
--tags "frontend;authentication;high-priority"
--tags "backend;api;performance" 
--tags "infrastructure;deployment;critical"
--tags "testing;automation;low-priority"
```

---

## 🔄 **Common Workflows**

### 🆕 **Feature Development Lifecycle**

```bash
# 1. Create Epic for major initiative
epic_response=$(mcp__devops-mcp__create-work-item \
  --type "Epic" \
  --title "User Authentication System" \
  --description "Implement comprehensive user authentication and authorization")

# Extract Epic ID from response (assuming JSON processing)
epic_id=$(echo $epic_response | jq -r '.workItem.id')

# 2. Create Feature under Epic
feature_response=$(mcp__devops-mcp__create-work-item \
  --type "Feature" \
  --title "OAuth 2.0 Integration" \
  --parent $epic_id \
  --iterationPath "MyProject\\Sprint 1" \
  --description "OAuth integration with Google, Microsoft, and GitHub")

feature_id=$(echo $feature_response | jq -r '.workItem.id')

# 3. Create User Stories under Feature
story1_response=$(mcp__devops-mcp__create-work-item \
  --type "User Story" \
  --title "As a user, I want to login with Google OAuth" \
  --parent $feature_id \
  --assignedTo "frontend@company.com" \
  --iterationPath "MyProject\\Sprint 1")

story1_id=$(echo $story1_response | jq -r '.workItem.id')

# 4. Create implementation tasks
mcp__devops-mcp__create-work-item \
  --type "Task" \
  --title "Design OAuth login UI components" \
  --parent $story1_id \
  --assignedTo "frontend@company.com" \
  --tags "ui;frontend;design" \
  --iterationPath "MyProject\\Sprint 1"

mcp__devops-mcp__create-work-item \
  --type "Task" \
  --title "Implement Google OAuth backend service" \
  --parent $story1_id \
  --assignedTo "backend@company.com" \
  --tags "backend;oauth;security" \
  --iterationPath "MyProject\\Sprint 1"

# 5. Add progress tracking
mcp__devops-mcp__add-work-item-comment \
  --id $story1_id \
  --comment "User story created with Epic: $epic_id, Feature: $feature_id. Ready for sprint planning."
```

### 📈 **Sprint Management Workflow**

```bash
# Get all work items in current sprint
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo] 
          FROM WorkItems 
          WHERE [System.IterationPath] UNDER 'MyProject\\Current Sprint'"

# Move incomplete items to next sprint
for item_id in 1234 1235 1236; do
  mcp__devops-mcp__update-work-item \
    --id $item_id \
    --iterationPath "MyProject\\Sprint 2"
  
  mcp__devops-mcp__add-work-item-comment \
    --id $item_id \
    --comment "Moved to Sprint 2 due to capacity constraints. Re-prioritized for next iteration."
done

# Close completed work items
mcp__devops-mcp__update-work-item \
  --id 1237 \
  --state "Closed"

mcp__devops-mcp__add-work-item-comment \
  --id 1237 \
  --comment "✅ Sprint Goal: COMPLETED
  
- All acceptance criteria met
- Code review approved
- Testing completed successfully  
- Deployed to production

Sprint metrics:
- Planned: 13 story points
- Completed: 13 story points
- Velocity: 100%"
```

### 🐛 **Bug Triage Workflow**

```bash
# Create detailed bug report
bug_response=$(mcp__devops-mcp__create-work-item \
  --type "Bug" \
  --title "Login form validation fails on Safari 16+" \
  --description "## Bug Report

**Environment:**
- Browser: Safari 16.5+ on macOS
- OS: macOS Ventura 13.4+
- URL: https://app.company.com/login

**Steps to Reproduce:**
1. Open Safari 16.5+ on macOS
2. Navigate to login page
3. Enter invalid email format (e.g., 'invalid-email')
4. Click submit button

**Expected Result:**
Validation error message displayed

**Actual Result:**
Form submits without validation, server returns 400 error

**Additional Context:**
- Works correctly on Chrome, Firefox, Edge
- Appears to be related to Safari's form validation polyfill
- Error console shows: 'validateForm is not a function'

**Priority:** High - affects 15% of user base" \
  --assignedTo "qa@company.com" \
  --tags "browser-compatibility;validation;high-priority;safari" \
  --state "Active")

bug_id=$(echo $bug_response | jq -r '.workItem.id')

# Add investigation findings
mcp__devops-mcp__add-work-item-comment \
  --id $bug_id \
  --comment "## Investigation Results

**Root Cause Identified:**
Safari 16+ has changed behavior for custom form validation. Our polyfill is not loading correctly.

**Files Affected:**
- `/src/utils/formValidation.js`
- `/src/components/LoginForm.jsx`

**Proposed Solution:**
1. Update form validation polyfill to v3.2.1
2. Add Safari-specific detection logic
3. Fallback to native validation where possible

**Estimated Effort:** 4-6 hours
**Risk Level:** Low - isolated to validation logic"

# Assign to developer
mcp__devops-mcp__update-work-item \
  --id $bug_id \
  --assignedTo "senior-developer@company.com" \
  --iterationPath "MyProject\\Current Sprint"

# Link to parent feature if applicable
mcp__devops-mcp__update-work-item \
  --id $bug_id \
  --parent 1101  # Authentication feature ID
```

### 🚀 **CI/CD Deployment Workflow**

```bash
# Trigger staging deployment
staging_response=$(mcp__devops-mcp__trigger-pipeline \
  --definitionName "Staging Deployment" \
  --sourceBranch "develop" \
  --parameters '{"environment": "staging", "runTests": true, "deploymentSlot": "blue"}')

staging_build_id=$(echo $staging_response | jq -r '.build.id')

# Monitor staging deployment
mcp__devops-mcp__get-pipeline-status \
  --buildId $staging_build_id \
  --includeTimeline true

# Wait for staging completion (in practice, you'd check status periodically)
sleep 600  # 10 minutes

# Check staging status and trigger production if successful
staging_status=$(mcp__devops-mcp__get-pipeline-status --buildId $staging_build_id)

if [[ $(echo $staging_status | jq -r '.build.result') == "succeeded" ]]; then
  # Trigger production deployment
  prod_response=$(mcp__devops-mcp__trigger-pipeline \
    --definitionName "Production Deployment" \
    --sourceBranch "main" \
    --parameters '{"environment": "production", "requireApproval": true, "deploymentStrategy": "blue-green"}')
  
  prod_build_id=$(echo $prod_response | jq -r '.build.id')
  
  # Update related work items
  mcp__devops-mcp__update-work-item \
    --id 1234 \
    --state "Resolved"
  
  mcp__devops-mcp__add-work-item-comment \
    --id 1234 \
    --comment "🚀 **DEPLOYED TO PRODUCTION**

**Deployment Details:**
- Staging Build: #$staging_build_id ✅
- Production Build: #$prod_build_id 🔄
- Branch: main
- Strategy: Blue-Green deployment

**Release Notes:**
- OAuth authentication now available
- Safari 16+ compatibility fixed
- Performance improvements: 15% faster login

**Monitoring:**
- APM Dashboard: [link]
- Error Tracking: [link]
- User Feedback: [link]"
fi
```

---

## ❓ **Troubleshooting**

### 🔧 **Common Issues & Solutions**

#### **❌ "No Azure DevOps configuration found"**

**Symptoms:**
```
Error: No Azure DevOps configuration found for current directory
```

**Diagnosis:**
```bash
# Check current context
mcp__devops-mcp__get-current-context

# Verify configuration file exists
ls -la .azure-devops.json

# Check file permissions
stat .azure-devops.json

# Validate JSON format
cat .azure-devops.json | jq .
```

**Solutions:**
```bash
# Create configuration file
cat > .azure-devops.json << EOF
{
  "organizationUrl": "https://dev.azure.com/your-org",
  "project": "YourProject",
  "pat": "your-pat-token-here",
  "description": "Azure DevOps configuration"
}
EOF

# Secure the file
chmod 600 .azure-devops.json

# Add to .gitignore
echo ".azure-devops.json" >> .gitignore
```

#### **❌ "Authentication failed" or "Unauthorized"**

**Symptoms:**
```
Error: Authentication failed. Please check your PAT token.
```

**Diagnosis:**
```bash
# Verify PAT token hasn't expired
# Check organization URL format
# Confirm project name accuracy
```

**Solutions:**
```bash
# Verify organization URL format
# ✅ CORRECT: https://dev.azure.com/orgname
# ❌ INCORRECT: https://orgname.visualstudio.com

# Check PAT token permissions:
# ✅ Work Items: Read & Write
# ✅ Code: Read
# ✅ Build: Read & Execute
# ✅ Project and Team: Read

# Test with minimal query
mcp__devops-mcp__get-work-items \
  --wiql "SELECT TOP 1 [System.Id] FROM WorkItems"
```

#### **❌ "Work item type 'User Story' not found"**

**Symptoms:**
```
Error: Work item type 'User Story' does not exist in this project
```

**Solutions:**
```bash
# Use process-specific work item types:

# Agile Process:
--type "Epic"
--type "Feature"  
--type "User Story"
--type "Task"
--type "Bug"

# Scrum Process:
--type "Epic"
--type "Feature"
--type "Product Backlog Item"  # Instead of User Story
--type "Task"
--type "Bug"

# CMMI Process:
--type "Epic"
--type "Feature"
--type "Requirement"  # Instead of User Story
--type "Task"
--type "Bug"
```

#### **❌ "Parent relationship validation failed"**

**Symptoms:**
```
Error: Cannot create parent relationship. Invalid hierarchy.
```

**Solutions:**
```bash
# Verify hierarchy rules:
# ✅ Epic → Feature
# ✅ Feature → User Story  
# ✅ User Story → Task
# ✅ Any → Bug
# ❌ Task → Epic (invalid)

# Check parent work item exists
mcp__devops-mcp__get-work-items --ids [parent_id]

# Verify parent work item type compatibility
```

#### **❌ "Pipeline trigger failed"**

**Symptoms:**
```
Error: Build definition not found or access denied
```

**Solutions:**
```bash
# List available build definitions
mcp__devops-mcp__get-builds

# Use exact definition name
mcp__devops-mcp__trigger-pipeline \
  --definitionName "Exact Pipeline Name"

# Or use definition ID
mcp__devops-mcp__trigger-pipeline \
  --definitionId 42

# Check PAT permissions include Build: Read & Execute
```

### 🔍 **Debug Commands**

```bash
# Test basic connectivity
mcp__devops-mcp__get-work-items \
  --wiql "SELECT TOP 1 [System.Id] FROM WorkItems"

# Verify repository access  
mcp__devops-mcp__get-repositories

# Check current configuration details
mcp__devops-mcp__get-current-context

# Test work item creation with minimal data
mcp__devops-mcp__create-work-item \
  --type "Task" \
  --title "Test connectivity"

# Verify pipeline access
mcp__devops-mcp__get-builds --top 1
```

### 📊 **Performance Troubleshooting**

```bash
# For slow WIQL queries, optimize field selection:
# ✅ FAST: SELECT [System.Id], [System.Title]
# ❌ SLOW: SELECT *

# For large result sets, use pagination:
mcp__devops-mcp__get-work-items \
  --wiql "SELECT TOP 50 [System.Id], [System.Title] FROM WorkItems"

# For hierarchy queries, be specific:
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Parent] FROM WorkItems WHERE [System.Parent] = 1100"
```

---

## 📚 **Additional Resources**

### **Official Documentation**
- **Azure DevOps REST API**: [Microsoft Documentation](https://docs.microsoft.com/en-us/rest/api/azure/devops/)
- **WIQL Reference**: [Query Language Guide](https://docs.microsoft.com/en-us/azure/devops/boards/queries/wiql-syntax)
- **Work Item Types**: [Process Template Guide](https://docs.microsoft.com/en-us/azure/devops/boards/work-items/guidance/choose-process)
- **PAT Tokens**: [Security Guide](https://docs.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate)

### **MCP Server Resources**
- **GitHub Repository**: [wangkanai/devops-mcp](https://github.com/wangkanai/devops-mcp)
- **NPM Package**: [@wangkanai/devops-mcp](https://www.npmjs.com/package/@wangkanai/devops-mcp)
- **Issue Tracking**: [GitHub Issues](https://github.com/wangkanai/devops-mcp/issues)

### **Related Documentation**
- **Claude MCP Usage**: `CLAUDE-MCP-USAGE.md` - Practical workflows and examples
- **Claude Context**: `claude.md` - Claude-specific integration guide
- **Issue Resolution**: `RESOLVED.md` - Historical issue fixes and solutions

### **API Version Information**
- **Current API Version**: `7.1` (Azure DevOps REST API)
- **Minimum Supported**: `6.0`
- **Recommended**: `7.1` for latest features and bug fixes

### **Browser Compatibility**
| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 100+ | Full support |
| Firefox | 100+ | Full support |
| Safari | 15+ | Form validation quirks in 16+ |
| Edge | 100+ | Full support |

---

**Version**: 2.0  
**Last Updated**: 2025-07-27  
**API Compatibility**: Azure DevOps REST API v7.1+  
**GitHub**: [wangkanai/devops-mcp](https://github.com/wangkanai/devops-mcp)  
**NPM**: [@wangkanai/devops-mcp](https://www.npmjs.com/package/@wangkanai/devops-mcp)

---

_This comprehensive command reference is designed to help Claude users effectively leverage Azure DevOps integration through the MCP protocol. For issues, feature requests, or contributions, please visit the GitHub repository._