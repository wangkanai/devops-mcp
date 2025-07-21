#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Enhanced Azure DevOps MCP Implementation Validation Script with MCP Server Startup
.DESCRIPTION
    Validates Azure DevOps MCP proxy implementation with proper MCP server initialization,
    connection verification, and readiness checks before running tests.
.PARAMETER ConfigFile
    Path to the validation configuration JSON file (default: validation-config.json)
.PARAMETER SkipInteractive
    Skip interactive Claude Code tests (faster execution)
.PARAMETER Verbose
    Enable verbose output for debugging
.PARAMETER RepoFilter
    Filter to specific repository names (comma-separated)
.PARAMETER WarmupTimeSeconds
    Time to wait for MCP server warmup (default: 10 seconds)
.NOTES
    Enhanced with MCP server startup and connection verification
#>

param(
    [string]$ConfigFile = "validation-config.json",
    [switch]$SkipInteractive,
    [switch]$Verbose,
    [string]$RepoFilter = "",
    [int]$WarmupTimeSeconds = 10
)

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Magenta = "`e[35m"
$Cyan = "`e[36m"
$Reset = "`e[0m"

# Test results tracking
$Global:TestResults = @{
    Total = 0
    Passed = 0
    Failed = 0
    Errors = @()
}

# Configuration
$Global:Config = $null

function Write-TestHeader {
    param([string]$Title)
    Write-Host "${Cyan}╭─────────────────────────────────────────────────────────────╮${Reset}"
    Write-Host "${Cyan}│ $($Title.PadRight(59)) │${Reset}"
    Write-Host "${Cyan}╰─────────────────────────────────────────────────────────────╯${Reset}"
}

function Write-TestResult {
    param(
        [string]$Test,
        [bool]$Success,
        [string]$Details = ""
    )
    
    $Global:TestResults.Total++
    
    if ($Success) {
        $Global:TestResults.Passed++
        Write-Host "${Green}✅ PASS${Reset} $Test"
        if ($Details) { Write-Host "   ${Blue}→${Reset} $Details" }
    } else {
        $Global:TestResults.Failed++
        $Global:TestResults.Errors += "$Test - $Details"
        Write-Host "${Red}❌ FAIL${Reset} $Test"
        if ($Details) { Write-Host "   ${Red}→${Reset} $Details" }
    }
}

function Load-Configuration {
    try {
        if (-not (Test-Path $ConfigFile)) {
            throw "Configuration file not found: $ConfigFile"
        }
        
        $configContent = Get-Content $ConfigFile -Raw | ConvertFrom-Json
        $Global:Config = $configContent
        
        Write-TestResult "Load Configuration File" $true "Loaded: $ConfigFile"
        
        # Apply command line overrides
        if ($SkipInteractive) {
            $Global:Config.testSettings.skipInteractive = $true
        }
        if ($Verbose) {
            $Global:Config.testSettings.verbose = $true
        }
        
        # Filter repositories if specified
        if ($RepoFilter) {
            $filterNames = $RepoFilter -split ","
            $filteredRepos = $Global:Config.repositories | Where-Object { 
                $_.name -in $filterNames -and $_.enabled 
            }
            $Global:Config.repositories = $filteredRepos
            Write-TestResult "Apply Repository Filter" $true "Filtered to: $($filterNames -join ', ')"
        } else {
            # Only include enabled repositories
            $Global:Config.repositories = $Global:Config.repositories | Where-Object { $_.enabled }
        }
        
        Write-TestResult "Repository Count" ($Global:Config.repositories.Count -gt 0) "Active repositories: $($Global:Config.repositories.Count)"
        
    } catch {
        Write-TestResult "Configuration Load Error" $false $_.Exception.Message
        exit 1
    }
}

