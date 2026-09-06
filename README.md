# 🛡️ VendorChain — Zero-Trust OS

```
╔═══════════════════════════════════════════════════════════════════════════════════╗
║  "Never Trust. Always Verify. Continuously Monitor."                              ║
║  Enterprise B2B Vendor Verification & Cryptographic Supply Chain Integrity        ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
```

> **Framework:** Next.js 14 & Vite 5  |  **Language:** TypeScript (Strict)  |  **Storage:** PostgreSQL 15 & Redis 7  |  **Tests:** 44/44 Green  |  **License:** MIT

---
Obsididan URL : [obsidian://open?vault=Bruce&file=Block%20Chain%20-%20Security%2FVendor%20Chain.canvas](url)

## ⚡ 1. Problem → Answer

**The Vulnerability of Assumed Trust**
Modern B2B software supply chains operate on blind faith. Vendors upload unauthenticated tax certificates, sensitive permanent account numbers (PANs) reside unencrypted in object storage, and internal platform administrators possess unrestricted, unaudited access to raw identity files. A single forged document or insider breach compromises the entire enterprise perimeter.

**The Zero-Trust Architecture**
VendorChain terminates assumed trust at the intake perimeter:
- 🔒 **Cryptographic Ingestion**: Files are inspected by raw magic byte signatures, encrypted via dedicated AES-256-GCM envelope keys before touching disk, and cross-referenced against official credentials using in-memory OCR extraction.
- 📐 **Deterministic Validation**: Verification executes mathematically via the Indian GSTIN Luhn Mod-36 algorithm inside an asynchronous queue with automatic retries and dead-letter fault isolation.
- 📜 **Immutable Accountability**: Every state transition and every decrypted document access appends a non-repudiable, tamper-evident `VerificationEvent` to the audit ledger.

---

## 🎯 2. Problem Statement & Project Scope


<img width="1748" height="663" alt="image" src="https://github.com/user-attachments/assets/d0876eea-f5d1-4c40-9adc-3c91a4cf35a4" />
<img width="1442" height="1009" alt="image" src="https://github.com/user-attachments/assets/f432e7b2-37db-4564-b70a-162343034294" />

## 📂 3. Repository Blueprint

```
landing-page-/
├── 🌐 index.html                 # Dark Web3 Landing Page (Strict CSP, 0 Inline Styles)
├── 🛑 404.html                   # Zero-Trust Error Recovery Route
├── 🎨 css/style.css              # Design System Tokens (--bg: #050507, --blue: #00E5FF)
├── ⚡ js/app.js                  # Labeled DEMO Verifier & Early Access Capture Pipeline
├── 📋 CHANGELOG.md               # Phased Verification Changelog
├── 🔐 SECURITY.md                # Production Headers & CSP Implementation Guide
├── 🖼️ assets/                    # README diagrams (problem-scope.svg, architecture.svg)
└── 🏢 platform/                  # Core Zero-Trust Onboarding Engine (Module 1, Slices 1–3)
    ├── 🐳 docker-compose.yml     # PostgreSQL 15 + Redis 7 + MinIO (S3 Emulation)
    ├── 🗄️ prisma/schema.prisma   # Vendor, Document, and VerificationEvent Schemas
    ├── 🚀 src/app/api/           # Next.js 14 REST API Route Handlers
    ├── 🧩 src/lib/               # Crypto (Envelope/GCM), OCR, Queue, Storage Drivers
    └── 🧪 src/tests/             # 12 Test Suites (44 Comprehensive Tests)
```

---

## 📊 4. Feature Matrix

| Capability | Technical Mechanism | Status |
|---|---|:---:|
| **Vendor Registration** | Zod-validated 15-char GSTIN & 10-char PAN with cross-consistency | `✅ Shipped` |
| **Magic-Byte Gating** | Binary signature inspection (`%PDF-`, `\x89PNG`, `\xFF\xD8\xFF`); blocks `.exe` | `✅ Shipped` |
| **Envelope Encryption** | Unique 256-bit DEK per document, wrapped via 256-bit Master KEK | `✅ Shipped` |
| **Masked-PII Storage** | AES-256-GCM at rest (`iv:tag:ciphertext`); API returns `AB******4F` | `✅ Shipped` |
| **Deterministic Sandbox** | Official Luhn Mod-36 GSTIN check; stamps `evidence.sandbox: true` | `🧪 Sandbox` |
| **Async Queue & DLQ** | BullMQ + Redis queue with concurrency 2, 3 retries, and dead-letter routing | `✅ Shipped` |
| **OCR Forgery Detection** | In-memory text extraction; credential mismatches trigger `FLAGGED` state | `✅ Shipped` |
| **Audited Byte Retrieval** | `GET .../bytes` streams decrypted data and logs an immutable `ADMIN_READ` event | `✅ Shipped` |
| **Actor Attribution** | `ADMIN_KEYS` JSON mapping attributes actions to `admin:<keyName>` | `✅ Shipped` |
| **Fail-Closed Boot Guard** | `NODE_ENV=production` without reachable Redis halts boot immediately | `✅ Shipped` |
| **Landing Honesty Layer** | Explicit `DEMO` badge; zero dead links; strict CSP; zero inline styles | `✅ Shipped` |
| **Live GSTN Integration** | Production Indian Government tax portal API connectors | `🔜 S4 Roadmap` |
| **Enterprise OIDC Provider**| Vendor single sign-on & fine-grained RBAC session management | `🔜 S4 Roadmap` |

---

## 🏗️ 5. System Architecture

```
[ Client / API Request ]
          │
          ▼
   ( Magic-Byte Gate ≤5MB ) ──► [ AES-256-GCM Envelope Encryption ]
                                               │
                                     ( Ciphertext on Disk/S3 )
                                               │
                                   [ BullMQ Asynchronous Queue ]
                                               │
                                               ▼
[ Append-Only VerificationEvent ] ◄── ( RAM Zeroing ) ◄── [ In-Memory Decryption & OCR ]
                                                                 │
                                                    [ GstSandboxAdapter (Mod-36) ]
```

---

## 🔄 6. State Machine & Lifecycle Transitions

### Vendor Verification Lifecycle (7 States)
```
UNVERIFIED ──► [ Doc Upload ] ──► PENDING ──► [ Verify Trigger ] ──► IN_PROGRESS
                                                                          │
         ┌──────────────────────────────┬─────────────────────────────────┴──────────────────────────────┐
         ▼                              ▼                                                                ▼
   [ VERIFIED ]                    [ FAILED ]                                                       [ FLAGGED ]
(All 3 Docs Pass)               (Checksum Mismatch)                                              (OCR Forgery)
```

| Transition | Originating Component | Verified Business Condition |
|---|---|---|
| `UNVERIFIED` → `PENDING` | `POST /api/vendors/:id/documents` | First required identity document successfully ingested. |
| `PENDING` → `IN_PROGRESS` | `POST .../verify` | Asynchronous verification job enqueued in BullMQ. |
| `IN_PROGRESS` → `VERIFIED` | `worker.ts` | All 3 documents (`GST_CERT`, `PAN_CARD`, `BANK_PROOF`) cryptographically verified. |
| `IN_PROGRESS` → `FAILED` | `worker.ts` | Invalid GSTIN checksum or corrupted binary payload. |
| `IN_PROGRESS` → `FLAGGED` | `ocr/extractor.ts` | Extracted document credential does not match registered vendor PAN/GSTIN. |

---

## 🔐 7. Security Architecture & Disclosures

```
[Master KEK (32-byte hex)] ──wraps──► [Document DEK (256-bit)] ──encrypts──► [Ciphertext File]
```
1. **Zero Plaintext at Rest**: PAN numbers and document files are encrypted before database insertion.
2. **Ephemeral Memory Hygiene**: Decrypted buffers live in RAM during verification and are zeroed (`buffer.fill(0)`) in `finally` blocks.
3. **Timing-Safe Authentication**: API key validation uses `crypto.timingSafeEqual` over fixed-length buffers.

> ⚠️ **Honesty Disclosures**:
> - **🧪 Sandbox Mode**: `GstSandboxAdapter` executes official Mod-36 checksums locally and does not query live government servers.
> - **🔑 API Keys**: `x-admin-key` header is a developer placeholder for the Slice 4 OIDC Identity Provider.
> - **📦 S3 Storage**: MinIO container in `docker-compose.yml` provides local S3 API parity for development.

---

## 🚀 8. Quickstart Guide

### Option A: Static Landing Page (Vite)
```bash
npm install
npm run dev # Access UI at http://localhost:5173
```

### Option B: Backend Platform API (Next.js 14)
```bash
cd platform
docker compose up -d # Boot PostgreSQL 15, Redis 7, MinIO
npm install
cp .env.example .env
npm run dev # API live at http://localhost:3001
```

#### Verbatim End-to-End API Walkthrough:
```bash
# 1. Health Verification (Public)
curl -s http://localhost:3001/api/health

# 2. Register Vendor (Returns 201 + Masked PAN)
curl -s -X POST http://localhost:3001/api/vendors \
  -H "Content-Type: application/json" \
  -H "x-admin-key: vc_admin_sec_placeholder_key_32bytes_min" \
  -d '{"legalName":"Acme Defense Labs","gstNumber":"27ABCDE1234F1Z0","panNumber":"ABCDE1234F"}'

# 3. Ingest GST Certificate (Returns 201 + Document ID)
curl -s -X POST http://localhost:3001/api/vendors/<VENDOR_ID>/documents \
  -H "x-admin-key: vc_admin_sec_placeholder_key_32bytes_min" \
  -F "type=GST_CERT" \
  -F "file=@sample.pdf"

# 4. Trigger Asynchronous Verification (Returns 202 Accepted)
curl -s -X POST http://localhost:3001/api/vendors/<VENDOR_ID>/documents/<DOC_ID>/verify \
  -H "x-admin-key: vc_admin_sec_placeholder_key_32bytes_min"

# 5. Audited Byte Retrieval (Streams decrypted PDF + appends ADMIN_READ audit event)
curl -s http://localhost:3001/api/vendors/<VENDOR_ID>/documents/<DOC_ID>/bytes \
  -H "x-admin-key: vc_admin_sec_placeholder_key_32bytes_min" -o verified_document.pdf
```

- **Fail-Closed Production Boot Guard**:
```bash
NODE_ENV=production node -e "require('./src/lib/queue/boot-check.ts')"
# Output: {"level":"fatal","msg":"Production boot failed: Redis connection required for BullMQ queue in production (REDIS_URL missing)"}
```

---

## 📜 10. Audited Work-Order Protocol

| Phase / Milestone | Commit Reference | Focus Area | Verification Result |
|---|---|---|---|
| **Landing Phase 1** | `44677be` | Trust & Integrity Pass | Labeled DEMO verifier; zero dead links. |
| **Landing Phase 2** | `d9f6131` | Conversion Core | Accessible early-access capture form; 0 PII stored. |
| **Landing Phase 3** | `2703e09` | Launch Hardening | Strict CSP meta tag; 0 inline styles; 404 & sitemap. |
| **Module 1 (Slice 1)** | `06a942b` | Secure Foundation | AES-256-GCM envelope intake; magic byte validation. |
| **Module 1 (Slice 2)** | `c76027d` | Async Pipeline | Mod-36 GST sandbox adapter; BullMQ worker & DLQ. |
| **Module 1 (Slice 3)** | `8af6762` | Document Intelligence | OCR forgery detection; audited byte streaming. |

---

## 🛡️ 12. Threat Model & Mitigations

| Threat Vector | Potential Vulnerability | Mitigation Strategy | Implemented In |
|---|---|---|---|
| **T1: Disguised Executables** | Malicious binary disguised as PDF | Strict magic byte signature inspection (`%PDF-`, `\x89PNG`) | `src/lib/crypto/magic-bytes.ts` |
| **T2: Database Breach** | SQL exfiltration leaks plaintext PANs | AES-256-GCM encryption at rest; no plaintext PAN column | `src/lib/crypto/pan-encryption.ts` |
| **T3: Timing Attacks** | Side-channel inspection on API key | `crypto.timingSafeEqual` comparison on fixed-length buffers | `src/lib/auth.ts` |
| **T4: Unauthorized Document Peeking** | Admin views documents without record | Every read stream logs an immutable `ADMIN_READ` event | `api/vendors/.../bytes/route.ts` |
| **T5: Identity Forgery** | Document text differs from vendor PAN | In-memory OCR cross-check flags mismatches to `FLAGGED` | `src/lib/ocr/extractor.ts` |
| **T6: Queue Outage Data Loss** | Production queue fails silently | Fail-closed boot check enforces Redis connection in production | `src/lib/queue/boot-check.ts` |
| **T7: Automated Form Spam** | Bot floods early access form | Honeypot field + 3-second minimum-time-to-submit guard | `js/app.js` |
| **T8: XSS & Script Injection** | Malicious payload injected in DOM | Strict Content Security Policy (`default-src 'self'`) | `index.html` |

---

## 🗺️ 13. Strategic Roadmap

- **Slice 4 (Upcoming)**: Production GSTN & NSDL government API connectors, enterprise OIDC IdP integration.
- **Module 2**: Automated CycloneDX SBOM generation via Syft + Cosign container image signing.
- **Module 3**: Claude AI contextual vulnerability risk scoring (1–10) & OPA Rego policy firewall.
- **Module 4**: Private Hyperledger Fabric immutable audit ledger commit.

---

## ⚖️ 14. License & Disclaimer

- **License**: Distributed under the MIT License.
- **Disclaimer**: This software is an enterprise reference build. The verification engine executes in **Sandbox Mode** using mathematical Luhn Mod-36 validation and does not interact with live Indian Government tax servers.
