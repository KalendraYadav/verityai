import re
from datetime import datetime, date, timezone
from typing import Optional, Dict, Any, List, Tuple
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.category import ApplicationCategory
from app.models.document import Document
from app.models.document_page import DocumentPage
from app.models.finding import ExtractedField
from app.models.validation import ValidationRule, ValidationRun, RuleResult
from app.services.audit import record_audit_event
from app.services.document_catalog import resolve_document_type


# ---------------------------------------------------------------------------
# Default Synthetic Demonstration Rules
# ---------------------------------------------------------------------------
DEFAULT_SYNTHETIC_RULES: List[Dict[str, Any]] = [
    {
        "rule_code": "RULE-DOC-ACCRED",
        "rule_version": "1.0",
        "rule_name": "Accreditation Certificate Presence",
        "description": "Verifies that an Accreditation Certificate is submitted and processed for the application category.",
        "rule_type": "REQUIRED_DOCUMENT",
        "category": "REQUIRED_DOCUMENT",
        "applies_to": {"categories": ["EOA_ILLUSTRATIVE"]},
        "parameters": {
            "document_type": "ACCREDITATION_CERTIFICATE",
            "aliases": ["accreditation", "nba_certificate", "naac_certificate"],
        },
        "severity": "HIGH",
        "on_fail_status": "FAIL",
        "provenance": "SYNTHETIC_DEMO",
        "enabled": True,
    },
    {
        "rule_code": "RULE-DOC-LAND",
        "rule_version": "1.0",
        "rule_name": "Land Use Certificate Presence",
        "description": "Verifies that a valid Land Use Certificate or Land Affidavit is present for extension of approval.",
        "rule_type": "REQUIRED_DOCUMENT",
        "category": "REQUIRED_DOCUMENT",
        "applies_to": {"categories": ["EOA_ILLUSTRATIVE"]},
        "parameters": {
            "document_type": "LAND_USE_CERTIFICATE",
            "aliases": ["land_use", "land_affidavit", "land_ownership"],
        },
        "severity": "HIGH",
        "on_fail_status": "FAIL",
        "provenance": "SYNTHETIC_DEMO",
        "enabled": True,
    },
    {
        "rule_code": "RULE-FLD-CERTNO",
        "rule_version": "1.0",
        "rule_name": "Accreditation Certificate Number Extraction",
        "description": "Checks that a distinct certificate or registration number is present on the accreditation document.",
        "rule_type": "REQUIRED_FIELD",
        "category": "REQUIRED_FIELD",
        "applies_to": {"categories": ["EOA_ILLUSTRATIVE"]},
        "parameters": {
            "document_type": "ACCREDITATION_CERTIFICATE",
            "field_key": "certificate_number",
            "pattern": r"\b(?:cert(?:ificate)?|reg(?:istration)?|licen[sc]e|accreditation|ref(?:erence)?)\s*(?:no|number|num|id|code)?[\s.:#-]+((?=[A-Z0-9\-\/]*\d)[A-Z0-9\-\/]{3,30})\b",
        },
        "severity": "HIGH",
        "on_fail_status": "NEEDS_REVIEW",
        "provenance": "SYNTHETIC_DEMO",
        "enabled": True,
    },
    {
        "rule_code": "RULE-EXP-ACCRED",
        "rule_version": "1.0",
        "rule_name": "Accreditation Validity & Expiry Check",
        "description": "Validates that the accreditation certificate has not expired as of the statutory evaluation date.",
        "rule_type": "EXPIRY_CHECK",
        "category": "EXPIRY",
        "applies_to": {"categories": ["EOA_ILLUSTRATIVE"]},
        "parameters": {
            "document_type": "ACCREDITATION_CERTIFICATE",
            "field_key": "certificate_expiry_date",
            "tolerance_days": 0,
        },
        "severity": "HIGH",
        "on_fail_status": "FAIL",
        "provenance": "SYNTHETIC_DEMO",
        "enabled": True,
    },
    {
        "rule_code": "RULE-CMP-NAME",
        "rule_version": "1.0",
        "rule_name": "Institution Name Cross-Document Match",
        "description": "Compares declared institutional applicant name against the entity name on the supporting certificate.",
        "rule_type": "FIELD_EQUALS_APPLICATION",
        "category": "CONSISTENCY",
        "applies_to": {"categories": ["EOA_ILLUSTRATIVE"]},
        "parameters": {
            "app_field": "institution_name",
            "doc_field": "institution_name",
            "document_type": "ACCREDITATION_CERTIFICATE",
            "normalize_case": True,
            "normalize_whitespace": True,
        },
        "severity": "HIGH",
        "on_fail_status": "FAIL",
        "provenance": "SYNTHETIC_DEMO",
        "enabled": True,
    },
    {
        "rule_code": "RULE-CMP-INTAKE",
        "rule_version": "1.0",
        "rule_name": "Approved Intake Capacity Match",
        "description": "Cross-references declared student intake capacity against evidentiary values in document text.",
        "rule_type": "FIELD_EQUALS_APPLICATION",
        "category": "CONSISTENCY",
        "applies_to": {"categories": ["EOA_ILLUSTRATIVE"]},
        "parameters": {
            "app_field": "approved_intake",
            "doc_field": "approved_intake",
            "document_type": "ACCREDITATION_CERTIFICATE",
            "is_numeric": True,
        },
        "severity": "MEDIUM",
        "on_fail_status": "NEEDS_REVIEW",
        "provenance": "SYNTHETIC_DEMO",
        "enabled": True,
    },
]