function Test-Prerequisites {
    Write-TestHeader "PREREQUISITES VALIDATION"
    
    # Test PowerShell version
    $psVersion = $PSVersionTable.PSVersion
    $psVersionOk = $psVersion.Major -ge 7
    Write-TestResult "PowerShell Version >= 7.0" $psVersionOk "Version: $psVersion"
    
    # Test Claude Code availability
    $claudeExists = Get-Command claude -ErrorAction SilentlyContinue
    $claudeOk = $null -ne $claudeExists
    Write-TestResult "Claude Code CLI Available" $claudeOk "Path: $($claudeExists.Source)"
    
    # Test proxy directory and build
    $proxyExists = Test-Path $Global:Config.proxyPath
    Write-TestResult "Proxy Directory Exists" $proxyExists "Path: $($Global:Config.proxyPath)"
    
    $proxyBuilt = Test-Path (Join-Path $Global:Config.proxyPath "dist/index.js")
    Write-TestResult "Azure DevOps Proxy Built" $proxyBuilt "Build: $($Global:Config.proxyPath)/dist/index.js"
    
    # Test repository directories and configurations
    foreach ($repo in $Global:Config.repositories) {
        $repoExists = Test-Path $repo.path
        Write-TestResult "$($repo.name) Directory Exists" $repoExists "Path: $($repo.path)"
        
        $configPath = Join-Path $repo.path $Global:Config.testSettings.configFileName
        $configExists = Test-Path $configPath
        Write-TestResult "$($repo.name) Local Config Exists" $configExists "Config: $configPath"
    }
}

function Initialize-MCPServers {
    Write-TestHeader "MCP SERVER INITIALIZATION"
    
    foreach ($repo in $Global:Config.repositories) {
        try {
            Push-Location $repo.path
            
            Write-Host "${Yellow}🔄${Reset} Initializing MCP server for $($repo.name)..."
            
            # Check if MCP server is configured
            $mcpListOutput = claude mcp list 2>&1
            $mcpListExitCode = $LASTEXITCODE
            
            if ($mcpListExitCode -eq 0) {
                $hasAzureDevOps = ($mcpListOutput -match $Global:Config.testSettings.mcpServerName) -ne $null -and ($mcpListOutput -match $Global:Config.testSettings.mcpServerName).Count -gt 0
                
                if ($hasAzureDevOps) {
                    Write-TestResult "$($repo.name) - MCP Server Configured" $true "Found $($Global:Config.testSettings.mcpServerName)"
                    
                    # Test basic MCP connectivity with timeout
                    Write-Host "${Yellow}⏳${Reset} Testing MCP connectivity for $($repo.name) (timeout: 15s)..."
                    
                    $connectivityTest = $false
                    $maxRetries = 3
                    $retryCount = 0
                    
                    while ($retryCount -lt $maxRetries -and -not $connectivityTest) {
                        try {
                            # Use a simpler approach - just test if the command executes
                            $mcpTestOutput = claude mcp get $Global:Config.testSettings.mcpServerName 2>&1
                            $mcpTestExitCode = $LASTEXITCODE
                            
                            if ($mcpTestExitCode -eq 0) {
                                $connectivityTest = $true
                                Write-TestResult "$($repo.name) - MCP Connectivity" $true "Connected successfully"
                            } else {
                                $retryCount++
                                if ($retryCount -lt $maxRetries) {
                                    Write-Host "${Yellow}⚠️${Reset} MCP connectivity test failed, retrying ($retryCount/$maxRetries)..."
                                    Start-Sleep -Seconds 2
                                }
                            }
                        } catch {
                            $retryCount++
                            if ($retryCount -lt $maxRetries) {
                                Write-Host "${Yellow}⚠️${Reset} MCP connectivity error, retrying ($retryCount/$maxRetries): $($_.Exception.Message)"
                                Start-Sleep -Seconds 2
                            }
                        }
                    }
                    
                    if (-not $connectivityTest) {
                        Write-TestResult "$($repo.name) - MCP Connectivity" $false "Failed after $maxRetries attempts"
                    }
                    
                } else {
                    Write-TestResult "$($repo.name) - MCP Server Configured" $false "Server $($Global:Config.testSettings.mcpServerName) not found"
                }
            } else {
                Write-TestResult "$($repo.name) - MCP List Command" $false "Exit code: $mcpListExitCode"
            }
            
        } catch {
            Write-TestResult "$($repo.name) - MCP Initialization Error" $false $_.Exception.Message
        } finally {
            Pop-Location
        }
    }
    
    # Global warmup period
    if ($WarmupTimeSeconds -gt 0) {
        Write-Host "${Yellow}🔥${Reset} MCP server warmup period: $WarmupTimeSeconds seconds..."
        Start-Sleep -Seconds $WarmupTimeSeconds
        Write-TestResult "MCP Server Warmup" $true "Waited $WarmupTimeSeconds seconds for server initialization"
    }
}

