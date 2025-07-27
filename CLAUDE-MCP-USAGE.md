# CLAUDE-MCP-USAGE.md - Practical Azure DevOps MCP Usage for Claude

Comprehensive workflow guide for Claude users to maximize productivity with the Azure DevOps MCP server.

---

## 🚀 **Quick Start Guide**

### **Installation & Setup (2 minutes)**

#### **1. Install via Claude Code (Recommended)**
```bash
# Add devops-mcp to Claude Code
claude mcp add devops-mcp -- -y @wangkanai/devops-mcp

# Verify installation
mcp__devops-mcp__get-current-context
```

#### **2. Claude Desktop Installation**
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

**Settings Location**:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

#### **3. Project Configuration**
Create `.azure-devops.json` in your project directory:

```json
{
  "organizationUrl": "https://dev.azure.com/your-organization",
  "project": "YourProjectName",
  "pat": "your-personal-access-token-here",
  "description": "Azure DevOps configuration for [Project Name]"
}
```

```bash
# Secure your configuration
echo ".azure-devops.json" >> .gitignore
```

#### **4. PAT Token Setup**
Create a Personal Access Token with these permissions:
- ✅ **Work Items**: Read & Write
- ✅ **Code**: Read
- ✅ **Build**: Read & Execute  
- ✅ **Project and Team**: Read

---

## 📋 **Core MCP Commands Reference**

### **Context Management**
| Command | Purpose | Key Use Cases |
|---------|---------|---------------|
| `mcp__devops-mcp__get-current-context` | Display active configuration | Verify setup, debug auth issues, confirm project switching |

### **Work Item Operations**
| Command | Purpose | Key Use Cases |
|---------|---------|---------------|
| `mcp__devops-mcp__get-work-items` | Query work items | Sprint planning, status tracking, filtering by criteria |
| `mcp__devops-mcp__create-work-item` | Create new work items | Feature planning, bug reporting, task breakdown |
| `mcp__devops-mcp__update-work-item` | Modify existing items | State changes, assignment updates, sprint moves |
| `mcp__devops-mcp__add-work-item-comment` | Add comments | Progress updates, investigation notes, resolution details |

### **Repository & Code Management**
| Command | Purpose | Key Use Cases |
|---------|---------|---------------|
| `mcp__devops-mcp__get-repositories` | List project repositories | Code exploration, repository discovery, link access |
| `mcp__devops-mcp__get-pull-requests` | Manage pull requests | Code review workflows, PR status tracking, developer filtering |

### **Build & Pipeline Operations**
| Command | Purpose | Key Use Cases |
|---------|---------|---------------|
| `mcp__devops-mcp__get-builds` | Query build history | Build troubleshooting, performance tracking, definition analysis |
| `mcp__devops-mcp__trigger-pipeline` | Start CI/CD pipelines | Deployment automation, testing workflows, release management |
| `mcp__devops-mcp__get-pipeline-status` | Monitor pipeline progress | Build monitoring, deployment validation, timeline analysis |

---

## 🎯 **Practical Workflow Examples**

### **🆕 Feature Development Lifecycle**

#### **1. Epic-to-Task Hierarchy Creation**
```bash
# Create Epic for major initiative
epic_id=$(mcp__devops-mcp__create-work-item \
  --type "Epic" \
  --title "User Authentication System" \
  --description "Implement comprehensive user authentication with OAuth, MFA, and role-based access control" \
  --tags "authentication;security;epic" | jq -r '.id')

# Create Feature under Epic
feature_id=$(mcp__devops-mcp__create-work-item \
  --type "Feature" \
  --title "OAuth 2.0 Integration" \
  --description "Integrate Google, Microsoft, and GitHub OAuth providers" \
  --parent $epic_id \
  --iterationPath "MyProject\\Sprint 1" \
  --assignedTo "architects@company.com" | jq -r '.id')

# Create User Stories under Feature
story_id=$(mcp__devops-mcp__create-work-item \
  --type "User Story" \
  --title "As a user, I want to login with Google OAuth" \
  --description "Users should be able to authenticate using their Google accounts with proper error handling and security validation" \
  --parent $feature_id \
  --iterationPath "MyProject\\Sprint 1" \
  --assignedTo "frontend@company.com" | jq -r '.id')

# Create implementation tasks
mcp__devops-mcp__create-work-item \
  --type "Task" \
  --title "Design OAuth login UI components" \
  --description "Create responsive login form with OAuth provider buttons, loading states, and error handling" \
  --parent $story_id \
  --assignedTo "frontend@company.com" \
  --iterationPath "MyProject\\Sprint 1"

mcp__devops-mcp__create-work-item \
  --type "Task" \
  --title "Implement OAuth backend service" \
  --description "Create secure OAuth validation service with token handling and user profile creation" \
  --parent $story_id \
  --assignedTo "backend@company.com" \
  --iterationPath "MyProject\\Sprint 1"
```

