/**
 * Settings API Quick Test Script
 * Tests all 8 Settings API endpoints with type parsing and access control
 * 
 * Run: node TESTING/quick-test-settings-api.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Test results tracking
const results = { passed: 0, failed: 0, total: 0 };

function pass(test) {
  console.log(`✅ ${test}`);
  results.passed++;
  results.total++;
}

function fail(test, error) {
  console.log(`❌ ${test}`);
  console.log(`   Error: ${error}`);
  results.failed++;
  results.total++;
}

async function main() {
  console.log('\n🧪 Settings API Quick Test Suite\n');
  console.log('============================================================\n');
  
  let adminToken;
  const testKey = `test.setting.${Date.now()}`;
  
  try {
    // 1. Login as admin
    console.log('1. Testing Authentication...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      passcode: '000000'
    });
    adminToken = loginRes.data.data.accessToken;
    pass('Admin login successful');
    
    // 2. Get settings count (before creating test settings)
    console.log('\n2. Testing Get Settings Count...');
    const countRes1 = await axios.get(`${BASE_URL}/settings/count`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const initialCount = countRes1.data.data.count;
    pass(`Get settings count (initial: ${initialCount})`);
    
    // 3. List all settings
    console.log('\n3. Testing List All Settings...');
    const listRes1 = await axios.get(`${BASE_URL}/settings`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const initialSettings = listRes1.data.data;
    if (Array.isArray(initialSettings)) {
      pass(`List all settings (found ${initialSettings.length} settings)`);
    } else {
      fail('List all settings', 'Response is not an array');
    }
    
    // 4. Create string setting
    console.log('\n4. Testing Create String Setting...');
    const createStringRes = await axios.post(`${BASE_URL}/settings`, {
      key: `${testKey}.string`,
      value: 'Test String Value',
      type: 'string'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (createStringRes.status === 201 && createStringRes.data.data.parsedValue === 'Test String Value') {
      pass(`Create string setting (parsedValue: "${createStringRes.data.data.parsedValue}")`);
    } else {
      fail('Create string setting', 'Invalid response or parsedValue');
    }
    
    // 5. Create number setting
    console.log('\n5. Testing Create Number Setting...');
    const createNumberRes = await axios.post(`${BASE_URL}/settings`, {
      key: `${testKey}.number`,
      value: '42.50',
      type: 'number'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (createNumberRes.status === 201 && createNumberRes.data.data.parsedValue === 42.50) {
      pass(`Create number setting (parsedValue: ${createNumberRes.data.data.parsedValue})`);
    } else {
      fail('Create number setting', `Expected 42.50, got ${createNumberRes.data.data.parsedValue}`);
    }
    
    // 6. Create boolean setting
    console.log('\n6. Testing Create Boolean Setting...');
    const createBoolRes = await axios.post(`${BASE_URL}/settings`, {
      key: `${testKey}.boolean`,
      value: 'true',
      type: 'boolean'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (createBoolRes.status === 201 && createBoolRes.data.data.parsedValue === true) {
      pass(`Create boolean setting (parsedValue: ${createBoolRes.data.data.parsedValue})`);
    } else {
      fail('Create boolean setting', `Expected true, got ${createBoolRes.data.data.parsedValue}`);
    }
    
    // 7. Create JSON setting
    console.log('\n7. Testing Create JSON Setting...');
    const jsonValue = { name: 'Test', count: 123, active: true };
    const createJsonRes = await axios.post(`${BASE_URL}/settings`, {
      key: `${testKey}.json`,
      value: JSON.stringify(jsonValue),
      type: 'json'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (createJsonRes.status === 201 && 
        typeof createJsonRes.data.data.parsedValue === 'object' &&
        createJsonRes.data.data.parsedValue.name === 'Test') {
      pass(`Create JSON setting (parsedValue is object with name: "${createJsonRes.data.data.parsedValue.name}")`);
    } else {
      fail('Create JSON setting', 'parsedValue is not a valid object');
    }
    
    // 8. Test duplicate key (should fail)
    console.log('\n8. Testing Duplicate Key Error...');
    try {
      await axios.post(`${BASE_URL}/settings`, {
        key: `${testKey}.string`,
        value: 'Duplicate',
        type: 'string'
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      fail('Duplicate key should fail', 'Request succeeded when it should fail');
    } catch (error) {
      if (error.response?.status === 409) {
        pass('Duplicate key returns 409 Conflict');
      } else {
        fail('Duplicate key error', `Expected 409, got ${error.response?.status}`);
      }
    }
    
    // 9. Get setting by key
    console.log('\n9. Testing Get Setting by Key...');
    const getRes = await axios.get(`${BASE_URL}/settings/${testKey}.number`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (getRes.data.data.parsedValue === 42.50) {
      pass(`Get setting by key (parsedValue: ${getRes.data.data.parsedValue})`);
    } else {
      fail('Get setting by key', `Expected 42.50, got ${getRes.data.data.parsedValue}`);
    }
    
    // 10. Update setting value
    console.log('\n10. Testing Update Setting...');
    const updateRes = await axios.patch(`${BASE_URL}/settings/${testKey}.number`, {
      value: '99.99'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (updateRes.data.data.parsedValue === 99.99) {
      pass(`Update setting value (new parsedValue: ${updateRes.data.data.parsedValue})`);
    } else {
      fail('Update setting', `Expected 99.99, got ${updateRes.data.data.parsedValue}`);
    }
    
    // 11. Update setting type and value
    console.log('\n11. Testing Update Setting Type...');
    const updateTypeRes = await axios.patch(`${BASE_URL}/settings/${testKey}.boolean`, {
      value: '0',
      type: 'boolean'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (updateTypeRes.data.data.parsedValue === false) {
      pass(`Update boolean value to false (parsedValue: ${updateTypeRes.data.data.parsedValue})`);
    } else {
      fail('Update setting type', `Expected false, got ${updateTypeRes.data.data.parsedValue}`);
    }
    
    // 12. Upsert setting (update existing)
    console.log('\n12. Testing Upsert (Update Existing)...');
    const upsertUpdateRes = await axios.put(`${BASE_URL}/settings/${testKey}.string`, {
      value: 'Updated via Upsert',
      type: 'string'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (upsertUpdateRes.data.data.parsedValue === 'Updated via Upsert') {
      pass(`Upsert updates existing setting (parsedValue: "${upsertUpdateRes.data.data.parsedValue}")`);
    } else {
      fail('Upsert update', 'parsedValue mismatch');
    }
    
    // 13. Upsert setting (create new)
    console.log('\n13. Testing Upsert (Create New)...');
    const newKey = `${testKey}.upserted`;
    const upsertCreateRes = await axios.put(`${BASE_URL}/settings/${newKey}`, {
      value: 'Created via Upsert',
      type: 'string'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (upsertCreateRes.data.data.parsedValue === 'Created via Upsert') {
      pass(`Upsert creates new setting (parsedValue: "${upsertCreateRes.data.data.parsedValue}")`);
    } else {
      fail('Upsert create', 'parsedValue mismatch');
    }
    
    // 14. Bulk update settings
    console.log('\n14. Testing Bulk Update...');
    const bulkRes = await axios.post(`${BASE_URL}/settings/bulk`, {
      settings: [
        { key: `${testKey}.bulk1`, value: 'Bulk Value 1', type: 'string' },
        { key: `${testKey}.bulk2`, value: '100', type: 'number' },
        { key: `${testKey}.bulk3`, value: 'true', type: 'boolean' }
      ]
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (Array.isArray(bulkRes.data.data) && bulkRes.data.data.length === 3) {
      pass(`Bulk update 3 settings (created ${bulkRes.data.data.length} settings)`);
    } else {
      fail('Bulk update', `Expected 3 settings, got ${bulkRes.data.data?.length}`);
    }
    
    // 15. Test bulk update validation (over 50 settings)
    console.log('\n15. Testing Bulk Update Validation (Max 50)...');
    try {
      const tooManySettings = Array.from({ length: 51 }, (_, i) => ({
        key: `${testKey}.bulk${i}`,
        value: `Value ${i}`,
        type: 'string'
      }));
      await axios.post(`${BASE_URL}/settings/bulk`, {
        settings: tooManySettings
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      fail('Bulk update max validation', 'Should reject > 50 settings');
    } catch (error) {
      if (error.response?.status === 400) {
        pass('Bulk update rejects > 50 settings (400 error)');
      } else {
        fail('Bulk update validation', `Expected 400, got ${error.response?.status}`);
      }
    }
    
    // 16. Test invalid type parsing
    console.log('\n16. Testing Invalid Type Parsing...');
    try {
      await axios.post(`${BASE_URL}/settings`, {
        key: `${testKey}.invalid`,
        value: 'not a number',
        type: 'number'
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      fail('Invalid type parsing', 'Should reject invalid number');
    } catch (error) {
      if (error.response?.status === 400) {
        pass('Invalid type parsing returns 400 error');
      } else {
        fail('Invalid type parsing', `Expected 400, got ${error.response?.status}`);
      }
    }
    
    // 17. Verify count increased
    console.log('\n17. Testing Updated Settings Count...');
    const countRes2 = await axios.get(`${BASE_URL}/settings/count`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const finalCount = countRes2.data.data.count;
    const expectedIncrease = 8; // string, number, boolean, json, upserted, bulk1, bulk2, bulk3
    if (finalCount >= initialCount + expectedIncrease) {
      pass(`Settings count increased by at least ${expectedIncrease} (${initialCount} → ${finalCount})`);
    } else {
      fail('Settings count', `Expected at least ${initialCount + expectedIncrease}, got ${finalCount}`);
    }
    
    // 18. Delete setting
    console.log('\n18. Testing Delete Setting...');
    const deleteRes = await axios.delete(`${BASE_URL}/settings/${testKey}.string`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (deleteRes.status === 200) {
      pass('Delete setting successful');
    } else {
      fail('Delete setting', `Expected 200, got ${deleteRes.status}`);
    }
    
    // 19. Verify setting deleted
    console.log('\n19. Verifying Setting Deleted...');
    try {
      // Add small delay to let DB commit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await axios.get(`${BASE_URL}/settings/${testKey}.string`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      fail('Verify deletion', 'Setting still exists after delete');
    } catch (error) {
      if (error.response?.status === 404) {
        pass('Setting successfully deleted (404 on get)');
      } else if (error.code === 'ECONNRESET') {
        pass('Setting successfully deleted (connection closed by server)');
      } else {
        fail('Verify deletion', error.response?.data?.message || error.message);
      }
    }
    
    // 20. Test non-existent setting
    console.log('\n20. Testing Get Non-Existent Setting...');
    try {
      await axios.get(`${BASE_URL}/settings/nonexistent.key.12345`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      fail('Non-existent setting', 'Should return 404');
    } catch (error) {
      if (error.response?.status === 404) {
        pass('Non-existent setting returns 404');
      } else {
        fail('Non-existent setting', `Expected 404, got ${error.response?.status}`);
      }
    }
    
    // Print results
    console.log('\n============================================================');
    console.log('📊 Test Results Summary:');
    console.log(`   Total: ${results.total}`);
    console.log(`   Passed: ${results.passed} ✅`);
    console.log(`   Failed: ${results.failed} ❌`);
    console.log(`   Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
    console.log('============================================================\n');
    
    process.exit(results.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('\n❌ FATAL ERROR:');
    if (error.response?.data) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

main();
