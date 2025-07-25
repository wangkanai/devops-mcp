# CLAUDE.md - DevOps MCP Project Context

Comprehensive project context for Claude Code to work effectively on the devops-mcp project.

---

## 📋 Project Overview

### **devops-mcp** - Azure DevOps MCP Server
**Technology**: Node.js, TypeScript, MCP Protocol  
**Purpose**: Dynamic Azure DevOps integration with directory-based authentication switching  
**Status**: 🗄️ **ARCHIVED (2025-07-22)** - Project completed successfully  

**GitHub**: <https://github.com/wangkanai/devops-mcp>
**Achievement**: Complete documentation archive in `ACHIEVED.md`  
**Features**: Local `.azure-devops.json` configuration, secure PAT tokens, >95% test coverage

---

## 🏗️ **Architecture Overview**

### **Core Components**
- **MCP Server**: Model Context Protocol server for Azure DevOps integration
- **Authentication System**: Directory-based authentication switching using local `.azure-devops.json` files
- **Tool Handlers**: Core functionality for Azure DevOps operations (`src/handlers/tool-handlers.ts`)
- **Configuration Management**: Dynamic project context switching based on directory structure

### **Key Technologies**
- **Node.js** with TypeScript
- **MCP (Model Context Protocol)** for external service integration
- **Azure DevOps REST API** v7.1+ integration
- **Jest** for comprehensive testing (>95% coverage)
- **ESLint/Prettier** for code quality

---

## 🔧 **Core Features & Capabilities**

### **Authentication Management**
- **Directory-based Authentication**: Automatically detects and switches authentication context based on local `.azure-devops.json` files
- **Secure PAT Storage**: Personal Access Token management with secure storage
- **Multi-Organization Support**: Handle multiple Azure DevOps organizations seamlessly

### **Azure DevOps Integration**
- **Work Item Management**: Create, read, update work items with full type support
- **Repository Operations**: Access repositories, branches, pull requests
- **Project Management**: List projects, get project details
- **Build/Pipeline Support**: Access build definitions and pipeline information

### **MCP Protocol Implementation**
- **Tool Registration**: Dynamic tool registration with Azure DevOps capabilities
- **Resource Management**: Efficient resource handling and caching
- **Error Handling**: Comprehensive error handling with user-friendly messages

---

## 🚨 **Known Issues & Recent Fixes**

### **GitHub Issue #8 - Work Item Creation 404 Error** ✅ **FIXED**

**Problem**: `create-work-item` command was failing with 404 error:
```
The controller for path '/RiverSync/_apis/wit/workitems/Task' was not found
```

**Root Causes Identified & Fixed**:
1. **Missing `$` prefix** before work item type in endpoint URL
2. **Incorrect HTTP method** (`POST` instead of `PATCH`)
3. **Wrong Content-Type** header for Azure DevOps work item operations

**Fix Applied** in `src/handlers/tool-handlers.ts`:
- **Line 229**: Fixed endpoint URL from `/wit/workitems/${args.type}` to `/wit/workitems/$${args.type}`
- **Line 234**: Changed HTTP method from `POST` to `PATCH`
- **Line 87**: Added proper `application/json-patch+json` Content-Type for work item PATCH operations
- **Lines 230-231**: Added diagnostic logging for endpoint validation

**Before/After**:
```typescript
// Before (404 Error)
POST https://dev.azure.com/riversync/RiverSync/_apis/wit/workitems/Task
Content-Type: application/json

// After (Fixed)
PATCH https://dev.azure.com/riversync/RiverSync/_apis/wit/workitems/$Task
Content-Type: application/json-patch+json
```

---

## 📁 **Critical Files & Structure**

### **Core Implementation Files**
- **`src/handlers/tool-handlers.ts`** - Main tool handlers for Azure DevOps operations
- **`src/index.ts`** - MCP server entry point and initialization
- **`src/types/azure-devops.ts`** - TypeScript type definitions
- **`package.json`** - Dependencies and scripts configuration