# ---------------------------------------------------------------------------
# Statutory AICTE Rules (Grounding: Approval Process Handbook 2024-27)
# ---------------------------------------------------------------------------
STATUTORY_AICTE_RULES: List[Dict[str, Any]] = [
    {
        "rule_code": "RULE-STAT-CADRE-UG",
        "rule_version": "1.0",
        "rule_name": "Undergraduate Engineering Faculty Cadre Ratio (1:2:6)",
        "description": "Verifies that faculty cadre distribution follows the statutory ratio of 1 Professor : 2 Associate Professors : 6 Assistant Professors for UG Engineering programmes.",
        "rule_type": "REQUIRED_FIELD",
        "category": "FACULTY_NORMS",
        "applies_to": {"categories": ["EOA_TECHNICAL", "NEW_INSTITUTION"]},
        "parameters": {
            "requirement_id": "REQ-0057",
            "source_document": "AICTE_APH_2024-27.pdf",
            "clause": "Annexure 5.2",
            "pdf_page": 111,
            "document_type": "DOC_PAYROLL_ECS",
            "aliases": ["payroll", "faculty_list", "form_16"],
            "field_key": "cadre_ratio",
            "statutory_formula": "Professor : Associate Professor : Assistant Professor == 1 : 2 : 6",
            "human_review_required": True,
        },
        "severity": "HIGH",
        "on_fail_status": "NEEDS_REVIEW",
        "provenance": "STATUTORY_APH_2024_27",
        "enabled": True,
    },
    {
        "rule_code": "RULE-STAT-FSR-UG",
        "rule_version": "1.0",
        "rule_name": "Undergraduate Engineering Faculty-Student Ratio (1:20)",
        "description": "Verifies that Faculty-Student Ratio (FSR) satisfies 1:20 for undergraduate Engineering and Technology programmes.",
        "rule_type": "REQUIRED_FIELD",
        "category": "FACULTY_NORMS",
        "applies_to": {"categories": ["EOA_TECHNICAL", "NEW_INSTITUTION"]},
        "parameters": {
            "requirement_id": "REQ-0057",
            "source_document": "AICTE_APH_2024-27.pdf",
            "clause": "Annexure 5.2",
            "pdf_page": 111,
            "document_type": "DOC_PAYROLL_ECS",
            "aliases": ["payroll", "faculty_list"],
            "field_key": "faculty_count",
            "statutory_formula": "total_faculty >= approved_intake * duration / 20",
            "human_review_required": False,
        },
        "severity": "HIGH",
        "on_fail_status": "FAIL",
        "provenance": "STATUTORY_APH_2024_27",
        "enabled": True,
    },
    {
        "rule_code": "RULE-STAT-ADMIN-AREA",
        "rule_version": "1.0",
        "rule_name": "Minimum Administrative Area (750 sqm)",
        "description": "Checks that the total administrative carpet area in Certificate 2 meets the statutory minimum of 750 sqm for an approved intake up to 300.",
        "rule_type": "REQUIRED_FIELD",
        "category": "INFRASTRUCTURE",
        "applies_to": {"categories": ["NEW_INSTITUTION", "EOA_TECHNICAL"]},
        "parameters": {
            "requirement_id": "REQ-0052",
            "source_document": "AICTE_APH_2024-27.pdf",
            "clause": "Annexure 3.3",
            "pdf_page": 106,
            "document_type": "DOC_CERTIFICATE_2",
            "aliases": ["certificate_2", "architect_certificate", "building_plan"],
            "field_key": "administrative_area_sqm",
            "statutory_minimum": 750.0,
            "human_review_required": False,
        },
        "severity": "HIGH",
        "on_fail_status": "FAIL",
        "provenance": "STATUTORY_APH_2024_27",
        "enabled": True,
    },
    {
        "rule_code": "RULE-STAT-AMENITIES-AREA",
        "rule_version": "1.0",
        "rule_name": "Minimum Amenities Carpet Area (500 sqm)",
        "description": "Verifies that total amenities carpet area in Certificate 2 satisfies the statutory minimum of 500 sqm for an approved intake up to 300.",
        "rule_type": "REQUIRED_FIELD",
        "category": "INFRASTRUCTURE",
        "applies_to": {"categories": ["NEW_INSTITUTION", "EOA_TECHNICAL"]},
        "parameters": {
            "requirement_id": "REQ-0053",
            "source_document": "AICTE_APH_2024-27.pdf",
            "clause": "Annexure 3.4",
            "pdf_page": 106,
            "document_type": "DOC_CERTIFICATE_2",
            "aliases": ["certificate_2", "amenities_area"],
            "field_key": "amenities_area_sqm",
            "statutory_minimum": 500.0,
            "human_review_required": False,
        },
        "severity": "HIGH",
        "on_fail_status": "FAIL",
        "provenance": "STATUTORY_APH_2024_27",
        "enabled": True,
    },
    {
        "rule_code": "RULE-STAT-CLASSROOM-AREA",
        "rule_version": "1.0",
        "rule_name": "Classroom Carpet Area Norms (66 sqm / 33 sqm)",
        "description": "Verifies that individual classroom carpet area adheres to statutory norm of 66 sqm for 60-division or 33 sqm for 30-division.",
        "rule_type": "REQUIRED_FIELD",
        "category": "INFRASTRUCTURE",
        "applies_to": {"categories": ["NEW_INSTITUTION", "EOA_TECHNICAL"]},
        "parameters": {
            "requirement_id": "REQ-0051",
            "source_document": "AICTE_APH_2024-27.pdf",
            "clause": "Annexure 3.2.1",
            "pdf_page": 103,
            "document_type": "DOC_CERTIFICATE_2",
            "aliases": ["certificate_2", "classroom_schedule"],
            "field_key": "classroom_carpet_area_sqm",
            "norm_per_division_60": 66.0,
            "norm_per_division_30": 33.0,
            "human_review_required": False,
        },
        "severity": "HIGH",
        "on_fail_status": "FAIL",
        "provenance": "STATUTORY_APH_2024_27",
        "enabled": True,
    },
    {
        "rule_code": "RULE-STAT-ANTI-RAGGING",
        "rule_version": "1.0",
        "rule_name": "Mandatory Anti-Ragging Committee and Squad",
        "description": "Verifies statutory constitution of Anti-Ragging Committee, Anti-Ragging Squad, and portal compliance undertaking per Clause 6.47.",
        "rule_type": "REQUIRED_DOCUMENT",
        "category": "GOVERNANCE",
        "applies_to": {"categories": ["NEW_INSTITUTION", "EOA_TECHNICAL", "STANDALONE_PGDM", "UNIVERSITY_TECHNICAL"]},
        "parameters": {
            "requirement_id": "REQ-0038",
            "source_document": "AICTE_APH_2024-27.pdf",
            "clause": "6.47",
            "pdf_page": 78,
            "document_type": "DOC_AFFIDAVIT_2",
            "aliases": ["affidavit_2", "anti_ragging_undertaking", "anti_ragging_committee"],
            "human_review_required": True,
        },
        "severity": "HIGH",
        "on_fail_status": "FAIL",
        "provenance": "STATUTORY_APH_2024_27",
        "enabled": True,
    },
    {
        "rule_code": "RULE-STAT-INTERNAL-COMM",
        "rule_version": "1.0",
        "rule_name": "Mandatory Internal Committee (IC) for Gender Sensitization",
        "description": "Verifies statutory constitution of Internal Committee (IC) with a senior woman faculty Presiding Officer per Clause 6.48.",
        "rule_type": "REQUIRED_DOCUMENT",
        "category": "GOVERNANCE",
        "applies_to": {"categories": ["NEW_INSTITUTION", "EOA_TECHNICAL", "STANDALONE_PGDM", "UNIVERSITY_TECHNICAL"]},
        "parameters": {
            "requirement_id": "REQ-0039",
            "source_document": "AICTE_APH_2024-27.pdf",
            "clause": "6.48",
            "pdf_page": 79,
            "document_type": "DOC_AFFIDAVIT_2",
            "aliases": ["affidavit_2", "internal_committee", "posh_committee"],
            "human_review_required": True,
        },
        "severity": "HIGH",
        "on_fail_status": "FAIL",
        "provenance": "STATUTORY_APH_2024_27",
        "enabled": True,
    },
    {
        "rule_code": "RULE-STAT-SC-ST-COMM",
        "rule_version": "1.0",
        "rule_name": "Mandatory SC/ST Prevention of Atrocities Committee",
        "description": "Verifies statutory constitution of 5-member SC/ST Committee with at least 2 SC/ST members and 1 woman member per Clause 6.49.",
        "rule_type": "REQUIRED_DOCUMENT",
        "category": "GOVERNANCE",
        "applies_to": {"categories": ["NEW_INSTITUTION", "EOA_TECHNICAL", "STANDALONE_PGDM", "UNIVERSITY_TECHNICAL"]},
        "parameters": {
            "requirement_id": "REQ-0040",
            "source_document": "AICTE_APH_2024-27.pdf",
            "clause": "6.49",
            "pdf_page": 80,
            "document_type": "DOC_AFFIDAVIT_2",
            "aliases": ["affidavit_2", "sc_st_committee"],
            "human_review_required": True,
        },
        "severity": "HIGH",
        "on_fail_status": "FAIL",
        "provenance": "STATUTORY_APH_2024_27",
        "enabled": True,
    },
    {
        "rule_code": "RULE-STAT-SGRC-OMBUDSMAN",
        "rule_version": "1.0",
        "rule_name": "Student Grievance Redressal Committee (SGRC) & University Ombudsman",
        "description": "Verifies constitution of SGRC and notification of University Ombudsman appointment per Clause 6.50.",
        "rule_type": "REQUIRED_DOCUMENT",
        "category": "GOVERNANCE",
        "applies_to": {"categories": ["NEW_INSTITUTION", "EOA_TECHNICAL", "STANDALONE_PGDM", "UNIVERSITY_TECHNICAL"]},
        "parameters": {
            "requirement_id": "REQ-0041",
            "source_document": "AICTE_APH_2024-27.pdf",
            "clause": "6.50",
            "pdf_page": 80,
            "document_type": "DOC_AFFIDAVIT_2",
            "aliases": ["affidavit_2", "sgrc_notification", "ombudsman"],
            "human_review_required": True,
        },
        "severity": "HIGH",
        "on_fail_status": "FAIL",
        "provenance": "STATUTORY_APH_2024_27",
        "enabled": True,
    },
    {
        "rule_code": "RULE-STAT-IIC-REG",
        "rule_version": "1.0",
        "rule_name": "Institution's Innovation Council (IIC) Registration",
        "description": "Validates active IIC establishment certificate and registration identifier from MoE's Innovation Cell per Clause 6.51.",
        "rule_type": "REQUIRED_FIELD",
        "category": "INNOVATION",
        "applies_to": {"categories": ["EOA_TECHNICAL", "NEW_INSTITUTION", "STANDALONE_PGDM"]},
        "parameters": {
            "requirement_id": "REQ-0042",
            "source_document": "AICTE_APH_2024-27.pdf",
            "clause": "6.51",
            "pdf_page": 83,
            "document_type": "DOC_MANDATORY_DISC",
            "aliases": ["mandatory_disclosure", "iic_certificate"],
            "field_key": "iic_registration_number",
            "pattern": r"\b(IIC-[A-Z0-9\-]{4,20})\b",
            "human_review_required": False,
        },
        "severity": "MEDIUM",
        "on_fail_status": "NEEDS_REVIEW",
        "provenance": "STATUTORY_APH_2024_27",
        "enabled": True,
    },
    {
        "rule_code": "RULE-STAT-EWS-RESERVATION",
        "rule_version": "1.0",
        "rule_name": "Economically Weaker Section (EWS) 10% Reservation & 1.25x Intake",
        "description": "Verifies that institutions operating EWS reservation allocate up to 1.25 times the intake per Clause 6.37.",
        "rule_type": "FIELD_EQUALS_APPLICATION",
        "category": "ADMISSIONS",
        "applies_to": {"categories": ["EOA_TECHNICAL", "NEW_INSTITUTION"]},
        "parameters": {
            "requirement_id": "REQ-0035",
            "source_document": "AICTE_APH_2024-27.pdf",
            "clause": "6.37",
            "pdf_page": 74,
            "document_type": "DOC_MANDATORY_DISC",
            "app_field": "approved_intake",
            "doc_field": "approved_intake",
            "multiplier": 1.25,
            "human_review_required": False,
        },
        "severity": "HIGH",
        "on_fail_status": "NEEDS_REVIEW",
        "provenance": "STATUTORY_APH_2024_27",
        "enabled": True,
    },
    {
        "rule_code": "RULE-STAT-TFW-QUOTA",
        "rule_version": "1.0",
        "rule_name": "Tuition Fee Waiver (TFW) 5% Supernumerary Quota Ceiling",
        "description": "Verifies that Tuition Fee Waiver supernumerary seats do not exceed 5% of Approved Intake per Course per Clause 6.42(a).",
        "rule_type": "FIELD_EQUALS_APPLICATION",
        "category": "ADMISSIONS",
        "applies_to": {"categories": ["EOA_TECHNICAL", "NEW_INSTITUTION"]},
        "parameters": {
            "requirement_id": "REQ-0036",
            "source_document": "AICTE_APH_2024-27.pdf",
            "clause": "6.42 (a)",
            "pdf_page": 75,
            "document_type": "DOC_MANDATORY_DISC",
            "ceiling_ratio": 0.05,
            "human_review_required": False,
        },
        "severity": "HIGH",
        "on_fail_status": "NEEDS_REVIEW",
        "provenance": "STATUTORY_APH_2024_27",
        "enabled": True,
    },
    {
        "rule_code": "RULE-STAT-LAND-LEASE",
        "rule_version": "1.0",
        "rule_name": "Minimum 30-Year Registered Land Lease & Live Lease Term",
        "description": "Verifies that leased institutional land possesses a minimum registered duration of 30 years and live lease >= course duration per Clause 6.17(a).",
        "rule_type": "REQUIRED_FIELD",
        "category": "INFRASTRUCTURE",
        "applies_to": {"categories": ["NEW_INSTITUTION"]},
        "parameters": {
            "requirement_id": "REQ-0029",
            "source_document": "AICTE_APH_2024-27.pdf",
            "clause": "6.17 (a)",
            "pdf_page": 72,
            "document_type": "DOC_CERTIFICATE_1",
            "aliases": ["certificate_1", "land_deed", "advocate_certificate"],
            "field_key": "lease_duration_years",
            "minimum_years": 30,
            "human_review_required": True,
        },
        "severity": "HIGH",
        "on_fail_status": "FAIL",
        "provenance": "STATUTORY_APH_2024_27",
        "enabled": True,
    },
    {
        "rule_code": "RULE-STAT-LAND-CONTIGUOUS",
        "rule_version": "1.0",
        "rule_name": "Contiguous Land Plots (Maximum 3 Plots <= 2km Distance)",
        "description": "Validates that institutional campus comprises at most 3 plots with inter-plot distance not exceeding 2 km per Clause 6.17(d).",
        "rule_type": "REQUIRED_FIELD",
        "category": "INFRASTRUCTURE",
        "applies_to": {"categories": ["NEW_INSTITUTION"]},
        "parameters": {
            "requirement_id": "REQ-0030",
            "source_document": "AICTE_APH_2024-27.pdf",
            "clause": "6.17 (d)",
            "pdf_page": 73,
            "document_type": "DOC_CERTIFICATE_1",
            "aliases": ["certificate_1", "land_survey"],
            "field_key": "plot_count",
            "max_plots": 3,
            "max_distance_km": 2.0,
            "human_review_required": True,
        },
        "severity": "HIGH",
        "on_fail_status": "FAIL",
        "provenance": "STATUTORY_APH_2024_27",
        "enabled": True,
    },
    {
        "rule_code": "RULE-STAT-FIRE-NOC",
        "rule_version": "1.0",
        "rule_name": "Mandatory Fire Safety Certificate & Unexpired Validity",
        "description": "Verifies that an authentic Fire Safety Certificate issued by State Fire Department is submitted and unexpired per Clause 6.17(i).",
        "rule_type": "EXPIRY_CHECK",
        "category": "SAFETY",
        "applies_to": {"categories": ["NEW_INSTITUTION", "EOA_TECHNICAL", "STANDALONE_PGDM", "UNIVERSITY_TECHNICAL"]},
        "parameters": {
            "requirement_id": "REQ-0033",
            "source_document": "AICTE_APH_2024-27.pdf",
            "clause": "6.17 (i)",
            "pdf_page": 73,
            "document_type": "DOC_FIRE_SAFETY",
            "aliases": ["fire_safety", "fire_noc", "fire_certificate"],
            "field_key": "certificate_expiry_date",
            "tolerance_days": 0,
            "human_review_required": False,
        },
        "severity": "HIGH",
        "on_fail_status": "FAIL",
        "provenance": "STATUTORY_APH_2024_27",
        "enabled": True,
    },
    {
        "rule_code": "RULE-STAT-OCCUPANCY-CERT",
        "rule_version": "1.0",
        "rule_name": "Valid Occupancy / Completion Certificate from Competent Authority",
        "description": "Validates submission of Occupancy / Completion Certificate from Competent Authority listed in Annexure-14 per Clause 6.17(g).",
        "rule_type": "REQUIRED_DOCUMENT",
        "category": "INFRASTRUCTURE",
        "applies_to": {"categories": ["NEW_INSTITUTION", "EOA_TECHNICAL", "STANDALONE_PGDM", "UNIVERSITY_TECHNICAL"]},
        "parameters": {
            "requirement_id": "REQ-0031",
            "source_document": "AICTE_APH_2024-27.pdf",
            "clause": "6.17 (g)",
            "pdf_page": 73,
            "document_type": "DOC_OCCUPANCY_CERT",
            "aliases": ["occupancy_certificate", "completion_certificate", "form_d"],
            "human_review_required": True,
        },
        "severity": "HIGH",
        "on_fail_status": "FAIL",
        "provenance": "STATUTORY_APH_2024_27",
        "enabled": True,
    },
    {
        "rule_code": "RULE-STAT-STUDENT-PC-RATIO",
        "rule_version": "1.0",
        "rule_name": "Student to PC Ratio Compliance (1:10 UG Engineering)",
        "description": "Checks that computing equipment inventory provides at least 1 PC for every 10 students in UG Engineering per Annexure 4.1.",
        "rule_type": "REQUIRED_FIELD",
        "category": "EQUIPMENT",
        "applies_to": {"categories": ["NEW_INSTITUTION", "EOA_TECHNICAL"]},
        "parameters": {
            "requirement_id": "REQ-0054",
            "source_document": "AICTE_APH_2024-27.pdf",
            "clause": "Annexure 4.1",
            "pdf_page": 108,
            "document_type": "DOC_MANDATORY_DISC",
            "aliases": ["mandatory_disclosure", "computer_inventory"],
            "field_key": "computer_count",
            "student_pc_ratio": 10.0,
            "min_pcs_per_dept": 20,
            "human_review_required": False,
        },
        "severity": "MEDIUM",
        "on_fail_status": "NEEDS_REVIEW",
        "provenance": "STATUTORY_APH_2024_27",
        "enabled": True,
    },
    {
        "rule_code": "RULE-STAT-INTERNET-BANDWIDTH",
        "rule_version": "1.0",
        "rule_name": "Minimum Internet Bandwidth (100 Mbps <= 300 Intake)",
        "description": "Verifies that institutional broadband subscription provides minimum 100 Mbps for intake up to 300 students per Annexure 4.1.",
        "rule_type": "REQUIRED_FIELD",
        "category": "EQUIPMENT",
        "applies_to": {"categories": ["NEW_INSTITUTION", "EOA_TECHNICAL", "STANDALONE_PGDM"]},
        "parameters": {
            "requirement_id": "REQ-0054",
            "source_document": "AICTE_APH_2024-27.pdf",
            "clause": "Annexure 4.1",
            "pdf_page": 108,
            "document_type": "DOC_MANDATORY_DISC",
            "aliases": ["mandatory_disclosure", "isp_bill"],
            "field_key": "internet_bandwidth_mbps",
            "minimum_bandwidth_mbps": 100.0,
            "human_review_required": False,
        },
        "severity": "MEDIUM",
        "on_fail_status": "NEEDS_REVIEW",
        "provenance": "STATUTORY_APH_2024_27",
        "enabled": True,
    },
    {
        "rule_code": "RULE-STAT-PGDM-CAT-WEIGHT",
        "rule_version": "1.0",
        "rule_name": "PGDM Common Admission Test Weightage (35% to 60%)",
        "description": "Checks that Standalone PGDM merit computation allocates between 35% and 60% weightage to national admission tests per Annexure 6.5.",
        "rule_type": "REQUIRED_FIELD",
        "category": "ADMISSIONS",
        "applies_to": {"categories": ["STANDALONE_PGDM"]},
        "parameters": {
            "requirement_id": "REQ-0058",
            "source_document": "AICTE_APH_2024-27.pdf",
            "clause": "Annexure 6.5",
            "pdf_page": 113,
            "document_type": "DOC_MANDATORY_DISC",
            "field_key": "admission_test_weight_percent",
            "min_weight": 35.0,
            "max_weight": 60.0,
            "human_review_required": True,
        },
        "severity": "HIGH",
        "on_fail_status": "NEEDS_REVIEW",
        "provenance": "STATUTORY_APH_2024_27",
        "enabled": True,
    },
    {
        "rule_code": "RULE-STAT-UNIV-NO-PARTIAL",
        "rule_version": "1.0",
        "rule_name": "Prohibition on Partial University Technical Course Approvals",
        "description": "Verifies that University applicants apply for all technical programmes offering without partial omission per Clause 4.4.4(b).",
        "rule_type": "REQUIRED_DOCUMENT",
        "category": "GOVERNANCE",
        "applies_to": {"categories": ["UNIVERSITY_TECHNICAL"]},
        "parameters": {
            "requirement_id": "REQ-0026",
            "source_document": "AICTE_APH_2024-27.pdf",
            "clause": "4.4.4 (b)",
            "pdf_page": 55,
            "document_type": "DOC_AFFIDAVIT_2",
            "aliases": ["affidavit_2", "university_undertaking"],
            "human_review_required": True,
        },
        "severity": "HIGH",
        "on_fail_status": "FAIL",
        "provenance": "STATUTORY_APH_2024_27",
        "enabled": True,
    },
]

ALL_SYSTEM_RULES: List[Dict[str, Any]] = DEFAULT_SYNTHETIC_RULES + STATUTORY_AICTE_RULES


def ensure_default_rules(db: Session) -> List[ValidationRule]:
    """Ensure baseline synthetic and statutory rules exist in database idempotently."""
    existing_rules = {r.rule_code: r for r in db.scalars(select(ValidationRule)).all()}
    added = False
    for r_data in ALL_SYSTEM_RULES:
        if r_data["rule_code"] not in existing_rules:
            rule = ValidationRule(**r_data)
            db.add(rule)
            added = True
    if added:
        db.flush()
    return list(db.scalars(select(ValidationRule).order_by(ValidationRule.rule_code)).all())


# ---------------------------------------------------------------------------
# Date Parsing & Normalization Utility
# ---------------------------------------------------------------------------
def parse_date_string(raw: Optional[str]) -> Tuple[Optional[date], bool, Optional[str]]:
    """Parse string date into date object with explicit format handling.
    Returns: (parsed_date, is_ambiguous, error_reason)
    """
    if not raw or not isinstance(raw, str) or not raw.strip():
        return None, False, "EMPTY_DATE"

    s = raw.strip()

    # 1. ISO 8601 YYYY-MM-DD
    iso_match = re.search(r"\b(\d{4})-(\d{2})-(\d{2})\b", s)
    if iso_match:
        try:
            d = date(int(iso_match.group(1)), int(iso_match.group(2)), int(iso_match.group(3)))
            return d, False, None
        except ValueError:
            return None, False, "INVALID_ISO_DATE"

    # 2. DD/MM/YYYY or DD-MM-YYYY
    dmy_match = re.search(r"\b(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})\b", s)
    if dmy_match:
        p1 = int(dmy_match.group(1))
        p2 = int(dmy_match.group(2))
        yr = int(dmy_match.group(3))

        # Check ambiguity if both p1 and p2 <= 12
        is_ambiguous = (1 <= p1 <= 12) and (1 <= p2 <= 12) and (p1 != p2)

        try:
            # Default to DD/MM/YYYY per Indian regulatory standards
            d = date(yr, p2, p1)
            return d, is_ambiguous, None
        except ValueError:
            try:
                d = date(yr, p1, p2)
                return d, True, None
            except ValueError:
                return None, False, "INVALID_DMY_DATE"

    # 3. Textual Month: "31 March 2027" or "March 31, 2027"
    months = {
        "jan": 1, "january": 1,
        "feb": 2, "february": 2,
        "mar": 3, "march": 3,
        "apr": 4, "april": 4,
        "may": 5,
        "jun": 6, "june": 6,
        "jul": 7, "july": 7,
        "aug": 8, "august": 8,
        "sep": 9, "september": 9,
        "oct": 10, "october": 10,
        "nov": 11, "november": 11,
        "dec": 12, "december": 12,
    }
    month_pattern = r"\b(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\b"
    m_match = re.search(month_pattern, s)
    if m_match:
        day = int(m_match.group(1))
        m_name = m_match.group(2).lower()
        yr = int(m_match.group(3))
        if m_name in months:
            try:
                return date(yr, months[m_name], day), False, None
            except ValueError:
                return None, False, "INVALID_MONTH_DATE"

    return None, False, "UNPARSEABLE_DATE_FORMAT"


