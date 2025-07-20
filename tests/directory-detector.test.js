/**
 * Simple integration test for DirectoryDetector
 */

const { DirectoryDetector } = require('../dist/directory-detector.js');

async function testDirectoryDetector() {
  console.log('Testing DirectoryDetector...');

  // Test data
  const mappings = [
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

  const detector = new DirectoryDetector(mappings);

  // Test 1: Exact match for RiverSync
  console.log('\nTest 1: RiverSync directory detection');
  const riversyncConfig = detector.detectConfiguration('/Users/wangkanai/Sources/riversync');
  console.log('Result:', riversyncConfig);
  console.log('Expected: RiverSync project');

  // Test 2: Exact match for Mula
  console.log('\nTest 2: Mula directory detection');
  const mulaConfig = detector.detectConfiguration('/Users/wangkanai/Sources/mula');
  console.log('Result:', mulaConfig);
  console.log('Expected: mula project');

  // Test 3: Nested directory (should find parent)
  console.log('\nTest 3: Nested directory detection');
  const nestedConfig = detector.detectConfiguration('/Users/wangkanai/Sources/riversync/src/components');
  console.log('Result:', nestedConfig);
  console.log('Expected: RiverSync project (parent match)');

  // Test 4: No match
  console.log('\nTest 4: No match scenario');
  const noMatchConfig = detector.detectConfiguration('/Users/wangkanai/Sources/other-project');
  console.log('Result:', noMatchConfig);
  console.log('Expected: null');

  // Test 5: Project context
  console.log('\nTest 5: Project context');
  const context = detector.getProjectContext('/Users/wangkanai/Sources/mula');
  console.log('Result:', context);
  console.log('Expected: mula project context');

  // Test 6: Configured directories
  console.log('\nTest 6: Configured directories');
  const configuredDirs = detector.getConfiguredDirectories();
  console.log('Result:', configuredDirs);
  console.log('Expected: Array of configured directories');

  console.log('\nDirectoryDetector tests completed!');
}

testDirectoryDetector().catch(console.error);