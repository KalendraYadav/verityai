Act as a senior application security engineer working on VerityAI, our SIH 2026 project.

Implement Phase A only, based on the verified findings in `docs/aicte-audit/PHASE_0_1_VERIFICATION_REPORT.md`.

## 1. Fix Document Download Authorization — P0

Target: `backend/app/api/v1/endpoints/documents.py`

Inspect the existing authentication, authorization, database models, and endpoint conventions before making changes.

Requirements:

* Require authentication for `GET /api/v1/documents/{document_id}/file`.
* Verify that the authenticated user is authorized to access the requested document.
* Enforce institution-level ownership for institution users using the actual database relationships.
* Apply existing role-based access policies to reviewers and administrators. Do not accidentally block legitimate authorized access.
* Return HTTP 401 for unauthenticated requests.
* Return HTTP 403 for authenticated users who lack permission.
* Return HTTP 404 for nonexistent documents where consistent with existing API conventions.
* Do not expose document contents, storage paths, or sensitive metadata to unauthorized users.
* Follow existing security patterns instead of introducing a separate authorization system.

## 2. Add Regression Tests — P0

Create or update `backend/tests/test_security_hardening.py`.

Cover:

1. Unauthenticated document download is denied.
2. Institution A cannot download Institution B's document.
3. An institution user can download their own authorized document.
4. An authorized reviewer can access documents according to existing permissions.
5. An unauthorized role cannot bypass access controls.
6. Missing document IDs are handled safely.

Use isolated test data and the existing test infrastructure. Never use real institution documents.

Run the relevant tests first, then the complete backend test suite.

## 3. Add Prototype Disclaimers — P1

Target:

* `frontend/src/components/compliance/ValidationComplianceView.tsx`
* The existing PDF report generation implementation.

Display a clear, professional disclaimer:

"Illustrative Prototype Rules — Results are generated using a limited demonstration rule set and must not be treated as official AICTE compliance determinations. Final decisions require verification against applicable regulations and authorized records."

Requirements:

* Keep the existing design system and layout.
* Make the disclaimer visible near compliance results.
* Include it in exported PDF reports.
* Do not change the underlying validation logic or invent additional regulatory rules.
* Do not imply that VerityAI is officially integrated with AICTE.

## 4. Preserve Existing Functionality

* Do not rewrite the application or change its architecture.
* Do not modify database schemas or migrations unless absolutely necessary; if a schema change appears necessary, stop and explain why before proceeding.
* Do not remove existing features or weaken security controls.
* Avoid unrelated UI changes and dependency upgrades.
* Do not modify the regulatory requirements register or silently change regulatory interpretations.

## 5. Verification and Completion Report

After implementation:

* Run the new security regression tests.
* Run the complete backend test suite.
* Run the frontend production build.
* Verify that existing authorized workflows still function.
* Report exact commands, exit codes, and actual results.
* Identify modified files and summarize each change.
* Report any failures honestly; never claim a test passed unless it actually ran successfully.

Save a completion report as:
`docs/aicte-audit/PHASE_A_IMPLEMENTATION_REPORT.md`

Do not start Phase B or any other feature work.

Begin by inspecting the relevant code and tests, then implement Phase A and verify it.



# PHASE B — REGULATORY KNOWLEDGE AND DOCUMENT CATALOGUE

**Priority:** P1
**Goal:** Establish a reliable, traceable, and versioned regulatory foundation for VerityAI without implementing unsupported AICTE requirements.

## 1. Mandatory Pre-Implementation Inspection

Before making changes, inspect:

* `docs/aicte-audit/REGULATORY_REQUIREMENTS_REGISTER.csv`
* `docs/aicte-audit/DOCUMENT_MASTER_CATALOG.csv`
* `docs/aicte-audit/REQUIREMENTS_TRACEABILITY_MATRIX.csv`
* `docs/aicte-audit/REGULATORY_CONFLICT_REGISTER.md`
* `docs/aicte-audit/DOCUMENT_FIELD_SCHEMAS.json`
* `docs/aicte-audit/OPEN_QUESTIONS_AND_BLOCKERS.md`
* The supplied AICTE Approval Process Handbook 2024–25 to 2026–27.
* Existing validation services, database models, migrations, seed data, and tests.

Read `docs/aicte-audit/PHASE_A_IMPLEMENTATION_REPORT.md` to confirm that Phase A completed successfully.

If Phase A has not resolved the critical document-access vulnerability, do not expand the regulatory implementation. Report the blocker and perform only independent, non-risky analysis.

Do not assume that the audit documents are automatically correct merely because they exist.

## 2. Regulatory Requirement Verification

Review the existing regulatory requirements register and verify every requirement selected for implementation against its actual source evidence.

For each selected requirement, establish:

* Unique requirement ID.
* Requirement description.
* Source document title and version.
* Exact chapter, clause, annexure, or table.
* PDF page number.
* Applicability conditions.
* Required inputs and supporting documents.
* Validation method.
* Expected outcome.
* Known limitations.
* Verification status.
* Associated tests.

Use these statuses:

* `VERIFIED`: Supporting evidence and interpretation have been checked.
* `PARTIALLY_VERIFIED`: Some details remain unresolved.
* `UNVERIFIED`: Supporting evidence or applicability is uncertain.
* `CONFLICTED`: Relevant sources appear inconsistent.

A requirement may be implemented as an enforceable rule only when its meaning and applicability are sufficiently established.

Do not implement a requirement as mandatory solely because it appears in the existing CSV.

Do not invent clause references, page numbers, regulatory values, formulas, or applicability conditions.

If the supplied handbook is unavailable, record the limitation and do not guess.

If newer amendments or circulars have not been checked, explicitly state that the requirement has only been assessed against the available handbook version.

## 3. Design a Traceable Regulatory Rule Representation

Inspect the existing rule engine and database schema before introducing new structures.

Extend existing models and services wherever practical.

Each implemented rule should support the following information where appropriate:

* `rule_id`
* `rule_version`
* `title`
* `description`
* `source_document`
* `source_version`
* `source_clause`
* `source_page`
* `application_category`
* `institution_type`
* `applicability_conditions`
* `required_fields`
* `validation_logic`
* `severity`
* `effective_from`
* `effective_until`, if applicable
* `verification_status`
* `limitations`
* `created_at`
* `updated_at`

Adapt these fields to the existing architecture rather than blindly creating a new database schema.

Use explicit, validated data structures for rule definitions.

Avoid executing arbitrary Python, SQL, shell commands, or user-supplied expressions as regulatory rules.

Rules must be deterministic, testable, and version-controlled.

If a rule requires professional interpretation or information unavailable to the system, classify it for human review rather than fabricating a deterministic outcome.

## 4. Review and Register Document Types

Inspect:

`docs/aicte-audit/DOCUMENT_MASTER_CATALOG.csv`

The existing audit claims to contain 25 document types. Verify those entries against the available source material before registering them.

For each supported document type, capture relevant information:

* Document type identifier.
* Display name.
* Description.
* Applicable application categories.
* Applicable institution types.
* Mandatory or conditional status.
* Applicability conditions.
* Expected fields.
* Supported file formats.
* Source requirement references.
* Extraction capabilities.
* Validation capabilities.
* Verification limitations.

Do not make every document mandatory for every institution.

Do not register unsupported document types as statutory requirements.

Distinguish between a document that is legally required and one that is merely useful supporting evidence.

Preserve existing document types and application records.

## 5. Application Categories and Compatibility

Inspect the existing application categories, including `EOA_ILLUSTRATIVE`, and determine how categories are represented throughout the backend, frontend, database, and tests.

Do not rename or remove existing identifiers without a compatibility plan.

Introduce additional categories only when:

1. Their intended workflow is clearly defined.
2. Their requirements have adequate source evidence.
3. Their impact on existing workflows is understood.
4. Their seed data and tests can be added safely.

Do not attempt to implement every AICTE application workflow in this phase.

Keep the existing working demonstration functional.

## 6. Regulatory Conflicts and Uncertainty

Review:

`docs/aicte-audit/REGULATORY_CONFLICT_REGISTER.md`

Pay particular attention to unresolved questions involving:

* Land requirements and FSI/FAR.
* Physical acreage declarations.
* Institution and programme applicability.
* Faculty and infrastructure requirements.
* Digital signatures.
* Application-specific document requirements.
* Conflicting or potentially outdated source provisions.

Do not resolve a legal or regulatory conflict using guesswork.

For each unresolved issue, document:

* The conflicting interpretations.
* The source evidence available.
* The possible impact on validation.
* The information needed to resolve it.
* A safe interim system behavior.

When a rule is uncertain, the system should indicate that verification is required rather than issuing an unsupported compliance failure.

## 7. Database, Seed Data, and Migration Safety

Inspect existing database models, migrations, and seed logic before changing them.

Requirements:

* Preserve existing application records.
* Make seed operations idempotent.
* Avoid duplicate rule or document-type records.
* Maintain referential integrity.
* Preserve compatibility with existing API responses.
* Avoid destructive migrations and database resets.
* Prefer backward-compatible changes.
* Add migration tests where appropriate.

Do not modify production databases or environments.

