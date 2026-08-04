'use strict';

require('dotenv').config({ path: '../.env' });

const {
  registerVendorOnChain,
  queryVendorFromChain,
  recordComplianceOnChain,
  recordPurchaseOnChain,
  getAuditHistoryFromChain
} = require('./fabric-service/blockchain-service');

async function runTests() {
  console.log('\n================================================');
  console.log('   VendorChain Blockchain Service Tests');
  console.log('================================================\n');

  try {
    // Test 1: Register a vendor
    console.log('Test 1: Registering vendor on blockchain...');
    const reg = await registerVendorOnChain(
      'vendor_test_001',
      'TestCorp Industries',
      'TestCorp Pvt Ltd',
      true
    );
    console.log('  ✓', reg.message);

    // Test 2: Query the vendor back
    console.log('\nTest 2: Querying vendor from blockchain...');
    const vendor = await queryVendorFromChain('vendor_test_001');
    console.log('  ✓ Vendor found on blockchain:');
    console.log('    VendorID  :', vendor.vendorID);
    console.log('    Name      :', vendor.name);
    console.log('    Company   :', vendor.company);
    console.log('    Certified :', vendor.certified);
    console.log('    Timestamp :', vendor.timestamp);

    // Test 3: Record a compliance result
    console.log('\nTest 3: Recording compliance result...');
    const compliance = await recordComplianceOnChain(
      'vendor_test_001',
      'abc123sbomhash456def789',
      'PASS',
      'low'
    );
    console.log('  ✓', compliance.message);
    console.log('    Record ID :', compliance.recordId);

    // Test 4: Record a purchase
    console.log('\nTest 4: Recording customer purchase...');
    const purchase = await recordPurchaseOnChain(
      'customer_001',
      'product_001',
      'vendor_test_001',
      '99.99'
    );
    console.log('  ✓', purchase.message);
    console.log('    Purchase ID :', purchase.purchaseId);

    // Test 5: Get audit history
    console.log('\nTest 5: Fetching audit history...');
    const history = await getAuditHistoryFromChain('vendor_test_001');
    console.log(`  ✓ Found ${history.length} blockchain history entries`);
    if (history.length > 0) {
      console.log('    Latest TX ID :', history[0].txID);
      console.log('    Timestamp    :', history[0].timestamp);
    }

    console.log('\n================================================');
    console.log('   ALL TESTS PASSED');
    console.log('   VendorChain is fully connected to Fabric');
    console.log('================================================\n');

  } catch (error) {
    console.error('\n✗ TEST FAILED:', error.message);
    console.error('\nTroubleshooting checklist:');
    console.error('  1. Is the Fabric test network running?');
    console.error('     cd ~/fabric-samples/test-network');
    console.error('     ./network.sh up createChannel -ca');
    console.error('  2. Is vendorchain chaincode deployed?');
    console.error('     ./network.sh deployCC -ccn vendorchain -ccp ~/vendorchain-chaincode -ccl go');
    console.error('  3. Are you running this from WSL terminal?');
    process.exit(1);
  }
}

runTests();