#### **2. Progress Tracking & Updates**
```bash
# Update work item states as development progresses
mcp__devops-mcp__update-work-item \
  --id $story_id \
  --state "Active" \
  --assignedTo "frontend@company.com"

# Add detailed progress comments
mcp__devops-mcp__add-work-item-comment \
  --id $story_id \
  --comment "UI components complete. Google OAuth integration 80% complete. Pending security review and error handling implementation."

# Move items between sprints when needed
mcp__devops-mcp__update-work-item \
  --id $story_id \
  --iterationPath "MyProject\\Sprint 2"
```

### **🐛 Bug Triage & Resolution Workflow**

#### **1. Bug Report Creation**
```bash
# Create comprehensive bug report
bug_id=$(mcp__devops-mcp__create-work-item \
  --type "Bug" \
  --title "Login page crashes on Safari iOS 16.5+" \
  --description "
**Reproduction Steps:**
1. Open Safari on iOS 16.5+ device
2. Navigate to /login page
3. Enter valid credentials
4. Click 'Sign In' button
5. Page becomes unresponsive, console shows validation errors

**Expected Behavior:** Successful login redirect to dashboard
**Actual Behavior:** Page freeze, no error message to user
**Browser:** Safari 16.5+ on iOS
**Frequency:** 100% reproduction rate
**Impact:** Critical - blocks all iOS Safari users from authentication
  " \
  --tags "browser-compatibility;ios;safari;critical;authentication" \
  --priority 1 \
  --assignedTo "qa@company.com" | jq -r '.id')

# Link to related user story if applicable
mcp__devops-mcp__update-work-item \
  --id $bug_id \
  --parent $story_id
```

#### **2. Investigation & Resolution**
```bash
# Add investigation findings
mcp__devops-mcp__add-work-item-comment \
  --id $bug_id \
  --comment "
**Investigation Results:**
- Issue reproduced consistently on Safari 16.5+ iOS
- Form validation polyfill causing JavaScript execution errors
- Safari's strict CSP policies blocking inline event handlers
- Alternative validation library testing in progress
- Estimated fix time: 2-3 days
"

# Assign to developer for resolution
mcp__devops-mcp__update-work-item \
  --id $bug_id \
  --assignedTo "frontend-lead@company.com" \
  --state "Active" \
  --iterationPath "MyProject\\Current Sprint"

# Track resolution progress
mcp__devops-mcp__add-work-item-comment \
  --id $bug_id \
  --comment "
**Resolution Applied:**
- Replaced form validation polyfill with native HTML5 validation
- Added Safari-specific CSS and JavaScript compatibility layer
- Implemented progressive enhancement for older browsers
- All validation now uses declarative approach compatible with Safari CSP
- Ready for QA validation on iOS devices
"

# Close after validation
mcp__devops-mcp__update-work-item \
  --id $bug_id \
  --state "Closed" \
  --assignedTo "qa@company.com"

mcp__devops-mcp__add-work-item-comment \
  --id $bug_id \
  --comment "✅ **VERIFIED FIXED**: Tested on Safari iOS 16.5+ across 5 different devices. Login flow works correctly. Deployed to production."
```

### **📈 Sprint Planning & Management**