If the implementation requires a risky schema migration, stop that specific change and document the proposed migration before proceeding.

## 8. API and Frontend Integration

Integrate verified regulatory metadata into the existing application without redesigning the entire interface.

Where appropriate, allow reviewers to see:

* Rule title and explanation.
* Applicable application category.
* Regulatory source and clause.
* Rule verification status.
* Supporting evidence.
* Applicability conditions.
* Known limitations.
* Whether human review is required.

Do not display unverified rules as confirmed statutory requirements.

Do not claim official AICTE integration.

Preserve existing navigation, components, styling, and workflows.

## 9. Testing Requirements

Add or update tests for:

1. Valid rule definitions.
2. Missing or invalid rule metadata.
3. Correct source references.
4. Rule applicability conditions.
5. Duplicate rule identifiers.
6. Document-type registration.
7. Idempotent seed execution.
8. Backward compatibility with existing categories.
9. Handling of unverified requirements.
10. Handling of regulatory conflicts.
11. Existing validation behavior.
12. Database integrity.

Run relevant tests after each significant change.

Then run the full backend test suite and the frontend production build if frontend code changed.

Report actual results. Do not claim success for tests that were not executed.

## 10. Phase B Acceptance Criteria

Phase B is complete only when:

* Implemented rules have traceable source evidence.
* Unverified requirements are not silently enforced.
* The document catalogue has been reviewed and registered safely.
* Existing categories and workflows remain compatible.
* Regulatory conflicts are documented.
* Seed operations are safe and repeatable.
* Relevant tests pass.
* Remaining limitations are recorded.

## 11. Deliverables

Create:

`docs/aicte-audit/PHASE_B_IMPLEMENTATION_REPORT.md`

The report must contain:

1. Executive summary.
2. Files changed.
3. Rules verified and implemented.
4. Rules excluded because evidence was insufficient.
5. Document types registered.
6. Regulatory conflicts and limitations.
7. Database and migration changes, if any.
8. Tests executed and actual results.
9. Known defects and unresolved questions.
10. Phase C readiness assessment.

Update:

`docs/aicte-audit/IMPLEMENTATION_PROGRESS.md`

Mark Phase B complete only when its acceptance criteria are satisfied.

## 12. Execution Instruction

Implement Phase B only.

Do not start conditional checklist implementation from Phase C.

After completing the work, verify the changes, write the report, and update the progress tracker.

If a requirement is uncertain, do not guess. Document the uncertainty and continue with independent, safe tasks.

Do not rewrite the existing application or introduce unnecessary infrastructure.





# PHASE C — CONDITIONAL CHECKLIST AND APPLICATION WORKFLOW

**Priority:** P1
**Goal:** Replace the existing static checklist with an application-specific, rule-driven checklist while preserving VerityAI's existing functionality.

## 1. Mandatory Pre-Implementation Inspection

Before making changes, inspect:

* `docs/aicte-audit/PHASE_A_IMPLEMENTATION_REPORT.md`
* `docs/aicte-audit/PHASE_B_IMPLEMENTATION_REPORT.md`
* `docs/aicte-audit/IMPLEMENTATION_PROGRESS.md`
* `docs/aicte-audit/REGULATORY_REQUIREMENTS_REGISTER.csv`
* `docs/aicte-audit/DOCUMENT_MASTER_CATALOG.csv`
* `docs/aicte-audit/REQUIREMENTS_TRACEABILITY_MATRIX.csv`
* `docs/aicte-audit/OPEN_QUESTIONS_AND_BLOCKERS.md`
* `backend/app/services/workflow.py`
* Existing application, institution, document, and rule models.
* Existing API endpoints, frontend checklist components, and tests.

Confirm that Phases A and B satisfy their acceptance criteria.

If Phase A's critical security vulnerability remains unresolved, do not expand the affected application workflows. Report the blocker and perform only independent, safe work.

If Phase B has not established sufficient source evidence for a requirement, do not turn that requirement into a mandatory checklist item.

## 2. Understand the Existing Workflow

Inspect the existing implementation before designing changes.

Determine:

* How application categories are represented.
* How institutions are associated with applications.
* How document requirements are stored or calculated.
* How uploaded documents are associated with checklist items.
* How checklist status is returned through the API.
* How the frontend displays missing and uploaded documents.
* How existing tests cover the workflow.

Preserve existing identifiers, API contracts, and database relationships wherever practical.

Do not rebuild the checklist from scratch if the existing workflow can be extended safely.

## 3. Implement Conditional Checklist Generation

Extend the existing workflow service to generate checklists based on verified regulatory conditions.

Potential applicability dimensions include:

* Application category.
* Institution type.
* Programme or discipline, when relevant.
* Existing versus proposed institution, where applicable.
* Regulatory conditions explicitly supported by the verified requirements register.
* Other application attributes only when their applicability is documented.

Use only dimensions and conditions supported by the available regulatory evidence.

Do not assume that every dimension applies to every application category.

Do not invent conditional requirements to make the demonstration appear more comprehensive.

For each generated checklist item, retain:

* Stable requirement or document-type identifier.
* Display name.
* Requirement description.
* Mandatory or conditional classification.
* Applicability result.
* Reason the item applies or does not apply.
* Regulatory source reference, when verified.
* Required evidence.
* Current completion status.
* Human-review requirement, where applicable.

## 4. Define Checklist Statuses

Use a consistent status model that distinguishes document presence from regulatory compliance.

Where appropriate, support:

* `REQUIRED_MISSING`
* `UPLOADED_PENDING_REVIEW`
* `EVIDENCE_AVAILABLE`
* `NEEDS_HUMAN_REVIEW`
* `CONDITIONAL_APPLICABILITY_UNRESOLVED`
* `NOT_APPLICABLE`
* `VERIFICATION_UNAVAILABLE`

Adapt these values to existing API conventions instead of introducing unnecessary duplicate status systems.

Important rules:

1. An uploaded document is not automatically valid.
2. A valid file format does not establish regulatory compliance.
3. Missing evidence is not proof of fraud.
4. An unresolved applicability condition must not silently become a mandatory failure.
5. `NOT_APPLICABLE` must have a defensible reason.
6. External verification unavailability must not be interpreted as a negative verification result.

Keep checklist status separate from the final human reviewer decision.

## 5. Support Safe Applicability Evaluation

Implement a predictable process for evaluating requirements.

For each candidate requirement:

1. Identify its verified applicability conditions.
2. Read the corresponding application data.
3. Evaluate the conditions using deterministic logic.
4. Determine whether the requirement applies.
5. Generate the appropriate checklist item.
6. Associate available evidence.
7. Assign an honest status.
8. Record the reason and source reference.

Handle missing, invalid, and contradictory application data explicitly.

Do not silently default unknown values to a value that makes a requirement pass or fail.

Do not execute arbitrary user-supplied expressions as workflow rules.

Keep regulatory rule evaluation separate from presentation logic.

## 6. Preserve Existing Applications and Documents

Review the current database model before deciding whether checklist items require persistence.

Prefer computing checklist results from existing verified definitions when persistence is unnecessary.

If persistence is required:

* Design a backward-compatible schema change.
* Preserve existing applications and document associations.
* Add appropriate uniqueness and integrity constraints.
* Support repeatable migrations and seed operations.
* Avoid database resets and destructive operations.
* Keep existing application records readable.
* Avoid duplicate checklist entries when a workflow is evaluated repeatedly.

If a safe migration cannot be established, document the issue before proceeding with that specific change.

## 7. API Integration

Extend existing endpoints where practical.

The API should return sufficient information for the frontend to display:

* Checklist item name.
* Requirement description.
* Applicability status.
* Reason for applicability.
* Required document type.
* Current evidence status.
* Source reference, when verified.
* Reviewer guidance.
* Known limitations.

Validate incoming application attributes.

Do not trust frontend-supplied institution IDs or permissions when making authorization decisions.

Enforce authentication and object-level authorization on all affected endpoints.

Do not introduce an API contract that breaks existing working frontend screens without updating and testing the consumers.

## 8. Frontend Integration

Integrate the conditional checklist into the existing VerityAI interface.

Preserve the current design system, navigation, and established components.

Display:

* Overall checklist progress.
* Required documents still missing.
* Uploaded documents awaiting review.
* Conditional requirements requiring clarification.
* Requirements marked not applicable and the reason.
* Evidence and regulatory references where available.
* Clear next actions for the institution user or reviewer.

Avoid presenting an overall percentage as a legal compliance score unless its calculation and meaning are explicitly justified.

If progress is displayed, label it as document-submission or checklist progress.

Keep the Phase A prototype disclaimer visible wherever compliance results are displayed.

Do not perform a broad UI redesign in this phase.

## 9. Handle Workflow Changes

If an application's category or relevant attributes change, determine whether the checklist must be recalculated.

Requirements:

* Re-evaluate affected applicability conditions.
* Preserve previously uploaded documents.
* Avoid silently deleting reviewer findings.
* Maintain an audit trail for material workflow changes where supported.
* Identify documents that no longer apply without deleting their historical records.
* Flag requirements that need human review when the change creates ambiguity.

