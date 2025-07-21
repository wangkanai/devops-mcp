#!/bin/bash
#
# MCP Server Warmup Script
# Ensures MCP servers are properly started and connected before validation
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${1:-$SCRIPT_DIR/validation-config.json}"

# Colors
RED='\033[31m'
GREEN='\033[32m'
YELLOW='\033[33m'
BLUE='\033[34m'
CYAN='\033[36m'
RESET='\033[0m'

echo -e "${CYAN}🔥 MCP Server Warmup Script${RESET}"
echo "=============================="
echo ""

# Check if configuration file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}❌ Configuration file not found: $CONFIG_FILE${RESET}"
    echo "Usage: $0 [config-file]"
    exit 1
fi

echo -e "${BLUE}📋 Using configuration: $CONFIG_FILE${RESET}"
echo ""

# Parse repositories from config (basic parsing)
if command -v jq &> /dev/null; then
    REPOS=$(jq -r '.repositories[] | select(.enabled == true) | "\(.name)|\(.path)"' "$CONFIG_FILE")
    MCP_SERVER_NAME=$(jq -r '.testSettings.mcpServerName' "$CONFIG_FILE")
else
    echo -e "${YELLOW}⚠️ jq not available, using basic parsing${RESET}"
    MCP_SERVER_NAME="azure-devops-proxy"
fi

echo "🔧 Warming up MCP servers..."
echo ""

# Function to warmup a single repository
warmup_repository() {
    local name="$1"
    local path="$2"
    
    echo "Testing $name:"
    
    if [ -d "$path" ]; then
        cd "$path"
        
        # Test MCP server list
        echo -n "   Checking MCP configuration... "
        if claude mcp list &>/dev/null; then
            echo -e "${GREEN}✅${RESET}"
        else
            echo -e "${RED}❌${RESET}"
            return 1
        fi
        
        # Test MCP server details
        echo -n "   Testing MCP server details... "
        if claude mcp get "$MCP_SERVER_NAME" &>/dev/null; then
            echo -e "${GREEN}✅${RESET}"
        else
            echo -e "${RED}❌${RESET}"
            return 1
        fi
        
        # Test basic MCP command (with timeout)
        echo -n "   Testing MCP command execution... "
        timeout 10s claude -c "echo 'MCP warmup test'" &>/dev/null
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅${RESET}"
        else
            echo -e "${YELLOW}⚠️ (timeout or error)${RESET}"
        fi
        
    else
        echo -e "${RED}❌ Repository directory not found: $path${RESET}"
        return 1
    fi
    
    echo ""
    return 0
}

# Warmup each repository
if command -v jq &> /dev/null && [ -n "$REPOS" ]; then
    echo "$REPOS" | while IFS='|' read -r name path; do
        if [ -n "$name" ]; then
            warmup_repository "$name" "$path"
        fi
    done
else
    # Fallback for hardcoded repositories
    echo -e "${YELLOW}⚠️ Using fallback repository list${RESET}"
    warmup_repository "RiverSync" "/Users/wangkanai/Sources/riversync"
    warmup_repository "Mula" "/Users/wangkanai/Sources/mula"
fi

echo "🎯 MCP server warmup completed!"
echo ""
echo "Next steps:"
echo "   ./validate-enhanced.sh --skip-interactive   # Run validation"
echo "   ./quick-test-generic.sh                     # Quick configuration test"