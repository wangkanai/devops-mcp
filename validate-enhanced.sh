#!/bin/bash
#
# Enhanced Azure DevOps MCP Implementation Validator
# With MCP server startup, connection verification, and readiness checks
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
POWERSHELL_SCRIPT="$SCRIPT_DIR/validate-enhanced.ps1"
DEFAULT_CONFIG="$SCRIPT_DIR/validation-config.json"

# Colors
RED='\033[31m'
GREEN='\033[32m'
YELLOW='\033[33m'
BLUE='\033[34m'
MAGENTA='\033[35m'
CYAN='\033[36m'
RESET='\033[0m'

echo -e "${MAGENTA}Enhanced Azure DevOps MCP Implementation Validator${RESET}"
echo -e "${BLUE}═════════════════════════════════════════════════${RESET}"
echo ""

# Check if PowerShell is available
if ! command -v pwsh &> /dev/null; then
    echo -e "${RED}❌ PowerShell (pwsh) is not installed${RESET}"
    echo "Please install PowerShell: https://docs.microsoft.com/en-us/powershell/scripting/install/installing-powershell"
    exit 1
fi

# Check PowerShell version
PWSH_VERSION=$(pwsh -Command "\$PSVersionTable.PSVersion.Major")
if [ "$PWSH_VERSION" -lt 7 ]; then
    echo -e "${RED}❌ PowerShell version 7+ required (current: $PWSH_VERSION)${RESET}"
    exit 1
fi

echo -e "${GREEN}✅ PowerShell $PWSH_VERSION detected${RESET}"

# Parse command line arguments
CONFIG_FILE="$DEFAULT_CONFIG"
SKIP_INTERACTIVE=""
VERBOSE=""
REPO_FILTER=""
WARMUP_TIME=""

show_help() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Enhanced validation with MCP server startup and connection verification"
    echo ""
    echo "Options:"
    echo "  -c, --config FILE         Use custom configuration file (default: validation-config.json)"
    echo "  -r, --repos NAMES         Filter to specific repositories (comma-separated)"
    echo "  -w, --warmup SECONDS      MCP server warmup time in seconds (default: 10)"
    echo "  --skip-interactive        Skip interactive Claude Code tests"
    echo "  --verbose                 Enable verbose output"
    echo "  --help                    Show this help message"
    echo ""
    echo "MCP Server Features:"
    echo "  • Automatic MCP server initialization and connectivity testing"
    echo "  • Server readiness verification with retry logic"
    echo "  • Configurable warmup period for stable connections"
    echo "  • Connection verification before running validation tests"
    echo ""
    echo "Configuration File Format:"
    echo "  JSON file defining repositories, proxy path, and test settings"
    echo "  See validation-config.json for example structure"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Test all enabled repositories with 10s warmup"
    echo "  $0 --skip-interactive                # Fast validation without Claude tests"
    echo "  $0 --repos \"RiverSync,Mula\"          # Test only specific repositories"
    echo "  $0 --warmup 20                       # Extended warmup period for slow systems"
    echo "  $0 --config custom-config.json       # Use custom configuration"
    echo ""
    echo "This enhanced validation system ensures MCP servers are properly started"
    echo "and connected before running tests, eliminating connection-related failures."
}

while [[ $# -gt 0 ]]; do
    case $1 in
        -c|--config)
            CONFIG_FILE="$2"
            shift 2
            ;;
        -r|--repos)
            REPO_FILTER="$2"
            shift 2
            ;;
        -w|--warmup)
            WARMUP_TIME="$2"
            shift 2
            ;;
        --skip-interactive)
            SKIP_INTERACTIVE="-SkipInteractive"
            shift
            ;;
        --verbose)
            VERBOSE="-Verbose"
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${RESET}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Validate configuration file
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}❌ Configuration file not found: $CONFIG_FILE${RESET}"
    echo "Use --config to specify a different file or create validation-config.json"
    exit 1
fi

echo -e "${CYAN}📋 Configuration: $CONFIG_FILE${RESET}"

# Show repository filter if specified
if [ -n "$REPO_FILTER" ]; then
    echo -e "${CYAN}🔍 Repository Filter: $REPO_FILTER${RESET}"
fi

# Show warmup time if specified
if [ -n "$WARMUP_TIME" ]; then
    echo -e "${CYAN}🔥 MCP Warmup Time: ${WARMUP_TIME}s${RESET}"
else
    echo -e "${CYAN}🔥 MCP Warmup Time: 10s (default)${RESET}"
fi

echo ""

# Build PowerShell command arguments
PWSH_ARGS=("-File" "$POWERSHELL_SCRIPT" "-ConfigFile" "$CONFIG_FILE")

if [ -n "$SKIP_INTERACTIVE" ]; then
    PWSH_ARGS+=("$SKIP_INTERACTIVE")
fi

if [ -n "$VERBOSE" ]; then
    PWSH_ARGS+=("$VERBOSE")
fi

if [ -n "$REPO_FILTER" ]; then
    PWSH_ARGS+=("-RepoFilter" "$REPO_FILTER")
fi

if [ -n "$WARMUP_TIME" ]; then
    PWSH_ARGS+=("-WarmupTimeSeconds" "$WARMUP_TIME")
fi

# Execute PowerShell validation script
echo -e "${CYAN}🚀 Starting enhanced validation with MCP server initialization...${RESET}"
echo ""

# Execute with proper error handling
if pwsh "${PWSH_ARGS[@]}"; then
    echo ""
    echo -e "${GREEN}🎉 Enhanced validation completed successfully!${RESET}"
    echo -e "${BLUE}ℹ️ MCP servers were properly initialized and tested${RESET}"
    exit 0
else
    EXIT_CODE=$?
    echo ""
    case $EXIT_CODE in
        1)
            echo -e "${YELLOW}⚠️ Enhanced validation completed with warnings${RESET}"
            echo -e "${BLUE}ℹ️ Some tests failed but MCP connectivity was established${RESET}"
            ;;
        2)
            echo -e "${RED}❌ Enhanced validation failed with errors${RESET}"
            echo -e "${BLUE}ℹ️ Check MCP server initialization and connectivity${RESET}"
            ;;
        *)
            echo -e "${RED}❌ Enhanced validation failed with unknown error (code: $EXIT_CODE)${RESET}"
            echo -e "${BLUE}ℹ️ Verify PowerShell script execution and MCP server status${RESET}"
            ;;
    esac
    exit $EXIT_CODE
fi