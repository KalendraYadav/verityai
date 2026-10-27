# Regulatory Conflict & Ambiguity Register

**Document ID:** CONFLICT-REG-001  
**Project:** VerityAI / EntityLocker  
**Audit Standard:** Clause-by-Clause Reconciliation of AICTE Approval Process Handbook (2024–25 to 2026–27)  
**Last Updated:** 2026-10-24  

---

## 1. Executive Summary

During the systematic analysis of the 231-page AICTE Approval Process Handbook (APH 2024–27), several regulatory contradictions, transitional provisions, changing norms under the National Education Policy (NEP 2020), and ambiguities were identified. 

To prevent hardcoding invalid assumptions into deterministic validation rules, every conflict is documented below with its affected clauses, operational impact, and recommended resolution.

---

## 2. Identified Regulatory Conflicts & Discrepancies

### CONFLICT-001: Removal of Upper Ceiling on Intake vs. Static Table 1.3 Division Caps
- **Affected Clauses:** Foreword (Clause 2, p. i), Section 2.6 (p. 16) **VERSUS** Table 1.3 (p. 6), Clause 1.7.1 (p. 7).
- **Nature of Conflict:**
  - Chairman Foreword (p. i) and Section 2.6 state: *"the Council decided to remove the upper limit on intake allowed earlier for the Courses / Programs offered by existing institutions. This is subject to the fulfillment of infrastructure availability, its readiness and filled faculty position."*
  - Conversely, Table 1.3 (p. 6) and Clause 1.7.1 enforce explicit static ceilings: *"maximum intake allowed for Engineering UG = 360 (Max 6 courses, Max 6/12 divisions)."*
- **Operational Impact on Validation Engine:** A validation rule that flags an existing institution applying for 420 or 480 intake as an "excess intake violation" would be legally incorrect under the 2024–27 reforms.
- **Recommended System Resolution:** Distinguish **New Technical Institutions** (which are strictly bounded by Table 1.3 for their initial LoA) from **Existing Institutions applying under Section 2.6** (where intake expansion is unbounded by fixed ceilings provided infrastructure and faculty ratios are satisfied).

### CONFLICT-002: Land Acreage Requirements under FSI/FAR vs. Legacy Minimum Acreage Tables
- **Affected Clauses:** Annexure 3.1 (p. 86) **VERSUS** Clause 6.17 (p. 56) and Legacy APH norms.
- **Nature of Conflict:**
  - In earlier APH editions, AICTE prescribed rigid minimum land acreage (e.g. 7.5 acres in Rural, 2.5 acres in Urban, 1.5 acres in Metro).
  - APH 2024–27 Annexure 3.1 introduces a major deregulation: *"For establishing an Institution... the built-up area requirement will be calculated based on the approved intake... The land required for the same will be based on prevailing FSI/FAR norms applicable for that location as declared by the respective competent authority... The same shall be applicable for Institutions in Mega/Metro/Urban/Rural areas."*
  - However, Clause 3.5 (p. 91) states: *"However, the Institutions may refer the previous Approval Process Hand Book for more details."*
- **Operational Impact on Validation Engine:** Hardcoding a rigid 7.5-acre threshold for rural colleges would falsely flag modern multi-storied institutions operating lawfully under high FSI/FAR municipal sanctions.
- **Recommended System Resolution:** Implement a two-tier check: if the institution submits an Architect Certificate 2 confirming built-up area satisfies local municipal FSI/FAR norms, pass the check; otherwise, flag for manual review against legacy acreage benchmarks.

### CONFLICT-003: BCA / BBA / BMS Programmes Transition to AICTE Umbrella
- **Affected Clauses:** Foreword (Clause 4, p. ii), Clause 1.3.3 (b) (p. 2) **VERSUS** Standard Technical Institution Norms (Clause 1.5.1).
- **Nature of Conflict:**
  - For the first time, undergraduate general degree courses in computer applications (BCA) and management (BBA/BMS) offered by Non-Technical General Degree Colleges were brought under AICTE regulation.
  - Clause 1.3.3 (b) Note explicitly provides an exemption: *"Exclusive building and Director/Principal are not required for Institutions under 1.3.3 (b). However, the Institutions should fulfil all other norms... separate Head of Department, Faculty, Infrastructure, Built-up area."*
- **Operational Impact on Validation Engine:** If a general arts/science/commerce college applying for AICTE approval for its existing BCA/BBA courses is evaluated against standard technical rules requiring an exclusive technical building and a technical Principal with Ph.D., it would fail validation falsely.
- **Recommended System Resolution:** Create a dedicated institutional category `NON_TECH_UG_APPLICATIONS` with relaxed validation predicates that bypass the exclusive building and technical Principal rules.

### CONFLICT-004: Extension of Approval Granted up to 3 Years vs. Annual Data Submission
- **Affected Clauses:** Clause 2.1 (a) (p. 11), Clause 4.2 (p. 37), Clause 5.2 (p. 45) **VERSUS** Clause 2.1 Note (p. 12), Clause 4.11 (p. 42).
- **Nature of Conflict:**
  - Outstanding institutions (NIRF ranked, QS Asia, NBA $\ge 30\%$, NAAC $\ge 3.01$, Autonomous) are granted **3 years' Extension of Approval (EoA)** upon paying 3 years' TER charges.
  - However, Clause 2.1 Note explicitly mandates: *"Although, the institutions can get extended EoA for 3 years, annually they need to submit information/data during the AICTE Approval Process time of respective years."*
- **Operational Impact on Validation Engine:** The platform must not assume an institution with a 3-year EoA certificate is exempt from annual document scrutiny.
- **Recommended System Resolution:** Distinguish between **Approval Order Validity** (active for 3 years) and **Annual Monitoring Submission** (annual requirement for student enrolment data, faculty updates, and mandatory disclosures).

### CONFLICT-005: Deemed-to-be Universities Mandatory Approval Status
- **Affected Clauses:** Clause 1.1 (g) (p. 1) **VERSUS** Clause 4.4.3 Note-ii (p. 39).
- **Nature of Conflict:**
  - Clause 1.1 (g) states: *"It is not mandatory for State Public, Private Universities and Central Universities to take AICTE approval as per the AICTE Act. However, Universities shall seek approval... for availing benefits of AICTE Schemes."*
  - In direct contrast, Clause 4.4.3 Note-ii specifies: *"For Institutions Deemed to be Universities, it is mandatory to have AICTE approval from the Academic Year 2018-19 in compliance with the Hon’ble Supreme Court Order dated 03-11-2017 passed in CA No. 17869-17870/2017... Institutions Deemed to be Universities... are directed NOT to run any Technical Programme(s)/Course(s) without prior approval."*
- **Operational Impact on Validation Engine:** Treating all universities alike would cause severe compliance misclassifications.
- **Recommended System Resolution:** Enforce strict mandatory approval checks on Deemed-to-be Universities, while classifying approval as optional/incentive-based for State Public and Central Universities.
