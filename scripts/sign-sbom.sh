#!/bin/bash
set -e

# VendorChain SBOM Signer
# Usage: ./scripts/sign-sbom.sh <sbom-file>
# Example: ./scripts/sign-sbom.sh outputs/sbom.json

SBOM_FILE=${1}
KEY_PATH="keys/cosign.key"
BUNDLE_FILE="${SBOM_FILE}.bundle"

if [ -z "$SBOM_FILE" ]; then
  echo "Error: Please provide the SBOM file path"
  echo "Usage: ./scripts/sign-sbom.sh outputs/sbom.json"
  exit 1
fi

if [ ! -f "$SBOM_FILE" ]; then
  echo "Error: SBOM file not found at $SBOM_FILE"
  exit 1
fi

if [ ! -f "$KEY_PATH" ]; then
  echo "Error: Private key not found at $KEY_PATH"
  exit 1
fi

echo "Signing SBOM: $SBOM_FILE"
cosign sign-blob \
  --key $KEY_PATH \
  --bundle $BUNDLE_FILE \
  --new-bundle-format \
  $SBOM_FILE

echo "Signature bundle saved: $BUNDLE_FILE"
echo "Done. Your SBOM is now digitally stamped."