#### **1. Sprint Retrospective & Planning**
```bash
# Get current sprint work items for retrospective
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [Microsoft.VSTS.Scheduling.StoryPoints] FROM WorkItems WHERE [System.IterationPath] UNDER 'MyProject\\Current Sprint' ORDER BY [System.State]"

# Query completed work for velocity calculation
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title], [Microsoft.VSTS.Scheduling.StoryPoints] FROM WorkItems WHERE [System.IterationPath] UNDER 'MyProject\\Current Sprint' AND [System.State] = 'Closed'"

# Find incomplete items for next sprint planning
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo] FROM WorkItems WHERE [System.IterationPath] UNDER 'MyProject\\Current Sprint' AND [System.State] <> 'Closed'"
```

#### **2. Sprint Transition**
```bash
# Move incomplete items to next sprint
incomplete_ids=(1234 1235 1236)  # From query results
for id in "${incomplete_ids[@]}"; do
  mcp__devops-mcp__update-work-item \
    --id $id \
    --iterationPath "MyProject\\Sprint 2"
  
  mcp__devops-mcp__add-work-item-comment \
    --id $id \
    --comment "Moved to Sprint 2 due to dependency on authentication system completion. All preparatory work complete."
done

# Close completed items with final comments
mcp__devops-mcp__update-work-item \
  --id 1237 \
  --state "Closed"

mcp__devops-mcp__add-work-item-comment \
  --id 1237 \
  --comment "✅ Feature complete and deployed to production. All acceptance criteria met. User feedback positive."
```

### **🚀 CI/CD & Deployment Workflow**

#### **1. Automated Deployment Pipeline**
```bash
# Trigger staging deployment for testing
staging_build_id=$(mcp__devops-mcp__trigger-pipeline \
  --definitionName "Staging Deployment" \
  --sourceBranch "develop" \
  --parameters '{"environment": "staging", "runTests": true, "requireApproval": false}' | jq -r '.id')

# Monitor staging deployment progress
mcp__devops-mcp__get-pipeline-status \
  --buildId $staging_build_id \
  --includeTimeline true

# Update related work items with staging deployment info
mcp__devops-mcp__add-work-item-comment \
  --id $story_id \
  --comment "🚀 **STAGING DEPLOYMENT**: Build #$staging_build_id deployed to staging environment. Available for QA validation at https://staging.company.com"
```

#### **2. Production Deployment & Validation**
```bash
# Trigger production deployment (with approval gates)
prod_build_id=$(mcp__devops-mcp__trigger-pipeline \
  --definitionName "Production Deployment" \
  --sourceBranch "main" \
  --parameters '{"environment": "production", "runTests": true, "requireApproval": true, "backupEnabled": true}' | jq -r '.id')

# Monitor production deployment with detailed timeline
mcp__devops-mcp__get-pipeline-status \
  --buildId $prod_build_id \
  --includeTimeline true

# Update all related work items post-deployment
work_item_ids=($epic_id $feature_id $story_id $bug_id)
for id in "${work_item_ids[@]}"; do
  mcp__devops-mcp__add-work-item-comment \
    --id $id \
    --comment "🎉 **PRODUCTION DEPLOYED**: Build #$prod_build_id successfully deployed to production. Feature available to all users. Monitor dashboards show green status."
done

# Mark feature as resolved
mcp__devops-mcp__update-work-item \
  --id $feature_id \
  --state "Resolved"
```

---

## 🔍 **Advanced Query Patterns & Use Cases**

### **WIQL Query Library for Claude**

#### **Personal Task Management**
```bash
# My active work items
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title], [System.State], [Microsoft.VSTS.Scheduling.StoryPoints] FROM WorkItems WHERE [System.AssignedTo] = @me AND [System.State] IN ('New', 'Active') ORDER BY [Microsoft.VSTS.Common.Priority]"

# My work items due this week
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title], [Microsoft.VSTS.Scheduling.DueDate] FROM WorkItems WHERE [System.AssignedTo] = @me AND [Microsoft.VSTS.Scheduling.DueDate] <= @today+7"

# Recently completed by me (for status updates)
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title], [System.ChangedDate] FROM WorkItems WHERE [System.AssignedTo] = @me AND [System.State] = 'Closed' AND [System.ChangedDate] >= @today-7"
```