### **Configuration Files**
- **`.azure-devops.json`** - Local authentication configuration (per directory)
- **`tsconfig.json`** - TypeScript compilation configuration
- **`jest.config.js`** - Testing framework configuration
- **`.eslintrc.js`** - Code quality and linting rules

### **Documentation Files**
- **`README.md`** - Primary project documentation
- **`ACHIEVED.md`** - Project completion and achievements archive
- **`PRODUCTION-VALIDATION-REPORT.md`** - Production validation status
- **`claude.md`** - This file (Claude context documentation)

### **Testing Structure**
- **`tests/`** - Comprehensive test suite with >95% coverage
- **`tests/handlers/`** - Tool handler unit tests
- **`tests/integration/`** - Integration tests for Azure DevOps API

---

## 🔑 **Azure DevOps API Specifications**

### **Work Item Creation** (Recently Fixed)
```typescript
// Correct Azure DevOps Work Item Creation
const endpoint = `${baseUrl}/_apis/wit/workitems/$${workItemType}?api-version=7.1`;
const method = 'PATCH';
const headers = {
  'Content-Type': 'application/json-patch+json',
  'Authorization': `Basic ${Buffer.from(`:${pat}`).toString('base64')}`
};
```

### **Common API Patterns**
- **Base URL**: `https://dev.azure.com/{organization}/{project}`
- **API Version**: `7.1` (current stable)
- **Authentication**: Basic authentication with PAT token
- **Work Items**: Use `$` prefix before work item type in URLs
- **HTTP Methods**:
  - GET for retrieval operations
  - PATCH for work item creation/updates
  - POST for other creation operations

---

## 🛠️ **Development Workflow**

### **Local Development Setup**
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build project
npm run build

# Run tests
npm test

# Run linting
npm run lint
```

### **Testing Commands**
```bash
# Work item creation test
mcp__devops-mcp__create-work-item \
  --type "Task" \
  --title "Test Work Item" \
  --description "Testing work item creation"

# Get current context
mcp__devops-mcp__get-current-context

# List work items
mcp__devops-mcp__get-work-items

# Repository operations
mcp__devops-mcp__get-repositories
mcp__devops-mcp__get-pull-requests --status "active"
```

### **Git Workflow** (Branch Protection Required)
**Important**: Repository has branch protection rules - all changes to `main` must be made through Pull Requests.

```bash
# Create feature branch
git checkout -b fix/issue-description

# Commit changes
git add .
git commit -m "fix: description of fix"

# Push and create PR (required - cannot push directly to main)
git push origin fix/issue-description

# For version releases
git checkout -b release/v1.x.x
npm version patch|minor|major
git push origin release/v1.x.x
# Create PR to main → merge triggers automated npm publishing
```

**Branch Protection Rules**:
- ❌ **Direct pushes to main**: Blocked
- ✅ **Pull Request required**: All changes must go through PR review
- ✅ **Automated publishing**: Merging to main triggers GitHub Action npm publish

---

## 📊 **Project Metrics & Status**

### **Quality Metrics**
- **Test Coverage**: >95% (Jest)
- **Code Quality**: ESLint + Prettier enforcement
- **Type Safety**: Full TypeScript coverage
- **Security**: Secure PAT token handling

### **Performance Metrics**
- **Response Time**: <200ms for typical Azure DevOps operations
- **Memory Usage**: Efficient resource management
- **Error Rate**: <1% for well-formed requests

### **Completion Status**
- **Core Features**: 100% complete
- **Testing**: 100% complete
- **Documentation**: 100% complete
- **Production Validation**: Complete
- **Project Status**: Successfully archived

---

## 📦 **Installation & Setup**

### **Claude Code Installation (Recommended)**

```bash
# Install and add to Claude Code MCP
claude mcp add devops-mcp -- npx -y @wangkanai/devops-mcp
```

> **Note**: The `-y` flag automatically accepts the package installation prompt, ensuring smooth non-interactive execution for MCP servers.

### **Claude Desktop Installation**

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

### **Project Configuration**

Each repository should contain a `.azure-devops.json` configuration file:

```json
{
  "organizationUrl": "https://dev.azure.com/your-org",
  "project": "YourProject",
  "pat": "your-pat-token-here",
  "description": "Azure DevOps configuration for this repository"
}
```

**Security**: Add `.azure-devops.json` to your `.gitignore` file to prevent committing PAT tokens.

---

## 🚀 **Usage Examples**

### **Basic Work Item Creation**
```bash
mcp__devops-mcp__create-work-item \
  --type "User Story" \
  --title "Implement new feature" \
  --description "Add functionality for user authentication"