Do not automatically treat a previously uploaded document as satisfying a different document requirement merely because the file exists.

## 10. Testing Requirements

Add or update tests covering:

1. Existing checklist behavior.
2. Each implemented conditional requirement.
3. Different supported application categories.
4. Different supported institution types, where applicable.
5. Required document missing.
6. Required document uploaded.
7. Conditional requirement applicable.
8. Conditional requirement not applicable.
9. Missing applicability data.
10. Invalid or contradictory application attributes.
11. Repeated checklist evaluation.
12. Application category changes.
13. Existing document associations.
14. Authorization for checklist access.
15. API response compatibility.
16. Frontend rendering of relevant statuses.

Use synthetic data.

Do not write tests that assert unsupported regulatory assumptions.

Run the relevant tests first, then the complete backend suite and frontend production build if affected.

Record actual commands and results.

## 11. Phase C Acceptance Criteria

Phase C is complete only when:

* Checklist generation responds correctly to supported application attributes.
* Every implemented conditional requirement has verified supporting evidence.
* Unknown applicability is handled explicitly.
* Missing documents are distinguished from compliance failures.
* Existing documents and applications remain intact.
* Repeated evaluations do not create unintended duplicates.
* API and frontend workflows remain compatible.
* Relevant tests pass.
* The implementation preserves human decision authority.

## 12. Deliverables

Create:

`docs/aicte-audit/PHASE_C_IMPLEMENTATION_REPORT.md`

Include:

1. Executive summary.
2. Existing workflow findings.
3. Conditional requirements implemented.
4. Supporting regulatory evidence.
5. Checklist status model.
6. API and frontend changes.
7. Database changes, if any.
8. Test commands and actual results.
9. Known limitations.
10. Unresolved questions.
11. Phase D readiness assessment.

Update:

`docs/aicte-audit/IMPLEMENTATION_PROGRESS.md`

Record the phase status accurately.

## 13. Execution Instruction

Implement Phase C only.

Do not start Phase D's extraction improvements or Phase E's rule-engine expansion.

If Phase B did not provide sufficient evidence for a requirement, leave that requirement unimplemented and document why.

Do not rewrite existing workflow services unnecessarily.

After implementation, inspect the diff, run the relevant tests, save the report, and update the progress tracker.

Continue automatically to the next phase only when the master controller confirms that Phase C's prerequisites and acceptance criteria are satisfied.



# PHASE D — DOCUMENT EXTRACTION AND FIELD-LEVEL EVIDENCE

**Priority:** P1
**Goal:** Improve document processing so VerityAI can extract information from uploaded documents, preserve traceable evidence, and distinguish extracted values from verified facts.

## 1. Mandatory Pre-Implementation Inspection

Before making changes, inspect:

* `docs/aicte-audit/PHASE_A_IMPLEMENTATION_REPORT.md`
* `docs/aicte-audit/PHASE_B_IMPLEMENTATION_REPORT.md`
* `docs/aicte-audit/PHASE_C_IMPLEMENTATION_REPORT.md`
* `docs/aicte-audit/IMPLEMENTATION_PROGRESS.md`
* `docs/aicte-audit/DOCUMENT_MASTER_CATALOG.csv`
* `docs/aicte-audit/DOCUMENT_FIELD_SCHEMAS.json`
* `docs/aicte-audit/REQUIREMENTS_TRACEABILITY_MATRIX.csv`
* `docs/aicte-audit/OPEN_QUESTIONS_AND_BLOCKERS.md`
* Existing document-processing services, schemas, API endpoints, database models, frontend components, and tests.

Confirm that Phase A's security remediation is complete and that Phase B and Phase C have established the prerequisites for this work.

Inspect the actual implementation before deciding what to modify. Reuse working extraction components wherever possible.

## 2. Audit the Existing Extraction Pipeline

Document the current processing flow, including:

* File upload and validation.
* File type detection.
* PDF text extraction using PyMuPDF.
* OCR fallback using RapidOCR, where applicable.
* Page-level text processing.
* Field extraction.
* Extraction error handling.
* Evidence storage.
* API responses.
* Frontend presentation.

Identify the actual limitations of the existing implementation.

Do not replace working extraction libraries or introduce a new AI provider without a demonstrated technical need.

## 3. Implement Page-Level Evidence Tracking

Every extracted field should retain enough information for a reviewer to locate and verify its source.

Where supported by the document format, capture:

* Document ID.
* Document version or content hash.
* Page number.
* Field name.
* Extracted value.
* Original text supporting the value.
* Extraction method.
* Extraction status.
* Confidence score, if the method provides a defensible score.
* Bounding-box coordinates, when available.
* Extraction timestamp.
* Relevant warnings or limitations.

Preserve the original source document and its integrity metadata.

If precise coordinates cannot be determined reliably, retain page-level evidence and explicitly mark the limitation.

Never fabricate page numbers, bounding boxes, quotations, or confidence scores.

## 4. Separate Extraction From Verification

Represent extraction and verification as distinct stages.

For example:

* `EXTRACTED`: A value was obtained from the document.
* `NEEDS_REVIEW`: The value is ambiguous or insufficiently supported.
* `VERIFIED_AGAINST_SOURCE`: The value was checked against a specified authoritative source.
* `CONFLICTING_EVIDENCE`: Available evidence disagrees.
* `EXTRACTION_FAILED`: The system could not reliably obtain the value.
* `NOT_VERIFIABLE`: The required independent verification source is unavailable.

Adapt these labels to the existing status model where possible.

Do not mark a value as verified merely because:

* OCR returned text.
* A regular expression matched.
* The same value appeared in multiple documents.
* The value passed a format check.
* An AI model assigned a high confidence score.

Verification must identify what source or rule was used and what the result actually establishes.

## 5. Improve Field Extraction

Use the existing document catalogue and field schemas as the starting point.

Prioritize fields that support the currently implemented application workflow.

Examples may include:

* Institution name.
* Institution identifiers.
* Certificate number.
* Issue date.
* Expiry date.
* Address.
* Land area.
* Built-up area.
* Intake or programme information.
* Relevant names and dates appearing across documents.

Only implement fields that are relevant to supported document types and have a clear purpose.

For each field, define:

* Expected data type.
* Normalization rules.
* Acceptable formats, where supported.
* Source evidence requirements.
* Validation rules.
* Ambiguity handling.
* Human-review conditions.

Do not assume that every listed field appears in every document.

Do not infer a missing value simply because it is expected.

## 6. Handle OCR and Document Quality

Improve processing behavior for:

* Scanned PDFs.
* Native-text PDFs.
* Mixed scanned and text-based PDFs.
* Rotated pages.
* Low-quality scans.
* Empty or nearly empty pages.
* Multi-page documents.
* Unsupported or malformed files.
* Password-protected PDFs.
* Extraction timeouts and OCR failures.

Where possible, detect whether a page contains usable text before invoking OCR.

Keep OCR resource usage bounded. Apply sensible limits to file size, page count, processing time, and memory consumption, consistent with the existing architecture.

Return useful error states instead of crashing or silently producing incomplete results.

Do not treat OCR output as ground truth.

## 7. Normalize Values Without Losing Evidence

Where normalization is useful, preserve both:

1. The original extracted value.
2. The normalized value used for comparison.

Examples include date normalization, whitespace cleanup, identifier formatting, and consistent representation of numeric quantities.

Do not discard meaningful punctuation, leading zeros, units, or distinctions between similar identifiers.

For quantities such as land area, preserve the original unit and only convert units when the conversion is explicit and tested.

If a conversion or normalization could change the interpretation, flag the field for review.

## 8. Cross-Document Comparison

Improve existing cross-document comparisons using extracted, traceable values.

Where relevant, compare:

* Institution names.
* Institution identifiers.
* Addresses.
* Certificate numbers.
* Dates.
* Programme details.
* Intake figures.
* Other fields supported by the existing schemas.

For each discrepancy, record:

* The compared fields.
* The source documents.
* The source pages.
* The original values.
* Any normalized values.
* The comparison method.
* The nature of the discrepancy.
* Whether human review is required.

Do not label every discrepancy as fraud.

Differences may arise from formatting, legitimate updates, different document dates, OCR errors, or genuine inconsistencies.

Where a reliable comparison is impossible, return an explicit unresolved state.

## 9. API and Frontend Integration

Extend existing API responses and UI components to present extracted information clearly.

Reviewers should be able to inspect:

* Extracted field values.
* Original supporting text.
* Source document and page.
* Extraction method.
* Confidence information, when meaningful.
* Verification status.
* Conflicting values.
* Extraction warnings.
* Fields requiring manual review.

Where feasible, provide a direct way to open the relevant document page.

Do not imply that evidence is independently verified when it only shows the origin of an extracted value.

Preserve the existing design system and API compatibility.

Keep the Phase A prototype disclaimer visible wherever compliance findings are displayed.

## 10. Privacy and Security

Ensure extraction improvements do not weaken existing protections.

Requirements:

* Reuse the security controls established in Phase A.
* Enforce authentication and authorization on document and extraction-result endpoints.
* Prevent cross-institution data exposure.
* Avoid exposing filesystem paths, stack traces, secrets, or internal infrastructure details.
* Validate file types and processing limits.
* Avoid executing embedded document content.
* Treat extracted text as untrusted input.
* Prevent document content from influencing system instructions or causing unauthorized tool execution if an AI model is used.
* Do not log sensitive document contents unnecessarily.
* Preserve the integrity of uploaded files and associated evidence.

## 11. Testing Requirements

Add or update tests covering:

1. Native-text PDF extraction.
2. OCR fallback.
3. Multi-page documents.
4. Empty and malformed documents.
5. Unsupported file formats.
6. Missing fields.
7. Ambiguous values.
8. Date and numeric normalization.
9. Original-value preservation.
10. Page-level evidence.
11. Bounding-box accuracy, where implemented.
12. Extraction failures and timeouts.
13. Cross-document comparison.
14. Conflicting evidence.
15. Extraction versus verification status.
16. Document version or content-hash association.
17. Authorization and cross-institution isolation.
18. API compatibility.
19. Existing workflow regressions.

Use synthetic fixtures and appropriately licensed test documents.

Do not report extraction accuracy unless it has been measured against a documented ground-truth dataset.

If accuracy evaluation is feasible, report the dataset, field-level metrics, sample size, and limitations separately from ordinary software test results.

## 12. Phase D Acceptance Criteria

Phase D is complete only when:

* Supported document types can be processed through the existing pipeline.
* Extracted fields have traceable source evidence.
* Extraction and independent verification are clearly distinguished.
* OCR failures and ambiguous values are handled safely.
* Original values are preserved when normalization occurs.
* Cross-document discrepancies can be traced to their sources.
* Security and authorization remain intact.
* Relevant tests and the frontend build pass.
* Known extraction limitations are documented honestly.

## 13. Deliverables

Create:

`docs/aicte-audit/PHASE_D_IMPLEMENTATION_REPORT.md`

Include:

1. Existing pipeline assessment.
2. Components reused and modified.
3. Extraction capabilities implemented.
4. Field-level evidence design.
5. OCR and normalization behavior.
6. Verification-status semantics.
7. Cross-document comparison changes.
8. API and frontend changes.
9. Security considerations.
10. Test commands and actual results.
11. Any measured accuracy results and evaluation methodology.
12. Known limitations and unresolved questions.
13. Phase E readiness assessment.

Update:

`docs/aicte-audit/IMPLEMENTATION_PROGRESS.md`

## 14. Execution Instruction

Implement Phase D only.

Do not expand the regulatory rule engine or add new regulatory requirements as part of this phase.

Preserve working functionality, avoid unnecessary dependencies, and inspect the final diff.

Run targeted tests, the complete backend test suite, and the frontend production build when affected.

Record actual outcomes. Never conceal failed tests or describe unimplemented features as complete.

After producing the report and updating the progress tracker, the master controller may proceed to Phase E if all prerequisites are satisfied.



# PHASE E — RULE ENGINE AND EVIDENCE-BASED VALIDATION

**Priority:** P1
**Goal:** Strengthen VerityAI's deterministic validation engine so every finding is traceable to an explicit rule, supporting evidence, applicability conditions, and an appropriate verification status.

## 1. Mandatory Pre-Implementation Inspection

Before changing anything, inspect:

* `docs/aicte-audit/PHASE_A_IMPLEMENTATION_REPORT.md`
* `docs/aicte-audit/PHASE_B_IMPLEMENTATION_REPORT.md`
* `docs/aicte-audit/PHASE_C_IMPLEMENTATION_REPORT.md`
* `docs/aicte-audit/PHASE_D_IMPLEMENTATION_REPORT.md`
* `docs/aicte-audit/IMPLEMENTATION_PROGRESS.md`
* `docs/aicte-audit/REGULATORY_REQUIREMENTS_REGISTER.csv`
* `docs/aicte-audit/REQUIREMENTS_TRACEABILITY_MATRIX.csv`
* `docs/aicte-audit/REGULATORY_CONFLICT_REGISTER.csv`, if present.
* `docs/aicte-audit/OPEN_QUESTIONS_AND_BLOCKERS.md`
* `backend/app/services/validation.py`
* Existing rule models, seed data, APIs, workflow services, frontend finding components, and tests.

Verify that Phases A–D satisfy their acceptance criteria.

If a prerequisite is incomplete, document the blocker and do not build on unverified assumptions.

## 2. Audit the Existing Rule Engine

Determine how rules are currently:

* Defined and stored.
* Associated with application categories.
* Evaluated against application data.
* Evaluated against uploaded documents.
* Linked to extracted fields.
* Represented in API responses.
* Displayed to reviewers.
* Tested and seeded.

Identify the limitations of the existing implementation before making changes.

Preserve working rule behavior and existing identifiers wherever practical.

Do not introduce a new rule engine merely to replace an existing service that can be extended safely.

## 3. Establish a Traceable Rule Model

Extend the existing rule representation to support the metadata that the application actually needs.

Where appropriate, each rule should contain:

* Stable rule ID.
* Rule version.
* Rule title and description.
* Rule category.
* Source document title.
* Source document version or applicable period.
* Clause, annexure, page, or other precise source locator.
* Applicability conditions.
* Required input fields.
* Validation logic or supported rule type.
* Expected outcome.
* Severity or review priority.
* Effective dates, where established.
* Regulatory verification status.
* Known limitations.
* Human-review requirements.
* Creation and update timestamps.

Reuse existing schema fields when equivalent information is already represented.

Do not add unnecessary fields simply to make the schema appear comprehensive.

## 4. Enforce Regulatory Verification Status

Use explicit statuses to distinguish the quality of the underlying regulatory evidence.

Suggested statuses:

* `VERIFIED`
* `PARTIALLY_VERIFIED`
* `UNVERIFIED`
* `CONFLICTED`
* `SUPERSEDED`

Adapt these values to the existing architecture.

Apply the following rules:

1. Only adequately verified rules may produce authoritative-looking deterministic compliance findings.
2. Partially verified rules may produce clearly labelled provisional findings or request human review.
3. Unverified rules must not cause an application to fail compliance checks.
4. Conflicted rules must not be resolved through undocumented assumptions.
5. Superseded rules must not be applied to current applications unless their historical applicability is explicitly required.
6. A rule must not be marked verified merely because a developer implemented it or a test passed.

Every implemented regulatory rule must have traceable supporting evidence.

If a rule cannot be verified from available sources, preserve the uncertainty and record what evidence is missing.

## 5. Implement Safe Deterministic Evaluation

Extend the current rule engine rather than introducing arbitrary code execution.

Support existing rule types and add new types only when required by verified requirements.

Potential rule types include:

* Required document presence.
* Required field presence.
* Date or expiry checks.
* Equality or consistency checks.
* Numeric range checks.
* Conditional applicability.
* Cross-document comparisons.

Implement only those types that are justified by the current requirements and supported by the available data.

For every evaluation:

1. Confirm rule applicability.
2. Validate input availability and types.
3. Check the rule's verification status.
4. Evaluate the deterministic condition.
5. Collect supporting evidence.
6. Produce an explicit outcome.
7. Record unresolved limitations.
8. Route ambiguous cases to human review.

Never execute arbitrary Python, JavaScript, SQL, or other code supplied through a rule definition.

Validate rule definitions before storing or activating them.

## 6. Separate Finding Types and Outcomes

Distinguish between:

* Requirement satisfied based on available evidence.
* Required evidence missing.
* Extracted field missing.
* Rule condition not satisfied.
* Conflicting evidence.
* Verification unavailable.
* Rule applicability unresolved.
* Human review required.
* Rule not evaluated.

Use the existing outcome model where practical.

Do not collapse these different situations into a single `PASS` or `FAIL`.

A missing document is not proof of fraud.

An unavailable external verification service is not a failed verification.

A document that satisfies a format check is not necessarily authentic.

A value matching another document does not independently establish its truth.

## 7. Evidence-Linked Findings

Each finding should include, where applicable:

* Unique finding ID.
* Rule ID and rule version.
* Evaluation timestamp.
* Application ID.
* Finding type and status.
* Human-readable explanation.
* Applicable source reference.
* Relevant document IDs.
* Source pages and extracted fields.
* Expected and observed values.
* Validation method.
* Verification limitations.
* Recommended next action.
* Whether human review is required.

Do not generate evidence references that point to nonexistent documents, fields, or source locations.

If evidence is incomplete, explain what is missing.

Preserve historical findings where existing versioning and audit facilities support it.

## 8. Rule Execution and Versioning

Ensure that rule changes do not silently alter the interpretation of previously evaluated applications.

Where supported by the existing architecture:

* Associate evaluations with the rule version used.
* Preserve the relevant rule metadata.
* Record evaluation timestamps.
* Make re-evaluation explicit.
* Identify findings affected by rule updates.
* Prevent duplicate findings during repeated evaluations.
* Keep evaluation history consistent with existing application versioning.

Do not silently overwrite historical decisions or reviewer actions.

If a regulatory amendment changes a rule, document the effective period and migration strategy before applying it.

## 9. Integrate With the Existing Workflow