# ---------------------------------------------------------------------------
# Document Matching & Text Extraction Helpers
# ---------------------------------------------------------------------------
def find_matching_document(
    doc_type: str,
    aliases: List[str],
    documents: List[Document],
) -> Optional[Document]:
    """Find document matching a target type or its known aliases."""
    normalized_target = doc_type.upper().replace("-", "_").replace(" ", "_")
    alias_set = {a.upper().replace("-", "_").replace(" ", "_") for a in aliases}
    alias_set.add(normalized_target)

    # Add canonical resolution
    canon = resolve_document_type(doc_type)
    if canon:
        alias_set.add(canon.upper())
    for a in list(alias_set):
        resolved = resolve_document_type(a)
        if resolved:
            alias_set.add(resolved.upper())

    # 1. Exact match on effective_type, declared_type, or detected_type
    for doc in documents:
        if doc.file_state == "DELETED":
            continue
        effective = (doc.effective_type or doc.declared_type or doc.detected_type or "").upper().replace("-", "_").replace(" ", "_")
        effective_canon = (resolve_document_type(effective) or effective).upper()
        if (effective and effective in alias_set) or (effective_canon and effective_canon in alias_set):
            return doc

    # 2. Check original_filename containing target tokens
    for doc in documents:
        if doc.file_state == "DELETED":
            continue
        fname = doc.original_filename.upper().replace("-", "_").replace(" ", "_")
        for alias in alias_set:
            if len(alias) >= 4 and alias in fname:
                return doc

    return None


def resolve_document_field_with_evidence(
    field_key: str,
    doc: Document,
    pattern: Optional[str] = None,
) -> Dict[str, Any]:
    """Extract field with structured provenance and snippet from document.
    Prioritizes ExtractedField database records, then falls back to regex scans on pages.
    """
    evidence: Dict[str, Any] = {
        "value": None,
        "numeric_value": None,
        "page_number": None,
        "text_source": None,
        "ocr_confidence": None,
        "evidence_snippet": None,
        "bounding_box": None,
        "extraction_method": None,
    }

    # 1. Check ExtractedField entities on document
    if getattr(doc, "extracted_fields", None):
        for ef in doc.extracted_fields:
            if not getattr(ef, "is_current", True):
                continue
            matches_key = (
                ef.field_key == field_key
                or (field_key == "faculty_count" and ef.field_key == "total_faculty_count")
                or (field_key == "total_faculty_count" and ef.field_key == "faculty_count")
                or (field_key == "tfw_quota_seats" and ef.field_key == "tfw_supernumerary_quota")
            )
            if matches_key:
                val_str = str(ef.normalized_value or ef.raw_value or "").strip()
                if val_str:
                    evidence["value"] = val_str
                    evidence["page_number"] = ef.page_number
                    evidence["text_source"] = ef.extraction_method or "EXTRACTED_FIELD"
                    evidence["ocr_confidence"] = ef.confidence
                    evidence["extraction_method"] = ef.extraction_method
                    cands = ef.candidate_values or {}
                    if isinstance(cands, dict):
                        evidence["evidence_snippet"] = cands.get("evidence_snippet")
                        evidence["bounding_box"] = cands.get("bounding_box")
                    # Try parsing float
                    num_match = re.search(r"[-+]?(?:\d*\.\d+|\d+)", val_str)
                    if num_match:
                        try:
                            evidence["numeric_value"] = float(num_match.group(0))
                        except ValueError:
                            pass
                    return evidence

    # 2. Regex scans across pages
    if not doc.pages:
        return evidence

    for page in doc.pages:
        text = page.clean_text or page.raw_text
        if not text:
            continue

        matched_val: Optional[str] = None
        matched_span: Optional[Tuple[int, int]] = None

        if pattern:
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                matched_val = m.group(1).strip()
                matched_span = m.span()

        if not matched_val:
            # Field-specific regexes
            if field_key == "certificate_number":
                m = re.search(
                    r"\b(?:cert(?:ificate)?|reg(?:istration)?|licen[sc]e|accreditation|ref(?:erence)?)\s*(?:no|number|num|id|code)?[\s.:#-]+((?=[A-Z0-9\-\/]*\d)[A-Z0-9\-\/]{3,30})\b",
                    text,
                    re.IGNORECASE,
                )
                if m:
                    matched_val = m.group(1).strip()
                    matched_span = m.span()

            elif field_key in ("certificate_expiry_date", "expiry_date", "valid_until"):
                m = re.search(
                    r"(?:valid\s*(?:upto|until|to|through)|expiry\s*(?:date)?|expires\s*(?:on)?|validity[\s.:]*to)[\s.:#-]*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}[-\/\.][0-9]{1,2}[-\/\.][0-9]{2,4}|[0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})",
                    text,
                    re.IGNORECASE,
                )
                if m:
                    matched_val = m.group(1).strip()
                    matched_span = m.span()

            elif field_key in ("approved_intake", "intake"):
                m = re.search(
                    r"(?:approved\s*intake|intake\s*capacity|total\s*intake|intake)[\s.:#-]*([0-9]{1,4})\b",
                    text,
                    re.IGNORECASE,
                )
                if m:
                    matched_val = m.group(1).strip()
                    matched_span = m.span()

            elif field_key == "administrative_area_sqm":
                m = re.search(
                    r"(?:administrative\s*(?:carpet)?\s*area|admin\s*area|admin\s*carpet\s*area)[\s.:#-]*([0-9]+(?:\.[0-9]+)?)\b",
                    text,
                    re.IGNORECASE,
                )
                if m:
                    matched_val = m.group(1).strip()
                    matched_span = m.span()

            elif field_key == "amenities_area_sqm":
                m = re.search(
                    r"(?:amenities\s*(?:carpet)?\s*area|amenity\s*area|amenity\s*carpet\s*area)[\s.:#-]*([0-9]+(?:\.[0-9]+)?)\b",
                    text,
                    re.IGNORECASE,
                )
                if m:
                    matched_val = m.group(1).strip()
                    matched_span = m.span()

            elif field_key == "classroom_carpet_area_sqm":
                m = re.search(
                    r"(?:classroom\s*(?:carpet)?\s*area|class\s*room\s*area|room\s*carpet\s*area)[\s.:#-]*([0-9]+(?:\.[0-9]+)?)\b",
                    text,
                    re.IGNORECASE,
                )
                if m:
                    matched_val = m.group(1).strip()
                    matched_span = m.span()

            elif field_key == "land_area_acres":
                m = re.search(
                    r"(?:total\s*land\s*area|land\s*area|campus\s*area)[\s.:#-]*([0-9]+(?:\.[0-9]+)?)\s*(?:acres?|acre)?\b",
                    text,
                    re.IGNORECASE,
                )
                if m:
                    matched_val = m.group(1).strip()
                    matched_span = m.span()

            elif field_key in ("total_faculty_count", "faculty_count"):
                m = re.search(
                    r"(?:total\s*faculty\s*count|total\s*faculty|faculty\s*strength|teaching\s*staff)[\s.:#-]*([0-9]{1,4})\b",
                    text,
                    re.IGNORECASE,
                )
                if m:
                    matched_val = m.group(1).strip()
                    matched_span = m.span()

            elif field_key == "professor_count":
                m = re.search(
                    r"(?:(?:full\s*)?professors?|cadre\s*professor)[\s.:#-]*([0-9]{1,3})\b",
                    text,
                    re.IGNORECASE,
                )
                if m:
                    matched_val = m.group(1).strip()
                    matched_span = m.span()

            elif field_key == "associate_professor_count":
                m = re.search(
                    r"(?:associate\s*professors?)[\s.:#-]*([0-9]{1,3})\b",
                    text,
                    re.IGNORECASE,
                )
                if m:
                    matched_val = m.group(1).strip()
                    matched_span = m.span()

            elif field_key == "assistant_professor_count":
                m = re.search(
                    r"(?:assistant\s*professors?)[\s.:#-]*([0-9]{1,3})\b",
                    text,
                    re.IGNORECASE,
                )
                if m:
                    matched_val = m.group(1).strip()
                    matched_span = m.span()

            elif field_key == "lease_duration_years":
                m = re.search(
                    r"(?:lease\s*(?:period|term|duration)|registered\s*lease)[\s.:#-]*([0-9]{1,3})\s*(?:years?|yrs)?\b",
                    text,
                    re.IGNORECASE,
                )
                if m:
                    matched_val = m.group(1).strip()
                    matched_span = m.span()

            elif field_key == "plot_count":
                m = re.search(
                    r"(?:number\s*of\s*plots?|plot\s*count|total\s*plots?)[\s.:#-]*([0-9]{1,2})\b",
                    text,
                    re.IGNORECASE,
                )
                if m:
                    matched_val = m.group(1).strip()
                    matched_span = m.span()

            elif field_key == "internet_bandwidth_mbps":
                m = re.search(
                    r"(?:internet\s*bandwidth|bandwidth|broadband\s*speed)[\s.:#-]*([0-9]+(?:\.[0-9]+)?)\s*(?:mbps|gbps)?\b",
                    text,
                    re.IGNORECASE,
                )
                if m:
                    matched_val = m.group(1).strip()
                    matched_span = m.span()

            elif field_key == "computer_count":
                m = re.search(
                    r"(?:total\s*computers?|number\s*of\s*pcs?|computer\s*count|total\s*pcs?)[\s.:#-]*([0-9]{1,5})\b",
                    text,
                    re.IGNORECASE,
                )
                if m:
                    matched_val = m.group(1).strip()
                    matched_span = m.span()

            elif field_key == "admission_test_weight_percent":
                m = re.search(
                    r"(?:test\s*weightage|admission\s*test\s*weight|cat\s*weightage)[\s.:#-]*([0-9]+(?:\.[0-9]+)?)\s*%?\b",
                    text,
                    re.IGNORECASE,
                )
                if m:
                    matched_val = m.group(1).strip()
                    matched_span = m.span()

            elif field_key in ("tfw_quota_seats", "tfw_supernumerary_quota"):
                m = re.search(
                    r"(?:tfw\s*(?:supernumerary\s*)?seats?|tuition\s*fee\s*waiver\s*(?:supernumerary\s*)?seats?|tfw\s*quota)[\s.:#-]*([0-9]{1,3})\b",
                    text,
                    re.IGNORECASE,
                )
                if m:
                    matched_val = m.group(1).strip()
                    matched_span = m.span()

            elif field_key == "iic_registration_number":
                m = re.search(
                    r"\b(IIC-[A-Z0-9\-]{4,20})\b",
                    text,
                    re.IGNORECASE,
                )
                if m:
                    matched_val = m.group(1).strip()
                    matched_span = m.span()

        if matched_val:
            evidence["value"] = matched_val
            evidence["page_number"] = page.page_number
            evidence["text_source"] = page.text_source or "DIGITAL_TEXT"
            evidence["ocr_confidence"] = page.ocr_mean_confidence
            evidence["extraction_method"] = "REGEX"
            if matched_span:
                start = max(0, matched_span[0] - 40)
                end = min(len(text), matched_span[1] + 40)
                evidence["evidence_snippet"] = text[start:end].replace("\n", " ").strip()
            num_match = re.search(r"[-+]?(?:\d*\.\d+|\d+)", matched_val)
            if num_match:
                try:
                    evidence["numeric_value"] = float(num_match.group(0))
                except ValueError:
                    pass
            return evidence

    return evidence


def extract_field_from_pages(
    field_key: str,
    doc: Document,
    pattern: Optional[str] = None,
) -> Tuple[Optional[str], Optional[int], Optional[str], Optional[float]]:
    """Scan document pages for field value using regex heuristics.
    Returns: (extracted_value, page_number, text_source, ocr_confidence)
    """
    res = resolve_document_field_with_evidence(field_key, doc, pattern)
    return res["value"], res["page_number"], res["text_source"], res["ocr_confidence"]