#### **Team Management & Planning**
```bash
# High-priority bugs across all projects
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title], [Microsoft.VSTS.Common.Priority], [System.CreatedDate] FROM WorkItems WHERE [System.WorkItemType] = 'Bug' AND [Microsoft.VSTS.Common.Priority] <= 2 AND [System.State] <> 'Closed' ORDER BY [Microsoft.VSTS.Common.Priority], [System.CreatedDate]"

# Sprint capacity planning - story points by assignee
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title], [System.AssignedTo], [Microsoft.VSTS.Scheduling.StoryPoints] FROM WorkItems WHERE [System.IterationPath] UNDER 'MyProject\\Sprint 1' AND [System.WorkItemType] IN ('User Story', 'Product Backlog Item') ORDER BY [System.AssignedTo]"

# Feature progress tracking
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title], [System.Parent], [System.State] FROM WorkItems WHERE [System.Parent] = $feature_id ORDER BY [System.WorkItemType], [System.State]"
```

#### **Quality & Compliance Tracking**
```bash
# Security-related work items
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title], [System.Tags], [System.State] FROM WorkItems WHERE [System.Tags] CONTAINS 'security' OR [System.Tags] CONTAINS 'vulnerability' ORDER BY [Microsoft.VSTS.Common.Priority]"

# Technical debt items
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title], [System.Tags], [Microsoft.VSTS.Scheduling.StoryPoints] FROM WorkItems WHERE [System.Tags] CONTAINS 'technical-debt' AND [System.State] <> 'Closed' ORDER BY [Microsoft.VSTS.Scheduling.StoryPoints] DESC"

# Items modified recently (for standup updates)
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title], [System.ChangedBy], [System.ChangedDate] FROM WorkItems WHERE [System.ChangedDate] >= @today-1 AND [System.ChangedBy] <> 'Build Service' ORDER BY [System.ChangedDate] DESC"
```

### **Repository & Code Management**

#### **Repository Discovery & Analysis**
```bash
# List all repositories with clone URLs
mcp__devops-mcp__get-repositories --includeLinks true

# Get active pull requests for code review
mcp__devops-mcp__get-pull-requests --status "active"

# Find PRs by specific developer for mentoring
mcp__devops-mcp__get-pull-requests --createdBy "junior-dev@company.com"

# Get completed PRs for retrospective analysis
mcp__devops-mcp__get-pull-requests --status "completed"
```

#### **Build & Pipeline Analysis**
```bash
# Get recent build failures for troubleshooting
mcp__devops-mcp__get-builds --definitionIds [123] --top 10

# Monitor specific build with detailed timeline
mcp__devops-mcp__get-pipeline-status \
  --buildId 5678 \
  --includeTimeline true

# Trigger hotfix deployment
mcp__devops-mcp__trigger-pipeline \
  --definitionName "Hotfix Pipeline" \
  --sourceBranch "hotfix/critical-security-fix" \
  --parameters '{"priority": "critical", "skipTests": false, "requireApproval": true}'
```

---

## 🔄 **Multi-Project Context Switching**

### **Automatic Context Detection**
The MCP server automatically detects your project context based on your current directory:

```bash
# Working on RiverSync project
cd ~/Projects/riversync/web-portal
mcp__devops-mcp__get-current-context
# Returns: https://dev.azure.com/riversync organization

# Switch to Mula project  
cd ~/Projects/mula/hr-system
mcp__devops-mcp__get-current-context
# Returns: https://dev.azure.com/mula-x organization

# Switch to client project
cd ~/Projects/client-alpha/api-service  
mcp__devops-mcp__get-current-context
# Returns: https://dev.azure.com/client-alpha organization
```

### **Multi-Project Workflow Example**
```bash
# Work on RiverSync feature
cd ~/Projects/riversync
mcp__devops-mcp__create-work-item \
  --type "User Story" \
  --title "Implement customer portal dashboard"

# Switch to Mula for related HR integration
cd ~/Projects/mula  
mcp__devops-mcp__create-work-item \
  --type "Task" \
  --title "Create employee data API for RiverSync integration"

# Context automatically switches - no manual configuration needed
```

