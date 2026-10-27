# Open Questions & Blockers Register

**Document ID:** BLOCKERS-001  
**Project:** VerityAI / EntityLocker  
**Audit Standard:** Strict Non-Assumption Policy  
**Last Updated:** 2026-10-24  

---

## 1. Statutory & Regulatory Open Questions

### Q-001: Statutory Interpretation of Land Requirement under APH 2024–27
- **Clause Reference:** Annexure 3.1 (p. 86) vs Clause 3.5 (p. 91).
- **The Issue:** Annexure 3.1 states land requirements are strictly calculated based on FSI/FAR norms without rigid acreage numbers. However, Clause 3.5 references previous handbooks for details. In addition, Affidavit 2 (p. 187) requires declaring land acreage in acres.
- **Why It Matters:** Affects the deterministic rule `RULE-DOC-LAND`. If the system enforces legacy acreage (e.g. 7.5 acres in rural areas), modern vertical technical institutions operating lawfully under high FSI/FAR municipal sanctions will be falsely flagged with deficiencies.
- **Resolution Path:** Recommendation: Accept FSI/FAR compliance certification from an Architect (Certificate 2) as satisfying land norms; flag rural institutions with $< 2.5$ acres for human review rather than automatic failure.

### Q-002: Transition Timelines for Non-Technical UG Programmes (BCA / BBA / BMS)
- **Clause Reference:** Foreword (Clause 4, p. ii) and Clause 1.3.3 (b) (p. 2).
- **The Issue:** General degree colleges offering BCA and BBA courses were brought under AICTE for the first time in AY 2024–25. While exempt from exclusive building and technical Principal requirements, the exact transitional grace period for achieving faculty student ratios (1:25) is not explicitly dated in the APH text.
- **Why It Matters:** Affects FSR compliance evaluations for general degree institutions. Strict immediate enforcement would trigger artificial non-compliance findings.
- **Resolution Path:** Apply a configurable grace period parameter in the validation engine for non-technical institutions during their initial 2 years under AICTE purview.

---

## 2. External Integration & Access Blockers

### BLK-001: Ministry of Education / Central AICTE Portal Access Credentials
- **The Issue:** Live bidirectional integration with the official AICTE Portal requires Ministry of Education network credentials, mutual TLS client certificates, and government intranet (NICNET) clearance.
- **Why It Matters:** The platform cannot perform real-time automated verification against live AICTE institutional records.
- **Current Mitigation:** The system operates with an honest statutory stub (`OFFICIAL_AICTE_PORTAL_STUB`) and a local synthetic registry (`SYNTHETIC_AISHE`). This satisfies prototype evaluation without fabricating live government connections.
- **Resolution Path:** Maintain honest labeling for hackathon demonstration; prepare production mutual-TLS gateway adapters for post-hackathon deployment.

### BLK-002: State Land Records API Fragmentation
- **The Issue:** India's 28 States and 8 Union Territories operate separate land record registries (e.g., Mahabhulekh, Bhoomi, Dharani, AnyRoR). Most public portals use CAPTCHAs and do not provide machine-to-machine REST APIs.
- **Why It Matters:** Fully automated verification of Land Deeds across all 28 states is technically blocked by CAPTCHA barriers and terms of service prohibiting automated scraping.
- **Current Mitigation:** The platform uses an **Assisted Verification** workflow: the system extracts survey numbers and registration metadata, opens the official state land registry link for the reviewer, and records the human reviewer's confirmation in `audit_events`.