# ---------------------------------------------------------------------------
# Individual Rule Evaluators
# ---------------------------------------------------------------------------
def evaluate_required_document(
    rule: ValidationRule,
    app: Application,
    documents: List[Document],
    evaluation_date: date,
) -> RuleResult:
    """Rule Type A: REQUIRED_DOCUMENT with Statutory Governance Committee Verification."""
    params = rule.parameters or {}
    doc_type = params.get("document_type", "MANDATORY_DOCUMENT")
    aliases = params.get("aliases", [])

    matching_doc = find_matching_document(doc_type, aliases, documents)

    if matching_doc:
        target_key = f"doc:{matching_doc.id}"
        # Check processing status
        if matching_doc.processing_status in ("QUEUED", "PROCESSING"):
            return RuleResult(
                rule_id=rule.id,
                application_id=app.id,
                rule_code=rule.rule_code,
                rule_version=rule.rule_version,
                rule_type=rule.rule_type,
                target_key=target_key,
                status="NEEDS_REVIEW",
                severity=rule.severity,
                explanation=f"Required document '{doc_type}' is uploaded ({matching_doc.original_filename}) but text extraction is currently in progress ({matching_doc.processing_status}). Scrutiny cannot conclude until extraction finishes.",
                expected_value="COMPLETED",
                observed_value=matching_doc.processing_status,
                source_document_id=matching_doc.id,
                inputs_status="PARTIAL",
                human_review_required=True,
                unresolved_reason="DOCUMENT_PROCESSING_INCOMPLETE",
                evidence_payload={
                    "document_id": matching_doc.id,
                    "filename": matching_doc.original_filename,
                    "processing_status": matching_doc.processing_status,
                    "file_size_bytes": matching_doc.file_size_bytes,
                },
                evaluation_date_used=evaluation_date,
            )
        elif matching_doc.processing_status == "FAILED":
            return RuleResult(
                rule_id=rule.id,
                application_id=app.id,
                rule_code=rule.rule_code,
                rule_version=rule.rule_version,
                rule_type=rule.rule_type,
                target_key=target_key,
                status="NEEDS_REVIEW",
                severity=rule.severity,
                explanation=f"Required document '{doc_type}' is uploaded ({matching_doc.original_filename}) but automated text extraction failed. Manual review of the document file is required.",
                expected_value="COMPLETED",
                observed_value="FAILED",
                source_document_id=matching_doc.id,
                inputs_status="PARTIAL",
                human_review_required=True,
                unresolved_reason="EXTRACTION_FAILED",
                evidence_payload={
                    "document_id": matching_doc.id,
                    "filename": matching_doc.original_filename,
                    "processing_status": "FAILED",
                },
                evaluation_date_used=evaluation_date,
            )
        elif matching_doc.processing_status in ("COMPLETED", "COMPLETED_WITH_WARNINGS"):
            # Check statutory mandatory governance committees (REQ-0038 to REQ-0041)
            if rule.rule_code in ("RULE-STAT-ANTI-RAGGING", "RULE-STAT-INTERNAL-COMM", "RULE-STAT-SC-ST-COMM", "RULE-STAT-SGRC-OMBUDSMAN"):
                committee_keywords = {
                    "RULE-STAT-ANTI-RAGGING": ["anti-ragging", "anti ragging", "ragging squad", "ragging committee", "prohibition of ragging"],
                    "RULE-STAT-INTERNAL-COMM": ["internal committee", "posh", "gender sensitization", "internal complaints committee", "icc presiding officer"],
                    "RULE-STAT-SC-ST-COMM": ["sc/st", "sc / st", "prevention of atrocities", "scheduled caste", "sc and st committee"],
                    "RULE-STAT-SGRC-OMBUDSMAN": ["ombudsman", "sgrc", "student grievance", "grievance redressal committee", "university ombudsman"],
                }
                kw_list = committee_keywords.get(rule.rule_code, [])
                found_kw = False
                matched_page = None
                matched_snippet = None
                for page in matching_doc.pages or []:
                    p_text = (page.clean_text or page.raw_text or "").lower()
                    for kw in kw_list:
                        if kw in p_text:
                            found_kw = True
                            matched_page = page.page_number
                            idx = p_text.find(kw)
                            orig_text = page.clean_text or page.raw_text or ""
                            matched_snippet = orig_text[max(0, idx - 30):min(len(orig_text), idx + 70)].replace("\n", " ").strip()
                            break
                    if found_kw:
                        break

                if found_kw:
                    return RuleResult(
                        rule_id=rule.id,
                        application_id=app.id,
                        rule_code=rule.rule_code,
                        rule_version=rule.rule_version,
                        rule_type=rule.rule_type,
                        target_key=target_key,
                        status="PASS",
                        severity=rule.severity,
                        explanation=f"Statutory mandate for '{rule.rule_name}' confirmed in uploaded Affidavit 2 ({matching_doc.original_filename}, Page {matched_page}) per APH 2024-27 Clause {params.get('clause', '')}.",
                        expected_value=f"Mandatory clause per Clause {params.get('clause', '')}",
                        observed_value="CLAUSE_CONFIRMED",
                        source_document_id=matching_doc.id,
                        source_page_number=matched_page,
                        inputs_status="ALL_AVAILABLE",
                        human_review_required=False,
                        evidence_payload={
                            "document_id": matching_doc.id,
                            "filename": matching_doc.original_filename,
                            "page_number": matched_page,
                            "evidence_snippet": matched_snippet,
                            "requirement_id": params.get("requirement_id"),
                            "clause": params.get("clause"),
                        },
                        evaluation_date_used=evaluation_date,
                    )
                else:
                    return RuleResult(
                        rule_id=rule.id,
                        application_id=app.id,
                        rule_code=rule.rule_code,
                        rule_version=rule.rule_version,
                        rule_type=rule.rule_type,
                        target_key=target_key,
                        status="NEEDS_REVIEW",
                        severity=rule.severity,
                        explanation=f"Mandatory document Affidavit 2 is uploaded, but specific statutory clause for '{rule.rule_name}' could not be automatically confirmed in text. Scrutiny official must inspect the physical affidavit per Clause {params.get('clause', '')}.",
                        expected_value=f"Clause {params.get('clause', '')} in Affidavit 2",
                        observed_value="CLAUSE_NOT_FOUND_IN_TEXT",
                        source_document_id=matching_doc.id,
                        inputs_status="PARTIAL",
                        human_review_required=True,
                        unresolved_reason="COMMITTEE_CLAUSE_NEEDS_SCRUTINY",
                        evidence_payload={
                            "document_id": matching_doc.id,
                            "filename": matching_doc.original_filename,
                            "pages_examined": len(matching_doc.pages or []),
                        },
                        evaluation_date_used=evaluation_date,
                    )

            return RuleResult(
                rule_id=rule.id,
                application_id=app.id,
                rule_code=rule.rule_code,
                rule_version=rule.rule_version,
                rule_type=rule.rule_type,
                target_key=target_key,
                status="PASS",
                severity=rule.severity,
                explanation=f"Mandatory document '{doc_type}' is present and processed successfully ({matching_doc.original_filename}, {matching_doc.page_count or 1} page(s)).",
                expected_value="PRESENT_AND_PROCESSED",
                observed_value="COMPLETED",
                source_document_id=matching_doc.id,
                inputs_status="ALL_AVAILABLE",
                human_review_required=False,
                evidence_payload={
                    "document_id": matching_doc.id,
                    "filename": matching_doc.original_filename,
                    "page_count": matching_doc.page_count,
                    "extraction_quality": matching_doc.extraction_quality_band,
                    "sha256": matching_doc.sha256,
                },
                evaluation_date_used=evaluation_date,
            )
        else:  # MANUAL_REVIEW_REQUIRED
            return RuleResult(
                rule_id=rule.id,
                application_id=app.id,
                rule_code=rule.rule_code,
                rule_version=rule.rule_version,
                rule_type=rule.rule_type,
                target_key=target_key,
                status="NEEDS_REVIEW",
                severity=rule.severity,
                explanation=f"Required document '{doc_type}' is present but flagged for manual review during extraction quality checks.",
                expected_value="COMPLETED",
                observed_value=matching_doc.processing_status,
                source_document_id=matching_doc.id,
                inputs_status="PARTIAL",
                human_review_required=True,
                unresolved_reason="MANUAL_REVIEW_REQUIRED",
                evidence_payload={"document_id": matching_doc.id, "filename": matching_doc.original_filename},
                evaluation_date_used=evaluation_date,
            )

    # Document missing
    in_flight = [d for d in documents if d.processing_status in ("QUEUED", "PROCESSING") and d.file_state != "DELETED"]
    if in_flight:
        return RuleResult(
            rule_id=rule.id,
            application_id=app.id,
            rule_code=rule.rule_code,
            rule_version=rule.rule_version,
            rule_type=rule.rule_type,
            target_key=f"doc_type:{doc_type}",
            status="NEEDS_REVIEW",
            severity=rule.severity,
            explanation=f"Mandatory document '{doc_type}' has not been classified yet; {len(in_flight)} uploaded document(s) are still undergoing OCR processing.",
            expected_value=f"Document matching {doc_type}",
            observed_value="NOT_FOUND_IN_FLIGHT",
            inputs_status="PARTIAL",
            human_review_required=True,
            unresolved_reason="PENDING_IN_FLIGHT_DOCUMENTS",
            evidence_payload={"expected_type": doc_type, "pending_count": len(in_flight)},
            evaluation_date_used=evaluation_date,
        )

    return RuleResult(
        rule_id=rule.id,
        application_id=app.id,
        rule_code=rule.rule_code,
        rule_version=rule.rule_version,
        rule_type=rule.rule_type,
        target_key=f"doc_type:{doc_type}",
        status=rule.on_fail_status or "FAIL",
        severity=rule.severity,
        explanation=f"Mandatory document '{doc_type}' required for application category '{app.category_code}' is missing from the institutional submission.",
        expected_value=f"Document of type {doc_type}",
        observed_value="MISSING",
        inputs_status="UNAVAILABLE",
        human_review_required=True,
        unresolved_reason="DOCUMENT_NOT_SUBMITTED",
        evidence_payload={
            "expected_type": doc_type,
            "available_types": [d.effective_type or d.declared_type for d in documents if d.file_state != "DELETED"],
        },
        evaluation_date_used=evaluation_date,
    )


