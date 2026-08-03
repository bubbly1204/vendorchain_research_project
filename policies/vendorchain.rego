package vendorchain

import future.keywords.if
import future.keywords.in

# ============================================================
# DEFAULT RULES
# Everything is denied by default unless explicitly allowed
# ============================================================

default allow = false
default risk_level = "unknown"

# ============================================================
# MAIN ALLOW RULE
# A submission is allowed ONLY if there are zero denial reasons
# ============================================================

allow if {
    count(deny) == 0
}

# ============================================================
# DENIAL RULES
# Each rule adds a reason to the deny set if its condition is true
# The submission is blocked if deny has even one entry
# ============================================================

# Rule 1: SBOM must exist and not be empty
deny[reason] if {
    not input.sbom
    reason := "SBOM is missing from the submission"
}

deny[reason] if {
    input.sbom
    not input.sbom.components
    reason := "SBOM has no components listed - file may be corrupt or empty"
}

# Rule 2: SBOM must have a minimum number of components
deny[reason] if {
    input.sbom.components
    count(input.sbom.components) < 3
    reason := sprintf(
        "SBOM has only %v components - minimum required is 3. SBOM may be incomplete.",
        [count(input.sbom.components)]
    )
}

# Rule 3: SBOM must have valid metadata
deny[reason] if {
    not input.sbom.metadata
    reason := "SBOM is missing metadata section - CycloneDX format may be invalid"
}

deny[reason] if {
    not input.sbom.metadata.component
    reason := "SBOM metadata does not identify the root component"
}

# Rule 4: cosign verification must have passed
deny[reason] if {
    not input.signature_verified
    reason := "cosign signature verification failed - SBOM may have been tampered with"
}

# Rule 5: Vendor certificate must be approved
deny[reason] if {
    input.vendor_certificate_status != "approved"
    reason := sprintf(
        "Vendor certificate status is '%v' - must be 'approved' before submission",
        [input.vendor_certificate_status]
    )
}

# Rule 6: SBOM must use the correct format
deny[reason] if {
    input.sbom.bomFormat != "CycloneDX"
    reason := sprintf(
        "SBOM format is '%v' - VendorChain requires CycloneDX format",
        [input.sbom.bomFormat]
    )
}

# Rule 7: Check for explicitly banned packages
deny[reason] if {
    some component in input.sbom.components
    component.name in banned_packages
    reason := sprintf(
        "Banned package detected: '%v' - this package is not permitted in vendor submissions",
        [component.name]
    )
}

# Rule 8: Block suspiciously old lodash versions (known vulnerabilities)
deny[reason] if {
    some component in input.sbom.components
    component.name == "lodash"
    component.version < "4.17.21"
    reason := sprintf(
        "Vulnerable lodash version detected: %v - minimum safe version is 4.17.21",
        [component.version]
    )
}

# ============================================================
# BANNED PACKAGES LIST
# Add any package names you want to always block
# ============================================================

banned_packages := {
    "malware-package",
    "test-virus",
    "cryptominer",
    "keylogger"
}

# ============================================================
# RISK LEVEL CALCULATION
# Gives an overall risk label based on component count
# ============================================================

risk_level := "low" if {
    allow
    count(input.sbom.components) >= 50
}

risk_level := "medium" if {
    allow
    count(input.sbom.components) >= 20
    count(input.sbom.components) < 50
}

risk_level := "low" if {
    allow
    count(input.sbom.components) < 20
}

# ============================================================
# SUMMARY OUTPUT
# This is what gets returned to the pipeline
# ============================================================

summary := {
    "allow": allow,
    "risk_level": risk_level,
    "denial_reasons": deny,
    "component_count": count(object.get(input, ["sbom", "components"], [])),
    "vendor_id": input.vendor_id,
    "sbom_hash": input.sbom_hash,
    "evaluated_at": input.timestamp
}