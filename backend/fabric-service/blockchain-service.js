'use strict';

const { connectToFabric, channelName, chaincodeName } = require('./connection');
const { TextDecoder } = require('util');
const crypto = require('crypto');

const utf8Decoder = new TextDecoder();

// Generates a unique ID like "compliance_1722076800000_a3f2bc91"
function generateId(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

// ── VENDOR FUNCTIONS ────────────────────────────────────────

async function registerVendorOnChain(vendorId, name, company, certified) {
  const { gateway, client } = await connectToFabric();
  try {
    const network = gateway.getNetwork(channelName);
    const contract = network.getContract(chaincodeName);

    await contract.submitTransaction(
      'RegisterVendor',
      vendorId,
      name,
      company,
      String(certified)
    );

    console.log(`✓ Vendor ${vendorId} registered on blockchain`);
    return {
      success: true,
      vendorId,
      message: `Vendor ${name} from ${company} registered permanently on blockchain`
    };
  } catch (error) {
    throw new Error(`Blockchain RegisterVendor failed: ${error.message}`);
  } finally {
    gateway.close();
    client.close();
  }
}

async function queryVendorFromChain(vendorId) {
  const { gateway, client } = await connectToFabric();
  try {
    const network = gateway.getNetwork(channelName);
    const contract = network.getContract(chaincodeName);

    const result = await contract.evaluateTransaction('QueryVendor', vendorId);
    const vendor = JSON.parse(utf8Decoder.decode(result));

    console.log(`✓ Vendor ${vendorId} queried from blockchain`);
    return vendor;
  } catch (error) {
    throw new Error(`Blockchain QueryVendor failed: ${error.message}`);
  } finally {
    gateway.close();
    client.close();
  }
}

// ── COMPLIANCE FUNCTIONS ─────────────────────────────────────

async function recordComplianceOnChain(vendorId, sbomHash, opaResult, riskLevel) {
  const { gateway, client } = await connectToFabric();
  try {
    const network = gateway.getNetwork(channelName);
    const contract = network.getContract(chaincodeName);

    const recordId = generateId('compliance');

    // aiRiskScore is 0 since we are not using AI in this project
    await contract.submitTransaction(
      'RecordCompliance',
      recordId,
      vendorId,
      sbomHash,
      opaResult,
      '0'
    );

    console.log(`✓ Compliance result ${opaResult} for ${vendorId} recorded on blockchain`);
    return {
      success: true,
      recordId,
      vendorId,
      opaResult,
      sbomHash,
      message: `Compliance result ${opaResult} permanently recorded on blockchain`
    };
  } catch (error) {
    throw new Error(`Blockchain RecordCompliance failed: ${error.message}`);
  } finally {
    gateway.close();
    client.close();
  }
}

// ── PURCHASE FUNCTIONS ───────────────────────────────────────

async function recordPurchaseOnChain(customerId, productId, vendorId, amount) {
  const { gateway, client } = await connectToFabric();
  try {
    const network = gateway.getNetwork(channelName);
    const contract = network.getContract(chaincodeName);

    const purchaseId = generateId('purchase');

    await contract.submitTransaction(
      'RecordPurchase',
      purchaseId,
      customerId,
      productId,
      vendorId,
      String(amount)
    );

    console.log(`✓ Purchase ${purchaseId} recorded on blockchain`);
    return {
      success: true,
      purchaseId,
      customerId,
      productId,
      amount,
      message: 'Purchase permanently recorded on blockchain'
    };
  } catch (error) {
    throw new Error(`Blockchain RecordPurchase failed: ${error.message}`);
  } finally {
    gateway.close();
    client.close();
  }
}

// ── AUDIT FUNCTIONS ──────────────────────────────────────────

async function getAuditHistoryFromChain(key) {
  const { gateway, client } = await connectToFabric();
  try {
    const network = gateway.getNetwork(channelName);
    const contract = network.getContract(chaincodeName);

    const result = await contract.evaluateTransaction('GetAuditHistory', key);
    const history = JSON.parse(utf8Decoder.decode(result));

    console.log(`✓ Audit history for ${key} retrieved — ${history.length} entries`);
    return history;
  } catch (error) {
    throw new Error(`Blockchain GetAuditHistory failed: ${error.message}`);
  } finally {
    gateway.close();
    client.close();
  }
}

module.exports = {
  registerVendorOnChain,
  queryVendorFromChain,
  recordComplianceOnChain,
  recordPurchaseOnChain,
  getAuditHistoryFromChain
};