def evaluate_required_field(
    rule: ValidationRule,
    app: Application,
    documents: List[Document],
    evaluation_date: date,
) -> RuleResult:
    """Rule Type B: REQUIRED_FIELD with Statutory Mathematical and Numerical Rules."""
    params = rule.parameters or {}
    field_key = params.get("field_key", "certificate_number")
    doc_type = params.get("document_type")
    aliases = params.get("aliases", [doc_type] if doc_type else [])
    pattern = params.get("pattern")

    # If field is expected on a document
    if doc_type:
        matching_doc = find_matching_document(doc_type, aliases, documents)
        if not matching_doc:
            return RuleResult(
                rule_id=rule.id,
                application_id=app.id,
                rule_code=rule.rule_code,
                rule_version=rule.rule_version,
                rule_type=rule.rule_type,
                target_key=f"field:{field_key}",
                status="UNABLE_TO_EVALUATE",
                severity=rule.severity,
                explanation=f"Cannot evaluate required field '{field_key}'; supporting document '{doc_type}' is missing from the submission.",
                expected_value=f"Field {field_key} on {doc_type}",
                observed_value="SUPPORTING_DOC_MISSING",
                inputs_status="UNAVAILABLE",
                human_review_required=True,
                unresolved_reason="SUPPORTING_DOC_MISSING",
                evidence_payload={"field_key": field_key, "expected_document_type": doc_type},
                evaluation_date_used=evaluation_date,
            )

        if matching_doc.processing_status in ("QUEUED", "PROCESSING"):
            return RuleResult(
                rule_id=rule.id,
                application_id=app.id,
                rule_code=rule.rule_code,
                rule_version=rule.rule_version,
                rule_type=rule.rule_type,
                target_key=f"field:{field_key}",
                status="NEEDS_REVIEW",
                severity=rule.severity,
                explanation=f"Cannot evaluate field '{field_key}' because document '{matching_doc.original_filename}' is still processing ({matching_doc.processing_status}).",
                source_document_id=matching_doc.id,
                inputs_status="PARTIAL",
                human_review_required=True,
                unresolved_reason="DOCUMENT_PROCESSING_INCOMPLETE",
                evidence_payload={"document_id": matching_doc.id, "field_key": field_key},
                evaluation_date_used=evaluation_date,
            )

        # -------------------------------------------------------------------
        # Special Mathematical Case 1: RULE-STAT-CADRE-UG (Cadre Ratio 1:2:6)
        # -------------------------------------------------------------------
        if rule.rule_code == "RULE-STAT-CADRE-UG":
            p_ev = resolve_document_field_with_evidence("professor_count", matching_doc)
            assoc_ev = resolve_document_field_with_evidence("associate_professor_count", matching_doc)
            asst_ev = resolve_document_field_with_evidence("assistant_professor_count", matching_doc)
            tot_ev = resolve_document_field_with_evidence("total_faculty_count", matching_doc)

            p_cnt = p_ev["numeric_value"] if p_ev["numeric_value"] is not None else (app.declared_data or {}).get("professor_count")
            assoc_cnt = assoc_ev["numeric_value"] if assoc_ev["numeric_value"] is not None else (app.declared_data or {}).get("associate_professor_count")
            asst_cnt = asst_ev["numeric_value"] if asst_ev["numeric_value"] is not None else (app.declared_data or {}).get("assistant_professor_count")
            tot_cnt = tot_ev["numeric_value"] if tot_ev["numeric_value"] is not None else (app.declared_data or {}).get("total_faculty_count") or (app.declared_data or {}).get("faculty_count")

            if p_cnt is None and assoc_cnt is None and asst_cnt is None and tot_cnt is None:
                return RuleResult(
                    rule_id=rule.id,
                    application_id=app.id,
                    rule_code=rule.rule_code,
                    rule_version=rule.rule_version,
                    rule_type=rule.rule_type,
                    target_key=f"field:{field_key}",
                    status="UNABLE_TO_EVALUATE",
                    severity=rule.severity,
                    explanation=f"Cannot evaluate faculty cadre ratio; faculty cadre counts not identified on document '{matching_doc.original_filename}'. Scrutiny official must inspect payroll records directly.",
                    expected_value="1 : 2 : 6 Cadre Distribution",
                    observed_value="CADRE_COUNTS_NOT_FOUND",
                    source_document_id=matching_doc.id,
                    inputs_status="PARTIAL",
                    human_review_required=True,
                    unresolved_reason="FIELD_NOT_EXTRACTED",
                    evidence_payload={"document_id": matching_doc.id},
                    evaluation_date_used=evaluation_date,
                )

            p = int(p_cnt or 0)
            assoc = int(assoc_cnt or 0)
            asst = int(asst_cnt or 0)
            tot = int(tot_cnt or (p + assoc + asst))

            if p == 0 and (assoc > 0 or asst > 0 or tot > 0):
                return RuleResult(
                    rule_id=rule.id,
                    application_id=app.id,
                    rule_code=rule.rule_code,
                    rule_version=rule.rule_version,
                    rule_type=rule.rule_type,
                    target_key=f"field:{field_key}",
                    status="NEEDS_REVIEW",
                    severity=rule.severity,
                    explanation=f"Faculty cadre deficiency: Zero Professors reported (Prof: 0, Assoc: {assoc}, Asst: {asst}, Total: {tot}). AICTE APH 2024-27 Annexure 5.2 mandates a cadre ratio of 1 Professor : 2 Associate Professors : 6 Assistant Professors. Mandatory human review required.",
                    expected_value="1 : 2 : 6 Cadre Distribution",
                    observed_value=f"Prof: 0, Assoc: {assoc}, Asst: {asst}",
                    source_document_id=matching_doc.id,
                    source_page_number=p_ev["page_number"] or assoc_ev["page_number"],
                    inputs_status="ALL_AVAILABLE",
                    human_review_required=True,
                    unresolved_reason="ZERO_PROFESSORS_REPORTED",
                    evidence_payload={
                        "professor_count": p,
                        "associate_professor_count": assoc,
                        "assistant_professor_count": asst,
                        "total_faculty": tot,
                        "cadre_ratio_observed": f"{p}:{assoc}:{asst}",
                        "cadre_ratio_mandated": "1:2:6",
                        "clause": params.get("clause", "Annexure 5.2"),
                        "evidence_snippet": p_ev["evidence_snippet"] or assoc_ev["evidence_snippet"],
                    },
                    evaluation_date_used=evaluation_date,
                )
            else:
                return RuleResult(
                    rule_id=rule.id,
                    application_id=app.id,
                    rule_code=rule.rule_code,
                    rule_version=rule.rule_version,
                    rule_type=rule.rule_type,
                    target_key=f"field:{field_key}",
                    status="PASS",
                    severity=rule.severity,
                    explanation=f"Faculty cadre distribution conforms to statutory ratio ({p} Prof : {assoc} Assoc : {asst} Asst, Total: {tot}) per APH 2024-27 Annexure 5.2.",
                    expected_value="1 : 2 : 6 Cadre Distribution",
                    observed_value=f"Prof: {p}, Assoc: {assoc}, Asst: {asst}",
                    source_document_id=matching_doc.id,
                    source_page_number=p_ev["page_number"] or assoc_ev["page_number"],
                    inputs_status="ALL_AVAILABLE",
                    human_review_required=False,
                    evidence_payload={
                        "professor_count": p,
                        "associate_professor_count": assoc,
                        "assistant_professor_count": asst,
                        "total_faculty": tot,
                        "cadre_ratio_observed": f"{p}:{assoc}:{asst}",
                        "evidence_snippet": p_ev["evidence_snippet"] or assoc_ev["evidence_snippet"],
                    },
                    evaluation_date_used=evaluation_date,
                )

        # -------------------------------------------------------------------
        # Special Mathematical Case 2: RULE-STAT-FSR-UG (FSR 1:20)
        # -------------------------------------------------------------------
        if rule.rule_code == "RULE-STAT-FSR-UG":
            intake_val = (app.declared_data or {}).get("approved_intake") or (app.declared_data or {}).get("intake")
            if intake_val is None:
                intake_ev = resolve_document_field_with_evidence("approved_intake", matching_doc)
                intake_val = intake_ev["numeric_value"]

            fac_ev = resolve_document_field_with_evidence("total_faculty_count", matching_doc)
            fac_cnt = fac_ev["numeric_value"]
            if fac_cnt is None:
                fac_ev2 = resolve_document_field_with_evidence("faculty_count", matching_doc)
                fac_cnt = fac_ev2["numeric_value"]
                if fac_cnt is not None:
                    fac_ev = fac_ev2
            if fac_cnt is None:
                fac_cnt = (app.declared_data or {}).get("total_faculty_count") or (app.declared_data or {}).get("faculty_count")

            if intake_val is None or fac_cnt is None:
                return RuleResult(
                    rule_id=rule.id,
                    application_id=app.id,
                    rule_code=rule.rule_code,
                    rule_version=rule.rule_version,
                    rule_type=rule.rule_type,
                    target_key=f"field:{field_key}",
                    status="UNABLE_TO_EVALUATE",
                    severity=rule.severity,
                    explanation=f"Cannot compute Faculty-Student Ratio (FSR); missing student intake ({intake_val}) or faculty count ({fac_cnt}) on document '{matching_doc.original_filename}'.",
                    expected_value="FSR <= 1:20",
                    observed_value="INSUFFICIENT_DATA",
                    source_document_id=matching_doc.id,
                    inputs_status="PARTIAL",
                    human_review_required=True,
                    unresolved_reason="INSUFFICIENT_EVIDENCE",
                    evidence_payload={"intake": intake_val, "faculty_count": fac_cnt},
                    evaluation_date_used=evaluation_date,
                )

            intake = float(intake_val)
            fac = float(fac_cnt)
            duration = 4.0  # UG Engineering 4 years
            total_students = intake * duration
            required_faculty = total_students / 20.0  # FSR 1:20
            effective_ratio = (total_students / fac) if fac > 0 else 999.0

            if fac >= required_faculty:
                return RuleResult(
                    rule_id=rule.id,
                    application_id=app.id,
                    rule_code=rule.rule_code,
                    rule_version=rule.rule_version,
                    rule_type=rule.rule_type,
                    target_key=f"field:{field_key}",
                    status="PASS",
                    severity=rule.severity,
                    explanation=f"Faculty-Student Ratio satisfies 1:20 norm: {int(fac)} faculty members for student strength {int(total_students)} (annual intake {int(intake)} x 4 years) yields effective ratio of 1:{effective_ratio:.1f} (statutory maximum 1:20) per APH 2024-27 Annexure 5.2.",
                    expected_value=f">= {int(required_faculty)} Faculty (FSR <= 1:20)",
                    observed_value=f"{int(fac)} Faculty (FSR 1:{effective_ratio:.1f})",
                    source_document_id=matching_doc.id,
                    source_page_number=fac_ev["page_number"],
                    inputs_status="ALL_AVAILABLE",
                    human_review_required=False,
                    evidence_payload={
                        "annual_intake": int(intake),
                        "student_strength": int(total_students),
                        "faculty_count": int(fac),
                        "required_faculty": int(required_faculty),
                        "effective_fsr": f"1:{effective_ratio:.1f}",
                        "statutory_ceiling": "1:20",
                        "evidence_snippet": fac_ev["evidence_snippet"],
                    },
                    evaluation_date_used=evaluation_date,
                )
            else:
                return RuleResult(
                    rule_id=rule.id,
                    application_id=app.id,
                    rule_code=rule.rule_code,
                    rule_version=rule.rule_version,
                    rule_type=rule.rule_type,
                    target_key=f"field:{field_key}",
                    status="FAIL",
                    severity=rule.severity,
                    explanation=f"Faculty-Student Ratio deficiency: Observed ratio 1:{effective_ratio:.1f} ({int(fac)} faculty for {int(total_students)} students) violates statutory ceiling 1:20. Minimum {int(required_faculty)} full-time faculty required (shortfall of {int(required_faculty - fac)}) per APH 2024-27 Annexure 5.2.",
                    expected_value=f">= {int(required_faculty)} Faculty (FSR <= 1:20)",
                    observed_value=f"{int(fac)} Faculty (FSR 1:{effective_ratio:.1f})",
                    source_document_id=matching_doc.id,
                    source_page_number=fac_ev["page_number"],
                    inputs_status="ALL_AVAILABLE",
                    human_review_required=True,
                    unresolved_reason="FSR_STATUTORY_DEFICIENCY",
                    evidence_payload={
                        "annual_intake": int(intake),
                        "student_strength": int(total_students),
                        "faculty_count": int(fac),
                        "required_faculty": int(required_faculty),
                        "shortfall": int(required_faculty - fac),
                        "effective_fsr": f"1:{effective_ratio:.1f}",
                        "statutory_ceiling": "1:20",
                        "evidence_snippet": fac_ev["evidence_snippet"],
                    },
                    evaluation_date_used=evaluation_date,
                )

        # -------------------------------------------------------------------
        # General Document Field Extraction
        # -------------------------------------------------------------------
        ev = resolve_document_field_with_evidence(field_key, matching_doc, pattern)

        if ev["value"] is not None:
            # 1. Statutory Minimum Check (e.g. Admin Area 750 sqm, Amenities 500 sqm)
            if "statutory_minimum" in params:
                min_val = float(params["statutory_minimum"])
                if ev["numeric_value"] is None:
                    return RuleResult(
                        rule_id=rule.id,
                        application_id=app.id,
                        rule_code=rule.rule_code,
                        rule_version=rule.rule_version,
                        rule_type=rule.rule_type,
                        target_key=f"field:{field_key}",
                        status="UNABLE_TO_EVALUATE",
                        severity=rule.severity,
                        explanation=f"Field '{field_key}' could not be parsed as a numeric value from document '{matching_doc.original_filename}'. Scrutiny official must inspect the document directly.",
                        expected_value=f">= {min_val:.1f}",
                        observed_value="NON_NUMERIC_OR_MISSING",
                        source_document_id=matching_doc.id,
                        inputs_status="PARTIAL",
                        human_review_required=True,
                        unresolved_reason="FIELD_NOT_EXTRACTED",
                        evidence_payload={"field_key": field_key, "statutory_minimum": min_val},
                        evaluation_date_used=evaluation_date,
                    )
                num = ev["numeric_value"]
                clause_ref = params.get("clause", "")
                if num >= min_val:
                    return RuleResult(
                        rule_id=rule.id,
                        application_id=app.id,
                        rule_code=rule.rule_code,
                        rule_version=rule.rule_version,
                        rule_type=rule.rule_type,
                        target_key=f"field:{field_key}",
                        status="PASS",
                        severity=rule.severity,
                        explanation=f"Statutory requirement satisfied for '{field_key}': Extracted value {num:.1f} meets or exceeds statutory minimum of {min_val:.1f} per APH 2024-27 {clause_ref} (Page {ev['page_number'] or 1}).",
                        expected_value=f">= {min_val:.1f}",
                        observed_value=f"{num:.1f}",
                        source_document_id=matching_doc.id,
                        source_page_number=ev["page_number"],
                        inputs_status="ALL_AVAILABLE",
                        human_review_required=False,
                        evidence_payload={
                            "field_key": field_key,
                            "extracted_value": num,
                            "statutory_minimum": min_val,
                            "document_id": matching_doc.id,
                            "page_number": ev["page_number"],
                            "evidence_snippet": ev["evidence_snippet"],
                            "bounding_box": ev["bounding_box"],
                            "text_source": ev["text_source"],
                            "ocr_confidence": ev["ocr_confidence"],
                        },
                        evaluation_date_used=evaluation_date,
                    )
                else:
                    return RuleResult(
                        rule_id=rule.id,
                        application_id=app.id,
                        rule_code=rule.rule_code,
                        rule_version=rule.rule_version,
                        rule_type=rule.rule_type,
                        target_key=f"field:{field_key}",
                        status="FAIL",
                        severity=rule.severity,
                        explanation=f"Statutory deficiency detected for '{field_key}': Extracted value {num:.1f} is below statutory minimum of {min_val:.1f} (shortfall of {min_val - num:.1f}) per APH 2024-27 {clause_ref} (Page {ev['page_number'] or 1}).",
                        expected_value=f">= {min_val:.1f}",
                        observed_value=f"{num:.1f}",
                        source_document_id=matching_doc.id,
                        source_page_number=ev["page_number"],
                        inputs_status="ALL_AVAILABLE",
                        human_review_required=True,
                        unresolved_reason="STATUTORY_MINIMUM_DEFICIENCY",
                        evidence_payload={
                            "field_key": field_key,
                            "extracted_value": num,
                            "statutory_minimum": min_val,
                            "shortfall": min_val - num,
                            "document_id": matching_doc.id,
                            "page_number": ev["page_number"],
                            "evidence_snippet": ev["evidence_snippet"],
                            "bounding_box": ev["bounding_box"],
                        },
                        evaluation_date_used=evaluation_date,
                    )

            # 2. Classroom Area Division Norms (RULE-STAT-CLASSROOM-AREA: 66 sqm / 33 sqm)
            if "norm_per_division_60" in params:
                norm_60 = float(params.get("norm_per_division_60", 66.0))
                norm_30 = float(params.get("norm_per_division_30", 33.0))
                num = ev["numeric_value"]
                if num is None:
                    return RuleResult(
                        rule_id=rule.id,
                        application_id=app.id,
                        rule_code=rule.rule_code,
                        rule_version=rule.rule_version,
                        rule_type=rule.rule_type,
                        target_key=f"field:{field_key}",
                        status="UNABLE_TO_EVALUATE",
                        severity=rule.severity,
                        explanation=f"Classroom carpet area could not be parsed as a numeric value from document '{matching_doc.original_filename}'.",
                        expected_value=f">= {norm_60:.1f} sqm (60-div) or {norm_30:.1f} sqm (30-div)",
                        observed_value="NON_NUMERIC_OR_MISSING",
                        source_document_id=matching_doc.id,
                        inputs_status="PARTIAL",
                        human_review_required=True,
                        unresolved_reason="FIELD_NOT_EXTRACTED",
                        evidence_payload={"field_key": field_key},
                        evaluation_date_used=evaluation_date,
                    )
                if num >= norm_60:
                    return RuleResult(
                        rule_id=rule.id,
                        application_id=app.id,
                        rule_code=rule.rule_code,
                        rule_version=rule.rule_version,
                        rule_type=rule.rule_type,
                        target_key=f"field:{field_key}",
                        status="PASS",
                        severity=rule.severity,
                        explanation=f"Classroom carpet area {num:.1f} sqm satisfies statutory norm of >= {norm_60:.1f} sqm for 60-division per APH 2024-27 Annexure 3.2.1.",
                        expected_value=f">= {norm_60:.1f} sqm",
                        observed_value=f"{num:.1f} sqm",
                        source_document_id=matching_doc.id,
                        source_page_number=ev["page_number"],
                        inputs_status="ALL_AVAILABLE",
                        human_review_required=False,
                        evidence_payload={
                            "classroom_area": num,
                            "norm_60": norm_60,
                            "norm_30": norm_30,
                            "evidence_snippet": ev["evidence_snippet"],
                        },
                        evaluation_date_used=evaluation_date,
                    )
                elif num >= norm_30:
                    return RuleResult(
                        rule_id=rule.id,
                        application_id=app.id,
                        rule_code=rule.rule_code,
                        rule_version=rule.rule_version,
                        rule_type=rule.rule_type,
                        target_key=f"field:{field_key}",
                        status="NEEDS_REVIEW",
                        severity=rule.severity,
                        explanation=f"Classroom carpet area {num:.1f} sqm satisfies 30-division norm (>= {norm_30:.1f} sqm) but is below 60-division norm ({norm_60:.1f} sqm). Scrutiny officer must verify approved batch division size per Annexure 3.2.1.",
                        expected_value=f">= {norm_60:.1f} sqm (60-div) or {norm_30:.1f} sqm (30-div)",
                        observed_value=f"{num:.1f} sqm",
                        source_document_id=matching_doc.id,
                        source_page_number=ev["page_number"],
                        inputs_status="ALL_AVAILABLE",
                        human_review_required=True,
                        unresolved_reason="DIVISION_SIZE_CONFIRMATION_REQUIRED",
                        evidence_payload={
                            "classroom_area": num,
                            "norm_60": norm_60,
                            "norm_30": norm_30,
                            "evidence_snippet": ev["evidence_snippet"],
                        },
                        evaluation_date_used=evaluation_date,
                    )
                else:
                    return RuleResult(
                        rule_id=rule.id,
                        application_id=app.id,
                        rule_code=rule.rule_code,
                        rule_version=rule.rule_version,
                        rule_type=rule.rule_type,
                        target_key=f"field:{field_key}",
                        status="FAIL",
                        severity=rule.severity,
                        explanation=f"Classroom carpet area deficiency: {num:.1f} sqm is below statutory minimum of {norm_30:.1f} sqm for any classroom division per Annexure 3.2.1.",
                        expected_value=f">= {norm_30:.1f} sqm",
                        observed_value=f"{num:.1f} sqm",
                        source_document_id=matching_doc.id,
                        source_page_number=ev["page_number"],
                        inputs_status="ALL_AVAILABLE",
                        human_review_required=True,
                        unresolved_reason="CLASSROOM_AREA_DEFICIENT",
                        evidence_payload={"classroom_area": num, "norm_30": norm_30},
                        evaluation_date_used=evaluation_date,
                    )

            # 3. Land Lease Duration (RULE-STAT-LAND-LEASE: >= 30 years)
            if "minimum_years" in params:
                min_yrs = int(params["minimum_years"])
                yrs = ev["numeric_value"]
                if yrs is not None and yrs >= min_yrs:
                    return RuleResult(
                        rule_id=rule.id,
                        application_id=app.id,
                        rule_code=rule.rule_code,
                        rule_version=rule.rule_version,
                        rule_type=rule.rule_type,
                        target_key=f"field:{field_key}",
                        status="PASS",
                        severity=rule.severity,
                        explanation=f"Registered land lease duration of {int(yrs)} years satisfies statutory minimum of >= {min_yrs} years per APH 2024-27 Clause 6.17(a).",
                        expected_value=f">= {min_yrs} years",
                        observed_value=f"{int(yrs)} years",
                        source_document_id=matching_doc.id,
                        source_page_number=ev["page_number"],
                        inputs_status="ALL_AVAILABLE",
                        human_review_required=False,
                        evidence_payload={"lease_years": int(yrs), "minimum_years": min_yrs, "evidence_snippet": ev["evidence_snippet"]},
                        evaluation_date_used=evaluation_date,
                    )
                elif yrs is not None and yrs < min_yrs:
                    return RuleResult(
                        rule_id=rule.id,
                        application_id=app.id,
                        rule_code=rule.rule_code,
                        rule_version=rule.rule_version,
                        rule_type=rule.rule_type,
                        target_key=f"field:{field_key}",
                        status="FAIL",
                        severity=rule.severity,
                        explanation=f"Land lease deficiency: Registered lease duration of {int(yrs)} years is below mandatory {min_yrs}-year statutory requirement per Clause 6.17(a).",
                        expected_value=f">= {min_yrs} years",
                        observed_value=f"{int(yrs)} years",
                        source_document_id=matching_doc.id,
                        source_page_number=ev["page_number"],
                        inputs_status="ALL_AVAILABLE",
                        human_review_required=True,
                        unresolved_reason="LEASE_TERM_DEFICIENT",
                        evidence_payload={"lease_years": int(yrs), "minimum_years": min_yrs},
                        evaluation_date_used=evaluation_date,
                    )

            # 4. Land Contiguous Plots (RULE-STAT-LAND-CONTIGUOUS: <= 3 plots, <= 2km)
            if "max_plots" in params:
                max_plots = int(params["max_plots"])
                plots = ev["numeric_value"]
                if plots is not None and plots <= max_plots:
                    return RuleResult(
                        rule_id=rule.id,
                        application_id=app.id,
                        rule_code=rule.rule_code,
                        rule_version=rule.rule_version,
                        rule_type=rule.rule_type,
                        target_key=f"field:{field_key}",
                        status="PASS",
                        severity=rule.severity,
                        explanation=f"Campus plot contiguity verified: {int(plots)} plot(s) complies with statutory maximum of {max_plots} contiguous plots per APH 2024-27 Clause 6.17(d).",
                        expected_value=f"<= {max_plots} plots",
                        observed_value=f"{int(plots)} plots",
                        source_document_id=matching_doc.id,
                        source_page_number=ev["page_number"],
                        inputs_status="ALL_AVAILABLE",
                        human_review_required=False,
                        evidence_payload={"plot_count": int(plots), "max_plots": max_plots, "evidence_snippet": ev["evidence_snippet"]},
                        evaluation_date_used=evaluation_date,
                    )
                elif plots is not None and plots > max_plots:
                    return RuleResult(
                        rule_id=rule.id,
                        application_id=app.id,
                        rule_code=rule.rule_code,
                        rule_version=rule.rule_version,
                        rule_type=rule.rule_type,
                        target_key=f"field:{field_key}",
                        status="FAIL",
                        severity=rule.severity,
                        explanation=f"Land contiguity violation: Campus comprises {int(plots)} plots, exceeding statutory ceiling of {max_plots} plots per Clause 6.17(d).",
                        expected_value=f"<= {max_plots} plots",
                        observed_value=f"{int(plots)} plots",
                        source_document_id=matching_doc.id,
                        source_page_number=ev["page_number"],
                        inputs_status="ALL_AVAILABLE",
                        human_review_required=True,
                        unresolved_reason="PLOT_COUNT_EXCEEDED",
                        evidence_payload={"plot_count": int(plots), "max_plots": max_plots},
                        evaluation_date_used=evaluation_date,
                    )

            # 5. Internet Bandwidth (RULE-STAT-INTERNET-BANDWIDTH: >= 100 Mbps)
            if "minimum_bandwidth_mbps" in params:
                min_bw = float(params["minimum_bandwidth_mbps"])
                bw = ev["numeric_value"]
                if bw is not None and bw >= min_bw:
                    return RuleResult(
                        rule_id=rule.id,
                        application_id=app.id,
                        rule_code=rule.rule_code,
                        rule_version=rule.rule_version,
                        rule_type=rule.rule_type,
                        target_key=f"field:{field_key}",
                        status="PASS",
                        severity=rule.severity,
                        explanation=f"Internet bandwidth of {bw:.1f} Mbps satisfies statutory minimum of >= {min_bw:.1f} Mbps per Annexure 4.1.",
                        expected_value=f">= {min_bw:.1f} Mbps",
                        observed_value=f"{bw:.1f} Mbps",
                        source_document_id=matching_doc.id,
                        source_page_number=ev["page_number"],
                        inputs_status="ALL_AVAILABLE",
                        human_review_required=False,
                        evidence_payload={"bandwidth_mbps": bw, "minimum_bandwidth": min_bw, "evidence_snippet": ev["evidence_snippet"]},
                        evaluation_date_used=evaluation_date,
                    )
                elif bw is not None and bw < min_bw:
                    return RuleResult(
                        rule_id=rule.id,
                        application_id=app.id,
                        rule_code=rule.rule_code,
                        rule_version=rule.rule_version,
                        rule_type=rule.rule_type,
                        target_key=f"field:{field_key}",
                        status="NEEDS_REVIEW",
                        severity=rule.severity,
                        explanation=f"Internet bandwidth {bw:.1f} Mbps is below statutory minimum of {min_bw:.1f} Mbps per Annexure 4.1.",
                        expected_value=f">= {min_bw:.1f} Mbps",
                        observed_value=f"{bw:.1f} Mbps",
                        source_document_id=matching_doc.id,
                        source_page_number=ev["page_number"],
                        inputs_status="ALL_AVAILABLE",
                        human_review_required=True,
                        unresolved_reason="BANDWIDTH_DEFICIENT",
                        evidence_payload={"bandwidth_mbps": bw, "minimum_bandwidth": min_bw},
                        evaluation_date_used=evaluation_date,
                    )

            # 6. Student to PC Ratio (RULE-STAT-STUDENT-PC-RATIO: 1:10)
            if "student_pc_ratio" in params:
                pc_ratio = float(params["student_pc_ratio"])
                intake = float((app.declared_data or {}).get("approved_intake") or 60)
                student_strength = intake * 4.0
                required_pcs = student_strength / pc_ratio
                pcs = ev["numeric_value"]
                if pcs is not None and pcs >= required_pcs:
                    return RuleResult(
                        rule_id=rule.id,
                        application_id=app.id,
                        rule_code=rule.rule_code,
                        rule_version=rule.rule_version,
                        rule_type=rule.rule_type,
                        target_key=f"field:{field_key}",
                        status="PASS",
                        severity=rule.severity,
                        explanation=f"Student-to-PC ratio compliant: {int(pcs)} PCs for student strength {int(student_strength)} satisfies 1:{int(pc_ratio)} ratio per Annexure 4.1.",
                        expected_value=f">= {int(required_pcs)} PCs",
                        observed_value=f"{int(pcs)} PCs",
                        source_document_id=matching_doc.id,
                        source_page_number=ev["page_number"],
                        inputs_status="ALL_AVAILABLE",
                        human_review_required=False,
                        evidence_payload={"computer_count": int(pcs), "required_pcs": int(required_pcs), "evidence_snippet": ev["evidence_snippet"]},
                        evaluation_date_used=evaluation_date,
                    )
                elif pcs is not None and pcs < required_pcs:
                    return RuleResult(
                        rule_id=rule.id,
                        application_id=app.id,
                        rule_code=rule.rule_code,
                        rule_version=rule.rule_version,
                        rule_type=rule.rule_type,
                        target_key=f"field:{field_key}",
                        status="NEEDS_REVIEW",
                        severity=rule.severity,
                        explanation=f"PC inventory shortfall: {int(pcs)} PCs is below 1:{int(pc_ratio)} ratio (minimum {int(required_pcs)} PCs needed for {int(student_strength)} students) per Annexure 4.1.",
                        expected_value=f">= {int(required_pcs)} PCs",
                        observed_value=f"{int(pcs)} PCs",
                        source_document_id=matching_doc.id,
                        source_page_number=ev["page_number"],
                        inputs_status="ALL_AVAILABLE",
                        human_review_required=True,
                        unresolved_reason="PC_RATIO_DEFICIENT",
                        evidence_payload={"computer_count": int(pcs), "required_pcs": int(required_pcs)},
                        evaluation_date_used=evaluation_date,
                    )

            # 7. PGDM CAT Weightage (RULE-STAT-PGDM-CAT-WEIGHT: 35% to 60%)
            if "min_weight" in params and "max_weight" in params:
                min_w = float(params["min_weight"])
                max_w = float(params["max_weight"])
                w = ev["numeric_value"]
                if w is not None and min_w <= w <= max_w:
                    return RuleResult(
                        rule_id=rule.id,
                        application_id=app.id,
                        rule_code=rule.rule_code,
                        rule_version=rule.rule_version,
                        rule_type=rule.rule_type,
                        target_key=f"field:{field_key}",
                        status="PASS",
                        severity=rule.severity,
                        explanation=f"Common Admission Test weightage of {w:.1f}% falls within statutory range [{min_w:.1f}%, {max_w:.1f}%] per Annexure 6.5.",
                        expected_value=f"[{min_w:.1f}%, {max_w:.1f}%]",
                        observed_value=f"{w:.1f}%",
                        source_document_id=matching_doc.id,
                        source_page_number=ev["page_number"],
                        inputs_status="ALL_AVAILABLE",
                        human_review_required=False,
                        evidence_payload={"admission_test_weight": w, "min_weight": min_w, "max_weight": max_w},
                        evaluation_date_used=evaluation_date,
                    )
                elif w is not None and (w < min_w or w > max_w):
                    return RuleResult(
                        rule_id=rule.id,
                        application_id=app.id,
                        rule_code=rule.rule_code,
                        rule_version=rule.rule_version,
                        rule_type=rule.rule_type,
                        target_key=f"field:{field_key}",
                        status="NEEDS_REVIEW",
                        severity=rule.severity,
                        explanation=f"Admission test weightage {w:.1f}% is outside statutory allocation [{min_w:.1f}%, {max_w:.1f}%] per Annexure 6.5.",
                        expected_value=f"[{min_w:.1f}%, {max_w:.1f}%]",
                        observed_value=f"{w:.1f}%",
                        source_document_id=matching_doc.id,
                        source_page_number=ev["page_number"],
                        inputs_status="ALL_AVAILABLE",
                        human_review_required=True,
                        unresolved_reason="ADMISSION_WEIGHT_OUT_OF_RANGE",
                        evidence_payload={"admission_test_weight": w, "min_weight": min_w, "max_weight": max_w},
                        evaluation_date_used=evaluation_date,
                    )

            # Standard successful extraction
            return RuleResult(
                rule_id=rule.id,
                application_id=app.id,
                rule_code=rule.rule_code,
                rule_version=rule.rule_version,
                rule_type=rule.rule_type,
                target_key=f"field:{field_key}",
                status="PASS",
                severity=rule.severity,
                explanation=f"Mandatory field '{field_key}' successfully identified on Page {ev['page_number'] or 1} of document '{matching_doc.original_filename}'.",
                expected_value=f"Identifiable {field_key}",
                observed_value=ev["value"],
                source_document_id=matching_doc.id,
                source_page_number=ev["page_number"],
                inputs_status="ALL_AVAILABLE",
                human_review_required=False,
                evidence_payload={
                    "field_key": field_key,
                    "extracted_value": ev["value"],
                    "document_id": matching_doc.id,
                    "page_number": ev["page_number"],
                    "text_source": ev["text_source"],
                    "ocr_confidence": ev["ocr_confidence"],
                    "evidence_snippet": ev["evidence_snippet"],
                    "bounding_box": ev["bounding_box"],
                },
                evaluation_date_used=evaluation_date,
            )

        # Document processed but field not extracted
        return RuleResult(
            rule_id=rule.id,
            application_id=app.id,
            rule_code=rule.rule_code,
            rule_version=rule.rule_version,
            rule_type=rule.rule_type,
            target_key=f"field:{field_key}",
            status="NEEDS_REVIEW",
            severity=rule.severity,
            explanation=f"Mandatory field '{field_key}' was not found in readable text of document '{matching_doc.original_filename}'. Scrutiny official must inspect the document directly.",
            expected_value=f"Present on {matching_doc.original_filename}",
            observed_value="NOT_FOUND_IN_TEXT",
            source_document_id=matching_doc.id,
            inputs_status="PARTIAL",
            human_review_required=True,
            unresolved_reason="FIELD_NOT_EXTRACTED",
            evidence_payload={
                "field_key": field_key,
                "document_id": matching_doc.id,
                "pages_examined": len(matching_doc.pages or []),
            },
            evaluation_date_used=evaluation_date,
        )

    # Field expected in declared application data
    declared_val = (app.declared_data or {}).get(field_key)
    if declared_val:
        return RuleResult(
            rule_id=rule.id,
            application_id=app.id,
            rule_code=rule.rule_code,
            rule_version=rule.rule_version,
            rule_type=rule.rule_type,
            target_key=f"declared_field:{field_key}",
            status="PASS",
            severity=rule.severity,
            explanation=f"Mandatory declared field '{field_key}' is present in the institutional application submission.",
            expected_value=f"Declared {field_key}",
            observed_value=str(declared_val),
            inputs_status="ALL_AVAILABLE",
            human_review_required=False,
            evidence_payload={"field_key": field_key, "declared_value": declared_val},
            evaluation_date_used=evaluation_date,
        )

    return RuleResult(
        rule_id=rule.id,
        application_id=app.id,
        rule_code=rule.rule_code,
        rule_version=rule.rule_version,
        rule_type=rule.rule_type,
        target_key=f"declared_field:{field_key}",
        status=rule.on_fail_status or "FAIL",
        severity=rule.severity,
        explanation=f"Mandatory declared field '{field_key}' is missing from the application submission data.",
        expected_value=f"Provided {field_key}",
        observed_value="NOT_PROVIDED",
        inputs_status="UNAVAILABLE",
        human_review_required=True,
        unresolved_reason="DECLARED_FIELD_MISSING",
        evidence_payload={"field_key": field_key},
        evaluation_date_used=evaluation_date,
    )