---

## 🛡️ **Security & Best Practices**

### **PAT Token Management**
```bash
# Each project uses isolated credentials
~/Projects/
├── riversync/
│   └── .azure-devops.json    # RiverSync PAT token
├── mula/
│   └── .azure-devops.json    # Mula PAT token  
└── client-project/
    └── .azure-devops.json    # Client PAT token

# Always exclude from version control
echo ".azure-devops.json" >> .gitignore
```

### **Secure Configuration Template**
```json
{
  "organizationUrl": "https://dev.azure.com/your-organization",
  "project": "YourProjectName",
  "pat": "your-personal-access-token-here", 
  "description": "Azure DevOps configuration for [Project Name] - Created [Date]"
}
```

### **Security Validation**
```bash
# Test configuration security
mcp__devops-mcp__get-current-context

# Verify credential isolation between projects
cd ~/Projects/project-a && mcp__devops-mcp__get-current-context
cd ~/Projects/project-b && mcp__devops-mcp__get-current-context
```

---

## 🔧 **Troubleshooting & Debugging**

### **Common Issues & Solutions**

#### **❌ "No Azure DevOps configuration found"**
**Diagnosis:**
```bash
# Check current directory for configuration
pwd
ls -la .azure-devops.json

# Verify JSON format
cat .azure-devops.json | jq .
```

**Solutions:**
- Create `.azure-devops.json` in project root directory
- Verify JSON syntax is valid
- Ensure PAT token has correct permissions

#### **❌ "Authentication failed"**
**Diagnosis:**
```bash
# Verify current context shows correct organization
mcp__devops-mcp__get-current-context

# Test basic connectivity
mcp__devops-mcp__get-work-items --wiql "SELECT TOP 1 [System.Id] FROM WorkItems"
```

**Solutions:**
- Verify PAT token hasn't expired
- Check organization URL format: `https://dev.azure.com/orgname`
- Ensure project name matches exactly (case-sensitive)
- Verify PAT token permissions include required scopes

#### **❌ "Work item type not found"**
**Diagnosis:**
Check your project's process template:

**Solutions:**
- **Agile Process**: Epic, Feature, User Story, Task, Bug
- **Scrum Process**: Epic, Feature, Product Backlog Item, Task, Bug
- **CMMI Process**: Epic, Feature, Requirement, Task, Bug

#### **❌ "WIQL query syntax error"**
**Common Mistakes:**
```bash
# ❌ Wrong: Single backslash in iteration path
--wiql "... WHERE [System.IterationPath] UNDER 'MyProject\Sprint 1'"

# ✅ Correct: Double backslash for escaping
--wiql "... WHERE [System.IterationPath] UNDER 'MyProject\\Sprint 1'"

# ❌ Wrong: Missing quotes around values
--wiql "... WHERE [System.State] = Active"

# ✅ Correct: Proper quoting
--wiql "... WHERE [System.State] = 'Active'"
```

### **Debug Commands & Validation**

#### **Connectivity Testing**
```bash
# Test basic MCP server connectivity
mcp__devops-mcp__get-current-context

# Test Azure DevOps API connectivity  
mcp__devops-mcp__get-repositories

# Test work item permissions
mcp__devops-mcp__get-work-items --wiql "SELECT TOP 1 [System.Id] FROM WorkItems"

# Test build/pipeline permissions
mcp__devops-mcp__get-builds --top 1
```

#### **Configuration Validation**
```bash
# Verify multi-project setup
for project in ~/Projects/*/; do
  echo "Testing $project"
  cd "$project"
  if [ -f .azure-devops.json ]; then
    mcp__devops-mcp__get-current-context
  else
    echo "No configuration found"
  fi
done
```

#### **Performance Monitoring**
```bash
# Time command execution
time mcp__devops-mcp__get-work-items

# Check for context switching overhead
cd ~/Projects/riversync && time mcp__devops-mcp__get-current-context
cd ~/Projects/mula && time mcp__devops-mcp__get-current-context
```

---

## 📚 **Integration with Claude Code Workflows**

### **AI-Assisted Development Patterns**

