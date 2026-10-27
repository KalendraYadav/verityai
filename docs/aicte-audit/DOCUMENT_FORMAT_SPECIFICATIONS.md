# Document Format & Structural Analysis Specifications

**Audit Focus:** AICTE Approval Process Handbook (2024–25 to 2026–27) Filing Specifications  
**Document ID:** SPEC-DOC-FORMAT-001  
**Last Updated:** 2026-10-24  

---

## 1. General Document Ingestion & Format Rules

Under the AICTE Approval Process Handbook (APH 2024–27), all filings submitted by educational institutions must adhere to standardized digital format rules:

1. **Digital Submission Exclusivity (Clause 1.3.1 & Chapter VIII.1):** All applications must be filed online through the National Single Window System (NSWS) and AICTE Web Portal. **Hard copies are strictly prohibited** (except for New Institute physical scrutiny where original documents are inspected).
2. **Mandatory Digital Signature Certificates (DSC) (Clause 1.4.3 & 1.4.6):**
   - Every uploaded document must be **Digitally Signed (DSC Class 3)** by the Chairman or Secretary of the Trust/Society/Company or Head of the Institution.
   - Any document uploaded without a digital signature **shall not be considered valid** (Clause 1.4.6).
3. **File Media Types & Size Bounds:**
   - Accepted MIME types: `application/pdf` (Primary standard for multi-page deeds, plans, and affidavits); `image/png` and `image/jpeg` (Permitted for specific certificate attachments).
   - Maximum upload ceiling: 20MB per document (enforced to prevent denial of service and decompression bombs).
4. **Language & Translations (Annexure 1.1 Private Lease):**
   - Documents submitted in regional/vernacular Indian languages (e.g. state revenue land deeds) **must be accompanied by a notarized English translation**.
5. **Prescribed Stamp Papers & Affidavits:**
   - Statutory Affidavits 1 through 13 must be sworn on **Rs. 100/- Non-Judicial Stamp Paper or e-Stamp Paper** before a First Class Judicial Magistrate, Public Notary, or Oath Commissioner.

---

## 2. Structural Specifications by Core Document Class

### 2.1 DOC_LAND_DEED: Registered Land Ownership / Lease Deed
- **Handbook Clauses:** Annexure 1.1 (xii), Annexure 3.1, Clause 6.17 (a)-(d).
- **Physical Structure:**
  - Registered Settlement Deed, Sale Deed, Irrevocable Gift Deed, or Registered Government/Private Lease Deed.
  - Sub-Registrar registration stamps, Book/Volume/Page serial numbers, and registration date.
  - Schedule of Property specifying Survey Numbers, Khasra Numbers, Plot Numbers, Village, Taluk, District, and total land area in Acres/Hectares.
  - Boundaries: North, South, East, West contiguous boundary descriptions.
- **Validity & Temporal Constraints:**
  - Minimum 30 years total lease duration from date of application.
  - At least 5 years of live lease remaining at the time of submission (Clause 6.17a).
  - Land must be in a maximum of **THREE contiguous plots within 2 km distance** (Annexure 3.1g).
- **Required Extracted Fields:**
  - `deed_type`, `registration_number`, `registration_date`, `sub_registrar_office`, `lessor_name`, `lessee_name`, `total_area_acres`, `survey_numbers`, `is_contiguous`, `lease_period_years`, `lease_expiry_date`.

### 2.2 DOC_BUILDING_PLAN: Sanctioned Building Plan & Carpet Area Schedule
- **Handbook Clauses:** Clause 1.5.1 (c), Annexure 1.1 (i), Annexure 3.2, Certificate 2.
- **Physical Structure:**
  - Architectural blueprint / as-built drawing prepared and signed by an Architect registered with the Council of Architecture (CoA).
  - Sanction stamp, order number, and signature of the designated Competent Municipal / Town Planning Authority (Annexure 14).
  - Room-by-room Carpet Area Schedule detailing Room Number, Room Type (Classroom, Tutorial, Laboratory, Workshop, Seminar Hall, Library, Principal Room, Board Room, Faculty Cabin, Toilets), Carpet Area in $m^2$, and completion status.
- **Dimensional Norms (Annexure 3.2.1):**
  - Classroom: $66\ m^2$ (for division of 60); $33\ m^2$ (for division of 30).
  - Tutorial Room: $33\ m^2$ (minimum 25% of classroom count).
  - Laboratories: $66\ m^2$ per course per year.
  - Workshop: $200\ m^2$.
  - Computer Centre: $150\ m^2$.
  - Library: $400\ m^2$ (UG Engineering); $150\ m^2$ (Planning/Design).
  - Administrative Area: Minimum $750\ m^2$ total (for intake $\le 300$).
  - Amenities Area: Minimum $500\ m^2$ total (for intake $\le 300$).
  - Access & Circulation Area (ACA): Exactly $25\%$ of sum of INA, ADA, and AMA.