def evaluate_expiry_check(
    rule: ValidationRule,
    app: Application,
    documents: List[Document],
    evaluation_date: date,
) -> RuleResult:
    """Rule Type C: EXPIRY_CHECK"""
    params = rule.parameters or {}
    doc_type = params.get("document_type")
    field_key = params.get("field_key", "certificate_expiry_date")

    # Locate source document if specified
    matching_doc = find_matching_document(doc_type, [doc_type] if doc_type else [], documents) if doc_type else None

    # Step 1: Check document extracted text first, then declared application data
    raw_date_val: Optional[str] = None
    page_num: Optional[int] = None
    text_src: Optional[str] = None
    conf: Optional[float] = None

    if matching_doc and matching_doc.processing_status in ("COMPLETED", "COMPLETED_WITH_WARNINGS"):
        extracted_date, page_num, text_src, conf = extract_field_from_pages(field_key, matching_doc)
        if extracted_date:
            raw_date_val = extracted_date

    if not raw_date_val:
        # Fallback to application declared data
        raw_date_val = (app.declared_data or {}).get(field_key)

    if not raw_date_val:
        # If document is still processing
        if matching_doc and matching_doc.processing_status in ("QUEUED", "PROCESSING"):
            return RuleResult(
                rule_id=rule.id,
                application_id=app.id,
                rule_code=rule.rule_code,
                rule_version=rule.rule_version,
                rule_type=rule.rule_type,
                target_key=f"expiry:{doc_type or 'application'}",
                status="NEEDS_REVIEW",
                severity=rule.severity,
                explanation=f"Cannot determine expiry date; document '{matching_doc.original_filename}' is still undergoing OCR processing.",
                source_document_id=matching_doc.id,
                inputs_status="PARTIAL",
                human_review_required=True,
                unresolved_reason="DOCUMENT_PROCESSING_INCOMPLETE",
                evidence_payload={"document_id": matching_doc.id, "evaluation_date": str(evaluation_date)},
                evaluation_date_used=evaluation_date,
            )

        return RuleResult(
            rule_id=rule.id,
            application_id=app.id,
            rule_code=rule.rule_code,
            rule_version=rule.rule_version,
            rule_type=rule.rule_type,
            target_key=f"expiry:{doc_type or 'application'}",
            status="NEEDS_REVIEW",
            severity=rule.severity,
            explanation=f"Document or application does not contain an identifiable expiry date for '{doc_type or 'submission'}'; manual scrutiny required.",
            expected_value=f"Valid date >= {evaluation_date}",
            observed_value="DATE_NOT_FOUND",
            source_document_id=matching_doc.id if matching_doc else None,
            inputs_status="UNAVAILABLE",
            human_review_required=True,
            unresolved_reason="EXPIRY_DATE_NOT_FOUND",
            evidence_payload={"evaluation_date": str(evaluation_date)},
            evaluation_date_used=evaluation_date,
        )

    # Step 2: Parse Date
    parsed_dt, is_ambiguous, err = parse_date_string(str(raw_date_val))

    if err or not parsed_dt:
        return RuleResult(
            rule_id=rule.id,
            application_id=app.id,
            rule_code=rule.rule_code,
            rule_version=rule.rule_version,
            rule_type=rule.rule_type,
            target_key=f"expiry:{doc_type or 'application'}",
            status="NEEDS_REVIEW",
            severity=rule.severity,
            explanation=f"Observed expiry date string '{raw_date_val}' is malformed or could not be parsed into a calendar date ({err}).",
            expected_value=f"Valid ISO/DMY date >= {evaluation_date}",
            observed_value=str(raw_date_val),
            source_document_id=matching_doc.id if matching_doc else None,
            source_page_number=page_num,
            inputs_status="PARTIAL",
            human_review_required=True,
            unresolved_reason="MALFORMED_DATE",
            evidence_payload={"raw_date": raw_date_val, "error": err},
            evaluation_date_used=evaluation_date,
        )

    if is_ambiguous:
        return RuleResult(
            rule_id=rule.id,
            application_id=app.id,
            rule_code=rule.rule_code,
            rule_version=rule.rule_version,
            rule_type=rule.rule_type,
            target_key=f"expiry:{doc_type or 'application'}",
            status="NEEDS_REVIEW",
            severity=rule.severity,
            explanation=f"Observed expiry date '{raw_date_val}' has ambiguous day/month interpretation (could be DD/MM or MM/DD). Requires reviewer confirmation.",
            expected_value=f">= {evaluation_date}",
            observed_value=str(parsed_dt),
            source_document_id=matching_doc.id if matching_doc else None,
            source_page_number=page_num,
            inputs_status="PARTIAL",
            human_review_required=True,
            unresolved_reason="AMBIGUOUS_DATE_FORMAT",
            evidence_payload={"raw_date": raw_date_val, "parsed_as": str(parsed_dt)},
            evaluation_date_used=evaluation_date,
        )

    # Step 3: Compare against evaluation date
    if parsed_dt >= evaluation_date:
        return RuleResult(
            rule_id=rule.id,
            application_id=app.id,
            rule_code=rule.rule_code,
            rule_version=rule.rule_version,
            rule_type=rule.rule_type,
            target_key=f"expiry:{doc_type or 'application'}",
            status="PASS",
            severity=rule.severity,
            explanation=f"Document certificate is valid. Expiry date {parsed_dt} is on or after the statutory scrutiny baseline date {evaluation_date}.",
            expected_value=f">= {evaluation_date}",
            observed_value=str(parsed_dt),
            source_document_id=matching_doc.id if matching_doc else None,
            source_page_number=page_num,
            inputs_status="ALL_AVAILABLE",
            human_review_required=False,
            evidence_payload={
                "parsed_expiry_date": str(parsed_dt),
                "evaluation_baseline_date": str(evaluation_date),
                "days_remaining": (parsed_dt - evaluation_date).days,
                "text_source": text_src,
                "ocr_confidence": conf,
            },
            evaluation_date_used=evaluation_date,
        )
    else:
        return RuleResult(
            rule_id=rule.id,
            application_id=app.id,
            rule_code=rule.rule_code,
            rule_version=rule.rule_version,
            rule_type=rule.rule_type,
            target_key=f"expiry:{doc_type or 'application'}",
            status="FAIL",
            severity=rule.severity,
            explanation=f"Certificate has EXPIRED. Expiry date {parsed_dt} is prior to the statutory evaluation baseline date {evaluation_date} (expired {(evaluation_date - parsed_dt).days} day(s) ago).",
            expected_value=f">= {evaluation_date}",
            observed_value=str(parsed_dt),
            source_document_id=matching_doc.id if matching_doc else None,
            source_page_number=page_num,
            inputs_status="ALL_AVAILABLE",
            human_review_required=True,
            unresolved_reason="CERTIFICATE_EXPIRED",
            evidence_payload={
                "parsed_expiry_date": str(parsed_dt),
                "evaluation_baseline_date": str(evaluation_date),
                "days_expired": (evaluation_date - parsed_dt).days,
            },
            evaluation_date_used=evaluation_date,
        )


