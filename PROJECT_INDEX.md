# VeritasESG® — Project Index & System Manifest (Phase 2 Upgrade)

> **Real-time state manifest** for VeritasESG® — Autonomous Sustainability Claim & BRSR Audit Platform (Vishwakarandak '26 Sustainability Track SUS-12).

## 🏗️ Multi-Page Architecture & Modules

| Route | Purpose | Component | Features |
|---|---|---|---|
| **`/`** | Home & Platform Overview | `src/app/page.tsx` | Cinematic video hero, value proposition, architecture breakdown |
| **`/directory`** | 20-Company BRSR Index | `src/app/directory/page.tsx` | Search, sector filter chips, credibility grades, 1-click inspect |
| **`/upload`** | **NEW: Direct PDF Upload Studio** | `src/app/upload/page.tsx` | Drag-and-drop PDF upload, Web Search toggle, live 4-step progress |
| **`/auditor`** | Split-Screen Forensic Auditor | `src/app/auditor/page.tsx` | URL param sync (`?companyId=`, `?uploadId=`), PDF canvas, Web Drawer |
| **`/sandbox`** | Ad-Hoc PR & Claim Verifier | `src/app/sandbox/page.tsx` | Arbitrary press release verification console with quick-load demo presets |
| **`/benchmark`** | Accuracy & Confusion Matrix | `src/app/benchmark/page.tsx` | 60 ground-truth claims, 2×2 matrix, Disagreement explorer |

---

## 📁 Updated Source Code Inventory

```
veritas-esg/
├── README.md                                    # Master architecture, pitch, and deployment guide
├── PROJECT_INDEX.md                             # Real-time state index and symbol catalog
├── backend/
│   ├── requirements.txt                         # Python dependencies (+ duckduckgo-search, pymupdf, multipart)
│   ├── veritas_esg.db                           # Pre-seeded SQLite evidence database + uploads
│   ├── uploads/                                 # Storage directory for user-uploaded BRSR PDFs
│   └── app/
│       ├── __init__.py
│       ├── config.py                            # Settings, Pydantic BaseSettings, timeout configs
│       ├── database.py                          # ORM: Company, UploadedReport, BrsrMetric, AuditClaim, BenchmarkItem
│       ├── main.py                              # FastAPI app, StaticFiles mount (/static/uploads), CORS
│       ├── core/
│       │   ├── __init__.py
│       │   ├── engine_factory.py                # Dual-Engine Router (Ollama -> Cloud -> Heuristic)
│       │   ├── ollama_client.py                 # Qwen3-8B local Ollama client (/no_think & /think)
│       │   ├── cloud_fallback.py                # Gemini 2.5 Flash cloud fallback client
│       │   ├── rule_evaluator.py                # Deterministic Python math verifier (Zero-Hallucination)
│       │   ├── pdf_processor.py                 # NEW: PyMuPDF + pdfplumber live table & narrative claim extractor
│       │   ├── pdf_indexer.py                   # Citation lookup, page numbers, bbox coordinates
│       │   └── web_search_agent.py              # NEW: Autonomous Web Search Sub-Agent (DDG + Stance synthesis)
│       ├── routers/
│       │   ├── __init__.py
│       │   ├── companies.py                     # GET /api/companies, /{id}, /{id}/metrics, /{id}/claims
│       │   ├── audits.py                        # POST /api/audits/verify, /verify-single, /{id}/web-verify, /{id}/export
│       │   ├── benchmark.py                     # GET /api/benchmark/metrics, POST /evaluate, /groundtruth
│       │   └── upload.py                        # NEW: POST /api/upload/pdf, GET /api/upload/{upload_id}
│       └── seed_data/
│           ├── companies.json                   # 20 Indian listed companies across 5 sectors
│           ├── sample_brsr_metrics.json         # Audited Principle 6 metrics with page numbers & bbox
│           └── benchmark_groundtruth.json       # 60 expert human annotated claims with ground truth
└── frontend/
    ├── package.json                             # Next.js 15, React 19, Tailwind CSS v4, Lucide
    ├── tsconfig.json                            # Strict TypeScript configuration
    └── src/
        ├── app/
        │   ├── globals.css                      # Tailwind v4, Instrument Serif & Inter fonts
        │   ├── layout.tsx                       # Global RootLayout with persistent Navbar & Footer
        │   ├── page.tsx                         # Multi-page landing portal (`/`)
        │   ├── directory/page.tsx               # 20-Company Directory (`/directory`)
        │   ├── upload/page.tsx                  # NEW: PDF Upload Studio (`/upload`)
        │   ├── auditor/page.tsx                 # Split-Screen Forensic Auditor (`/auditor`)
        │   ├── sandbox/page.tsx                 # Ad-Hoc Sandbox (`/sandbox`)
        │   └── benchmark/page.tsx               # Empirical Accuracy Benchmark (`/benchmark`)
        ├── components/
        │   ├── Navbar.tsx                       # Multi-page Link navigation with active route highlights
        │   ├── HeroSection.tsx                  # Typographic hero with looping cloud video
        │   ├── LeaderboardTable.tsx             # 20-company interactive macro index
        │   ├── SplitAuditor.tsx                 # Dual-panel claims vs official PDF viewer + Web Drawer
        │   ├── PdfHighlighter.tsx               # Simulated PDF document with animated bbox overlay
        │   ├── LiveSandbox.tsx                  # Arbitrary text audit console with judge presets
        │   └── BenchmarkModal.tsx               # 60-item evaluation suite & confusion matrix
        ├── lib/
        │   ├── api.ts                           # Typed fetch client (uploadPdf, runWebVerifyClaim, exportAuditDossier)
        │   └── types.ts                         # Shared TypeScript interfaces (UploadedReport, WebVerificationResult)
        └── styles/
            ├── fonts.css                        # Instrument Serif & Inter Google Fonts imports
            └── theme.css                        # Custom fade-rise keyframes & bounding-box pulse
```

---

## 🗄️ Database Schema Updates (SQLite)

### `uploaded_reports`
- `id` (VARCHAR PK): e.g. `f1ab7cc9`
- `filename` (VARCHAR): Original uploaded PDF name
- `company_name` (VARCHAR): Extracted or user-specified company name
- `file_path` (VARCHAR): Local filesystem path in `backend/uploads/`
- `file_size` (INTEGER): File size in bytes
- `total_pages` (INTEGER): Number of pages in PDF
- `status` (VARCHAR): `processing`, `completed`, `failed`
- `claims_count` (INTEGER): Count of audited claims
- `flags_count` (INTEGER): Count of discrepancy flags raised
- `created_at` (DATETIME): Timestamp

### `audit_claims` (Enhanced Columns)
- `upload_id` (VARCHAR NULLABLE): References `uploaded_reports.id` when audited from custom PDF
- `web_verification_json` (TEXT NULLABLE): Stores JSON payload of `WebVerificationResult` (articles, stances, web summary)

---

## 🔌 Complete API Endpoints Catalog

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/upload/pdf` | Upload custom BRSR PDF, extract tables, audit claims, run web sub-agent |
| `GET` | `/api/upload/{upload_id}` | Retrieve uploaded report metadata, metrics, and claims |
| `POST` | `/api/audits/{claim_id}/web-verify` | On-demand Web Search Sub-Agent execution for a single claim |
| `GET` | `/api/audits/{entity_id}/export` | Export structured JSON/Markdown executive audit dossier |
| `GET` | `/api/health` | Health check and active engine telemetry |
| `GET` | `/api/engine-status` | Current engine mode (`LOCAL`, `CLOUD`, `HEURISTIC`) |
| `GET` | `/api/companies` | List 20 companies with filter chips and credibility grades |
| `GET` | `/api/companies/{id}` | Company metadata & filing statistics |
| `GET` | `/api/companies/{id}/metrics` | All Principle 6 metrics with bbox coordinates |
| `GET` | `/api/companies/{id}/claims` | All audited claims and verdicts for company |
| `POST` | `/api/audits/verify` | Ad-hoc text verification |
| `POST` | `/api/audits/verify-single` | Single claim verification |
| `GET` | `/api/benchmark/groundtruth` | 60 annotated ground-truth claims |
| `POST` | `/api/benchmark/evaluate` | Run benchmark evaluation and generate confusion matrix |
| `GET` | `/api/benchmark/metrics` | Retrieve cached benchmark precision/recall scores |
