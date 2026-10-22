# VerityAI / EntityLocker — Demonstration Video Script

**Project:** VerityAI / EntityLocker (Smart India Hackathon 2026, Smart Automation Track)  
**Target Duration:** 4 minutes 30 seconds (270 seconds)  
**Target Resolution:** 1920 × 1080 (16:9 widescreen)  
**Narration Language:** English  
**Demonstration Dataset:** Pre-seeded Synthetic Scrutiny Sandbox (`VAI-2026-0001`, `VAI-2026-0002`, `VAI-2026-0003`)  

---

## Storyboard & Timestamped Narration

### Scene 1: Opening & Problem Statement (0:00 – 0:30)
- **Visual:** Title splash card with VerityAI / EntityLocker branding, followed by the public landing page showing institutional document scrutiny challenges.
- **On-Screen Action:** Cursor hovers over trust banner: "Smart India Hackathon 2026 · AICTE Decision Support Sandbox".
- **Narration:**
  > "Every academic year, the All India Council for Technical Education (AICTE) evaluates approval applications from over 10,000 technical institutions across India. Each institutional dossier comprises dozens of complex statutory documents—including land deeds, building approvals, fire safety certificates, and faculty registers. Reviewing these manually is grueling, prone to clerical oversight, and vulnerable to cross-document discrepancies. Welcome to VerityAI, also known as EntityLocker—an AI-assisted scrutiny platform designed to bring speed, explainability, and verifiable proof to regulatory evaluations."

---

### Scene 2: Scrutiny Desk Overview & Workload Dashboard (0:30 – 1:00)
- **Visual:** Switch from landing page to Scrutiny Portal Overview (`DashboardView`).
- **On-Screen Action:** Reviewer inspects live portfolio metrics: 3 registered dossiers, 3 extracted documents, recent audit events, and API health status badge.
- **Narration:**
  > "We enter the Scrutiny Desk. The overview immediately gives regulatory officials a live snapshot of incoming dossiers, document extraction progress, and recent audit events. Notice that every number here reflects real, backend-verified database records—no fabricated metrics or artificial accuracy scores. Our session indicator confirms our role as Regulatory Reviewer, with strict role-based access control enforced on the server."

---

### Scene 3: Scrutiny Queue & Readiness Evaluation (1:00 – 1:35)
- **Visual:** Scrutiny Queue tab (`ScrutinyQueueView`).
- **On-Screen Action:** Reviewer filters the queue by readiness state (`READY_FOR_SCRUTINY`). Selects application `VAI-2026-0002` (Zenith College of Engineering).
- **Narration:**
  > "Navigating to the Scrutiny Queue, applications are categorized by readiness. Our multi-dimensional readiness calculator evaluates whether mandatory documents are present, text extraction has completed, and compliance checks have run before clearing a file for official scrutiny. Let's inspect application VAI-2026-0002 submitted by Zenith College of Engineering."

---

### Scene 4: Document Intelligence & Bilingual OCR (1:35 – 2:20)
- **Visual:** Application Workspace (`ApplicationDetailWorkspace`), Subtab 1: "Submitted Documents & OCR".
- **On-Screen Action:** Reviewer inspects `Zenith_Bilingual_AICTE_Approval_Devanagari.pdf`. Clicks to view extracted text, script distribution (88% English, 12% Devanagari), and candidate fields.
- **Narration:**
  > "Opening the dossier, we see the institution's submitted documents. VerityAI features dual-engine extraction: native vector parsing with PyMuPDF in under 15 milliseconds, backed by RapidOCR for scanned certificates. More importantly, it solves a real Indian statutory challenge: bilingual certificates. In this approval certificate, the approved intake was issued in Hindi using Devanagari numerals. VerityAI automatically converts Devanagari digits to standard numerals, discovers candidate fields, and maps them to our statutory regulatory glossary—running 100% locally on CPU without paid cloud APIs."

---

### Scene 5: Deterministic Validation & AI Anomaly Detection (2:20 – 3:10)
- **Visual:** Subtab 2 ("Validation Rules") and Subtab 3 ("Anomalies & Candidate Fields").
- **On-Screen Action:** Reviewer examines validation rules. Then clicks Subtab 3: highlights Critical Anomaly `ANM-XDOC-INTAKE`. Shows Expected vs Observed side-by-side comparison.
- **Narration:**
  > "Under the Validation Rules tab, deterministic compliance checks test mandatory document types, date expiration, and program requirements. Next, our cross-document anomaly engine performs deep inconsistency checks. Here, it has flagged a critical discrepancy: the institution declared an intake capacity of 180 seats, but the extracted AICTE approval certificate specifies only 120 seats. Notice the explainability: the finding cites the exact rule code, links to Page 1 of the certificate, and highlights the raw extracted sentence. No black-box guesses—just transparent evidence."

---

### Scene 6: Reference Registries & External Gateways (3:10 – 3:45)
- **Visual:** Primary Navigation: "Registry Verification" and "Regulatory Gateways".
- **On-Screen Action:** Reviewer opens Registry Verification, inspects Synthetic AISHE reference records, then probes Regulatory Gateways showing active SSRF defense.
- **Narration:**
  > "VerityAI cross-verifies institutional declarations against external registries. In the Registry Verification workspace, we compare normalized institution aliases against the AISHE reference database. In the Regulatory Gateways view, our architecture implements socket-level SSRF defense—blocking private RFC-1918 CIDRs and cloud metadata endpoints while providing an honest statutory stub for official AICTE production integration."

---

### Scene 7: Human Reviewer Adjudication & Scrutiny Dossier (3:45 – 4:15)
- **Visual:** Subtab 7: "Scrutiny Dossier & Reports" in `ApplicationDetailWorkspace`.
- **On-Screen Action:** Reviewer clicks "Generate Scrutiny Dossier", downloads multi-page PDF, and shows the official advisory banner and executive summary.
- **Narration:**
  > "Adhering to our core principle that humans make consequential decisions, the reviewer adjudicates the finding, records an observation note, and generates an official Scrutiny Dossier. Synthesized directly in Python using PyMuPDF, this multi-page PDF includes a formal advisory notice, executive compliance scorecards, itemized evidence citations, and a reviewer signature block."

---

### Scene 8: Architecture, Testing Status & Closing (4:15 – 4:30)
- **Visual:** Audit Trail view showing append-only event ledger, closing with architecture slide.
- **On-Screen Action:** Cursor hovers over audit log entries, ending on title card.
- **Narration:**
  > "Every action is sealed in an append-only audit trail. With 121 automated backend tests passing, 0 build errors across 1,950 modules, and 12 out of 12 verified end-to-end workflows, VerityAI is a robust, demonstrable prototype ready to accelerate educational governance in India. Thank you."

---

*End of Demonstration Video Script.*
