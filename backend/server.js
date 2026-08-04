'use strict';

require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const {
  registerVendorOnChain,
  queryVendorFromChain,
  recordComplianceOnChain,
  recordPurchaseOnChain,
  getAuditHistoryFromChain
} = require('./fabric-service/blockchain-service');

const app = express();
const PORT = process.env.PORT || 3001;

// Supabase admin client (bypasses RLS for backend operations)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.use(cors());
app.use(express.json());

// ── HEALTH CHECK ─────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'running',
    service: 'VendorChain Backend API',
    timestamp: new Date().toISOString()
  });
});

// ── VENDOR ROUTES ─────────────────────────────────────────────

// Register vendor on blockchain and update Supabase
app.post('/api/vendor/register', async (req, res) => {
  try {
    const { vendorId, name, company, certified, profileId } = req.body;

    if (!vendorId || !name || !company) {
      return res.status(400).json({
        error: 'vendorId, name, and company are required'
      });
    }

    // Write to blockchain first
    const blockchainResult = await registerVendorOnChain(
      vendorId, name, company, certified ?? true
    );

    // Update vendor record in Supabase
    if (profileId) {
      const { error } = await supabase
        .from('vendors')
        .update({ certificate_status: 'approved' })
        .eq('profile_id', profileId);

      if (error) console.error('Supabase vendor update error:', error.message);
    }

    res.json({
      success: true,
      blockchain: blockchainResult,
      message: 'Vendor registered on blockchain successfully'
    });
  } catch (error) {
    console.error('POST /api/vendor/register error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Query vendor from blockchain
app.get('/api/vendor/:vendorId', async (req, res) => {
  try {
    const vendor = await queryVendorFromChain(req.params.vendorId);
    res.json({ success: true, vendor });
  } catch (error) {
    console.error('GET /api/vendor/:id error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── COMPLIANCE ROUTES ─────────────────────────────────────────

// Record OPA compliance result on blockchain + update Supabase
app.post('/api/compliance/record', async (req, res) => {
  try {
    const { vendorId, sbomHash, opaResult, riskLevel, submissionId } = req.body;

    if (!vendorId || !sbomHash || !opaResult) {
      return res.status(400).json({
        error: 'vendorId, sbomHash, and opaResult are required'
      });
    }

    // Write to blockchain
    const blockchainResult = await recordComplianceOnChain(
      vendorId, sbomHash, opaResult, riskLevel
    );

    // Update submission in Supabase with blockchain record ID
    if (submissionId) {
      const { error } = await supabase
        .from('submissions')
        .update({
          blockchain_tx_id: blockchainResult.recordId,
          opa_result: opaResult,
          risk_level: riskLevel
        })
        .eq('id', submissionId);

      if (error) console.error('Supabase submission update error:', error.message);

      // If compliance passed, mark the product as compliant
      if (opaResult === 'PASS') {
        const { data: submission } = await supabase
          .from('submissions')
          .select('product_id')
          .eq('id', submissionId)
          .single();

        if (submission?.product_id) {
          await supabase
            .from('products')
            .update({
              status: 'compliant',
              blockchain_tx_id: blockchainResult.recordId
            })
            .eq('id', submission.product_id);
        }
      }
    }

    res.json({
      success: true,
      blockchain: blockchainResult,
      message: `Compliance result ${opaResult} recorded permanently on blockchain`
    });
  } catch (error) {
    console.error('POST /api/compliance/record error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── PURCHASE ROUTES ───────────────────────────────────────────

// Record a customer purchase on blockchain + update Supabase
app.post('/api/purchase/record', async (req, res) => {
  try {
    const { customerId, productId, vendorId, amount, supabasePurchaseId } = req.body;

    if (!customerId || !productId || !vendorId || !amount) {
      return res.status(400).json({
        error: 'customerId, productId, vendorId, and amount are required'
      });
    }

    // Write to blockchain
    const blockchainResult = await recordPurchaseOnChain(
      customerId, productId, vendorId, amount
    );

    // Update purchase in Supabase with blockchain purchase ID
    if (supabasePurchaseId) {
      const { error } = await supabase
        .from('purchases')
        .update({ blockchain_tx_id: blockchainResult.purchaseId })
        .eq('id', supabasePurchaseId);

      if (error) console.error('Supabase purchase update error:', error.message);
    }

    res.json({
      success: true,
      blockchain: blockchainResult,
      message: 'Purchase permanently recorded on blockchain'
    });
  } catch (error) {
    console.error('POST /api/purchase/record error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── AUDIT ROUTES ──────────────────────────────────────────────

// Get full audit trail for any key from the blockchain
app.get('/api/audit/:key', async (req, res) => {
  try {
    const history = await getAuditHistoryFromChain(req.params.key);
    res.json({ success: true, history });
  } catch (error) {
    console.error('GET /api/audit/:key error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── START SERVER ──────────────────────────────────────────────

app.listen(PORT, () => {
  console.log('\n================================================');
  console.log(`   VendorChain Backend API`);
  console.log('================================================');
  console.log(`   Running on  : http://localhost:${PORT}`);
  console.log(`   Health      : http://localhost:${PORT}/health`);
  console.log(`   Vendor API  : http://localhost:${PORT}/api/vendor`);
  console.log(`   Compliance  : http://localhost:${PORT}/api/compliance`);
  console.log(`   Purchase    : http://localhost:${PORT}/api/purchase`);
  console.log(`   Audit       : http://localhost:${PORT}/api/audit`);
  console.log('================================================\n');
});

module.exports = app;