#### **Feature Planning with Claude**
```bash
# 1. Ask Claude to analyze requirements and create Epic
# Claude creates Epic and gets the ID
epic_id=$(mcp__devops-mcp__create-work-item \
  --type "Epic" \
  --title "AI-suggested epic title" | jq -r '.id')

# 2. Claude breaks down Epic into Features  
# 3. Claude creates User Stories with acceptance criteria
# 4. Claude generates Tasks with estimated complexity
```

#### **Code Review Integration**
```bash
# Link work items to pull requests in comments
mcp__devops-mcp__add-work-item-comment \
  --id 1234 \
  --comment "Implementation complete. Ready for review in PR #456. @reviewer please validate OAuth flow and error handling."

# Update work items based on PR feedback  
mcp__devops-mcp__add-work-item-comment \
  --id 1234 \
  --comment "PR feedback addressed: Added input validation, improved error messages, updated unit tests. Ready for re-review."
```

#### **Automated Status Updates**
```bash
# Claude can analyze git commits and update work items
# Based on commit messages that reference work item IDs
mcp__devops-mcp__add-work-item-comment \
  --id 1234 \
  --comment "Code changes detected in commit abc123: Updated OAuth provider configuration, fixed Safari compatibility issue, added comprehensive error handling."
```

### **Documentation Generation**
```bash
# Generate release notes from completed work items
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title], [System.Description] FROM WorkItems WHERE [System.IterationPath] UNDER 'MyProject\\Sprint 1' AND [System.State] = 'Closed'"

# Create deployment checklists from work items
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title], [System.Tags] FROM WorkItems WHERE [System.Tags] CONTAINS 'deployment' AND [System.State] = 'Resolved'"
```

---

## 🎯 **Success Patterns & Optimization**

### **Efficient Work Item Management**

#### **Hierarchy Best Practices**
1. **Start with Epics** for 3-6 month initiatives
2. **Break into Features** for 2-4 week deliverables
3. **Create User Stories** that provide clear user value
4. **Add Tasks** for specific implementation work
5. **Use consistent naming** for easy filtering
6. **Tag strategically** for cross-cutting concerns

#### **Sprint Planning Optimization**
```bash
# Velocity calculation from previous sprints
mcp__devops-mcp__get-work-items \
  --wiql "SELECT SUM([Microsoft.VSTS.Scheduling.StoryPoints]) FROM WorkItems WHERE [System.IterationPath] UNDER 'MyProject\\Previous Sprint' AND [System.State] = 'Closed'"

# Capacity planning by team member
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.AssignedTo], SUM([Microsoft.VSTS.Scheduling.StoryPoints]) FROM WorkItems WHERE [System.IterationPath] UNDER 'MyProject\\Current Sprint' GROUP BY [System.AssignedTo]"
```

### **Quality Assurance Integration**

#### **Bug Tracking Excellence**
```bash
# Create bugs with comprehensive context
mcp__devops-mcp__create-work-item \
  --type "Bug" \
  --title "Descriptive, specific title with context" \
  --description "Detailed reproduction steps, expected vs actual behavior, environment details" \
  --tags "severity-high;component-auth;browser-safari" \
  --parent $related_story_id
```

#### **Definition of Done Tracking**
```bash
# Check completion criteria before closing
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.Title], [System.Tags] FROM WorkItems WHERE [System.Tags] CONTAINS 'needs-review' OR [System.Tags] CONTAINS 'needs-testing'"
```

### **Performance & Monitoring**

#### **Pipeline Integration Patterns**
```bash
# Trigger builds with comprehensive parameters
mcp__devops-mcp__trigger-pipeline \
  --definitionName "Comprehensive CI/CD" \
  --sourceBranch "feature/auth-improvements" \
  --parameters '{
    "environment": "staging",
    "runTests": true,
    "requireApproval": false,
    "workItemId": 1234,
    "notifyOnFailure": true,
    "backupBeforeDeploy": true
  }'
```

#### **Continuous Feedback Loops**
```bash
# Update work items with build results
mcp__devops-mcp__add-work-item-comment \
  --id 1234 \
  --comment "Build #5678 completed successfully. Deployed to staging. Performance metrics: 95% faster page load, 0 critical security vulnerabilities detected."
```