- **Required Extracted Fields:**
  - `architect_name`, `architect_coa_registration_no`, `municipal_authority_name`, `plan_approval_number`, `plan_approval_date`, `total_built_up_area_sqm`, `instructional_area_sqm`, `administrative_area_sqm`, `amenities_area_sqm`, `circulation_area_sqm`, `classroom_count`, `lab_count`.

### 2.3 DOC_OCCUPANCY_CERT: Occupancy / Completion Certificate / Form D
- **Handbook Clauses:** Clause 6.17 (g), Annexure 1.1 (iv), Annexure 2.1 (iii), Annexure 14.
- **Physical Structure:**
  - Official Certificate issued by the designated state-specific Competent Authority per Annexure 14 (Municipal Corporation Commissioner, DTCP Town Planner, District Collector, or Gram Panchayat).
  - Form D for partial occupancy (valid for maximum 2 consecutive academic sessions).
  - For government buildings: Certification under the Government Building Act, 1899.
- **Required Extracted Fields:**
  - `issuing_authority_name`, `authority_jurisdiction_type` (Urban/Rural per Annex 14), `certificate_number`, `issue_date`, `occupancy_type` (Full/Partial), `building_address`, `carpet_area_certified`.

### 2.4 DOC_FIRE_SAFETY: Fire & Life Safety Certificate
- **Handbook Clauses:** Clause 6.17 (i), Annexure 1.1 (v), Annexure 2.1 (v).
- **Physical Structure:**
  - Official certificate issued by the State Fire Services Department / Chief Fire Officer.
  - Certifies that building height, exit staircases, fire hydrants, smoke alarms, and water storage satisfy the National Building Code (NBC) of India.
- **Validity & Temporal Constraints:**
  - Certificate must be active and unexpired as of the evaluation date.
- **Required Extracted Fields:**
  - `fire_officer_designation`, `station_jurisdiction`, `noc_number`, `issue_date`, `validity_expiry_date`, `building_height_meters`, `safety_status`.

### 2.5 DOC_AFFIDAVIT_2: Comprehensive Sworn Compliance Affidavit
- **Handbook Clauses:** Clauses 1.4.4, 6.39, Affidavits Section (pp. 186–188).
- **Physical Structure:**
  - Sworn before First Class Judicial Magistrate, Notary Public, or Oath Commissioner on Rs. 100/- stamp paper.
  - 33 mandatory statutory clauses covering:
    1. Truth of all online entries (Clauses 1–3).
    2. Occupancy & Structural Stability upload (Clause 5).
    3. Fire safety compliance (Clause 7).
    4. Qualified regular Principal & FSR adherence (Clauses 8–9).
    5. No retention of original faculty certificates (Clause 11).
    6. Land contiguity without dispute (Clause 13).
    7. Detailed Land & Room Carpet Area tables (Clause 15).
    8. Payment of salaries via bank ECS & Minimum Wages Act (Clauses 17, 33).
    9. Mandatory constitution of Anti-Ragging, SGRC, Internal Committee (IC), and SC/ST Committee (Clause 31).
- **Required Extracted Fields:**
  - `deponent_name`, `deponent_designation`, `trust_name`, `stamp_paper_serial_number`, `stamp_value_rs`, `magistrate_or_notary_name`, `attestation_date`, `declared_land_acreage`, `anti_ragging_committee_constituted`, `ic_committee_constituted`, `sgrc_committee_constituted`.

### 2.6 DOC_CERTIFICATE_1: Certificate of an Advocate
- **Handbook Reference:** Formats & Certificates (pp. 210–211).
- **Physical Structure:**
  - Printed on official letterhead of an Advocate registered with the Bar Council of India.
  - Section A: Verification of Trust/Society/Company registration from Competent Authority office.
  - Section B: Land document verification from Sub-Registrar Office, confirming clear title and lawful possession.
  - Section C: Verification of Land Use Certificate (CLU) and full extent of land.
  - Section D & E: Land Conversion and Land Classification orders.
- **Required Extracted Fields:**
  - `advocate_name`, `bar_council_registration_number`, `practicing_location`, `date_of_verification`, `sub_registrar_office_verified`, `land_ownership_authentic_status`, `title_clear_status`, `extent_of_land_acres`.

### 2.7 DOC_CERTIFICATE_3: Certificate of Bank Manager
- **Handbook Reference:** Formats & Certificates (p. 213).
- **Physical Structure:**
  - Printed on official letterhead of a Scheduled Commercial Bank recognized by RBI.
  - Section A: Bank Account details (Account Number, Account Holder Name, Balance on date).
  - Section B: Operational Fund Fixed Deposit Receipts (FDR Number, Date of Deposit, Date of Maturity, Amount, Bank Branch).
  - Declaration: Certifies that FDRs are authentic, in the name of the Applicant, and free of loans or mortgages.
- **Required Extracted Fields:**
  - `bank_name`, `branch_name`, `branch_ifsc_code`, `manager_name`, `account_number`, `account_balance_rs`, `fdr_numbers`, `total_fdr_amount_rs`, `lien_status`.
