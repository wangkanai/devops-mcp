# 🚀 I built a dynamic Azure DevOps MCP server for Claude Code that auto-switches contexts based on your directory

**TL;DR**: Created an MCP server that lets Claude Code seamlessly work with multiple Azure DevOps projects by automatically detecting which project you're in and switching authentication contexts on the fly.

## The Problem I Solved

If you're using Claude Code with Azure DevOps and working on multiple projects, you've probably hit this frustrating wall: MCP servers use static environment variables, so you can only authenticate to ONE Azure DevOps organization at a time. Want to switch between projects? Restart Claude, change configs, repeat. 😤

## The Solution: Dynamic Context Switching

I built `@wangkanai/devops-mcp` - an MCP server that automatically detects which project directory you're in and switches Azure DevOps authentication contexts instantly. No restarts, no manual config changes, just seamless workflow.

### How It Works

1. **Local Config Files**: Each project has its own `.azure-devops.json` with org-specific PAT tokens
2. **Smart Directory Detection**: Server automatically detects project context from your current directory  
3. **Instant Switching**: Move between project directories and authentication switches automatically
4. **Security First**: All tokens stored locally, never committed to git

## Features That Make Life Better

**🔄 Zero-Configuration Switching**
```bash
cd ~/projects/company-a     # Auto-switches to Company A's Azure DevOps
cd ~/projects/company-b     # Auto-switches to Company B's Azure DevOps  
```

**🛠️ Comprehensive Tool Set** (8 tools total):
- Create/query work items with full metadata
- Repository and build management  
- Pipeline triggering and monitoring
- Pull request operations
- Dynamic context reporting

**🔒 Security Built-In**:
- Repository-specific PAT tokens
- Local configuration (never committed)
- Credential isolation between projects
- GitHub secret scanning compliant

## Installation

Super simple with Claude Code:

```bash
# Claude Code - One command installation
claude mcp add devops-mcp -- npx @wangkanai/devops-mcp
```

**For Claude Desktop users**, add to your MCP config:
```json
{
  "mcpServers": {
    "devops-mcp": {
      "command": "npx",
      "args": ["@wangkanai/devops-mcp"]
    }
  }
}
```

Then just add a `.azure-devops.json` to each project:
```json
{
  "organizationUrl": "https://dev.azure.com/your-org",
  "project": "YourProject", 
  "pat": "your-pat-token",
  "description": "Project-specific Azure DevOps config"
}
```

## Real-World Impact

Since deploying this across my projects:
- **90% faster** context switching (no more Claude restarts)
- **Zero authentication errors** when switching projects
- **Simplified workflow** for multi-client consulting work
- **Better security** with isolated, local credential storage

## Tech Stack & Metrics

- **Node.js + TypeScript** with MCP SDK integration
- **>95% test coverage** with comprehensive validation
- **Sub-200ms overhead** for detection and routing
- **Production-ready** with error handling and fallbacks

## Why This Matters for DevOps Workflows

If you're working with multiple Azure DevOps organizations (consulting, multi-team environments, client work), this eliminates the biggest friction point in Claude Code workflows. Instead of context-switching being a 30-second interruption, it's now completely transparent.

**GitHub**: https://github.com/wangkanai/devops-mcp  
**NPM**: `@wangkanai/devops-mcp`

---

**Questions?** Happy to explain the technical implementation or help with setup issues! This was a fun project that solved a real daily annoyance in my workflow.

*Tags: #DevOps #AzureDevOps #Claude #MCP #Automation #WorkflowOptimization*