/**
 * VerityAI Authoritative Statutory Document Registry
 *
 * Grounding Source: AICTE Approval Process Handbook (APH 2024-25 to 2026-27).
 * Authoritative Citations:
 * - Annexure 2, Section 2.1: "Documents to be uploaded for the issuance of EoA based on
 *   Self-Disclosure/after a break in the preceding Academic Years/Restoration of Intake"
 * - Annexure 1, Annexure 3, Annexure 6, Annexure 14, Annexure 18, and Chapters I-IV.
 */

export interface RegulatoryDocumentType {
  code: string;
  shortTitle: string;
  officialTitle: string;
  categoryGroup: string;
  sourceReference: string;
  pdfPage: number;
  printedPage: number;
  mandatoryOrConditional: 'MANDATORY' | 'CONDITIONAL' | 'SUPPORTING';
  conditionDescription: string;
  applicableCategories: string[];
}

export const REGULATORY_GROUPS = [
  'Affidavits & Undertakings',
  'Land, Building & Site Approvals',
  'Statutory Clearances & NOCs',
  'Financial Audits & Accounts',
  'Academic & Institutional Setup',
  'Public Disclosures & Scrutiny Media',
] as const;

export const REGULATORY_DOCUMENT_CATALOG: RegulatoryDocumentType[] = [
  // -------------------------------------------------------------------------
  // 1. Affidavits & Undertakings
  // -------------------------------------------------------------------------
  {
    code: 'DOC_AFFIDAVIT_2',
    shortTitle: 'Affidavit 2 (Self-Disclosure & Undertaking)',
    officialTitle:
      'An Affidavit 2 with digital signature of the Chairman/ Secretary of the Trust/ Society/ Company on an e-stamp paper of Rs. 100/- duly sworn before a First Class Judicial Magistrate or Notary or an Oath Commissioner.',
    categoryGroup: 'Affidavits & Undertakings',
    sourceReference: 'Annexure 2, Section 2.1 (i) / Annexure 1.1 (ii)',
    pdfPage: 73,
    printedPage: 57,
    mandatoryOrConditional: 'MANDATORY',
    conditionDescription:
      'Mandatory for all statutory applications. Must be on Rs. 100/- e-stamp paper sworn before a First Class Judicial Magistrate, Notary Public, or Oath Commissioner.',
    applicableCategories: ['NEW_INSTITUTION', 'EOA_TECHNICAL', 'STANDALONE_PGDM', 'UNIVERSITY_TECHNICAL'],
  },
  {
    code: 'DOC_AFFIDAVIT_3',
    shortTitle: 'Affidavit 3 (Security Deposit Creation)',
    officialTitle: 'Affidavit 3 — Undertaking for Creation of Security Deposit in AICTE Account',
    categoryGroup: 'Affidavits & Undertakings',
    sourceReference: 'Clause 1.12 / Affidavit 3',
    pdfPage: 26,
    printedPage: 10,
    mandatoryOrConditional: 'MANDATORY',
    conditionDescription:
      'Mandatory for establishing a new institution; establishes 10-year lock-in joint FDR in scheduled bank.',
    applicableCategories: ['NEW_INSTITUTION'],
  },
  {
    code: 'DOC_AFFIDAVIT_4',
    shortTitle: 'Affidavit 4 (Institutional Closure & Zero Liability)',
    officialTitle:
      'Affidavit 4 — Undertaking for Closure of Institution / Course with Zero Liability to Students',
    categoryGroup: 'Affidavits & Undertakings',
    sourceReference: 'Clause 2.21 / Affidavit 4',
    pdfPage: 43,
    printedPage: 27,
    mandatoryOrConditional: 'CONDITIONAL',
    conditionDescription:
      'Conditionally required ONLY when an institution or department applies for progressive or complete closure.',
    applicableCategories: ['EOA_TECHNICAL'],
  },
  {
    code: 'DOC_AFFIDAVIT_8',
    shortTitle: 'Affidavit 8 (Course / Intake Expansion)',
    officialTitle:
      'Affidavit 8 — Undertaking for Introduction of Additional Courses / Increase in Approved Intake',
    categoryGroup: 'Affidavits & Undertakings',
    sourceReference: 'Clause 2.6 / Annexure 2.6 / Affidavit 8',
    pdfPage: 98,
    printedPage: 82,
    mandatoryOrConditional: 'CONDITIONAL',
    conditionDescription:
      'Conditionally required when applying for additional courses, new divisions, or expansion of student intake.',
    applicableCategories: ['EOA_TECHNICAL'],
  },
  {
    code: 'DOC_AFFIDAVIT_11',
    shortTitle: 'Affidavit 11 (Twinning & Collaboration)',
    officialTitle:
      'Affidavit 11 — Undertaking for Collaboration & Twinning Programme with Foreign University',
    categoryGroup: 'Affidavits & Undertakings',
    sourceReference: 'Clause 3.4 / Affidavit 11',
    pdfPage: 51,
    printedPage: 35,
    mandatoryOrConditional: 'CONDITIONAL',
    conditionDescription:
      'Conditionally required when applying for joint or dual degree collaboration with accredited foreign universities.',
    applicableCategories: ['EOA_TECHNICAL', 'UNIVERSITY_TECHNICAL'],
  },
  {
    code: 'DOC_FORMAT_3',
    shortTitle: 'Governing Body Resolution (Format 3)',
    officialTitle: 'Format 3 — Certified Copy of Governing Body Resolution of Trust / Society / Company',
    categoryGroup: 'Affidavits & Undertakings',
    sourceReference: 'Format 3 / APH Page 205',
    pdfPage: 221,
    printedPage: 205,
    mandatoryOrConditional: 'MANDATORY',
    conditionDescription:
      'Mandatory certified resolution detailing applicant commitments, land survey allocations, and authorized signatories.',
    applicableCategories: ['NEW_INSTITUTION', 'EOA_TECHNICAL', 'STANDALONE_PGDM'],
  },

  // -------------------------------------------------------------------------
  // 2. Land, Building & Site Approvals
  // -------------------------------------------------------------------------
  {
    code: 'DOC_OCCUPANCY_CERT',
    shortTitle: 'Occupancy / Completion Certificate (Form D)',
    officialTitle: 'Valid Occupancy/ Completion Certificate/ Building License/ Form D issued by the Competent Authority.',
    categoryGroup: 'Land, Building & Site Approvals',
    sourceReference: 'Annexure 2, Section 2.1 (iii) / Annexure 1.1 (iv) / Annexure 14',
    pdfPage: 73,
    printedPage: 57,
    mandatoryOrConditional: 'MANDATORY',
    conditionDescription:
      'Mandatory for all institutions under Annexure 2.1. Form D or temporary building license permitted if campus construction is phased.',
    applicableCategories: ['NEW_INSTITUTION', 'EOA_TECHNICAL', 'STANDALONE_PGDM', 'UNIVERSITY_TECHNICAL'],
  },
  {
    code: 'DOC_STRUCT_STABILITY',
    shortTitle: 'Structural Stability Certificate (> 30 Yrs)',
    officialTitle:
      'Valid Structural Stability Certificate from the registered Structural Engineer, if the Building is more than thirty years from the issue of Completion Certificate.',
    categoryGroup: 'Land, Building & Site Approvals',
    sourceReference: 'Annexure 2, Section 2.1 (iv) / Clause 6.17 (h)',
    pdfPage: 73,
    printedPage: 57,
    mandatoryOrConditional: 'CONDITIONAL',
    conditionDescription:
      'Conditionally required ONLY if the Building is more than thirty years from the date of issue of the Completion Certificate. Valid for 5 years.',
    applicableCategories: ['EOA_TECHNICAL', 'STANDALONE_PGDM', 'UNIVERSITY_TECHNICAL'],
  },
  {
    code: 'DOC_SATELLITE_MAP',
    shortTitle: 'Geo-Tagged Satellite Map (Main Entrance)',
    officialTitle:
      'Satellite map, using suitable Web site, showing geographical location of the Land with latitude and longitude at the entrance of the main Building mentioned on it.',
    categoryGroup: 'Land, Building & Site Approvals',
    sourceReference: 'Annexure 2, Section 2.1 (vi)',
    pdfPage: 73,
    printedPage: 57,
    mandatoryOrConditional: 'MANDATORY',
    conditionDescription:
      'Mandatory for all statutory applications. Must clearly display geo-coordinates (latitude and longitude) positioned at the main entrance gate.',
    applicableCategories: ['NEW_INSTITUTION', 'EOA_TECHNICAL', 'STANDALONE_PGDM', 'UNIVERSITY_TECHNICAL'],
  },
  {
    code: 'DOC_LAND_DEED',
    shortTitle: 'Registered Land Ownership Deed',
    officialTitle:
      'Registered Land Ownership Deed (Sale Deed / Gift Deed / Government Lease / Private Lease >= 30 Years)',
    categoryGroup: 'Land, Building & Site Approvals',
    sourceReference: 'Annexure 1.1 (xii) / Annexure 3.1',
    pdfPage: 93,
    printedPage: 77,
    mandatoryOrConditional: 'MANDATORY',
    conditionDescription:
      'Mandatory for new institution setup. Minimum 30-year lease period required with >= 5 years live lease remaining at submission.',
    applicableCategories: ['NEW_INSTITUTION'],
  },
  {
    code: 'DOC_LAND_CLU',
    shortTitle: 'Land Use / Conversion Certificate (CLU)',
    officialTitle:
      'Land Use Certificate / Non-Agricultural (NA) Certificate / Conversion Order for Educational Purpose',
    categoryGroup: 'Land, Building & Site Approvals',
    sourceReference: 'Annexure 1.1 (Private Lease ii) / Annexure 14',
    pdfPage: 94,
    printedPage: 78,
    mandatoryOrConditional: 'MANDATORY',
    conditionDescription:
      'Mandatory statutory conversion order issued by District Collector, SDM, or Competent Revenue Authority.',
    applicableCategories: ['NEW_INSTITUTION', 'EOA_ILLUSTRATIVE'],
  },
  {
    code: 'DOC_ENCUMBRANCE',
    shortTitle: 'Encumbrance Certificate (EC)',
    officialTitle:
      'Encumbrance Certificate from Sub-Registrar / IGR verifying clear unencumbered title',
    categoryGroup: 'Land, Building & Site Approvals',
    sourceReference: 'Annexure 1.1 (Private Lease iv)',
    pdfPage: 94,
    printedPage: 78,
    mandatoryOrConditional: 'MANDATORY',
    conditionDescription:
      'Mandatory for new institutions; must be issued on a date not earlier than application notification date.',
    applicableCategories: ['NEW_INSTITUTION'],
  },
  {
    code: 'DOC_BUILDING_PLAN',
    shortTitle: 'Sanctioned Building Plan & Blueprint',
    officialTitle:
      'Sanctioned Building Plan approved by Competent Municipal Authority & Registered Architect',
    categoryGroup: 'Land, Building & Site Approvals',
    sourceReference: 'Annexure 1.1 (i) / Annexure 3.2',
    pdfPage: 93,
    printedPage: 77,
    mandatoryOrConditional: 'MANDATORY',
    conditionDescription:
      'Mandatory sanctioned municipal blueprint detailing room-by-room carpet areas and barrier-free access provisions.',
    applicableCategories: ['NEW_INSTITUTION'],
  },
  {
    code: 'DOC_CERTIFICATE_1',
    shortTitle: 'Advocate Land Title Certificate (Cert 1)',
    officialTitle:
      'Certificate 1 — Legal Certificate of Title, Ownership, and Non-Encumbrance issued by practicing Advocate',
    categoryGroup: 'Land, Building & Site Approvals',
    sourceReference: 'Certificate 1 / APH Page 210',
    pdfPage: 226,
    printedPage: 210,
    mandatoryOrConditional: 'MANDATORY',
    conditionDescription:
      'Mandatory legal certificate by practicing advocate verifying clear 30-year search title of the promoter land.',
    applicableCategories: ['NEW_INSTITUTION'],
  },
  {
    code: 'DOC_CERTIFICATE_2',
    shortTitle: 'Architect Built-Up Area Certificate (Cert 2)',
    officialTitle:
      'Certificate 2 — Certification of Built-Up Carpet Area and Barrier-Free Access by Registered Architect',
    categoryGroup: 'Land, Building & Site Approvals',
    sourceReference: 'Certificate 2 / Annexure 3',
    pdfPage: 228,
    printedPage: 212,
    mandatoryOrConditional: 'MANDATORY',
    conditionDescription:
      'Mandatory architect certificate certifying instructional carpet areas and National Building Code compliance.',
    applicableCategories: ['NEW_INSTITUTION', 'EOA_TECHNICAL'],
  },

  // -------------------------------------------------------------------------
  // 3. Statutory Clearances & NOCs
  // -------------------------------------------------------------------------
  {
    code: 'DOC_FIRE_SAFETY',
    shortTitle: 'Fire & Life Safety Certificate',
    officialTitle: 'A valid Fire Safety Certificate issued by the Competent Authority.',
    categoryGroup: 'Statutory Clearances & NOCs',
    sourceReference: 'Annexure 2, Section 2.1 (v) / Annexure 1.1 (v)',
    pdfPage: 73,
    printedPage: 57,
    mandatoryOrConditional: 'MANDATORY',
    conditionDescription:
      'Mandatory for all institutions; certificate must be currently valid without any lapse under State Fire law.',
    applicableCategories: ['NEW_INSTITUTION', 'EOA_TECHNICAL', 'STANDALONE_PGDM', 'UNIVERSITY_TECHNICAL'],
  },
  {
    code: 'DOC_FORMAT_1',
    shortTitle: 'State Govt / UT NOC (Format 1)',
    officialTitle:
      'Format 1 — No Objection Certificate (NOC) from State Government / Union Territory Administration',
    categoryGroup: 'Statutory Clearances & NOCs',
    sourceReference: 'Format 1 / APH Page 201',
    pdfPage: 217,
    printedPage: 201,
    mandatoryOrConditional: 'MANDATORY',
    conditionDescription:
      'Mandatory for new technical institutions or adding new degree/diploma programmes requiring State concurrence.',
    applicableCategories: ['NEW_INSTITUTION'],
  },
  {
    code: 'DOC_FORMAT_2',
    shortTitle: 'Affiliating University NOC (Format 2)',
    officialTitle:
      'Format 2 — No Objection Certificate (NOC) from Affiliating University / State Board of Technical Education',
    categoryGroup: 'Statutory Clearances & NOCs',
    sourceReference: 'Format 2 / APH Page 202',
    pdfPage: 218,
    printedPage: 202,
    mandatoryOrConditional: 'MANDATORY',
    conditionDescription:
      'Mandatory for degree-granting colleges; certifies university affiliation, syllabus alignment, and student enrollment quota.',
    applicableCategories: ['NEW_INSTITUTION', 'EOA_TECHNICAL'],
  },

  // -------------------------------------------------------------------------
  // 4. Financial Audits & Accounts
  // -------------------------------------------------------------------------
  {
    code: 'DOC_AUDITED_ACCOUNTS',
    shortTitle: 'Audited Statement of Accounts (Previous Year)',
    officialTitle: 'Audited statement of accounts of the Trust/ Society/ Company of the previous year.',
    categoryGroup: 'Financial Audits & Accounts',
    sourceReference: 'Annexure 2, Section 2.1 (vii)',
    pdfPage: 73,
    printedPage: 57,
    mandatoryOrConditional: 'MANDATORY',
    conditionDescription:
      'Mandatory for all EoA applications. Full audited balance sheet and income/expenditure account certified by Chartered Accountant with valid UDIN.',
    applicableCategories: ['EOA_TECHNICAL', 'STANDALONE_PGDM', 'UNIVERSITY_TECHNICAL'],
  },
  {
    code: 'DOC_PAY_RECEIPT',
    shortTitle: 'AICTE Web-Portal Pay Receipt',
    officialTitle:
      'Copy of pay receipt print made on AICTE Web-Portal if any, in respect of Extension of Approval for the respective Academic Year.',
    categoryGroup: 'Financial Audits & Accounts',
    sourceReference: 'Annexure 2, Section 2.1 (ii)',
    pdfPage: 73,
    printedPage: 57,
    mandatoryOrConditional: 'CONDITIONAL',
    conditionDescription:
      'Conditionally required if application processing fee was paid online via the AICTE web-portal payment gateway.',
    applicableCategories: ['EOA_TECHNICAL', 'NEW_INSTITUTION', 'STANDALONE_PGDM', 'UNIVERSITY_TECHNICAL'],
  },
  {
    code: 'DOC_BANK_CERT',
    shortTitle: 'Bank Funds & FDR Verification (Cert 3)',
    officialTitle:
      'Certificate 3 — Verification of Operational Funds, Corpus Fund, and Joint FDR in Scheduled Commercial Bank',
    categoryGroup: 'Financial Audits & Accounts',
    sourceReference: 'Annexure 1.1 (vi) / Certificate 3',
    pdfPage: 93,
    printedPage: 77,
    mandatoryOrConditional: 'MANDATORY',
    conditionDescription:
      'Mandatory for new institutions; certifies financial viability and operational liquidity.',
    applicableCategories: ['NEW_INSTITUTION'],
  },
  {
    code: 'DOC_PAYROLL_ECS',
    shortTitle: 'Faculty Salary Statement (Bank ECS Transfer)',
    officialTitle:
      'Annual Faculty Salary Paid Statement certified by Bank Branch Manager verifying electronic fund transfer (ECS/NEFT)',
    categoryGroup: 'Financial Audits & Accounts',
    sourceReference: 'Clause 6.14 (a) / Annexure 1.4.3',
    pdfPage: 71,
    printedPage: 55,
    mandatoryOrConditional: 'MANDATORY',
    conditionDescription:
      'Mandatory for all existing institutions applying for EoA; certifies 12 continuous months of electronic salary disbursement.',
    applicableCategories: ['EOA_TECHNICAL', 'STANDALONE_PGDM', 'UNIVERSITY_TECHNICAL'],
  },

  // -------------------------------------------------------------------------
  // 5. Academic & Institutional Setup
  // -------------------------------------------------------------------------
  {
    code: 'DOC_DPR',
    shortTitle: 'Detailed Project Report (DPR)',
    officialTitle: 'Detailed Project Report (DPR) along with Master Plan and Technical Feasibility',
    categoryGroup: 'Academic & Institutional Setup',
    sourceReference: 'Annexure 1.1 (xi) / Annexure 3',
    pdfPage: 95,
    printedPage: 79,
    mandatoryOrConditional: 'MANDATORY',
    conditionDescription:
      'Mandatory baseline project report for establishing a new technical institution under Chapter I.',
    applicableCategories: ['NEW_INSTITUTION'],
  },
  {
    code: 'DOC_TRUST_REG',
    shortTitle: 'Trust / Society / Company Registration',
    officialTitle:
      'Registration Document of the Trust / Society / Section 8 Company along with Memorandum of Association',
    categoryGroup: 'Academic & Institutional Setup',
    sourceReference: 'Annexure 1.1 (viii) & (x)',
    pdfPage: 93,
    printedPage: 77,
    mandatoryOrConditional: 'MANDATORY',
    conditionDescription:
      'Mandatory founding charter and bylaws for establishing a technical campus.',
    applicableCategories: ['NEW_INSTITUTION'],
  },
  {
    code: 'DOC_ACCRED_CERT',
    shortTitle: 'Accreditation Certificate (NBA / NAAC)',
    officialTitle: 'Accreditation Certificate issued by National Board of Accreditation (NBA) or NAAC',
    categoryGroup: 'Academic & Institutional Setup',
    sourceReference: 'Clause 2.1 (a) / Annexure 2.14',
    pdfPage: 27,
    printedPage: 11,
    mandatoryOrConditional: 'CONDITIONAL',
    conditionDescription:
      'Conditionally required for intake expansion, autonomous status, or supernumerary quota approval.',
    applicableCategories: ['EOA_TECHNICAL', 'STANDALONE_PGDM', 'UNIVERSITY_TECHNICAL', 'EOA_ILLUSTRATIVE'],
  },
  {
    code: 'DOC_FORMAT_4',
    shortTitle: 'Skill Knowledge Provider MoU (Format 4)',
    officialTitle:
      'Format 4 — Memorandum of Understanding (MoU) with Skill Knowledge Provider (SKP) under NSQF',
    categoryGroup: 'Academic & Institutional Setup',
    sourceReference: 'Format 4 / NSQF Regulations',
    pdfPage: 223,
    printedPage: 207,
    mandatoryOrConditional: 'CONDITIONAL',
    conditionDescription:
      'Conditionally required for institutions offering B.Voc / D.Voc or NSQF skill-aligned programmes.',
    applicableCategories: ['NEW_INSTITUTION', 'EOA_TECHNICAL'],
  },

  // -------------------------------------------------------------------------
  // 6. Public Disclosures & Scrutiny Media
  // -------------------------------------------------------------------------
  {
    code: 'DOC_MANDATORY_DISC',
    shortTitle: 'Mandatory Public Disclosure Document',
    officialTitle:
      'Mandatory Public Disclosure Single PDF Document published on Institutional Website per Annexure 18',
    categoryGroup: 'Public Disclosures & Scrutiny Media',
    sourceReference: 'Annexure 18 / Clause 6.32',
    pdfPage: 180,
    printedPage: 196,
    mandatoryOrConditional: 'MANDATORY',
    conditionDescription:
      'Mandatory annual statutory public disclosure document published on the institutional website covering all 18 heads.',
    applicableCategories: ['EOA_TECHNICAL', 'STANDALONE_PGDM', 'UNIVERSITY_TECHNICAL'],
  },
  {
    code: 'DOC_EVC_VIDEO',
    shortTitle: 'EVC Inspection Video (30-Minute Recording)',
    officialTitle:
      'Expert Visit Committee 30-Minute Unedited Video Recording covering campus infrastructure and laboratories',
    categoryGroup: 'Public Disclosures & Scrutiny Media',
    sourceReference: 'Clause 1.9 (f) & (g) / Annexure 1.2 (ix)',
    pdfPage: 24,
    printedPage: 8,
    mandatoryOrConditional: 'CONDITIONAL',
    conditionDescription:
      'Conditionally required when virtual or physical Expert Visit Committee scrutiny is ordered.',
    applicableCategories: ['NEW_INSTITUTION', 'EOA_TECHNICAL'],
  },
];

/**
 * Retrieve document metadata by code or alias.
 */
export function getDocumentByCode(code: string): RegulatoryDocumentType | undefined {
  if (!code) return undefined;
  const normalized = code.trim().toUpperCase();
  return REGULATORY_DOCUMENT_CATALOG.find(
    (d) => d.code === normalized || d.code === code.trim()
  );
}

/**
 * Filter documents by search term and optional application category.
 */
export function searchDocuments(
  query: string,
  categoryCode?: string
): RegulatoryDocumentType[] {
  const cleanQ = query.toLowerCase().trim();
  return REGULATORY_DOCUMENT_CATALOG.filter((doc) => {
    if (categoryCode && !doc.applicableCategories.includes(categoryCode)) {
      return false;
    }
    if (!cleanQ) return true;
    return (
      doc.shortTitle.toLowerCase().includes(cleanQ) ||
      doc.officialTitle.toLowerCase().includes(cleanQ) ||
      doc.code.toLowerCase().includes(cleanQ) ||
      doc.categoryGroup.toLowerCase().includes(cleanQ) ||
      doc.sourceReference.toLowerCase().includes(cleanQ)
    );
  });
}
