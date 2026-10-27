# Official & Legitimate Verification Matrix

**Document ID:** VERIF-MATRIX-001  
**Project:** VerityAI / EntityLocker  
**Scope:** Verification strategy for institutional approval claims per AICTE APH 2024–27  
**Guiding Principle:** Distinguish Authenticity from Consistency; enforce legal access; honest disclosure of stubs.  
**Last Updated:** 2026-10-24  

---

## 1. Classification of Verification Outcomes

To ensure legal soundness and avoid overclaiming, the system classifies every verification attempt into one of the following 10 mutually exclusive categories:

1. **`AUTHENTICITY_CONFIRMED`:** A trusted cryptographic mechanism (e.g. valid PKI digital signature with unrevoked certificate from CCA India Root CA) or official API with mutual TLS establishes document authenticity.
2. **`OFFICIAL_RECORD_MATCH`:** An authoritative government database contains an exact matching record. (Note: Proves the claim is registered, but does not prove every uploaded page is unaltered).
3. **`CONTENT_CONSISTENCY_MATCH`:** Information agrees with another supporting filing or declared application data, but independent external authenticity has not been verified.
4. **`RULE_COMPLIANCE_PASS`:** The submitted values satisfy a defined regulatory threshold (e.g., carpet area $\ge 66\ m^2$).
5. **`POTENTIAL_DISCREPANCY`:** An empirical conflict or mismatch is detected between declarations and evidence.
6. **`INCONCLUSIVE`:** Evidence is partially legible, uncalibrated, or conflicting; insufficient to reach a conclusive determination.
7. **`SOURCE_UNAVAILABLE`:** The designated external authority service timed out or was unreachable.
8. **`MANUAL_VERIFICATION_REQUIRED`:** A qualified human scrutiny officer must physically inspect original records.
9. **`VERIFICATION_NOT_SUPPORTED`:** No legitimate, legally accessible public online registry exists for this document class.
10. **`VERIFICATION_EXPIRED`:** Previously verified credential has lapsed or passed its statutory validity date.

---

## 2. Master Verification Matrix

### VM-001: Trust / Society / Section 8 Registration
- **Document Code:** `DOC_TRUST_REG` | **Requirement ID:** `REQ-0003`
- **Claim to Verify:** Legal existence, registration number, non-profit status, and active promoter entity.
- **Authoritative Source:** Ministry of Corporate Affairs (MCA21) for Section 8 Companies; State Charity Commissioner for Trusts; District Registrar of Societies.
- **Official Endpoint:** `https://www.mca.gov.in/content/mca/global/en/home.html` (Company Master Data API / Public View).
- **Access Method:** Public online lookup / authorized API gateway.
- **Authentication:** Captcha-protected public web portal; corporate API requires MCA portal gateway credentials.
- **Legal Basis:** Companies Act, 2013; Societies Registration Act, 1860; public records doctrine.
- **Query Inputs:** Corporate Identification Number (CIN) or Society Registration Number.
- **Expected Evidence:** Company status = `ACTIVE`, Company Class = `Section 8 Company`, Registered Address matches campus.
- **Automation Level:** Semi-Automated (Assisted lookup for prototype; automated API requires MCA corporate credentials).
- **Confidence Methodology:** Exact CIN match yields high confidence; name-only fuzzy matches require human confirmation.
- **Limitations:** Cannot detect internal trustee dispute pending in Civil Court unless notified in ROC charges.
- **Legitimate Fallback:** Advocate Certificate 1 verification of original Trust register book.

### VM-002: Land Ownership & Encumbrance Status
- **Document Code:** `DOC_LAND_DEED` | **Requirement ID:** `REQ-0008`, `REQ-0029`
- **Claim to Verify:** Clear legal title, registered deed execution, minimum 30-year lease duration, zero encumbrance/mortgage.
- **Authoritative Source:** State Inspector General of Registration (IGR) and Land Revenue Department.
- **Official Endpoints (State Examples):**
  - Maharashtra: Mahabhulekh (`https://bhulekh.mahabhumi.gov.in`) / e-Search (`https://igrmaharashtra.gov.in`)
  - Karnataka: Bhoomi (`https://landrecords.karnataka.gov.in`) / Kaveri Online Services
  - Telangana: Dharani Portal (`https://dharani.telangana.gov.in`)
- **Access Method:** State online land registry search by District, SRO, Deed Number, and Year.
- **Authentication:** Public search interfaces; bulk API access restricted to government departments.
- **Legal Basis:** Registration Act, 1908; Right to Information Act, 2005.
- **Query Inputs:** SRO Office, Document Registration Number, Year of Registration, Survey/Plot Numbers.
- **Expected Evidence:** Registered Deed metadata with matching Lessor/Lessee names, property schedule, and NIL encumbrances.
- **Automation Level:** Assisted / Manual Review (Captcha and state-specific fragmentation prevent single universal API).
- **Confidence Methodology:** Official e-Search index match confirms registration existence.
- **Limitations:** Online land records in some rural taluks may have digitization lag; does not substitute for on-ground physical boundary demarcations.
- **Legitimate Fallback:** Certified copy issued by Sub-Registrar Office + Advocate Certificate 1.