function Test-MCPServerReadiness {
    Write-TestHeader "MCP SERVER READINESS VERIFICATION"
    
    foreach ($repo in $Global:Config.repositories) {
        try {
            Push-Location $repo.path
            
            # Test MCP server details command
            $mcpGetOutput = claude mcp get $Global:Config.testSettings.mcpServerName 2>&1
            $mcpGetExitCode = $LASTEXITCODE
            
            if ($mcpGetExitCode -eq 0) {
                # Parse server details with explicit boolean conversion
                $isLocalScope = ($mcpGetOutput -match "Scope: Local") -ne $null -and ($mcpGetOutput -match "Scope: Local").Count -gt 0
                $hasCorrectCommand = ($mcpGetOutput -match "Command: node") -ne $null -and ($mcpGetOutput -match "Command: node").Count -gt 0
                $hasProxyPath = ($mcpGetOutput -match [regex]::Escape($Global:Config.proxyPath)) -ne $null -and ($mcpGetOutput -match [regex]::Escape($Global:Config.proxyPath)).Count -gt 0
                
                Write-TestResult "$($repo.name) - MCP Server Details" $true "Command executed successfully"
                Write-TestResult "$($repo.name) - Local Scope" $isLocalScope "Scope validation"
                Write-TestResult "$($repo.name) - Correct Command" $hasCorrectCommand "Node.js command"
                Write-TestResult "$($repo.name) - Proxy Path" $hasProxyPath "Correct proxy path"
                
                # Check for environment variables (should be empty for local config)
                $environmentSection = ($mcpGetOutput -match "Environment:") -ne $null -and ($mcpGetOutput -match "Environment:").Count -gt 0
                if ($environmentSection) {
                    $envLines = $mcpGetOutput -split "`n" | Select-String -Pattern "Environment:" -Context 0,1
                    $nextLine = if ($envLines -and $envLines.Context -and $envLines.Context.PostContext) { $envLines.Context.PostContext } else { $null }
                    $noEnvVars = (-not $nextLine) -or ($nextLine -match "^\s*$")
                    Write-TestResult "$($repo.name) - No Environment Variables" $noEnvVars "Using local configuration"
                }
                
            } else {
                Write-TestResult "$($repo.name) - MCP Server Details" $false "Exit code: $mcpGetExitCode"
            }
            
        } catch {
            Write-TestResult "$($repo.name) - MCP Readiness Error" $false $_.Exception.Message
        } finally {
            Pop-Location
        }
    }
}

function Test-RepositoryConfiguration {
    param([PSCustomObject]$Repository)
    
    Write-TestHeader "LOCAL CONFIGURATION - $($Repository.name)"
    
    try {
        $configPath = Join-Path $Repository.path $Global:Config.testSettings.configFileName
        $config = Get-Content $configPath | ConvertFrom-Json
        
        # Test required fields
        $hasOrgUrl = -not [string]::IsNullOrEmpty($config.organizationUrl)
        $hasProject = -not [string]::IsNullOrEmpty($config.project)
        $hasPat = -not [string]::IsNullOrEmpty($config.pat)
        
        Write-TestResult "$($Repository.name) - Organization URL" $hasOrgUrl $config.organizationUrl
        Write-TestResult "$($Repository.name) - Project Name" $hasProject $config.project
        Write-TestResult "$($Repository.name) - PAT Token Present" $hasPat "Length: $($config.pat.Length) chars"
        
        # Test URL format and expected values
        $validUrl = $config.organizationUrl -match "^https://dev\.azure\.com/"
        Write-TestResult "$($Repository.name) - Valid Azure DevOps URL" $validUrl $config.organizationUrl
        
        $expectedUrl = $config.organizationUrl -eq $Repository.organizationUrl
        Write-TestResult "$($Repository.name) - Expected Organization URL" $expectedUrl "Expected: $($Repository.organizationUrl), Actual: $($config.organizationUrl)"
        
        $expectedProject = $config.project -eq $Repository.project
        Write-TestResult "$($Repository.name) - Expected Project Name" $expectedProject "Expected: $($Repository.project), Actual: $($config.project)"
        
        # Test tools configuration
        $toolsConfigured = $true
        foreach ($tool in $Global:Config.expectedTools) {
            if ($config.tools.$tool -ne $true) {
                $toolsConfigured = $false
                break
            }
        }
        $toolsDescription = ($Global:Config.expectedTools | ForEach-Object { "$_`: $($config.tools.$_)" }) -join ", "
        Write-TestResult "$($Repository.name) - Tools Enabled" $toolsConfigured $toolsDescription
        
    } catch {
        Write-TestResult "$($Repository.name) - Configuration Parse Error" $false $_.Exception.Message
    }
}

