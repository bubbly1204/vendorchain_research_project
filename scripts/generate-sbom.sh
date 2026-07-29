#!/bin/bash

# VendorChain SBOM Generator
# Usage: ./scripts/generate-sbom.sh <path-to-vendor-project>

PROJECT_PATH=${1:-.}
OUTPUT_DIR="outputs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SBOM_FILE="$OUTPUT_DIR/sbom_$TIMESTAMP.json"

echo "Scanning project at: $PROJECT_PATH"
mkdir -p $OUTPUT_DIR

syft $PROJECT_PATH -o cyclonedx-json > $SBOM_FILE

HASH=$(sha256sum $SBOM_FILE | cut -d' ' -f1)

echo "SBOM generated: $SBOM_FILE"
echo "SBOM SHA256 hash: $HASH"
echo $HASH > $OUTPUT_DIR/sbom_hash.txt

echo "Done."