---

## 📊 **Metrics & Analytics Workflows**

### **Team Productivity Tracking**
```bash
# Sprint burndown data
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [System.State], [Microsoft.VSTS.Scheduling.StoryPoints], [System.ChangedDate] FROM WorkItems WHERE [System.IterationPath] UNDER 'MyProject\\Current Sprint' ORDER BY [System.ChangedDate]"

# Individual productivity metrics
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.AssignedTo], COUNT([System.Id]), SUM([Microsoft.VSTS.Scheduling.StoryPoints]) FROM WorkItems WHERE [System.ChangedDate] >= @today-30 AND [System.State] = 'Closed' GROUP BY [System.AssignedTo]"
```

### **Quality Metrics**
```bash
# Bug creation vs resolution rates
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.CreatedDate], [System.State] FROM WorkItems WHERE [System.WorkItemType] = 'Bug' AND [System.CreatedDate] >= @today-30 ORDER BY [System.CreatedDate]"

# Technical debt tracking
mcp__devops-mcp__get-work-items \
  --wiql "SELECT [System.Id], [Microsoft.VSTS.Scheduling.StoryPoints] FROM WorkItems WHERE [System.Tags] CONTAINS 'technical-debt' AND [System.State] <> 'Closed'"
```

---

## 🔄 **Advanced Integration Scenarios**

### **Cross-Project Dependencies**
```bash
# Track dependencies between projects
mcp__devops-mcp__add-work-item-comment \
  --id 1234 \
  --comment "Blocked pending completion of authentication API in RiverSync project (work item #5678). Expected completion: Sprint 2."

# Update when dependencies resolved  
mcp__devops-mcp__update-work-item \
  --id 1234 \
  --state "Active"

mcp__devops-mcp__add-work-item-comment \
  --id 1234 \
  --comment "Dependency resolved. RiverSync authentication API deployed. Resuming implementation."
```

### **Release Management**
```bash
# Create release epic with all features
mcp__devops-mcp__create-work-item \
  --type "Epic" \
  --title "Q2 2025 Major Release" \
  --description "Complete feature set for Q2 release including authentication, reporting, and mobile support"

# Link all release features to epic
# Track release progress across multiple teams
# Coordinate deployment timing
```

---

## 📖 **Reference & Resources**

### **Additional Documentation**
- **Command Reference**: See `MCP-COMMANDS.md` for complete parameter documentation
- **Claude Integration**: See `claude.md` for Claude-specific workflows and troubleshooting
- **Issue Resolution**: See `RESOLVED.md` for historical problem resolution patterns

### **External Resources**
- **Azure DevOps REST API**: [Microsoft Documentation](https://docs.microsoft.com/en-us/rest/api/azure/devops/)
- **WIQL Syntax Guide**: [Query Language Reference](https://docs.microsoft.com/en-us/azure/devops/boards/queries/wiql-syntax)
- **Work Item Types**: [Process Template Documentation](https://docs.microsoft.com/en-us/azure/devops/boards/work-items/guidance/choose-process)
- **PAT Token Security**: [Authentication Best Practices](https://docs.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate)

### **Community & Support**
- **GitHub Repository**: [wangkanai/devops-mcp](https://github.com/wangkanai/devops-mcp)
- **NPM Package**: [@wangkanai/devops-mcp](https://www.npmjs.com/package/@wangkanai/devops-mcp)
- **Issue Tracking**: [GitHub Issues](https://github.com/wangkanai/devops-mcp/issues)

---

**Documentation Version**: 2.0  
**Created**: 2025-07-27  
**Last Updated**: 2025-07-27  
**Project Status**: Production Ready (Active Deployment)  
**Primary Technologies**: Node.js, TypeScript, MCP Protocol, Azure DevOps REST API v7.1+  
**Test Coverage**: >95%  
**GitHub**: <https://github.com/wangkanai/devops-mcp>  
**NPM**: [@wangkanai/devops-mcp](https://www.npmjs.com/package/@wangkanai/devops-mcp)