```

### **Context Switching**
```bash
# Automatically switches context based on directory
cd /path/to/riversync/project
mcp__devops-mcp__get-current-context

cd /path/to/mula/project  
mcp__devops-mcp__get-current-context
```

### **Repository Operations**
```bash
# List all repositories in current context
mcp__devops-mcp__get-repositories

# Get active pull requests
mcp__devops-mcp__get-pull-requests --status "active"
```

---

## 🔍 **Troubleshooting Guide**

### **Common Issues**

**Authentication Issues**:
- Verify `.azure-devops.json` exists in project directory
- Check PAT token validity and permissions
- Ensure organization and project names are correct

**API Errors**:
- Verify Azure DevOps API version compatibility
- Check endpoint URL construction (especially `$` prefix for work items)
- Validate HTTP method and headers for specific operations

**Connection Issues**:
- Check network connectivity to dev.azure.com
- Verify firewall/proxy settings
- Confirm MCP server is running and accessible

**Git/GitHub Issues**:
- **Push rejected to main**: Repository has branch protection - create PR instead
- **Failed to publish**: Ensure NPM_TOKEN secret is configured in repository settings
- **Workflow not triggering**: Verify GitHub Action file exists and PR targets main branch

### **Debug Commands**
```bash
# Enable debug logging
DEBUG=* npm run dev

# Test specific functionality
npm test -- --testNamePattern="create-work-item"

# Validate configuration
node -e "console.log(require('./src/config/azure-config.js'))"
```

---

## 📈 **Future Enhancements** (If Project Resumed)

### **Potential Features**
- **Advanced Work Item Queries**: Complex query support with filters
- **Bulk Operations**: Batch work item operations
- **Pipeline Integration**: Build trigger and monitoring
- **Dashboard Support**: Real-time project metrics
- **Webhook Support**: Event-driven notifications

### **Technical Improvements**
- **Caching Layer**: Redis-based caching for improved performance
- **Rate Limiting**: Built-in rate limiting for Azure DevOps API
- **Advanced Error Recovery**: Retry logic with exponential backoff
- **Configuration UI**: Web-based configuration management

---

## 📝 **Development Notes**

### **Code Patterns**
- **Error Handling**: Always use try-catch with meaningful error messages
- **Type Safety**: Leverage TypeScript for all Azure DevOps API interfaces
- **Testing**: Maintain >95% test coverage for all new features
- **Documentation**: Update relevant documentation for any changes

### **Azure DevOps API Best Practices**
- **Use PATCH for work item operations** (not POST)
- **Include `$` prefix for work item types** in endpoint URLs
- **Use `application/json-patch+json`** for work item Content-Type
- **Implement proper authentication** with Base64-encoded PAT tokens
- **Handle rate limiting** appropriately (Azure DevOps has limits)

### **MCP Protocol Best Practices**
- **Register tools dynamically** based on available functionality
- **Implement proper resource cleanup** to prevent memory leaks
- **Use structured error responses** for client-friendly error handling
- **Cache expensive operations** to improve performance

---

**Documentation Version**: 1.0  
**Created**: 2025-07-22  
**Project Status**: Archived (Successfully Completed)  
**Primary Technologies**: Node.js, TypeScript, MCP Protocol, Azure DevOps REST API  
**Test Coverage**: >95%  
**GitHub**: <https://github.com/wangkanai/devops-mcp>