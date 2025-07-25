# Test Suite Documentation

This directory contains the comprehensive test suite for the Azure DevOps MCP Server following TDD best practices.

## Test Structure

```
tests/
├── unit/                    # Unit tests for isolated components
│   └── directory-detector.test.js
├── integration/             # Integration tests for component interaction
│   ├── mcp-server.test.js
│   └── directory-detection.test.js
└── e2e/                     # End-to-end tests (future)
```

## Test Categories

### **Unit Tests** (`tests/unit/`)
- **Purpose**: Test individual components in isolation
- **Scope**: Single class/function testing with mocked dependencies
- **Files**: 
  - `directory-detector.test.js` - Tests DirectoryDetector class logic

### **Integration Tests** (`tests/integration/`)
- **Purpose**: Test component interaction and system integration
- **Scope**: Multiple components working together
- **Files**:
  - `mcp-server.test.js` - Tests MCP protocol compliance and server startup
  - `directory-detection.test.js` - Tests full directory detection workflow

### **End-to-End Tests** (`tests/e2e/`)
- **Purpose**: Test complete user workflows (future implementation)
- **Scope**: Full system testing with real Azure DevOps API calls

## Running Tests

### All Tests
```bash
npm test                    # Run unit + integration tests
```

### Specific Test Categories
```bash
npm run test:unit          # Run only unit tests
npm run test:integration   # Run only integration tests
npm run test:watch         # Run tests in watch mode
```

### Individual Test Files
```bash
node tests/unit/directory-detector.test.js
node tests/integration/mcp-server.test.js
```

## Test Development Guidelines

### **Unit Tests**
- Should test single functions/classes in isolation
- Mock external dependencies (file system, API calls)
- Fast execution (< 1 second per test)
- No side effects or external state changes

### **Integration Tests**
- Test component interaction and data flow
- May use real file system but avoid external API calls
- Test MCP protocol compliance and message handling
- Verify configuration loading and directory detection workflows

### **Future E2E Tests**
- Test complete user scenarios with real Azure DevOps
- Require test environment configuration
- Slower execution but high confidence testing

## Test Data

### Mock Configurations
Tests use predefined configurations for consistent results:

```javascript
const testMappings = [
  {
    directory: '/Users/wangkanai/Sources/riversync',
    config: {
      organizationUrl: 'https://dev.azure.com/riversync',
      pat: 'test-pat-1',
      project: 'RiverSync'
    }
  },
  {
    directory: '/Users/wangkanai/Sources/mula',
    config: {
      organizationUrl: 'https://dev.azure.com/mula-x', 
      pat: 'test-pat-2',
      project: 'mula'
    }
  }
];
```

## Current Test Coverage

### **Unit Tests**: ✅ Directory Detection Logic
- Configuration mapping
- Project context generation
- Directory traversal algorithms

### **Integration Tests**: ✅ MCP Protocol & System Integration
- Server initialization and startup
- MCP protocol compliance (initialize, list tools)
- Directory detection with real file system
- Tool registration and schema validation

### **Areas for Future Testing**
- Azure DevOps API integration
- Error handling and edge cases
- Performance under load
- Security and authentication flows

## Contributing

When adding new features:

1. **Write Unit Tests First** - Test individual components
2. **Add Integration Tests** - Test component interaction  
3. **Update Documentation** - Document test scenarios
4. **Run Full Suite** - Ensure all tests pass

---

**TDD Philosophy**: Tests are first-class citizens and essential for maintaining code quality, enabling refactoring, and ensuring reliability in production environments.