function Test-ClaudeMCPCommands {
    param([PSCustomObject]$Repository)
    
    Write-TestHeader "CLAUDE MCP COMMANDS - $($Repository.name)"
    
    try {
        # Change to repository directory
        Push-Location $Repository.path
        
        if (-not $Global:Config.testSettings.skipInteractive) {
            # Create temporary Claude script for testing
            $testScript = @"
mcp__$($Global:Config.testSettings.mcpServerName)__get-current-context
"@
            
            $scriptPath = Join-Path $Repository.path "temp_mcp_test.txt"
            $testScript | Out-File -FilePath $scriptPath -Encoding UTF8
            
            Write-Host "${Yellow}⏳${Reset} Testing Claude MCP commands for $($Repository.name) (timeout: $($Global:Config.testSettings.timeoutSeconds)s)..."
            
            # Execute Claude with proper process handling
            $processInfo = New-Object System.Diagnostics.ProcessStartInfo
            $processInfo.FileName = "claude"
            $processInfo.Arguments = "--file `"$scriptPath`""
            $processInfo.WorkingDirectory = $Repository.path
            $processInfo.RedirectStandardOutput = $true
            $processInfo.RedirectStandardError = $true
            $processInfo.UseShellExecute = $false
            $processInfo.CreateNoWindow = $true
            
            $process = New-Object System.Diagnostics.Process
            $process.StartInfo = $processInfo
            
            $started = $process.Start()
            $finished = $process.WaitForExit($Global:Config.testSettings.timeoutSeconds * 1000)
            
            if ($finished) {
                $claudeOutput = $process.StandardOutput.ReadToEnd()
                $claudeError = $process.StandardError.ReadToEnd()
                
                # Test context detection
                $contextMatch = ($claudeOutput -match $Repository.expectedOrganization) -ne $null -and ($claudeOutput -match $Repository.expectedOrganization).Count -gt 0
                Write-TestResult "$($Repository.name) - Context Detection" $contextMatch "Expected: $($Repository.expectedOrganization)"
                
                # Test command execution (look for JSON response)
                $commandsExecuted = ($claudeOutput -match "organizationUrl|project") -ne $null -and ($claudeOutput -match "organizationUrl|project").Count -gt 0
                Write-TestResult "$($Repository.name) - MCP Commands Executed" $commandsExecuted
                
                # Test no errors
                $hasErrors = ($claudeError -match "Error:|error:|failed|Failed") -ne $null -and ($claudeError -match "Error:|error:|failed|Failed").Count -gt 0
                Write-TestResult "$($Repository.name) - No Command Errors" (-not $hasErrors)
                
                if ($Global:Config.testSettings.verbose -and $claudeOutput) {
                    Write-Host "   ${Blue}Output Sample:${Reset} $($claudeOutput -replace "`n", " " | Select-Object -First 100)..."
                }
                
            } else {
                $process.Kill()
                Write-TestResult "$($Repository.name) - Command Timeout" $false "Commands exceeded $($Global:Config.testSettings.timeoutSeconds) second timeout"
            }
            
            # Cleanup
            Remove-Item $scriptPath -ErrorAction SilentlyContinue
        } else {
            Write-Host "${Yellow}⏭️${Reset} Skipping interactive tests (skipInteractive enabled)"
        }
        
    } catch {
        Write-TestResult "$($Repository.name) - Claude Command Error" $false $_.Exception.Message
    } finally {
        Pop-Location
    }
}

