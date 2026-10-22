# VerityAI / EntityLocker — Presentation Asset Checklist

**Project:** VerityAI / EntityLocker (Smart India Hackathon 2026, Smart Automation Track)  
**Deliverable:** `docs/submission/VerityAI_SIH_2026_Presentation.pptx`  
**Companion File:** `docs/submission/PRESENTATION_CONTENT.md`  

---

## 1. Presentation Structure & Asset Inventory

The 15-slide PowerPoint pitch deck (`VerityAI_SIH_2026_Presentation.pptx`) incorporates structured visual cards, data tables, color-coded status badges, and architecture blocks. Below is the inventory of visual assets, diagrams, and prototype representations embedded within the presentation:

| Slide # | Slide Title | Visual Type | Assets & Diagrams Included | Source / Implementation Reference | Status |
|---|---|---|---|---|---|
| **Slide 1** | Title & Project Introduction | Brand & Metadata Card | EntityLocker Logo, SIH 2026 Smart Automation banner, Team & Institution Placeholders | `components/brand/EntityLockerLogo.tsx` | `VERIFIED` |
| **Slide 2** | The Regulatory Challenge | Context & Volume Cards | 10,000+ technical institutions statistic, 20–50 document dossier breakdown, statutory calendar timeline | AICTE Approval Process Handbook (APH) | `VERIFIED` |
| **Slide 3** | Existing Operational Pain Points | Problem Diagnosis Grid | 5-card grid: Inconsistency, Cross-Doc Blindspots, Evidence Gaps, Multilingual Barriers, Audit Deficits | `docs/DEMO_SCRIPT.md` Section 1 | `VERIFIED` |
| **Slide 4** | The VerityAI Solution | Solution Architecture Pillars | 5 core capability pillars: Secure Locker, Intelligent OCR, Deterministic Engine, Anomaly Detection, Human Oversight | `AGENTS.md` Section A | `VERIFIED` |
| **Slide 5** | End-to-End Scrutiny Workflow | Multi-Stage Flow Diagram | 8-stage operational pipeline: Intake → Upload → Extraction → Normalization → Validation → Anomalies → Registry → Human Scrutiny | `docs/ARCHITECTURE.md` Section 3 | `VERIFIED` |
| **Slide 6** | System Architecture & Technical Stack | Layered Architectural Topology | Frontend (React 19 / TS), API Monolith (FastAPI), Storage (SQLite WAL / OS filesystem), Processing (PyMuPDF / RapidOCR), Security Layer | `docs/ARCHITECTURE.md` Section 2 | `VERIFIED` |
| **Slide 7** | Multilingual OCR & Document Intelligence | Pipeline & Normalization Flow | Dual-path vector/OCR routing, Devanagari conversion (`०-९` → `0-9`), script classifier percentages, 19-term regulatory glossary | `app/services/multilingual.py` | `VERIFIED` |
| **Slide 8** | Explainability & Evidence Traceability | Finding Evidence Card | Evidence chain anatomy: Rule ID, Document, Page, Raw Snippet, Side-by-side Expected vs Observed values, 4 status vocabularies | `app/services/reporting.py` | `VERIFIED` |
| **Slide 9** | Security, Privacy & SSRF Governance | Defense-in-Depth Shield Card | Socket-level SSRF defense topology, blocked RFC-1918 CIDRs, 169.254.169.254 metadata defense, Argon2id & HttpOnly cookies | `app/services/integration.py` | `VERIFIED` |
| **Slide 10** | Working Prototype Demonstration | Scenario Showcase Cards | Scenarios A (Compliant), B (Bilingual Discrepancy), C (Executive PDF Report), D (Freshness Auditing & Versioning) | `app/db/seed.py` demo scenarios | `VERIFIED` |
| **Slide 11** | Innovation & Differentiation | Comparative Feature Matrix | Comparison table: Generic OCR vs Black-Box LLMs vs VerityAI / EntityLocker across 6 critical regulatory dimensions | `docs/EVALUATION_PACKAGE.md` | `VERIFIED` |
| **Slide 12** | Projected Impact & Proposed Pilot Metrics | KPI Metric Cards & Target Table | Review cycle reduction (45m → 5m), 4 proposed pilot evaluation metrics (Average review time, Precision/Recall, Agreement rate, False-positive ceiling) | `docs/EVALUATION_PACKAGE.md` | `VERIFIED` |
| **Slide 13** | Feasibility & Deployment Scalability | Containerized Topology Card | Multi-stage Docker deployment footprint, 2 vCPU / 4GB RAM specs, NIC MeghRaj cloud readiness, zero GPU requirement | `docs/DEPLOYMENT.md` | `VERIFIED` |
| **Slide 14** | Implementation & Verification Status | Verified Audit Ledger Card | Real test results: 121 backend tests passing (100%), 0 failures, 1950 frontend modules built, 12/12 e2e workflows verified, 10/10 pre-flight readiness checks | `docs/AUTONOMOUS_EXECUTION_STATUS.md` | `VERIFIED` |
| **Slide 15** | Roadmap & Closing Vision | 4-Quarter Strategic Roadmap | Phased progression (State Pilots → AICTE Portal Integration → Mobile Geo-Tagged Uploads → Continuous Compliance Monitoring) | `docs/IMPLEMENTATION_PLAN.md` | `VERIFIED` |

---

## 2. Brand Identity & Typography Specifications

All slides strictly adhere to the approved VerityAI visual design tokens:

- **Canvas Background:** Pure White (`#FFFFFF`) cards with subtle neutral background (`#FAF9FC`)
- **Primary Accent (Purple):** `#7450D8` (Headings, primary borders, active indicators)
- **Deep Purple:** `#5633B8` (Section tags, brand accents)
- **Lavender Surface:** `#F3EEFC` / `#FAF8FF` (Card backgrounds, pill badges)
- **Action / Alert Red:** `#F04438` / `#E34234` (Warning indicators, discrepancy callouts)
- **Success Green:** `#027A48` / `#ECFDF3` (Passing rules, verified controls)
- **Primary Text:** `#171B45` (High-contrast charcoal navy)
- **Secondary Text:** `#5F6485` (Muted slate gray for explanations)
- **Typography:** Inter / Segoe UI / Arial (clean institutional sans-serif with high projector readability)

---

## 3. Disclosures & User-Provided Customization Checkpoints

Before presenting to official Smart India Hackathon evaluators, the team should update the following marked placeholders:

1. **Slide 1:** Update `[TEAM_ID_PLACEHOLDER]` and `[INSTITUTION_NAME_PLACEHOLDER]` with your designated SIH team ID and college name.
2. **Slide 10:** If live screenshot captures are desired in place of styled scenario cards, high-resolution screenshots from the running application (`localhost:5173` or containerized host) can be inserted into Slide 10.
3. **Slide 15:** Contact email / team GitHub links can be added to the closing slide.

---

*Verified and updated for Phase 18 Smart India Hackathon submission package.*