def evaluate_field_equals_application(
    rule: ValidationRule,
    app: Application,
    documents: List[Document],
    evaluation_date: date,
) -> RuleResult:
    """Rule Type D: FIELD_EQUALS_APPLICATION"""
    params = rule.parameters or {}
    if "ceiling_ratio" in params or rule.rule_code == "RULE-STAT-TFW-QUOTA":
        app_field = params.get("app_field", "approved_intake")
        doc_field = params.get("doc_field", "tfw_quota_seats")
    elif "multiplier" in params or rule.rule_code == "RULE-STAT-EWS-RESERVATION":
        app_field = params.get("app_field", "approved_intake")
        doc_field = params.get("doc_field", "approved_intake")
    else:
        app_field = params.get("app_field", "institution_name")
        doc_field = params.get("doc_field", "institution_name")
    doc_type = params.get("document_type", "ACCREDITATION_CERTIFICATE")
    normalize_case = params.get("normalize_case", True)
    normalize_whitespace = params.get("normalize_whitespace", True)
    is_numeric = params.get("is_numeric", False)

    # 1. Resolve declared application value
    declared_val: Optional[Any] = None
    if app_field == "institution_name" and app.institution:
        declared_val = app.institution.institution_name
    elif app_field == "institution_identifier" and app.institution:
        declared_val = app.institution.institution_identifier
    else:
        declared_val = (app.declared_data or {}).get(app_field)

    if declared_val is None:
        return RuleResult(
            rule_id=rule.id,
            application_id=app.id,
            rule_code=rule.rule_code,
            rule_version=rule.rule_version,
            rule_type=rule.rule_type,
            target_key=f"comparison:{app_field}",
            status="UNABLE_TO_EVALUATE",
            severity=rule.severity,
            explanation=f"Cannot perform cross-check; application declared field '{app_field}' is not provided in submission.",
            expected_value=f"Declared value for {app_field}",
            observed_value="APPLICATION_FIELD_MISSING",
            inputs_status="UNAVAILABLE",
            human_review_required=True,
            unresolved_reason="APPLICATION_FIELD_MISSING",
            evidence_payload={"app_field": app_field},
            evaluation_date_used=evaluation_date,
        )

    # 2. Resolve document
    matching_doc = find_matching_document(doc_type, [doc_type], documents)
    if not matching_doc:
        return RuleResult(
            rule_id=rule.id,
            application_id=app.id,
            rule_code=rule.rule_code,
            rule_version=rule.rule_version,
            rule_type=rule.rule_type,
            target_key=f"comparison:{app_field}",
            status="UNABLE_TO_EVALUATE",
            severity=rule.severity,
            explanation=f"Cannot compare '{app_field}'; supporting document '{doc_type}' is missing from application.",
            expected_value=str(declared_val),
            observed_value="SUPPORTING_DOC_MISSING",
            inputs_status="UNAVAILABLE",
            human_review_required=True,
            unresolved_reason="SUPPORTING_DOC_MISSING",
            evidence_payload={"app_field": app_field, "declared_value": str(declared_val)},
            evaluation_date_used=evaluation_date,
        )

    if matching_doc.processing_status in ("QUEUED", "PROCESSING"):
        return RuleResult(
            rule_id=rule.id,
            application_id=app.id,
            rule_code=rule.rule_code,
            rule_version=rule.rule_version,
            rule_type=rule.rule_type,
            target_key=f"comparison:{app_field}",
            status="NEEDS_REVIEW",
            severity=rule.severity,
            explanation=f"Cannot compare '{app_field}'; document '{matching_doc.original_filename}' is still undergoing OCR processing ({matching_doc.processing_status}).",
            source_document_id=matching_doc.id,
            inputs_status="PARTIAL",
            human_review_required=True,
            unresolved_reason="DOCUMENT_PROCESSING_INCOMPLETE",
            evidence_payload={"document_id": matching_doc.id, "app_field": app_field},
            evaluation_date_used=evaluation_date,
        )

    # 3. Extract candidate value from document
    doc_val: Optional[str] = None
    page_num: Optional[int] = None
    text_src: Optional[str] = None
    conf: Optional[float] = None

    if app_field == "institution_name":
        # Check pages for institution name appearance
        declared_str = str(declared_val).strip()
        for page in matching_doc.pages or []:
            text = page.clean_text or page.raw_text or ""
            # Search for full or clean name
            if declared_str.lower() in text.lower():
                doc_val = declared_str
                page_num = page.page_number
                text_src = page.text_source
                conf = page.ocr_mean_confidence
                break
            # Or token overlap
            tokens = [t for t in re.split(r"\W+", declared_str) if len(t) > 3]
            match_tokens = [t for t in tokens if t.lower() in text.lower()]
            if len(tokens) >= 2 and len(match_tokens) == len(tokens):
                doc_val = declared_str
                page_num = page.page_number
                text_src = page.text_source
                conf = page.ocr_mean_confidence
                break
    else:
        if "ceiling_ratio" in params:
            tfw_ev = resolve_document_field_with_evidence("tfw_quota_seats", matching_doc)
            if tfw_ev["value"] is None:
                tfw_ev = resolve_document_field_with_evidence("tfw_supernumerary_quota", matching_doc)
            doc_val = tfw_ev["value"]
            page_num = tfw_ev["page_number"]
            text_src = tfw_ev["text_source"]
            conf = tfw_ev["ocr_confidence"]
        elif "multiplier" in params:
            ews_ev = resolve_document_field_with_evidence("ews_supernumerary_quota", matching_doc)
            if ews_ev["value"] is not None:
                doc_val = ews_ev["value"]
                page_num = ews_ev["page_number"]
                text_src = ews_ev["text_source"]
                conf = ews_ev["ocr_confidence"]
            else:
                doc_val, page_num, text_src, conf = extract_field_from_pages("approved_intake", matching_doc)
        else:
            doc_val, page_num, text_src, conf = extract_field_from_pages(doc_field, matching_doc)

    if doc_val is None:
        return RuleResult(
            rule_id=rule.id,
            application_id=app.id,
            rule_code=rule.rule_code,
            rule_version=rule.rule_version,
            rule_type=rule.rule_type,
            target_key=f"comparison:{app_field}",
            status="NEEDS_REVIEW",
            severity=rule.severity,
            explanation=f"Could not extract candidate value for '{doc_field}' from document '{matching_doc.original_filename}' to compare with declared application value '{declared_val}'.",
            expected_value=str(declared_val),
            observed_value="CANDIDATE_VALUE_NOT_EXTRACTED",
            source_document_id=matching_doc.id,
            inputs_status="PARTIAL",
            human_review_required=True,
            unresolved_reason="EXTRACTED_VALUE_NOT_FOUND",
            evidence_payload={
                "app_field": app_field,
                "declared_value": str(declared_val),
                "document_id": matching_doc.id,
            },
            evaluation_date_used=evaluation_date,
        )

    # 4. Compare Values
    app_str = str(declared_val).strip()
    doc_str = str(doc_val).strip()

    # Quota Check 1: Multiplier Ceiling (e.g. RULE-STAT-EWS-RESERVATION: 1.25x)
    if "multiplier" in params:
        try:
            num_app = float(re.sub(r"[^\d.]", "", app_str))
            num_doc = float(re.sub(r"[^\d.]", "", doc_str))
            max_multiplier = float(params["multiplier"])
            ceiling_intake = num_app * max_multiplier
            if num_doc <= ceiling_intake:
                return RuleResult(
                    rule_id=rule.id,
                    application_id=app.id,
                    rule_code=rule.rule_code,
                    rule_version=rule.rule_version,
                    rule_type=rule.rule_type,
                    target_key=f"comparison:{app_field}",
                    status="PASS",
                    severity=rule.severity,
                    explanation=f"EWS quota allocation conforms to statutory ceiling: Document intake {int(num_doc)} does not exceed {max_multiplier}x declared intake ({int(ceiling_intake)}) per APH 2024-27 Clause 6.37.",
                    expected_value=f"<= {int(ceiling_intake)} ({max_multiplier}x intake)",
                    observed_value=f"{int(num_doc)}",
                    source_document_id=matching_doc.id,
                    source_page_number=page_num,
                    inputs_status="ALL_AVAILABLE",
                    human_review_required=False,
                    evidence_payload={
                        "app_field": app_field,
                        "declared_intake": int(num_app),
                        "document_intake": int(num_doc),
                        "multiplier_ceiling": max_multiplier,
                        "max_allowed_intake": int(ceiling_intake),
                    },
                    evaluation_date_used=evaluation_date,
                )
            else:
                return RuleResult(
                    rule_id=rule.id,
                    application_id=app.id,
                    rule_code=rule.rule_code,
                    rule_version=rule.rule_version,
                    rule_type=rule.rule_type,
                    target_key=f"comparison:{app_field}",
                    status="NEEDS_REVIEW",
                    severity=rule.severity,
                    explanation=f"EWS intake expansion exceeds statutory ceiling: Document intake {int(num_doc)} exceeds {max_multiplier}x declared intake ceiling of {int(ceiling_intake)} per Clause 6.37.",
                    expected_value=f"<= {int(ceiling_intake)}",
                    observed_value=f"{int(num_doc)}",
                    source_document_id=matching_doc.id,
                    source_page_number=page_num,
                    inputs_status="ALL_AVAILABLE",
                    human_review_required=True,
                    unresolved_reason="EWS_INTAKE_MULTIPLIER_EXCEEDED",
                    evidence_payload={
                        "app_field": app_field,
                        "declared_intake": int(num_app),
                        "document_intake": int(num_doc),
                        "max_allowed_intake": int(ceiling_intake),
                    },
                    evaluation_date_used=evaluation_date,
                )
        except (ValueError, TypeError):
            pass

    # Quota Check 2: Ceiling Ratio (e.g. RULE-STAT-TFW-QUOTA: 5% of intake)
    if "ceiling_ratio" in params:
        try:
            num_app = float(re.sub(r"[^\d.]", "", app_str))
            num_doc = float(re.sub(r"[^\d.]", "", doc_str))
            ceiling = float(params["ceiling_ratio"])
            max_tfw = num_app * ceiling
            if num_doc <= max_tfw:
                return RuleResult(
                    rule_id=rule.id,
                    application_id=app.id,
                    rule_code=rule.rule_code,
                    rule_version=rule.rule_version,
                    rule_type=rule.rule_type,
                    target_key=f"comparison:{app_field}",
                    status="PASS",
                    severity=rule.severity,
                    explanation=f"Tuition Fee Waiver supernumerary seats ({int(num_doc)}) comply with 5% statutory ceiling ({max_tfw:.1f} seats) for approved intake {int(num_app)} per APH 2024-27 Clause 6.42(a).",
                    expected_value=f"<= {max_tfw:.1f} seats (5% of {int(num_app)})",
                    observed_value=f"{int(num_doc)} seats",
                    source_document_id=matching_doc.id,
                    source_page_number=page_num,
                    inputs_status="ALL_AVAILABLE",
                    human_review_required=False,
                    evidence_payload={
                        "app_field": app_field,
                        "declared_intake": int(num_app),
                        "tfw_seats": int(num_doc),
                        "max_allowed_tfw": max_tfw,
                    },
                    evaluation_date_used=evaluation_date,
                )
            else:
                return RuleResult(
                    rule_id=rule.id,
                    application_id=app.id,
                    rule_code=rule.rule_code,
                    rule_version=rule.rule_version,
                    rule_type=rule.rule_type,
                    target_key=f"comparison:{app_field}",
                    status="NEEDS_REVIEW",
                    severity=rule.severity,
                    explanation=f"TFW supernumerary quota exceeded: {int(num_doc)} seats exceeds 5% statutory ceiling ({max_tfw:.1f} seats) for approved intake {int(num_app)} per Clause 6.42(a).",
                    expected_value=f"<= {max_tfw:.1f} seats",
                    observed_value=f"{int(num_doc)} seats",
                    source_document_id=matching_doc.id,
                    source_page_number=page_num,
                    inputs_status="ALL_AVAILABLE",
                    human_review_required=True,
                    unresolved_reason="TFW_CEILING_EXCEEDED",
                    evidence_payload={
                        "app_field": app_field,
                        "declared_intake": int(num_app),
                        "tfw_seats": int(num_doc),
                        "max_allowed_tfw": max_tfw,
                    },
                    evaluation_date_used=evaluation_date,
                )
        except (ValueError, TypeError):
            pass

    # Numeric comparison
    if is_numeric:
        try:
            num_app = int(re.sub(r"[^\d]", "", app_str))
            num_doc = int(re.sub(r"[^\d]", "", doc_str))
            if num_app == num_doc:
                return RuleResult(
                    rule_id=rule.id,
                    application_id=app.id,
                    rule_code=rule.rule_code,
                    rule_version=rule.rule_version,
                    rule_type=rule.rule_type,
                    target_key=f"comparison:{app_field}",
                    status="PASS",
                    severity=rule.severity,
                    explanation=f"Numeric match verified for '{app_field}': declared value {num_app} matches document extracted value {num_doc} (Page {page_num or 1}).",
                    expected_value=str(num_app),
                    observed_value=str(num_doc),
                    source_document_id=matching_doc.id,
                    source_page_number=page_num,
                    inputs_status="ALL_AVAILABLE",
                    human_review_required=False,
                    evidence_payload={
                        "app_field": app_field,
                        "declared_numeric": num_app,
                        "extracted_numeric": num_doc,
                        "document_id": matching_doc.id,
                        "page_number": page_num,
                    },
                    evaluation_date_used=evaluation_date,
                )
            else:
                return RuleResult(
                    rule_id=rule.id,
                    application_id=app.id,
                    rule_code=rule.rule_code,
                    rule_version=rule.rule_version,
                    rule_type=rule.rule_type,
                    target_key=f"comparison:{app_field}",
                    status="FAIL",
                    severity=rule.severity,
                    explanation=f"Intake discrepancy detected for '{app_field}': declared value is {num_app}, but document reflects {num_doc} (Page {page_num or 1}).",
                    expected_value=str(num_app),
                    observed_value=str(num_doc),
                    source_document_id=matching_doc.id,
                    source_page_number=page_num,
                    inputs_status="ALL_AVAILABLE",
                    human_review_required=True,
                    unresolved_reason="NUMERIC_VALUE_MISMATCH",
                    evidence_payload={
                        "app_field": app_field,
                        "declared_numeric": num_app,
                        "extracted_numeric": num_doc,
                        "document_id": matching_doc.id,
                        "page_number": page_num,
                    },
                    evaluation_date_used=evaluation_date,
                )
        except (ValueError, TypeError):
            pass

    # String comparison with normalization
    cmp_app = app_str
    cmp_doc = doc_str

    if normalize_case:
        cmp_app = cmp_app.lower()
        cmp_doc = cmp_doc.lower()

    if normalize_whitespace:
        cmp_app = re.sub(r"\s+", " ", cmp_app)
        cmp_doc = re.sub(r"\s+", " ", cmp_doc)

    if cmp_app == cmp_doc:
        return RuleResult(
            rule_id=rule.id,
            application_id=app.id,
            rule_code=rule.rule_code,
            rule_version=rule.rule_version,
            rule_type=rule.rule_type,
            target_key=f"comparison:{app_field}",
            status="PASS",
            severity=rule.severity,
            explanation=f"Extracted document value '{doc_str}' exactly matches application declared value '{app_str}'.",
            expected_value=app_str,
            observed_value=doc_str,
            source_document_id=matching_doc.id,
            source_page_number=page_num,
            inputs_status="ALL_AVAILABLE",
            human_review_required=False,
            evidence_payload={
                "app_field": app_field,
                "declared_value": app_str,
                "extracted_value": doc_str,
                "document_id": matching_doc.id,
                "page_number": page_num,
                "text_source": text_src,
                "ocr_confidence": conf,
            },
            evaluation_date_used=evaluation_date,
        )

    # Discrepancy detected
    return RuleResult(
        rule_id=rule.id,
        application_id=app.id,
        rule_code=rule.rule_code,
        rule_version=rule.rule_version,
        rule_type=rule.rule_type,
        target_key=f"comparison:{app_field}",
        status="FAIL",
        severity=rule.severity,
        explanation=f"Field discrepancy detected for '{app_field}': declared value '{app_str}' does not match value '{doc_str}' extracted from document '{matching_doc.original_filename}'.",
        expected_value=app_str,
        observed_value=doc_str,
        source_document_id=matching_doc.id,
        source_page_number=page_num,
        inputs_status="ALL_AVAILABLE",
        human_review_required=True,
        unresolved_reason="FIELD_VALUE_MISMATCH",
        evidence_payload={
            "app_field": app_field,
            "declared_value": app_str,
            "extracted_value": doc_str,
            "document_id": matching_doc.id,
            "page_number": page_num,
        },
        evaluation_date_used=evaluation_date,
    )