### VM-003: Land Use Conversion for Educational Purpose (CLU)
- **Document Code:** `DOC_LAND_CLU` | **Requirement ID:** `REQ-0004`, `REQ-0030`
- **Claim to Verify:** Statutory conversion from agricultural to institutional/educational use by the designated Annexure-14 authority.
- **Authoritative Source:** District Collector / Revenue Divisional Officer (RDO) / Sub-Divisional Magistrate (SDM) / DTCP per Annexure 14.
- **Official Endpoint:** State Revenue / Town Planning Department e-District Portal.
- **Access Method:** Public Order Verification by Order Dispatch Number and Date.
- **Authentication:** State e-District portal lookup.
- **Legal Basis:** State Land Revenue Codes and Town & Country Planning Acts.
- **Query Inputs:** Order Number, Date of Order, District, Land Survey Numbers.
- **Expected Evidence:** Sanctioned CLU Order permitting "Higher Technical Education / College Campus".
- **Automation Level:** Assisted Verification.
- **Limitations:** Annexure 14 establishes 36 distinct issuing bodies across States and UTs; automated scraping is strictly prohibited.
- **Legitimate Fallback:** Inspection of sealed original Collectorate order countersigned by practicing advocate.

### VM-004: Architect Building Sanction & Built-Up Area
- **Document Code:** `DOC_BUILDING_PLAN`, `DOC_CERTIFICATE_2` | **Requirement ID:** `REQ-0009`, `REQ-0051`, `REQ-0052`
- **Claim to Verify:** Architect registration standing, municipal sanction authenticity, carpet area schedule calculations.
- **Authoritative Source:** Council of Architecture (CoA), India (`https://www.coa.gov.in`) & Local Municipal Planning Authority.
- **Official Endpoint:** `https://www.coa.gov.in/index1.php?lang=1&level=0&linkid=34&lid=57` (CoA Architect Directory).
- **Access Method:** Public web directory query.
- **Authentication:** None (Public professional register).
- **Legal Basis:** Architects Act, 1972 (Section 23).
- **Query Inputs:** Architect CA Registration Number (Format: `CA/YYYY/XXXXX`).
- **Expected Evidence:** Registered Architect status = `IN GOOD STANDING`, Name matches Certificate 2.
- **Automation Level:** Automated CoA Directory Check.
- **Limitations:** Proves professional standing of the architect; does not verify municipal planning order without local municipal portal access.
- **Legitimate Fallback:** Local municipal building sanction register verification.

### VM-005: Fire and Life Safety NOC
- **Document Code:** `DOC_FIRE_SAFETY` | **Requirement ID:** `REQ-0033`
- **Claim to Verify:** Building fire safety clearance, emergency exit adequacy, unexpired certificate status.
- **Authoritative Source:** State Directorate of Fire Services / Municipal Fire Department.
- **Official Endpoint (Examples):** State Fire Department portal (e.g. Delhi Fire Service `https://dfs.delhigovt.nic.in`, Maharashtra Fire Services).
- **Access Method:** NOC verification by Reference Number and Building Name.
- **Authentication:** State fire portal.
- **Legal Basis:** State Fire Prevention and Life Safety Measures Acts.
- **Query Inputs:** Fire Safety Certificate / NOC Number, Issue Date, Pin Code.
- **Expected Evidence:** Status = `VALID`, Expiry Date $\ge$ Evaluation Date.
- **Automation Level:** Assisted / Semi-Automated where state portal permits public query.
- **Limitations:** Validity periods vary (1 to 3 years); expired certificates automatically transition to `POTENTIAL_DISCREPANCY`.
- **Legitimate Fallback:** Inspection of physical sealed certificate issued by Chief Fire Officer.

### VM-006: Institutional Accreditation (NBA / NAAC) & Extended EoA Eligibility
- **Document Code:** `DOC_ACCRED_CERT` | **Requirement ID:** `REQ-0016`
- **Claim to Verify:** Valid NBA accreditation (minimum 30% courses) or NAAC score $\ge 3.01$ for 3-year extended EoA.
- **Authoritative Source:** National Board of Accreditation (NBA) (`https://www.nbaind.org`) & NAAC (`http://naac.gov.in`).
- **Official Endpoints:**
  - NBA: `https://www.nbaind.org/accreditedprogrammes`
  - NAAC: `http://naac.gov.in/index.php/assessment-accreditation`
- **Access Method:** Public accredited institutions directories.
- **Authentication:** Public web access.
- **Legal Basis:** AICTE Mandatory Accreditation Regulations, 2014.
- **Query Inputs:** Permanent Institute ID (PID), College Name, State.
- **Expected Evidence:** Program name, valid accreditation dates (must extend through at least April 30 of academic year), NAAC CGPA score.
- **Automation Level:** Fully Automated against public accreditation roster.
- **Confidence Methodology:** Deterministic string and date comparison against published government accreditation roster.
- **Limitations:** Provisional accreditations require special validity checking.

### VM-007: Official AICTE Central Portal Standing (EoA History)
- **Document Code:** `DOC_EOA_LETTER` | **Requirement ID:** `REQ-0017`, `REQ-0025`
- **Claim to Verify:** Existing approval status, permanent institute ID (PID), approved intake history, no punitive closure.
- **Authoritative Source:** AICTE Official Web Portal (`https://www.aicte-india.org`).
- **Official Endpoint:** `https://facilities.aicte-india.org/dashboard/pages/angulardashboard.php` (AICTE Approved Institutes Dashboard).
- **Access Method:** AICTE Public Dashboard query / Official Central Portal (Restricted).
- **Authentication:** Public dashboard is open; regulatory transactional API requires Ministry of Education VPN & PKI mutual TLS.
- **Legal Basis:** AICTE Act, 1987.
- **Query Inputs:** Permanent Institute ID (PID) / AISHE Code.
- **Expected Evidence:** Approved Course names, sanctioned intake figures, division counts matching application declarations.
- **Automation Level:**
  - In Prototype: **Statutory Stub** (`OFFICIAL_AICTE_PORTAL_STUB`) reporting `UNCONFIGURED` honestly.
  - In Production: Mutual-TLS authenticated REST gateway.
- **Limitations:** Full transactional database write/read requires official government credentials not available in sandbox.
