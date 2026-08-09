```markdown
# VendorChain — Zero-Trust OS (v1.0.0)

> **"Never Trust. Always Verify. Continuously Monitor."**  
> `Next.js 14` · `TypeScript Strict` · `Vite 5` · `PostgreSQL 15` · `Redis 7` · `44 Tests (100% Green)` · `MIT License`

---

## 1. Problem → Answer

Traditional B2B vendor onboarding relies on static, assumed trust: vendors upload unverified certificates, sensitive tax credentials sit in plaintext across S3 buckets, and internal administrators possess unchecked, unaudited read access. A single forged document or compromised credential breaches the entire supply chain.

VendorChain enforces Zero-Trust at the exact boundary of intake:
1. **Never Trust**: Documents are validated by magic byte headers, encrypted via AES-256-GCM envelope keys before touching disk, and cross-checked against registered credentials using in-memory OCR.
2. **Always Verify**: Verification is deterministic (Luhn Mod-36 GSTIN algorithm), running through an asynchronous queue with automatic retries and dead-letter routing.
3. **Continuously Monitor**: Every state transition and every decrypted byte access is permanently logged as an immutable, append-only `VerificationEvent`.

---

## 2. What's Inside

landing-page-/
├── index.html                # Static Vite landing (CSP enabled, DEMO verifier, accessible capture form)
├── 404.html                  # Branded Zero-Trust error recovery route
├── css/style.css             # Dark premium tokens (--bg #050507, --blue #00E5FF, 0 inline styles)
├── js/app.js                 # Verifier sandbox & early-access submission pipeline
├── CHANGELOG.md              # Landing hardening log with verification proofs
├── SECURITY.md               # Production host headers & CSP checklist
└── platform/                 # Zero-Trust Onboarding Engine (Module 1, Slices 1–3)
    ├── docker-compose.yml    # PostgreSQL 15 + Redis 7 + MinIO (local S3 dev emulation)
    ├── prisma/schema.prisma  # Vendor, Document, VerificationEvent models
    ├── src/app/api/          # Next.js 14 App Router API endpoints
    ├── src/lib/              # Crypto (AES-256-GCM), StorageDriver, OCR, Queue (BullMQ)
    └── src/tests/            # 12 test suites (44 tests, 100% passing)

---

## 3. Feature Matrix

| Feature | Description | Status |
|---|---|---|
| **Vendor Registration** | Zod-validated 15-char GSTIN & 10-char PAN intake with cross-consistency checks. | ✅ Shipped |
| **Magic-Byte Gating** | Rejects renamed executables (`.exe-as-.pdf`); validates `%PDF-`, `\x89PNG`, `\xFF\xD8\xFF`. | ✅ Shipped |
| **Envelope Encryption** | Random 256-bit DEK per doc, wrapped with 256-bit Master KEK via AES-256-GCM. | ✅ Shipped |
| **Masked-PII Reads** | PAN encrypted at rest (`iv:tag:ciphertext`); API returns `AB******4F`. | ✅ Shipped |
| **Deterministic Sandbox** | Official Luhn Mod-36 GST checksum validation; stamps `evidence.sandbox: true`. | 🧪 Sandbox |
| **Async Queue & DLQ** | BullMQ + Redis queue with concurrency 2, 3 exponential retries, and DLQ routing. | ✅ Shipped |
| **OCR Forgery Detection** | In-memory text extraction; credential mismatches trigger `FLAGGED` state. | ✅ Shipped |
| **Audited Byte Retrieval** | `GET .../bytes` streams decrypted data and appends an immutable `ADMIN_READ` event. | ✅ Shipped |
| **Multi-Actor Attribution** | `ADMIN_KEYS` JSON mapping attributes actions to `admin:<keyName>` (never logs key). | ✅ Shipped |
| **Fail-Closed Boot Guard** | `NODE_ENV=production` without reachable Redis halts boot immediately. | ✅ Shipped |
| **Landing Honesty Layer** | Explicit `DEMO` verifier badge; zero dead links; strict CSP; zero inline styles. | ✅ Shipped |
| **Live GSTN Integration** | Direct government e-Way / GSTN portal integration. | 🔜 Roadmap (S4) |
| **Full OIDC Provider** | Vendor SSO and fine-grained RBAC session management. | 🔜 Roadmap (S4) |

---

## 4. Architecture

[Client / API] ──► ( Magic-Byte Gating ≤5MB ) ──► [ AES-256-GCM Envelope Encryption ]
                                                                 │
                                                       ( Ciphertext on Disk/S3 )
                                                                 │
                                                     [ BullMQ Async Queue ]
                                                                 │
                                                                 ▼
[ VerificationEvent (Append-Only) ] ◄── ( RAM Zeroing ) ◄── [ In-Memory Decrypt & OCR ]
                                                                 │
                                                    [ GstSandboxAdapter (Mod-36) ]

---

## 5. State Machines

### VendorStatus (7 States)
UNVERIFIED ──(Doc Upload)──► PENDING ──(Verify Trigger)──► IN_PROGRESS
                                                               │
        ┌──────────────────────┬───────────────────────────────┴──────────────────────────────┐
        ▼                      ▼                                                               ▼
   [ VERIFIED ]           [ FAILED ]                                                     [ FLAGGED ]
(All 3 Docs Pass)      (Adapter Rejection)                                            (OCR Mismatch)

### DocumentStatus (5 States)
`STORED` ──► `PENDING` ──► `VERIFIED` | `REJECTED` | `FLAGGED`

| Transition | Component / Trigger | Reason |
|---|---|---|
| `UNVERIFIED` → `PENDING` | `POST /api/vendors/:id/documents` | First identity document uploaded. |
| `PENDING` → `IN_PROGRESS` | `POST .../verify` | Verification job enqueued in BullMQ. |
| `IN_PROGRESS` → `VERIFIED` | `worker.ts` | All 3 docs (`GST_CERT`, `PAN_CARD`, `BANK_PROOF`) verified. |
| `IN_PROGRESS` → `FAILED` | `worker.ts` | Invalid GST checksum or corrupted payload. |
| `IN_PROGRESS` → `FLAGGED` | `ocr/extractor.ts` | Extracted document credential does not match registered vendor. |

---

## 6. Security Model & Honesty Disclosures

1. Master KEK (32-byte hex in env) wraps ephemeral DEKs generated per document.
2. Ciphertext, 12-byte IV, and 16-byte GCM tag stored at rest; plaintext never hits disk.
3. Decrypted buffers live in RAM during verification and are zeroed (`buffer.fill(0)`) in finally blocks.
4. PAN is encrypted at rest; zero plaintext columns exist in the database schema.

- **🧪 Sandbox Disclosure**: The `GstSandboxAdapter` deterministically validates Luhn Mod-36 checksums but does **not** call live government servers. Production calls are stubbed in `GstnAdapter`.
- **🔑 Admin Key Placeholder**: `x-admin-key` header with `crypto.timingSafeEqual` is a Slice 1–3 placeholder for full OIDC IdP in Slice 4.
- **📦 S3 Emulation**: `docker-compose.yml` includes MinIO for local S3 API emulation.

---

## 7. Quickstart

### A. Landing Page (Vite)
npm install
npm run dev # http://localhost:5173

### B. Platform API (Next.js 14)
cd platform
docker compose up -d # Boots PostgreSQL 15, Redis 7, MinIO
npm install
cp .env.example .env
npm run dev # http://localhost:3001

#### Step-by-Step API Execution:
# 1. Check health
curl -s http://localhost:3001/api/health

# 2. Register Vendor (Returns 201 + masked PAN)
curl -s -X POST http://localhost:3001/api/vendors \
  -H "Content-Type: application/json" \
  -H "x-admin-key: vc_admin_sec_placeholder_key_32bytes_min" \
  -d '{"legalName":"Acme Defense Labs","gstNumber":"27ABCDE1234F1Z0","panNumber":"ABCDE1234F"}'

# 3. Upload GST Certificate (Returns 201 + Document ID)
curl -s -X POST http://localhost:3001/api/vendors/<VENDOR_ID>/documents \
  -H "x-admin-key: vc_admin_sec_placeholder_key_32bytes_min" \
  -F "type=GST_CERT" \
  -F "file=@sample.pdf"

# 4. Enqueue Verification (Returns 202 Accepted)
curl -s -X POST http://localhost:3001/api/vendors/<VENDOR_ID>/documents/<DOC_ID>/verify \
  -H "x-admin-key: vc_admin_sec_placeholder_key_32bytes_min"

# 5. Audited Byte Retrieval (Returns decrypted stream + logs ADMIN_READ)
curl -s http://localhost:3001/api/vendors/<VENDOR_ID>/documents/<DOC_ID>/bytes \
  -H "x-admin-key: vc_admin_sec_placeholder_key_32bytes_min" -o downloaded.pdf

---

## 8. Proof & Reproducibility

Clean-ref verification guarantees every claim is reproducible on a fresh clone:

rm -rf /tmp/vc-clean && mkdir -p /tmp/vc-clean
git archive HEAD | tar -x -C /tmp/vc-clean
cd /tmp/vc-clean/platform && npm ci && cp .env.example .env
npm test # 12 suites, 44 tests green
npm run build # Compiled successfully (0 errors)

- **Fail-Closed Boot Check**:
NODE_ENV=production node -e "require('./src/lib/queue/boot-check.ts')"
# Output: {"level":"fatal","msg":"Production boot failed: Redis connection required for BullMQ queue in production (REDIS_URL missing)"}

---

## 9. Audited Work-Order Protocol

| Phase / Slice | PR / Commit | Primary Milestone | Verification Proof |
|---|---|---|---|
| **Landing P1** | PR #4 (`44677be`) | Trust & Integrity Pass | Labeled DEMO verifier; zero dead links. |
| **Landing P2** | PR #4 (`d9f6131`) | Conversion Core | Accessible early access capture; 0 PII stored. |
| **Landing P3** | PR #4 (`2703e09`) | Launch Hardening | Strict CSP; 0 inline styles; 404 & sitemap. |
| **Module 1 (S1)** | PR #4 (`06a942b`) | Secure Foundation | AES-256-GCM envelope intake; magic bytes. |
| **Module 1 (S2)** | PR #4 (`c76027d`) | Async Pipeline | Mod-36 GST adapter; BullMQ worker & DLQ. |
| **Module 1 (S3)** | PR #4 (`8af6762`) | Document Intelligence | OCR forgery detection; audited byte stream. |

---

## 10. API Reference

| Method | Route | Guard | Purpose | Status |
|---|---|---|---|---|
| `GET` | `/api/health` | Public | System health & build SHA | ✅ Shipped |
| `POST` | `/api/vendors` | `x-admin-key` | Register vendor with encrypted PAN | ✅ Shipped |
| `GET` | `/api/vendors/:id` | `x-admin-key` | Retrieve vendor metadata with masked PAN | ✅ Shipped |
| `POST` | `/api/vendors/:id/documents` | `x-admin-key` | Magic-byte gated document intake | ✅ Shipped |
| `GET` | `/api/vendors/:id/documents` | `x-admin-key` | List document metadata | ✅ Shipped |
| `POST` | `/api/vendors/:id/documents/:docId/verify` | `x-admin-key` | Trigger async verification job | ✅ Shipped |
| `GET` | `/api/vendors/:id/documents/:docId/bytes` | `x-admin-key` | Audited decrypted byte streaming | ✅ Shipped |
| `GET` | `/api/vendors/:id/verification` | `x-admin-key` | Full audit event timeline | ✅ Shipped |

---

## 11. Threat Model

| Threat | Vulnerability | Mitigation Mechanism | File / Location |
|---|---|---|---|
| **T1: Malicious Executable Intake** | Attacker renames `.exe` to `.pdf`. | Header magic byte signature inspection (`%PDF-`, `\x89PNG`). | `src/lib/crypto/magic-bytes.ts` |
| **T2: Database Credential Leak** | SQL dump exposes plaintext PANs. | AES-256-GCM encryption at rest; schema has no plaintext PAN column. | `src/lib/crypto/pan-encryption.ts` |
| **T3: Timing Attack on Admin Key** | Byte-by-byte timing discrepancy. | `crypto.timingSafeEqual` over fixed-length buffers. | `src/lib/auth.ts` |
| **T4: Insider Snooping on Docs** | Admins view files without record. | Every read stream logs an immutable `ADMIN_READ` event. | `api/vendors/[id]/documents/[docId]/bytes` |
| **T5: Credential Forgery** | Document text differs from vendor PAN. | In-memory OCR cross-check flags mismatches to `FLAGGED`. | `src/lib/ocr/extractor.ts` |
| **T6: Queue Loss in Outage** | Production queue crashes silently. | Fail-closed boot check enforces active Redis in production. | `src/lib/queue/boot-check.ts` |
| **T7: Rapid Bot Submissions** | Automated spam on early access form. | Honeypot field + 3-second minimum-time-to-submit guard. | `js/app.js` |
| **T8: XSS & Resource Injection** | Script injection in landing DOM. | Strict meta Content Security Policy + zero inline scripts. | `index.html` |

---

## 12. Roadmap

- **Slice 4 (Upcoming)**: Live GSTN/NSDL government API connectors, production OIDC IdP provider, image OCR worker.
- **Module 2**: Automated CycloneDX SBOM generation via Syft + Cosign container image signing.
- **Module 3**: Claude AI contextual vulnerability scoring (1–10) & OPA Rego policy firewall.
- **Module 4**: Private Hyperledger Fabric immutable audit ledger commit.

---

## 13. License & Disclaimer

- **License**: Released under the MIT License.
- **Disclaimer**: This is a portfolio reference build. The verification engine runs in **Sandbox Mode** using deterministic Mod-36 checksum mathematical validation and does not submit queries to official Indian tax authorities.
```
