#!/usr/bin/env node

/**
 * Simple test script to validate the parent relationship fix
 * This script can be run manually to test the actual parent relationship functionality
 */

const { spawn } = require('child_process');

console.log('🧪 Testing Parent Relationship Fix for Issue #26');
console.log('='.repeat(60));

function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { stdio: 'pipe' });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    proc.on('error', reject);
  });
}

async function testParentRelationship() {
  try {
    console.log('📋 Step 1: Creating test Epic (parent work item)...');
    
    // Create an Epic first (parent)
    const epicResult = await runCommand('node', ['dist/index.js'], {
      input: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'create-work-item',
          arguments: {
            type: 'Epic',
            title: 'Test Epic - Parent Fix Validation',
            description: 'Epic created to test the parent relationship fix for Issue #26',
            iterationPath: 'Sathai'
          }
        }
      })
    });

    if (epicResult.code !== 0) {
      console.error('❌ Failed to create Epic:', epicResult.stderr);
      return false;
    }

    console.log('✅ Epic created successfully');
    
    // Extract Epic ID from response
    const epicResponse = JSON.parse(epicResult.stdout);
    const epicId = epicResponse.result?.content?.[0]?.text ? 
      JSON.parse(epicResponse.result.content[0].text).workItem.id : null;

    if (!epicId) {
      console.error('❌ Could not extract Epic ID from response');
      return false;
    }

    console.log(`📋 Epic ID: ${epicId}`);
    console.log('📋 Step 2: Creating Feature with Epic as parent...');

    // Create a Feature with the Epic as parent
    const featureResult = await runCommand('node', ['dist/index.js'], {
      input: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'create-work-item',
          arguments: {
            type: 'Feature',
            title: 'Test Feature - Parent Relationship Validation',
            description: `Feature created to test parent relationship with Epic ${epicId}`,
            iterationPath: 'Sathai',
            parent: epicId
          }
        }
      })
    });

    if (featureResult.code !== 0) {
      console.error('❌ Failed to create Feature:', featureResult.stderr);
      return false;
    }

    console.log('✅ Feature created successfully');
    
    // Parse the Feature response to check for parent relationship
    const featureResponse = JSON.parse(featureResult.stdout);
    const featureData = featureResponse.result?.content?.[0]?.text ? 
      JSON.parse(featureResponse.result.content[0].text).workItem : null;

    if (!featureData) {
      console.error('❌ Could not parse Feature response');
      return false;
    }

    console.log('📋 Step 3: Validating parent relationship...');
    console.log(`📋 Feature ID: ${featureData.id}`);
    console.log(`📋 Parent ID: ${featureData.parent}`);
    console.log(`📋 Parent Relation: ${JSON.stringify(featureData.parentRelation, null, 2)}`);
    console.log(`📋 Relations Count: ${featureData.relations}`);

    // Validate that parent relationship was established
    if (featureData.parent === epicId || featureData.parentRelation?.id === epicId) {
      console.log('🎉 SUCCESS: Parent relationship established correctly!');
      console.log(`✅ Feature ${featureData.id} is properly linked to Epic ${epicId}`);
      return true;
    } else {
      console.error('❌ FAILURE: Parent relationship not established');
      console.error(`Expected parent: ${epicId}, Got: ${featureData.parent}`);
      return false;
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
    return false;
  }
}

// Run the test
testParentRelationship().then(success => {
  console.log('='.repeat(60));
  if (success) {
    console.log('🎉 PARENT RELATIONSHIP FIX VALIDATION: PASSED');
    console.log('✅ Issue #26 has been successfully resolved!');
    process.exit(0);
  } else {
    console.log('❌ PARENT RELATIONSHIP FIX VALIDATION: FAILED');
    console.log('🔧 Issue #26 fix needs further investigation');
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});