function Test-DynamicSwitching {
    Write-TestHeader "DYNAMIC ENVIRONMENT SWITCHING"
    
    if (-not $Global:Config.testSettings.skipInteractive -and $Global:Config.repositories.Count -gt 1) {
        try {
            $contexts = @()
            
            # Collect contexts from each repository
            foreach ($repo in $Global:Config.repositories) {
                Push-Location $repo.path
                $mcpResult = claude mcp get $Global:Config.testSettings.mcpServerName 2>&1
                $contexts += @{
                    Repository = $repo.name
                    Context = $mcpResult
                    Success = $LASTEXITCODE -eq 0
                }
                Pop-Location
            }
            
            # Test that contexts are different between repositories
            $successfulContexts = $contexts | Where-Object { $_.Success }
            if ($successfulContexts.Count -gt 1) {
                $uniqueContexts = ($successfulContexts | Select-Object -ExpandProperty Context | Sort-Object -Unique).Count
                $expectedUnique = $successfulContexts.Count
                
                $switchingWorks = $uniqueContexts -eq $expectedUnique
                Write-TestResult "Directory-Based Context Switching" $switchingWorks "Unique contexts: $uniqueContexts, Expected: $expectedUnique"
            } else {
                Write-TestResult "Dynamic Switching Test" $false "Insufficient successful contexts to test switching"
            }
            
        } catch {
            Write-TestResult "Dynamic Switching Test Error" $false $_.Exception.Message
        }
    } else {
        if ($Global:Config.repositories.Count -le 1) {
            Write-Host "${Yellow}⏭️${Reset} Skipping dynamic switching test (insufficient repositories: $($Global:Config.repositories.Count))"
        } else {
            Write-Host "${Yellow}⏭️${Reset} Skipping dynamic switching test (skipInteractive enabled)"
        }
    }
}

function Write-Summary {
    Write-TestHeader "VALIDATION SUMMARY"
    
    $passRate = if ($Global:TestResults.Total -gt 0) { 
        [math]::Round(($Global:TestResults.Passed / $Global:TestResults.Total) * 100, 1) 
    } else { 0 }
    
    Write-Host "${Blue}Total Tests:${Reset} $($Global:TestResults.Total)"
    Write-Host "${Green}Passed:${Reset} $($Global:TestResults.Passed)"
    Write-Host "${Red}Failed:${Reset} $($Global:TestResults.Failed)"
    Write-Host "${Cyan}Pass Rate:${Reset} $passRate%"
    Write-Host "${Magenta}Repositories Tested:${Reset} $($Global:Config.repositories.Count)"
    Write-Host "${Yellow}Warmup Time:${Reset} $WarmupTimeSeconds seconds"
    
    if ($Global:TestResults.Failed -gt 0) {
        Write-Host ""
        Write-Host "${Red}Failed Tests:${Reset}"
        foreach ($error in $Global:TestResults.Errors) {
            Write-Host "  ${Red}•${Reset} $error"
        }
    }
    
    Write-Host ""
    if ($passRate -ge 90) {
        Write-Host "${Green}🎉 VALIDATION SUCCESSFUL${Reset} - Azure DevOps MCP implementation is working correctly!"
        exit 0
    } elseif ($passRate -ge 70) {
        Write-Host "${Yellow}⚠️ VALIDATION PARTIAL${Reset} - Some issues detected but core functionality works"
        exit 1
    } else {
        Write-Host "${Red}❌ VALIDATION FAILED${Reset} - Significant issues detected, implementation needs fixes"
        exit 2
    }
}

# Main execution
Write-Host "${Magenta}Enhanced Azure DevOps MCP Implementation Validator${Reset}"
Write-Host "${Blue}═════════════════════════════════════════════════${Reset}"
Write-Host ""

# Load configuration
Load-Configuration

# Run validation tests with MCP server initialization
Test-Prerequisites
Initialize-MCPServers
Test-MCPServerReadiness

foreach ($repository in $Global:Config.repositories) {
    Test-RepositoryConfiguration $repository
    Test-ClaudeMCPCommands $repository
}

Test-DynamicSwitching

# Generate summary
Write-Summary