# ---------------------------------------------------------------------------
# Validation Engine Execution
# ---------------------------------------------------------------------------
def run_application_validation(
    application_id: str,
    db: Session,
    evaluation_date: Optional[date] = None,
    triggered_by: Optional[str] = None,
    trigger: str = "MANUAL",
) -> Dict[str, Any]:
    """Execute deterministic validation engine for an application.
    Evaluates:
      1. REQUIRED_DOCUMENT
      2. REQUIRED_FIELD
      3. EXPIRY_CHECK
      4. FIELD_EQUALS_APPLICATION
    Persists ValidationRun and RuleResult records with full evidence snapshots.
    Records audit events and updates application pipeline status.
    """
    eval_dt = evaluation_date or datetime.now(timezone.utc).date()

    # 1. Fetch application and category
    app = db.scalar(select(Application).where(Application.id == application_id))
    if not app:
        raise ValueError(f"Application {application_id} not found.")

    # 2. Fetch all documents for application
    documents = list(
        db.scalars(
            select(Document)
            .where(Document.application_id == application_id, Document.deleted_at.is_(None))
            .order_by(Document.created_at.asc())
        ).all()
    )

    # 3. Ensure rules exist
    rules = ensure_default_rules(db)

    # 4. Filter applicable rules
    applicable_rules = []
    for r in rules:
        if not r.enabled:
            continue
        applies_to = r.applies_to or {}
        cat_codes = applies_to.get("categories")
        if cat_codes and app.category_code not in cat_codes:
            continue
        applicable_rules.append(r)

    # 5. Archive prior current runs for this application
    db.execute(
        update(ValidationRun)
        .where(ValidationRun.application_id == application_id, ValidationRun.is_current.is_(True))
        .values(is_current=False)
    )

    safe_actor_id = triggered_by if (triggered_by and triggered_by != "SYSTEM") else None
    safe_actor_type = "USER" if safe_actor_id else "SYSTEM"

    # Record audit event: VALIDATION_INITIATED
    record_audit_event(
        db=db,
        event_type="VALIDATION_INITIATED",
        actor_id=safe_actor_id,
        actor_type=safe_actor_type,
        application_id=app.id,
        metadata={
            "application_reference": app.application_reference,
            "evaluation_date": str(eval_dt),
            "applicable_rules_count": len(applicable_rules),
            "trigger": trigger,
        },
    )

    # 6. Create new ValidationRun
    run = ValidationRun(
        application_id=application_id,
        status="RUNNING",
        trigger=trigger,
        evaluation_date=eval_dt,
        pipeline_version="0.2.0",
        rule_snapshot=[{"rule_code": r.rule_code, "rule_version": r.rule_version} for r in applicable_rules],
        is_current=True,
        triggered_by=safe_actor_id,
    )
    db.add(run)
    db.flush()

    # 7. Evaluate each rule
    rule_results: List[RuleResult] = []
    counts = {
        "total_rules": len(applicable_rules),
        "passed": 0,
        "failed": 0,
        "needs_review": 0,
        "not_applicable": 0,
        "unable_to_evaluate": 0,
    }

    try:
        for rule in applicable_rules:
            result: Optional[RuleResult] = None
            if rule.rule_type == "REQUIRED_DOCUMENT":
                result = evaluate_required_document(rule, app, documents, eval_dt)
            elif rule.rule_type == "REQUIRED_FIELD":
                result = evaluate_required_field(rule, app, documents, eval_dt)
            elif rule.rule_type == "EXPIRY_CHECK":
                result = evaluate_expiry_check(rule, app, documents, eval_dt)
            elif rule.rule_type == "FIELD_EQUALS_APPLICATION":
                result = evaluate_field_equals_application(rule, app, documents, eval_dt)
            else:
                # Default unknown rule handler
                result = RuleResult(
                    rule_id=rule.id,
                    application_id=app.id,
                    rule_code=rule.rule_code,
                    rule_version=rule.rule_version,
                    rule_type=rule.rule_type,
                    target_key="app",
                    status="NOT_APPLICABLE",
                    severity=rule.severity,
                    explanation=f"Rule type '{rule.rule_type}' is not applicable or not supported by engine version.",
                    inputs_status="UNAVAILABLE",
                    evaluation_date_used=eval_dt,
                )

            result.validation_run_id = run.id
            db.add(result)
            rule_results.append(result)

            # Update count summary
            st = result.status.lower()
            if st in counts:
                counts[st] += 1

        # 8. Mark run completed
        is_compliant = (
            counts["failed"] == 0
            and counts["needs_review"] == 0
            and counts["unable_to_evaluate"] == 0
            and counts["passed"] > 0
        )
        counts["is_compliant"] = is_compliant

        run.status = "COMPLETED"
        run.summary = counts
        run.completed_at = datetime.now(timezone.utc)

        # Update application pipeline status
        if counts["failed"] > 0 or counts["needs_review"] > 0:
            app.pipeline_status = "REQUIRES_REVIEW"
        elif is_compliant:
            app.pipeline_status = "VALIDATED"
        else:
            app.pipeline_status = "IN_PROGRESS"

        db.flush()

        # Record audit event: VALIDATION_COMPLETED
        record_audit_event(
            db=db,
            event_type="VALIDATION_COMPLETED",
            actor_id=safe_actor_id,
            actor_type=safe_actor_type,
            application_id=app.id,
            metadata={
                "validation_run_id": run.id,
                "summary": counts,
                "is_compliant": is_compliant,
            },
        )

        db.commit()

        return {
            "application_id": app.id,
            "validation_run_id": run.id,
            "status": run.status,
            "evaluation_date": eval_dt,
            "pipeline_version": run.pipeline_version,
            "total_rules": counts["total_rules"],
            "passed": counts["passed"],
            "failed": counts["failed"],
            "needs_review": counts["needs_review"],
            "not_applicable": counts["not_applicable"],
            "unable_to_evaluate": counts["unable_to_evaluate"],
            "is_compliant": is_compliant,
            "evaluated_at": run.completed_at,
            "results": rule_results,
        }

    except Exception as exc:
        db.rollback()
        # Record failure event
        record_audit_event(
            db=db,
            event_type="VALIDATION_FAILED",
            actor_id=safe_actor_id,
            actor_type=safe_actor_type,
            application_id=app.id,
            metadata={"error": str(exc)},
        )
        raise exc