Integrate the rule engine with Phases C and D.

The engine should consume:

* Application attributes.
* Conditional checklist results.
* Uploaded document metadata.
* Extracted field values.
* Field-level evidence.
* Verified regulatory requirements.

The engine should produce:

* Structured findings.
* Evidence references.
* Explicit evaluation outcomes.
* Uncertainty indicators.
* Human-review requirements.

Do not duplicate checklist logic, extraction logic, or regulatory source data unnecessarily.

Maintain clear boundaries between workflow applicability, document extraction, rule evaluation, and reviewer adjudication.

## 10. Reviewer Experience

Extend existing findings and validation components to show:

* What was checked.
* Why the check applies.
* Which rule was used.
* The source of the rule.
* What evidence supports the finding.
* What condition was evaluated.
* Whether independent verification occurred.
* What remains uncertain.
* What action the reviewer should take.

Display unverified and conflicted rules prominently as limitations rather than confirmed violations.

Maintain the existing design system and Phase A prototype disclaimer.

The interface must not imply that automated findings constitute an official AICTE approval or rejection.

## 11. External Verification Boundaries

Inspect existing registry adapters and external verification interfaces.

Preserve the distinction between:

* Synthetic demonstration data.
* Locally available evidence.
* Configured but untested integrations.
* Tested authorized external integrations.
* Unavailable verification sources.

Do not claim live AICTE, AISHE, institutional, or other statutory database access unless the integration is authorized, implemented, and demonstrably tested.

If an external source is unavailable, return a clear status and preserve the finding for human review.

Do not substitute synthetic records for real verification without clearly identifying them as synthetic.

## 12. Testing Requirements

Add or update tests covering:

1. Valid rule definitions.
2. Invalid rule definitions.
3. Duplicate rule IDs.
4. Rule version handling.
5. Source metadata validation.
6. Applicability conditions.
7. Verified rules.
8. Partially verified rules.
9. Unverified rules.
10. Conflicted rules.
11. Superseded rules.
12. Missing input fields.
13. Invalid input types.
14. Each implemented rule type.
15. Evidence-linked findings.
16. Unavailable external verification.
17. Human-review routing.
18. Repeated evaluation and duplicate prevention.
19. Historical evaluation preservation.
20. API authorization.
21. Existing checklist and extraction integration.
22. Regression against existing tests.

Use synthetic test data.

Tests must not treat an unsupported regulatory assumption as correct simply because it is encoded in a rule.

Run targeted tests, the full backend test suite, and the frontend production build when affected.

Record actual commands and outcomes.

## 13. Phase E Acceptance Criteria

Phase E is complete only when:

* Rules have stable identities and traceable metadata.
* Regulatory verification status affects rule execution appropriately.
* Unsupported rules cannot silently produce definitive compliance failures.
* Evaluation outcomes distinguish missing evidence, conflicts, and unavailable verification.
* Findings link to actual supporting evidence.
* Rule execution is deterministic and safe.
* Existing workflow and extraction components remain compatible.
* Rule changes do not silently corrupt historical evaluations.
* Human reviewers retain final decision authority.
* Relevant tests pass and known limitations are documented.

## 14. Deliverables

Create:

`docs/aicte-audit/PHASE_E_IMPLEMENTATION_REPORT.md`

Include:

1. Existing rule engine assessment.
2. Rule model and versioning changes.
3. Regulatory verification policy.
4. Rule types implemented.
5. Evaluation behavior and outcome semantics.
6. Evidence-linking implementation.
7. Checklist and extraction integration.
8. External verification limitations.
9. API and frontend changes.
10. Test commands and actual results.
11. Known limitations and unresolved regulatory questions.
12. Phase F readiness assessment.

Update:

`docs/aicte-audit/IMPLEMENTATION_PROGRESS.md`

## 15. Execution Instruction

Implement Phase E only.

Do not begin Phase F's external verification integration work or Phase G's security and performance hardening.

Preserve existing functionality and data. Do not reset databases or perform destructive migrations.

Inspect the final diff, run relevant tests, and report any failures honestly.

After saving the report and updating the progress tracker, the master controller may proceed to Phase F when the prerequisites and acceptance criteria are satisfied.





# PHASE F — EXTERNAL VERIFICATION AND REGISTRY INTEGRATION

**Priority:** P1
**Goal:** Establish a reliable, secure, and auditable architecture for verifying institutional claims against authorized external sources without misrepresenting synthetic data or unavailable integrations as real verification.

## 1. Mandatory Pre-Implementation Inspection

Before making changes, inspect:

* `docs/aicte-audit/PHASE_A_IMPLEMENTATION_REPORT.md`
* `docs/aicte-audit/PHASE_B_IMPLEMENTATION_REPORT.md`
* `docs/aicte-audit/PHASE_C_IMPLEMENTATION_REPORT.md`
* `docs/aicte-audit/PHASE_D_IMPLEMENTATION_REPORT.md`
* `docs/aicte-audit/PHASE_E_IMPLEMENTATION_REPORT.md`
* `docs/aicte-audit/IMPLEMENTATION_PROGRESS.md`
* `docs/aicte-audit/REGULATORY_REQUIREMENTS_REGISTER.csv`
* `docs/aicte-audit/SOURCE_AUTHORITY_REGISTER.csv`, if present.
* `docs/aicte-audit/OPEN_QUESTIONS_AND_BLOCKERS.md`
* Existing registry adapters, service interfaces, configuration, database models, API endpoints, frontend components, and tests.

Confirm that Phases A–E meet their acceptance criteria.

Inspect the actual registry implementation before changing it. Preserve existing working functionality.

## 2. Audit Existing Registry Integrations

Inspect every existing external verification provider and classify it accurately.

At minimum, distinguish:

* Synthetic demonstration provider.
* Local or manually supplied reference data.
* Official provider stub.
* Configured external integration.
* Successfully tested authorized external integration.
* Unavailable or unconfigured provider.

Review the existing `SyntheticAISHEProvider` and `OfficialAICTEProviderStub`, or their current equivalents.

Determine exactly what each provider does, what data it uses, and what its output means.

Do not describe a stub as an operational integration.

Do not assume that publicly accessible information provides an authorized API or permission to automate access.

## 3. Establish an Explicit Provider Contract

Extend the existing adapter architecture rather than introducing a parallel integration system.

Where appropriate, define a consistent provider contract containing:

* Provider identifier and display name.
* Source authority.
* Integration status.
* Supported verification capabilities.
* Request and response schemas.
* Input validation.
* Verification result.
* Source reference.
* Retrieval timestamp.
* Source record timestamp, if available.
* Data freshness information, if available.
* Provider error or unavailability status.
* Relevant limitations.
* Correlation or audit identifier.

Adapt the contract to the existing architecture.

Avoid storing unnecessary copies of sensitive external records.

## 4. Use Honest Verification Outcomes

Implement or reuse explicit outcomes such as:

* `MATCH_CONFIRMED`
* `MISMATCH_FOUND`
* `RECORD_NOT_FOUND`
* `SOURCE_UNAVAILABLE`
* `ACCESS_NOT_CONFIGURED`
* `AUTHORIZATION_REQUIRED`
* `RESPONSE_INVALID`
* `DATA_STALE`
* `MANUAL_REVIEW_REQUIRED`
* `NOT_CHECKED`

Use these only where their meanings are supported by the provider response.

Important distinctions:

1. A record not found does not automatically establish fraud.
2. A mismatch does not independently establish document forgery.
3. An unavailable service does not mean verification failed.
4. A successful HTTP response does not guarantee that the returned record is authoritative.
5. Synthetic data must never produce a result labelled as real-world verification.
6. A match confirms only the specific claim and source that were checked.

Every result must identify its source and verification limitations.

## 5. Implement Real Integrations Only When Authorized

Inspect the available configuration and existing integration documentation.

If official credentials, documented APIs, and authorization are available:

* Use the documented API contract.
* Keep credentials in environment variables or the existing secret-management mechanism.
* Validate requests and responses.
* Apply bounded timeouts and safe retry policies.
* Handle rate limits.
* Avoid logging credentials or sensitive payloads.
* Add mocked tests and authorized integration tests where feasible.
* Document the exact capabilities actually verified.

If credentials, API documentation, or authorization are unavailable:

* Do not invent endpoints.
* Do not fabricate credentials or responses.
* Do not scrape protected systems.
* Do not bypass access controls.
* Do not claim integration is complete.
* Preserve a clear, testable provider interface.
* Return an honest `ACCESS_NOT_CONFIGURED` or equivalent status.

Continue with safe architecture, documentation, and tests rather than blocking unrelated work.

## 6. Handle Data Quality and Freshness

Where the provider supplies the relevant metadata, record:

* Source record identifier.
* Source timestamp.
* Retrieval timestamp.
* Source version or revision.
* Freshness threshold, if justified.
* Data quality limitations.

Do not invent timestamps or freshness guarantees.

If a source record is stale, malformed, incomplete, or ambiguous, make the limitation visible.

Do not treat the absence of a timestamp as proof that the record is current.

## 7. Security and Privacy

External verification must preserve the existing security controls.

Requirements:

* Authenticate and authorize callers.
* Enforce institution-level access restrictions.
* Validate identifiers and request parameters.
* Protect provider credentials.
* Use HTTPS where applicable.
* Apply timeouts and bounded retries.
* Prevent SSRF and arbitrary URL access.
* Do not allow users to supply unrestricted provider URLs.
* Avoid leaking sensitive information in error responses.
* Minimize personal and institutional data sent to external services.
* Record security-relevant verification actions.
* Apply rate limits where appropriate.

Do not weaken the Phase A document-access controls or other existing authorization checks.

## 8. Frontend Integration

Extend the existing reviewer interface to show:

* Verification source.
* Verification status.
* Claim or field being checked.
* Retrieval time, where available.
* Source reference.
* Match or mismatch details.
* Source availability.
* Data freshness, when supported.
* Known limitations.
* Recommended next action.

Clearly label synthetic results as **Synthetic Demo Data**.

Clearly label unconfigured providers as **Not Connected** or equivalent.

Never use official-looking success indicators for synthetic or unverified results.

Preserve the current design system and the Phase A prototype disclaimer.

## 9. Testing Requirements

Add or update tests covering:

1. Provider interface compatibility.
2. Synthetic provider labelling.
3. Unconfigured official provider behavior.
4. Authorized provider success, where available.
5. Record match.
6. Record mismatch.
7. Record not found.
8. Provider timeout.
9. Rate limiting.
10. Invalid provider response.
11. Stale records.
12. Missing source metadata.
13. Missing credentials.
14. Unauthorized access.
15. Institution-level access isolation.
16. SSRF protections.
17. Credential redaction.
18. Audit logging.
19. Frontend status presentation.
20. Regression against existing tests.

Use mocked providers for ordinary automated tests.

Do not make live external calls during the default test suite unless the project already has a safe, explicitly configured integration-test mechanism.

Never fabricate a successful live integration test.

## 10. Phase F Acceptance Criteria

Phase F is complete only when:

* Every provider's status and capabilities are documented accurately.
* Synthetic and real verification are clearly separated.
* Unavailable sources produce honest outcomes.
* Provider responses are validated.
* Credentials and sensitive information are protected.
* Verification findings identify their source and limitations.
* The application handles provider errors without falsely declaring compliance.
* Existing registry behavior remains compatible.
* Relevant tests pass.
* Missing credentials or authorization are documented rather than bypassed.

A production integration is not required when authorized access is unavailable. A secure, tested adapter with honest status reporting is an acceptable result.

## 11. Deliverables

Create:

`docs/aicte-audit/PHASE_F_IMPLEMENTATION_REPORT.md`

Include:

1. Existing provider inventory.
2. Provider capabilities and integration status.
3. Adapter contract and architecture.
4. Verification outcomes and their meanings.
5. Authorized integrations implemented, if any.
6. Synthetic-data safeguards.
7. Security and privacy controls.
8. API and frontend changes.
9. Test commands and actual results.
10. External dependencies and access limitations.
11. Known risks and unresolved questions.
12. Phase G readiness assessment.

Update:

`docs/aicte-audit/IMPLEMENTATION_PROGRESS.md`

## 12. Execution Instruction

Implement Phase F only.

Do not begin Phase G's broader security, performance, and reliability hardening.

Preserve existing data and working functionality. Do not invent external services, bypass authorization, expose credentials, or make unsupported claims about live integrations.

Inspect the final diff, run relevant tests, and document all actual results.

After producing the report and updating the progress tracker, the master controller may proceed to Phase G when the prerequisites and acceptance criteria are satisfied.





# PHASE G — SECURITY, RELIABILITY, AND PERFORMANCE HARDENING

**Priority:** P0/P1
**Goal:** Harden VerityAI for a reliable, secure, and demonstrable prototype by addressing vulnerabilities, improving error handling, validating authorization boundaries, and measuring actual application performance.

## 1. Mandatory Pre-Implementation Inspection

Before making changes, inspect:

* `docs/aicte-audit/PHASE_A_IMPLEMENTATION_REPORT.md`
* `docs/aicte-audit/PHASE_B_IMPLEMENTATION_REPORT.md`
* `docs/aicte-audit/PHASE_C_IMPLEMENTATION_REPORT.md`
* `docs/aicte-audit/PHASE_D_IMPLEMENTATION_REPORT.md`
* `docs/aicte-audit/PHASE_E_IMPLEMENTATION_REPORT.md`
* `docs/aicte-audit/PHASE_F_IMPLEMENTATION_REPORT.md`
* `docs/aicte-audit/IMPLEMENTATION_PROGRESS.md`
* `docs/aicte-audit/OPEN_QUESTIONS_AND_BLOCKERS.md`
* Existing security tests, API authorization dependencies, database configuration, upload and extraction services, authentication logic, logging, frontend API handling, and deployment configuration.

Review earlier phase reports for unresolved security issues.

Do not assume that a vulnerability was fixed merely because an earlier report says it was fixed. Verify the actual code and tests.

If a critical vulnerability remains, prioritize remediation before unrelated hardening work.

## 2. Authentication and Authorization Audit

Review all API endpoints that expose or modify:

* Applications.
* Uploaded documents.
* Extracted fields.
* Validation findings.
* Registry verification results.
* Reviewer decisions.
* Audit records.
* Reports and exports.
* User and institution information.

Verify that:

1. Protected endpoints require appropriate authentication.
2. Institution users can access only authorized institutional resources.
3. Reviewer and administrator permissions are enforced server-side.
4. Object ownership is checked through actual database relationships.
5. Unauthorized access returns appropriate HTTP status codes.
6. Missing or inaccessible objects do not expose sensitive information.
7. Bulk operations apply authorization to every affected object.
8. File downloads and generated reports receive the same protections as ordinary API responses.

Do not rely on frontend route guards or hidden buttons as authorization controls.

Reuse the existing authentication architecture unless a concrete security defect requires a change.

## 3. File Upload and Download Security

Review the complete document lifecycle.

Inspect:

* File type validation.
* File size and page-count limits.
* Filename handling.
* Storage paths.
* Duplicate-file handling.
* File retrieval.
* PDF parsing and OCR resource limits.
* Generated report storage and downloads.
* Temporary-file cleanup.
* Error handling.

Ensure that:

* User-controlled filenames cannot cause path traversal.
* Files cannot overwrite unrelated application data.
* Untrusted document content is never executed.
* Upload limits are enforced server-side.
* File downloads require appropriate authorization.
* Cross-institution document access is prevented.
* Temporary files are handled safely.
* Malformed documents fail without crashing the service.
* Sensitive internal paths are not returned to clients.

Do not weaken existing content validation or introduce unsafe file-serving shortcuts.

## 4. Authentication and Session Hardening

Inspect the current Argon2id password hashing, JWT handling, HttpOnly session cookies, CSRF protections, and logout behavior.

Verify:

* Password verification uses the existing secure password-hashing mechanism.
* Session expiration is enforced.
* Signing keys are not hardcoded.
* Missing or insecure production secrets are detected.
* Cookies use appropriate `HttpOnly`, `Secure`, and `SameSite` settings for the deployment environment.
* State-changing requests are protected against CSRF where applicable.
* Logout invalidates or expires sessions according to the existing design.
* Authentication failures do not expose sensitive implementation details.
* Login and sensitive authentication operations have appropriate rate limiting or abuse protections.

Do not log passwords, tokens, cookies, or secret values.

Do not invent a new authentication system if the existing implementation can be hardened.

## 5. Input Validation and Application Security

Review API request validation and security-sensitive processing.

Check for:

* Missing schema validation.
* Unsafe dynamic SQL.
* Untrusted file paths.
* Unsafe deserialization.
* Arbitrary expression execution.
* SSRF vulnerabilities.
* Open redirects.
* Overly permissive CORS.
* Excessive request sizes.
* Unsafe exception responses.
* Sensitive information in logs.
* AI prompt-injection risks in extracted document text, where AI models are used.

Ensure extracted document content is treated as untrusted data rather than trusted instructions.

Validate provider URLs against the intended configuration and prevent users from supplying arbitrary URLs to privileged server-side fetch operations.

Do not introduce speculative security middleware without demonstrating that it is compatible with the current application.

## 6. Database and Data Integrity

Inspect SQLite configuration, transaction handling, SQLAlchemy models, Alembic migrations, and existing database constraints.

Verify:

* Transactions are used for logically related writes.
* Foreign-key constraints are enforced where intended.
* Unique identifiers and deduplication rules are consistent.
* Failed operations do not leave partially updated records.
* Migration operations preserve existing data.
* Repeated operations do not create unintended duplicate records.
* Audit and reviewer history remain consistent.
* Database errors do not leak sensitive SQL or filesystem details.

Do not reset the database or delete existing application data.

Do not migrate to a different database as part of this phase unless a demonstrated critical requirement makes it unavoidable. If a migration is necessary, document the reason, risks, rollback plan, and compatibility implications before implementing it.

## 7. Reliability and Error Handling

Inspect how the backend handles failures in:

* Authentication.
* Database operations.
* File uploads.
* PDF extraction.
* OCR.
* Rule evaluation.
* External registry providers.
* Report generation.
* Frontend API requests.

Ensure that:

* Failures produce consistent, understandable responses.
* Partial processing is represented accurately.
* Retriable operations are distinguished from permanent failures.
* External service timeouts are bounded.
* Unexpected exceptions are logged safely.
* Sensitive exception details are not exposed to users.
* Failed background or long-running operations do not appear successful.
* Users can identify the next appropriate action.

Do not suppress exceptions merely to make tests pass.

Do not return successful responses when the underlying operation failed.

## 8. Performance and Resource Management

Measure the current application before optimizing it.

Evaluate representative workflows such as:

* Application retrieval.
* Checklist generation.
* Document upload.
* Text extraction.
* OCR fallback.
* Rule evaluation.
* Cross-document comparison.
* Report generation.

Inspect for:

* Repeated database queries.
* Unbounded file processing.
* Excessive memory usage.
* Unnecessary repeated OCR.
* Expensive synchronous operations.
* Missing database indexes for demonstrated query patterns.
* Unbounded request or response sizes.
* Frontend rendering bottlenecks.

Apply targeted optimizations only where evidence supports them.

Use reasonable limits for file sizes, page counts, processing duration, and concurrent work.

Do not claim performance improvements without comparing measured results.

If load testing is feasible, document the workload, environment, concurrency, measurements, and limitations.

## 9. Auditability and Reviewer Actions

Inspect the existing audit-log and adjudication mechanisms.

Where supported, ensure important reviewer actions record:

* Actor identity.
* Action performed.
* Target application or finding.
* Timestamp.
* Relevant state transition.
* Reason or reviewer note, where appropriate.

Avoid logging unnecessary sensitive document content.

Ensure users cannot silently alter reviewer decisions or audit history through ordinary API requests.

Preserve historical findings and reviewer actions when applications are re-evaluated.

Do not claim the audit trail is tamper-proof unless appropriate technical controls establish that property.

## 10. Frontend and Deployment Hardening

Inspect frontend authentication handling, API error handling, environment configuration, and production build settings.

Verify:

* Authentication failures are handled consistently.
* Sensitive data is not unnecessarily stored in browser storage.
* Server secrets are never embedded in client-side bundles.
* Production configuration does not silently use development credentials.
* Error messages do not expose internal stack traces.
* The interface distinguishes loading, empty, error, and successful states.
* The prototype disclaimer remains visible where required.
* Synthetic data and unconfigured integrations are labelled accurately.

Review CORS, trusted hosts, cookie settings, and deployment configuration against the actual deployment architecture.

Do not invent deployment guarantees or assume that a development configuration is production-ready.

## 11. Automated Security and Regression Testing

Add or update tests covering:

1. Unauthenticated API requests.
2. Cross-institution access attempts.
3. Reviewer and administrator authorization.
4. Document download authorization.
5. Report download authorization.
6. Invalid authentication tokens.
7. Session expiration.
8. CSRF protections.
9. Malformed uploads.
10. Oversized uploads.
11. Path traversal attempts.
12. Unauthorized object access.
13. SSRF protections.
14. Invalid request payloads.
15. Database transaction failures where practical.
16. Provider timeouts.
17. Extraction failures.
18. Sensitive error-response handling.
19. Audit-log consistency.
20. Existing workflow regression.

Run the full backend test suite, relevant security tests, frontend production build, and existing end-to-end verification script.

Use additional dependency or static-analysis tools only when they are already available or can be introduced safely.

Record actual commands, outcomes, warnings, and failures.

A passing unit-test suite does not establish that the application is free of vulnerabilities.

## 12. Performance Validation

Where practical, execute a repeatable performance test against representative workflows.

Record:

* Test environment.
* Dataset size.
* Request or workflow count.
* Concurrency.
* Median latency.
* High-percentile latency, when sufficient samples exist.
* Throughput, where relevant.
* Resource usage, where measurable.
* Errors and timeouts.

Compare results with a baseline if one is available.

If no baseline exists, report the measurements without claiming an improvement.

Do not use synthetic benchmarks to imply production-scale readiness.

## 13. Phase G Acceptance Criteria

Phase G is complete only when:

* Critical known vulnerabilities are fixed or explicitly documented as blockers.
* Authentication and authorization are enforced server-side.
* Document and report access is protected.
* Upload and extraction limits are enforced.
* Secrets and sensitive information are handled safely.
* Database integrity is preserved.
* Failures are reported honestly.
* Performance changes are supported by measurements.
* Existing workflows remain functional.
* Security and regression tests pass, or failures are clearly documented.
* Remaining production risks are explicitly identified.

Do not describe the system as fully secure or production-ready solely because these tasks are complete.

## 14. Deliverables

Create:

`docs/aicte-audit/PHASE_G_IMPLEMENTATION_REPORT.md`

Include:

1. Security assessment.
2. Vulnerabilities identified.
3. Remediations implemented.
4. Authentication and authorization test results.
5. Upload and download security findings.
6. Database integrity assessment.
7. Reliability and error-handling changes.
8. Performance baseline and measured results, if available.
9. Commands executed and actual test outcomes.
10. Remaining security risks.
11. Deployment limitations.
12. Phase H readiness assessment.

Update:

`docs/aicte-audit/IMPLEMENTATION_PROGRESS.md`

## 15. Execution Instruction

Implement Phase G only.

Do not begin Phase H's final evaluation, demo-readiness assessment, and release documentation.

Preserve existing data and functionality. Avoid unnecessary architectural rewrites and destructive migrations.

If a critical issue cannot be safely resolved, document the impact and recommended remediation rather than concealing it or implementing an unsafe workaround.

Inspect the final diff, run the required tests, save the report, and update the progress tracker.

After the master controller confirms that Phase G's prerequisites and acceptance criteria are satisfied, it may proceed to Phase H.





# PHASE H — FINAL EVALUATION, DEMO READINESS, AND RELEASE AUDIT

**Priority:** P0/P1
**Goal:** Independently evaluate the completed VerityAI prototype, verify end-to-end functionality, assess regulatory traceability and security, and prepare a reliable Smart India Hackathon demonstration without overstating system capabilities.

## 1. Mandatory Pre-Implementation Inspection

Before making changes, inspect:

* `AGENTS.md`, if present.
* `VerityAI_Implementation_Master_Plan.md`, if available in the repository.
* `docs/aicte-audit/IMPLEMENTATION_PROGRESS.md`.
* `docs/aicte-audit/PHASE_A_IMPLEMENTATION_REPORT.md`.
* `docs/aicte-audit/PHASE_B_IMPLEMENTATION_REPORT.md`.
* `docs/aicte-audit/PHASE_C_IMPLEMENTATION_REPORT.md`.
* `docs/aicte-audit/PHASE_D_IMPLEMENTATION_REPORT.md`.
* `docs/aicte-audit/PHASE_E_IMPLEMENTATION_REPORT.md`.
* `docs/aicte-audit/PHASE_F_IMPLEMENTATION_REPORT.md`.
* `docs/aicte-audit/PHASE_G_IMPLEMENTATION_REPORT.md`.
* All relevant audit registers, traceability matrices, and unresolved-questions documents.
* Existing test suites, end-to-end verification scripts, frontend build configuration, and demo instructions.

Verify that the implementation reports correspond to actual code and test results.

Do not assume that an earlier phase passed simply because its report claims success.

If an earlier phase is incomplete, record the gap and determine whether it can be safely resolved within Phase H. Do not conceal critical unresolved vulnerabilities.

## 2. Establish the Actual Release Scope

Inspect the application and document what currently works.

Evaluate:

* Institution application workflow.
* Conditional checklist generation.
* Document upload and retrieval.
* PDF text extraction and OCR.
* Field-level evidence.
* Cross-document comparisons.
* Deterministic rule evaluation.
* External verification adapters.
* Reviewer findings and adjudication.
* Application history and versioning.
* Report generation and export.
* Authentication and role-based access.
* Institution-level data isolation.
* Error handling and recovery.

Classify each capability as:

* `IMPLEMENTED_AND_TESTED`
* `IMPLEMENTED_BUT_PARTIALLY_TESTED`
* `PARTIALLY_IMPLEMENTED`
* `DEMONSTRATION_ONLY`
* `NOT_IMPLEMENTED`
* `BLOCKED`

Use these classifications consistently.

Do not label a feature complete solely because its UI exists.

## 3. Run the Complete Verification Suite

Execute the available verification commands using the repository's actual environment and instructions.

At minimum, where applicable, run:

1. Complete backend test suite.
2. Security-specific tests.
3. Existing end-to-end verification script.
4. Frontend production build.
5. Database migration or schema validation.
6. Seed-data integrity checks.
7. API smoke tests.
8. Existing lint and type-check commands.
9. Browser-based tests, if configured.
10. Dependency or static security checks, if available.

Previously reported commands included:

* `pytest backend/tests -q`
* `python scripts/verify_e2e.py`
* `npm run build` from the frontend directory.

Confirm the current commands before running them; do not assume the repository remains unchanged.

For every command, record:

* Exact command.
* Execution environment.
* Exit status.
* Passed and failed test counts, where available.
* Warnings.
* Relevant failure details.

Do not fabricate test output or modify tests merely to make the suite pass.

If a test fails, investigate the cause and fix it only when the correction is safe and within scope. Otherwise, document the failure as an unresolved issue.

## 4. Perform an End-to-End Demonstration

Validate the complete user journey using synthetic demonstration data.

A representative journey should include:

1. Institution user authenticates.
2. User creates or opens an application.
3. System identifies the supported application workflow.
4. Conditional checklist is generated.
5. User uploads representative documents.
6. System validates the files.
7. Text extraction or OCR runs.
8. Extracted fields retain source evidence.
9. Deterministic rules evaluate supported conditions.
10. Findings identify the rules and evidence involved.
11. External verification displays the actual provider status.
12. Reviewer examines findings and records an adjudication.
13. Application history preserves the relevant actions.
14. A report is generated and downloaded by an authorized user.

Verify that the displayed results match the backend records.

Use clearly labelled synthetic data and representative documents.

Do not use real institutional or personal documents without appropriate authorization.

If a workflow depends on an unavailable external service, demonstrate its honest unavailable or unconfigured status instead of fabricating a successful verification.

## 5. Verify Regulatory Traceability

Audit the implemented regulatory rules against their recorded source evidence.

For each active rule, verify:

* Rule ID and version.
* Source document and version.
* Clause, annexure, page, or other locator.
* Applicability conditions.
* Effective period, where established.
* Required inputs.
* Evaluation logic.
* Supporting evidence.
* Test coverage.
* Verification status.
* Known limitations.

Check for:

* Unsupported mandatory requirements.
* Invented regulatory conditions.
* Missing source references.
* Incorrect or ambiguous citations.
* Conflicting requirements treated as settled.
* Superseded rules applied without justification.
* Synthetic data presented as real evidence.

Where a requirement cannot be independently verified, mark it accordingly and prevent unsupported definitive compliance conclusions.

Do not expand the regulatory scope merely to make the demonstration look more complete.

## 6. Validate Findings and Human Review

Confirm that reviewers can distinguish:

* Missing evidence.
* Extracted information.
* Rule-based validation results.
* Independent external verification.
* Conflicting evidence.
* Unavailable verification.
* Unresolved applicability.
* Findings requiring human review.

Verify that:

* Findings link to actual evidence.
* Source references are valid.
* Rule versions are identifiable.
* Reviewer decisions are recorded correctly.
* Re-evaluation does not silently erase historical decisions.
* Institutions cannot modify reviewer-only decisions without authorization.
* The application does not automatically issue an official approval or rejection.

Automated findings must remain decision support, not an unsupported substitute for official scrutiny.

## 7. Final Security Verification

Recheck the critical security boundaries, even if Phase G reports them as fixed.

At minimum, verify:

* Unauthenticated users cannot access protected documents.
* Institutions cannot access other institutions' documents.
* Reviewer and administrator permissions are enforced.
* Report downloads enforce authorization.
* File upload limits and validation are active.
* Sensitive errors do not expose internal details.
* Session and CSRF controls work as intended.
* Secrets are not committed or embedded in frontend assets.
* External verification endpoints cannot be manipulated into arbitrary server-side requests.
* Audit records remain consistent.

If any critical vulnerability remains, identify it prominently in the final report.

Do not claim that the system is production-ready while critical security issues remain unresolved.

## 8. Evaluate Extraction and Validation Quality

Review the evidence available for assessing document extraction and rule evaluation.

Distinguish software correctness from real-world accuracy.

Where a labelled evaluation dataset exists, report suitable metrics for the implemented capabilities.

For extraction, consider:

* Field-level exact-match accuracy.
* Precision and recall where applicable.
* OCR failure rate.
* Ambiguous-field rate.
* Page-reference correctness.

For deterministic rules, consider:

* Correct outcomes against manually verified test cases.
* False-positive findings.
* False-negative findings.
* Applicability errors.
* Unresolved cases.

Document the dataset, sample size, methodology, and limitations.

If no adequate labelled dataset exists, state that accuracy has not yet been established. Do not invent accuracy percentages or claim that the system achieves a particular accuracy level.

## 9. Evaluate Performance and Reliability

Use actual measurements where available.

Review:

* API response times.
* Document processing duration.
* OCR processing duration.
* Rule evaluation time.
* Report generation time.
* Resource consumption.
* Error and timeout rates.
* Behavior under representative concurrent requests.

Use repeatable tests and document the environment.

If load testing has not been performed, state that scalability remains unverified.

Do not claim production-scale capacity from a successful local demonstration.

## 10. Prepare a Reliable Hackathon Demonstration

Prepare a reproducible demonstration using the existing application.

Document:

* Prerequisites.
* Environment configuration.
* Required services.
* Database setup and migration commands.
* Synthetic seed-data procedure.
* Backend startup.
* Frontend startup.
* Test-account setup using the project's established mechanism.
* Representative demo scenario.
* Expected outputs.
* Known limitations.
* Recovery steps for common failures.

Never include passwords, API keys, tokens, or other secrets in committed demo documentation.

Do not reset an existing database as a shortcut.

If seed data is necessary, use a safe, repeatable procedure that preserves existing records.

Where a live integration is unavailable, explain the limitation and demonstrate the adapter's actual behavior.

## 11. Review the User Experience

Inspect the complete institution and reviewer workflows.

Verify that:

* Loading, success, empty, and error states are clear.
* Upload progress and processing status are understandable.
* Missing documents are easy to identify.
* Findings explain why they were generated.
* Evidence can be inspected.
* Uncertainty and unavailable verification are visible.
* Reviewer actions are clear.
* Reports use understandable terminology.
* The interface remains usable at the intended demonstration resolution.
* The prototype disclaimer appears wherever compliance results are displayed.

Avoid broad redesigns or unrelated feature additions.

Fix only usability defects that materially affect the demonstrated workflow or the correctness of the information presented.

## 12. Documentation and Repository Consistency

Review documentation for consistency with the actual implementation.

Update outdated instructions where necessary.

Ensure the repository clearly distinguishes:

* Implemented capabilities.
* Synthetic demonstration features.
* Unconfigured integrations.
* Verified regulatory rules.
* Unverified or conflicted regulatory questions.
* Known security limitations.
* Untested accuracy or scalability claims.

Check that report paths, filenames, API descriptions, environment variables, and startup instructions match the current repository.

Do not delete useful audit evidence or overwrite historical reports merely to simplify the documentation.

## 13. Final Acceptance Criteria

Phase H is complete only when:

* All earlier phase reports have been reviewed against the actual implementation.
* The complete available test suite has been executed.
* Test failures and warnings are documented accurately.
* The principal end-to-end demonstration has been tested.
* Active regulatory rules have traceable evidence and appropriate verification statuses.
* Security-critical workflows have been rechecked.
* Synthetic and real verification results are clearly distinguished.
* Accuracy and performance claims are supported by measurements or explicitly marked unverified.
* Demonstration instructions are reproducible.
* Known limitations and unresolved risks are documented.
* The final readiness assessment reflects the actual evidence.

A successful demonstration does not, by itself, establish regulatory validity, production readiness, or real-world accuracy.

## 14. Required Deliverables

Create:

`docs/aicte-audit/PHASE_H_IMPLEMENTATION_REPORT.md`

Include:

1. Executive summary.
2. Actual feature-completion matrix.
3. Full test execution summary.
4. End-to-end demonstration results.
5. Regulatory traceability assessment.
6. Extraction and validation quality assessment.
7. Security verification results.
8. Performance and reliability findings.
9. Deployment and demonstration instructions.
10. Remaining blockers and risks.
11. Unsupported or unverified capabilities.
12. Final readiness recommendation.

Update:

`docs/aicte-audit/IMPLEMENTATION_PROGRESS.md`

Then create:

`docs/aicte-audit/FINAL_READINESS_REPORT.md`

The final readiness report must include:

* Overall readiness: `READY_FOR_DEMO`, `READY_WITH_LIMITATIONS`, or `NOT_READY`.
* Critical blockers.
* High-priority issues.
* Verified capabilities.
* Demonstration-only capabilities.
* Unconfigured integrations.
* Regulatory uncertainties.
* Security findings.
* Actual test results.
* Recommended next steps.

Choose the readiness status based on evidence, not optimism.

## 15. Final Execution Instruction

Implement Phase H only.

Do not introduce unrelated features or rewrite working architecture.

Preserve existing data, audit history, and regulatory evidence.

Fix only safe, clearly identified defects within scope. If a fix would require a risky migration, authorization assumption, or unresolved regulatory decision, document the issue rather than improvising.

Inspect the final diff, execute the available verification suite, save both reports, and update the progress tracker.

When complete, provide a concise final summary containing:

1. Overall readiness status.
2. Phases completed and any incomplete phases.
3. Test results using actual counts.
4. Critical security issues, if any.
5. Regulatory limitations.
6. Demo startup instructions.
7. Important files changed.
8. Remaining blockers and recommended next actions.

Do not claim all phases are complete unless their acceptance criteria have actually been met.
