#!/bin/bash

# VendorChain OPA Policy Evaluator
# Usage: ./scripts/evaluate-policy.sh <sbom-file> <vendor-cert-status> <signature-verified> <sbom-hash>

SBOM_FILE=${1}
CERT_STATUS=${2:-"approved"}
SIG_VERIFIED=${3:-"true"}
SBOM_HASH=${4:-""}
POLICY_FILE="policies/vendorchain.rego"
TEMP_INPUT="/tmp/opa_input_$$.json"

if [ ! -f "$SBOM_FILE" ]; then
  echo "Error: SBOM file not found at $SBOM_FILE"
  exit 1
fi

echo "Running VendorChain policy evaluation..."
echo "SBOM File    : $SBOM_FILE"
echo "Cert Status  : $CERT_STATUS"
echo "Sig Verified : $SIG_VERIFIED"
echo ""

# Build the OPA input JSON safely
python3 - << PYEOF
import json, sys, os
from datetime import datetime

with open("$SBOM_FILE", "r") as f:
    sbom_data = json.load(f)

opa_input = {
    "vendor_id": "vendor001",
    "vendor_certificate_status": "$CERT_STATUS",
    "signature_verified": "$SIG_VERIFIED".lower() == "true",
    "sbom_hash": "$SBOM_HASH",
    "timestamp": datetime.utcnow().isoformat() + "Z",
    "sbom": sbom_data
}

with open("$TEMP_INPUT", "w") as f:
    json.dump(opa_input, f, indent=2)

print("Input prepared successfully")
PYEOF

# Run OPA evaluation using raw format
RESULT=$(opa eval \
  --input $TEMP_INPUT \
  --data $POLICY_FILE \
  "data.vendorchain.summary" \
  --format raw)

# Clean up temp file
rm -f $TEMP_INPUT

# Parse result safely from the raw JSON output
ALLOW=$(echo "$RESULT" | python3 -c "import json,sys; data=json.load(sys.stdin); print(data.get('allow', 'False'))" 2>/dev/null)
REASONS=$(echo "$RESULT" | python3 -c "import json,sys; data=json.load(sys.stdin); reasons=data.get('denial_reasons',[]); print('\n'.join(['  - '+r for r in reasons]))" 2>/dev/null)
RISK=$(echo "$RESULT" | python3 -c "import json,sys; data=json.load(sys.stdin); print(data.get('risk_level','unknown'))" 2>/dev/null)
COUNT=$(echo "$RESULT" | python3 -c "import json,sys; data=json.load(sys.stdin); print(data.get('component_count','0'))" 2>/dev/null)

echo "================================================"
echo "   VendorChain OPA Policy Result"
echo "================================================"
echo "Components   : $COUNT"
echo "Risk Level   : $RISK"
echo ""

if [ "$ALLOW" = "True" ]; then
  echo "VERDICT      : ✓ PASS"
  echo "Action       : Submission approved for blockchain recording"
  echo "================================================"
  exit 0
else
  echo "VERDICT      : ✗ FAIL"
  echo "Reasons:"
  echo "$REASONS"
  echo "================================================"
  exit 1
fi
EOF