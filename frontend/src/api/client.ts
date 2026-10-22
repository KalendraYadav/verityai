export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  environment: string;
  timestamp: string;
  database: {
    status: string;
    engine: string;
    error?: string;
  };
}

export interface Institution {
  id: string;
  institution_name: string;
  institution_identifier?: string | null;
  institution_type?: string | null;
  state?: string | null;
  city?: string | null;
  status: string;
}

export interface ApplicationCategory {
  code: string;
  name: string;
  description?: string | null;
  required_document_types: string[];
  required_declared_fields: string[];
  provenance: string;
  enabled: boolean;
}

export interface ApplicationListItem {
  id: string;
  application_reference: string;
  institution: {
    id: string;
    institution_name: string;
    institution_identifier?: string | null;
  };
  category_code: string;
  academic_year?: string | null;
  lifecycle_status: string;
  pipeline_status: string;
  document_count: number;
  open_findings_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationCreatePayload {
  institution_id: string;
  category_code: string;
  academic_year?: string;
  declared_data: Record<string, any>;
}

export interface ApplicationDetailResponse {
  id: string;
  application_reference: string;
  institution: {
    id: string;
    institution_name: string;
    institution_identifier?: string | null;
    institution_type?: string | null;
    state?: string | null;
    city?: string | null;
    status: string;
  };
  category_code: string;
  academic_year?: string | null;
  lifecycle_status: string;
  pipeline_status: string;
  declared_data: Record<string, any>;
  submitted_at?: string | null;
  assigned_reviewer_id?: string | null;
  created_by: string;
  data_origin: string;
  created_at: string;
  updated_at: string;
  documents_summary?: {
    total: number;
    by_status: Record<string, number>;
  };
  current_validation_run_id?: string | null;
}

export interface PaginatedApplications {
  data: ApplicationListItem[];
  meta: {
    page: number;
    page_size: number;
    total: number;
  };
}

const COMMON_HEADERS = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'X-Requested-With': 'VerityAI',
};

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch('/api/v1/health', {
    method: 'GET',
    headers: { 'Accept': 'application/json', 'X-Requested-With': 'VerityAI' },
  });

  if (!response.ok) {
    throw new Error(`Health check failed with HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchApplications(params?: {
  page?: number;
  page_size?: number;
  lifecycle_status?: string;
  q?: string;
}): Promise<PaginatedApplications> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.page_size) query.set('page_size', String(params.page_size));
  if (params?.lifecycle_status) query.set('lifecycle_status', params.lifecycle_status);
  if (params?.q) query.set('q', params.q);

  const response = await fetch(`/api/v1/applications?${query.toString()}`, {
    method: 'GET',
    headers: COMMON_HEADERS,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error?.message || `Failed to fetch applications (${response.status})`);
  }

  return response.json();
}

export async function fetchInstitutions(): Promise<Institution[]> {
  const response = await fetch('/api/v1/institutions', {
    method: 'GET',
    headers: COMMON_HEADERS,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error?.message || `Failed to fetch institutions (${response.status})`);
  }

  const res = await response.json();
  return res.data;
}

export async function fetchCategories(): Promise<ApplicationCategory[]> {
  const response = await fetch('/api/v1/application-categories', {
    method: 'GET',
    headers: COMMON_HEADERS,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error?.message || `Failed to fetch categories (${response.status})`);
  }

  const res = await response.json();
  return res.data;
}

export async function createApplication(payload: ApplicationCreatePayload): Promise<any> {
  const response = await fetch('/api/v1/applications', {
    method: 'POST',
    headers: COMMON_HEADERS,
    body: JSON.stringify(payload),
  });

  const resData = await response.json();
  if (!response.ok) {
    const message = resData?.error?.message || 'Application creation failed';
    const details = resData?.error?.details?.map((d: any) => `${d.field}: ${d.issue}`).join('; ');
    throw new Error(details ? `${message} (${details})` : message);
  }

  return resData.data;
}

export async function fetchApplicationDetail(applicationId: string): Promise<ApplicationDetailResponse> {
  const response = await fetch(`/api/v1/applications/${applicationId}`, {
    method: 'GET',
    headers: COMMON_HEADERS,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error?.message || `Failed to fetch application detail (${response.status})`);
  }

  const res = await response.json();
  return res.data;
}

export async function fetchApplicationAudit(applicationId: string): Promise<AuditEventItem[]> {
  const response = await fetch(`/api/v1/applications/${applicationId}/audit`, {
    method: 'GET',
    headers: COMMON_HEADERS,
  });

  if (!response.ok) {
    return [];
  }

  const res = await response.json();
  return res.data || [];
}


export interface AuditEventItem {
  id: string;
  event_type: string;
  actor_id?: string | null;
  actor_type: string;
  application_id?: string | null;
  occurred_at: string;
  metadata?: Record<string, any> | null;
}

export async function fetchAuditEvents(limit = 10): Promise<AuditEventItem[]> {
  const response = await fetch(`/api/v1/audit-events?limit=${limit}`, {
    method: 'GET',
    headers: COMMON_HEADERS,
  });

  if (!response.ok) {
    return [];
  }

  const res = await response.json();
  return res.data || [];
}

export interface DocumentListItem {
  id: string;
  application_id: string;
  original_filename: string;
  media_type: string;
  file_size_bytes: number;
  sha256: string;
  page_count?: number | null;
  file_state: string;
  upload_status: string;
  processing_status: string;
  extraction_quality_band?: string | null;
  declared_type?: string | null;
  detected_type?: string | null;
  effective_type?: string | null;
  latest_verification_status?: string | null;
  possible_duplicate: boolean;
  uploaded_by: string;
  created_at: string;
}

export interface DocumentUploadResponseData {
  id: string;
  application_id: string;
  original_filename: string;
  media_type: string;
  file_size_bytes: number;
  sha256: string;
  upload_status: string;
  processing_status: string;
  possible_duplicate: boolean;
  processing_url: string;
  created_at: string;
}

export interface DocumentPageItem {
  id: string;
  document_id: string;
  processing_run_id: string;
  page_number: number;
  text_source: 'DIGITAL_TEXT' | 'OCR' | 'NONE';
  raw_text: string | null;
  clean_text: string | null;
  char_count: number;
  ocr_mean_confidence: number | null;
  rotation_applied: number | null;
  status: string;
  error_code: string | null;
  duration_ms: number | null;
  created_at: string;
}

export interface DocumentPagesResponseData {
  document_id: string;
  page_count: number;
  pages: DocumentPageItem[];
}

export interface ProcessingRunItem {
  id: string;
  document_id: string;
  trigger: string;
  status: string;
  pipeline_version: string;
  warnings: string[] | null;
  error_code: string | null;
  safe_error_summary: string | null;
  quality_summary: Record<string, any> | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
}

export interface DocumentProcessingStatusData {
  document_id: string;
  processing_status: string;
  extraction_quality_band: string | null;
  current_run: ProcessingRunItem | null;
  runs_history: ProcessingRunItem[];
}

export interface PaginatedDocuments {
  data: DocumentListItem[];
  meta: {
    page: number;
    page_size: number;
    total: number;
  };
}

export async function uploadDocument(
  applicationId: string,
  file: File,
  declaredType?: string
): Promise<DocumentUploadResponseData> {
  const formData = new FormData();
  formData.append('file', file);
  if (declaredType) {
    formData.append('declared_type', declaredType);
  }

  // Allow browser to set boundary header automatically
  const response = await fetch(`/api/v1/applications/${applicationId}/documents`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'X-Requested-With': 'VerityAI',
    },
    body: formData,
  });

  const resData = await response.json();
  if (!response.ok) {
    const message = resData?.error?.message || 'Document upload failed';
    const code = resData?.error?.code;
    const error = new Error(code ? `[${code}] ${message}` : message);
    (error as any).code = code;
    throw error;
  }

  return resData.data;
}

export async function fetchApplicationDocuments(
  applicationId: string,
  page = 1,
  pageSize = 20
): Promise<PaginatedDocuments> {
  const response = await fetch(
    `/api/v1/applications/${applicationId}/documents?page=${page}&page_size=${pageSize}`,
    {
      method: 'GET',
      headers: COMMON_HEADERS,
    }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error?.message || `Failed to fetch documents (${response.status})`);
  }

  return response.json();
}

export async function fetchAllDocuments(params?: {
  application_id?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedDocuments> {
  const query = new URLSearchParams();
  if (params?.application_id) query.set('application_id', params.application_id);
  if (params?.q) query.set('q', params.q);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('page_size', String(params.pageSize));

  const response = await fetch(`/api/v1/documents?${query.toString()}`, {
    method: 'GET',
    headers: COMMON_HEADERS,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error?.message || `Failed to fetch documents (${response.status})`);
  }

  return response.json();
}

export function getDocumentFileUrl(documentId: string, download = false): string {
  return `/api/v1/documents/${documentId}/file${download ? '?download=true' : ''}`;
}

export async function fetchDocumentPages(documentId: string): Promise<DocumentPagesResponseData> {
  const response = await fetch(`/api/v1/documents/${documentId}/pages`, {
    method: 'GET',
    headers: COMMON_HEADERS,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error?.message || `Failed to fetch document pages (${response.status})`);
  }

  const resJson = await response.json();
  return resJson.data;
}

export async function fetchDocumentProcessing(documentId: string): Promise<DocumentProcessingStatusData> {
  const response = await fetch(`/api/v1/documents/${documentId}/processing`, {
    method: 'GET',
    headers: COMMON_HEADERS,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error?.message || `Failed to fetch processing status (${response.status})`);
  }

  const resJson = await response.json();
  return resJson.data;
}

export async function reprocessDocument(documentId: string): Promise<DocumentProcessingStatusData> {
  const response = await fetch(`/api/v1/documents/${documentId}/reprocess`, {
    method: 'POST',
    headers: COMMON_HEADERS,
    body: JSON.stringify({ from_stage: 'TEXT_EXTRACT' }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    const message = errData?.error?.message || `Failed to reprocess document (${response.status})`;
    const code = errData?.error?.code;
    const error = new Error(code ? `[${code}] ${message}` : message);
    (error as any).code = code;
    throw error;
  }

  const resJson = await response.json();
  return resJson.data;
}

// ---------------------------------------------------------------------------
// Phase 5: Deterministic Validation Engine Types & Client
// ---------------------------------------------------------------------------

export interface ValidationRuleItem {
  id: string;
  rule_code: string;
  rule_version: string;
  rule_name: string;
  description: string;
  rule_type: 'REQUIRED_DOCUMENT' | 'REQUIRED_FIELD' | 'EXPIRY_CHECK' | 'FIELD_EQUALS_APPLICATION' | string;
  category: string;
  applies_to: {
    categories?: string[];
    [key: string]: any;
  };
  parameters: Record<string, any>;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
  on_fail_status: string;
  provenance: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface RuleResultItem {
  id: string;
  validation_run_id: string;
  application_id: string;
  rule_id: string;
  rule_code: string;
  rule_version: string;
  rule_type: string;
  target_key: string;
  status: 'PASS' | 'FAIL' | 'NEEDS_REVIEW' | 'NOT_APPLICABLE' | 'UNABLE_TO_EVALUATE' | string;
  severity: string;
  explanation: string;
  expected_value?: string | null;
  observed_value?: string | null;
  source_document_id?: string | null;
  source_page_number?: number | null;
  evidence_payload: Record<string, any>;
  inputs_status: string;
  human_review_required: boolean;
  unresolved_reason?: string | null;
  evaluation_date_used: string;
  evaluated_at: string;
}

export interface ValidationSummaryData {
  application_id: string;
  validation_run_id?: string | null;
  status: string;
  evaluation_date?: string | null;
  pipeline_version: string;
  total_rules: number;
  passed: number;
  failed: number;
  needs_review: number;
  not_applicable: number;
  unable_to_evaluate: number;
  is_compliant: boolean;
  evaluated_at?: string | null;
  results: RuleResultItem[];
}

export async function fetchValidationRules(enabledOnly = false): Promise<ValidationRuleItem[]> {
  const query = enabledOnly ? '?enabled_only=true' : '';
  const response = await fetch(`/api/v1/validation-rules${query}`, {
    method: 'GET',
    headers: COMMON_HEADERS,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error?.message || `Failed to fetch validation rules (${response.status})`);
  }

  const resJson = await response.json();
  return resJson.data;
}

export async function fetchApplicationValidationSummary(applicationId: string): Promise<ValidationSummaryData> {
  const response = await fetch(`/api/v1/applications/${applicationId}/validation-summary`, {
    method: 'GET',
    headers: COMMON_HEADERS,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error?.message || `Failed to fetch validation summary (${response.status})`);
  }

  const resJson = await response.json();
  return resJson.data;
}

export async function fetchApplicationValidationResults(
  applicationId: string,
  status?: string,
): Promise<RuleResultItem[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const response = await fetch(`/api/v1/applications/${applicationId}/validation-results${query}`, {
    method: 'GET',
    headers: COMMON_HEADERS,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error?.message || `Failed to fetch validation results (${response.status})`);
  }

  const resJson = await response.json();
  return resJson.data;
}

export async function triggerApplicationValidation(
  applicationId: string,
  evaluationDate?: string,
  force = false,
): Promise<ValidationSummaryData> {
  const response = await fetch(`/api/v1/applications/${applicationId}/validate`, {
    method: 'POST',
    headers: COMMON_HEADERS,
    body: JSON.stringify({
      evaluation_date: evaluationDate || null,
      force,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    const message = errData?.error?.message || `Failed to trigger validation (${response.status})`;
    const code = errData?.error?.code;
    const error = new Error(code ? `[${code}] ${message}` : message);
    (error as any).code = code;
    throw error;
  }

  const resJson = await response.json();
  return resJson.data;
}

export async function fetchValidationResultDetail(resultId: string): Promise<RuleResultItem> {
  const response = await fetch(`/api/v1/validation-results/${resultId}`, {
    method: 'GET',
    headers: COMMON_HEADERS,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error?.message || `Failed to fetch validation result (${response.status})`);
  }

  const resJson = await response.json();
  return resJson.data;
}

// ---------------------------------------------------------------------------
// Phase 6: AI-Assisted Document Analysis, Candidate Extraction & Anomalies
// ---------------------------------------------------------------------------

export interface ExtractedFieldItem {
  id: string;
  document_id: string;
  processing_run_id?: string | null;
  field_key: string;
  raw_value?: string | null;
  normalized_value?: string | null;
  normalization_status?: string | null;
  date_parse_status?: string | null;
  candidate_values?: any;
  page_number?: number | null;
  extraction_method: string;
  confidence?: number | null;
  confidence_basis?: string | null;
  extraction_status: string;
  review_status: string;
  field_version: number;
  is_current: boolean;
  created_at: string;
}

export interface FindingEvidenceItem {
  id: string;
  finding_id: string;
  sort_order: number;
  evidence_type: string;
  label: string;
  document_id?: string | null;
  field_id?: string | null;
  page_number?: number | null;
  raw_value?: string | null;
  normalized_value?: string | null;
  snapshot: Record<string, any>;
  captured_at: string;
}

export interface FindingItem {
  id: string;
  application_id: string;
  document_id?: string | null;
  validation_run_id?: string | null;
  rule_result_id?: string | null;
  rule_code: string;
  rule_version: string;
  finding_type: string;
  category: string;
  indicator_id?: string | null;
  finding_key: string;
  result_status: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  explanation: string;
  expected_value?: string | null;
  observed_value?: string | null;
  recommended_action: string;
  requires_human_review: boolean;
  evidence_note?: string | null;
  review_status: 'OPEN' | 'UNDER_REVIEW' | 'CONFIRMED' | 'DISMISSED' | 'RESOLVED' | 'AWAITING_EVIDENCE';
  review_comment?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  is_current: boolean;
  detection_method: string;
  created_at: string;
  updated_at: string;
  evidence_items: FindingEvidenceItem[];
}

export interface ApplicationAnalysisData {
  application_id: string;
  total_anomalies: number;
  open_findings: number;
  confirmed_findings: number;
  dismissed_findings: number;
  resolved_findings: number;
  severity_breakdown: Record<string, number>;
  category_breakdown: Record<string, number>;
  ai_advisory_status: string;
  ai_advisory_message: string;
  findings: FindingItem[];
  extracted_fields: ExtractedFieldItem[];
}

export interface FindingReviewPayload {
  review_status: string;
  comment?: string;
  reviewer_id?: string;
}

export async function fetchApplicationAnalysis(applicationId: string): Promise<ApplicationAnalysisData> {
  const response = await fetch(`/api/v1/applications/${applicationId}/analysis`, {
    method: 'GET',
    headers: COMMON_HEADERS,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error?.message || `Failed to fetch application analysis (${response.status})`);
  }

  const resJson = await response.json();
  return resJson.data;
}

export async function triggerApplicationAnalysis(applicationId: string): Promise<ApplicationAnalysisData> {
  const response = await fetch(`/api/v1/applications/${applicationId}/analyze`, {
    method: 'POST',
    headers: COMMON_HEADERS,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error?.message || `Failed to trigger analysis (${response.status})`);
  }

  const resJson = await response.json();
  return resJson.data;
}

export async function fetchApplicationAnomalies(
  applicationId: string,
  filter?: { severity?: string; category?: string; review_status?: string },
): Promise<FindingItem[]> {
  const params = new URLSearchParams();
  if (filter?.severity) params.set('severity', filter.severity);
  if (filter?.category) params.set('category', filter.category);
  if (filter?.review_status) params.set('review_status', filter.review_status);

  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`/api/v1/applications/${applicationId}/anomalies${query}`, {
    method: 'GET',
    headers: COMMON_HEADERS,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error?.message || `Failed to list anomalies (${response.status})`);
  }

  const resJson = await response.json();
  return resJson.data;
}

export async function fetchFindingDetail(findingId: string): Promise<FindingItem> {
  const response = await fetch(`/api/v1/anomalies/${findingId}`, {
    method: 'GET',
    headers: COMMON_HEADERS,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error?.message || `Failed to fetch finding (${response.status})`);
  }

  const resJson = await response.json();
  return resJson.data;
}

export async function reviewFinding(findingId: string, payload: FindingReviewPayload): Promise<FindingItem> {
  const response = await fetch(`/api/v1/anomalies/${findingId}/review`, {
    method: 'POST',
    headers: COMMON_HEADERS,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error?.message || `Failed to submit review for finding (${response.status})`);
  }

  const resJson = await response.json();
  return resJson.data;
}

export async function fetchExtractedFields(
  applicationId: string,
  fieldKey?: string,
  documentId?: string,
): Promise<ExtractedFieldItem[]> {
  const params = new URLSearchParams();
  if (fieldKey) params.set('field_key', fieldKey);
  if (documentId) params.set('document_id', documentId);

  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`/api/v1/applications/${applicationId}/extracted-fields${query}`, {
    method: 'GET',
    headers: COMMON_HEADERS,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error?.message || `Failed to fetch candidate fields (${response.status})`);
  }

  const resJson = await response.json();
  return resJson.data;
}

// ---------------------------------------------------------------------------
// Phase 7: Authentication, Session & User Management Types & Client
// ---------------------------------------------------------------------------

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  role: 'ADMIN' | 'REVIEWER' | 'VIEWER' | 'INSTITUTION_USER' | string;
  institution_id?: string | null;
  is_active: boolean;
  last_login_at?: string | null;
  created_at: string;
}

export interface PaginatedUsers {
  data: UserProfile[];
  meta: {
    page: number;
    page_size: number;
    total: number;
  };
}

export async function loginUser(email: string, password: string): Promise<UserProfile> {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: COMMON_HEADERS,
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  const resJson = await response.json();
  if (!response.ok) {
    const message = resJson?.error?.message || 'Authentication failed';
    const code = resJson?.error?.code;
    const error = new Error(code ? `[${code}] ${message}` : message);
    (error as any).code = code;
    throw error;
  }

  return resJson.data;
}

export async function logoutUser(): Promise<void> {
  const response = await fetch('/api/v1/auth/logout', {
    method: 'POST',
    headers: COMMON_HEADERS,
    credentials: 'include',
  });

  if (!response.ok) {
    const resJson = await response.json().catch(() => null);
    throw new Error(resJson?.error?.message || 'Logout failed');
  }
}

export async function fetchCurrentUser(): Promise<UserProfile | null> {
  try {
    const response = await fetch('/api/v1/auth/me', {
      method: 'GET',
      headers: COMMON_HEADERS,
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    const resJson = await response.json();
    return resJson.data;
  } catch (err) {
    return null;
  }
}

export async function changeUserPassword(currentPassword: string, newPassword: string): Promise<UserProfile> {
  const response = await fetch('/api/v1/auth/change-password', {
    method: 'POST',
    headers: COMMON_HEADERS,
    credentials: 'include',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });

  const resJson = await response.json();
  if (!response.ok) {
    const message = resJson?.error?.message || 'Failed to change password';
    const code = resJson?.error?.code;
    const error = new Error(code ? `[${code}] ${message}` : message);
    (error as any).code = code;
    throw error;
  }

  return resJson.data;
}

export async function fetchUsersList(params?: {
  page?: number;
  pageSize?: number;
  role?: string;
  isActive?: boolean;
}): Promise<PaginatedUsers> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('page_size', String(params.pageSize));
  if (params?.role) query.set('role', params.role);
  if (params?.isActive !== undefined) query.set('is_active', String(params.isActive));

  const response = await fetch(`/api/v1/users?${query.toString()}`, {
    method: 'GET',
    headers: COMMON_HEADERS,
    credentials: 'include',
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error?.message || `Failed to fetch users (${response.status})`);
  }

  return response.json();
}

export async function createNewUser(payload: {
  email: string;
  display_name: string;
  password: string;
  role: string;
  institution_id?: string;
}): Promise<UserProfile> {
  const response = await fetch('/api/v1/users', {
    method: 'POST',
    headers: COMMON_HEADERS,
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const resJson = await response.json();
  if (!response.ok) {
    const message = resJson?.error?.message || 'Failed to create user';
    const code = resJson?.error?.code;
    const error = new Error(code ? `[${code}] ${message}` : message);
    (error as any).code = code;
    throw error;
  }

  return resJson.data;
}

export async function toggleUserActiveStatus(userId: string, isActive: boolean): Promise<UserProfile> {
  const response = await fetch(`/api/v1/users/${userId}/status`, {
    method: 'PATCH',
    headers: COMMON_HEADERS,
    credentials: 'include',
    body: JSON.stringify({ is_active: isActive }),
  });

  const resJson = await response.json();
  if (!response.ok) {
    const message = resJson?.error?.message || 'Failed to update user status';
    const code = resJson?.error?.code;
    const error = new Error(code ? `[${code}] ${message}` : message);
    (error as any).code = code;
    throw error;
  }

  return resJson.data;
}

// ---------------------------------------------------------------------------
// Phase 8: End-to-End Workflow Orchestration & Readiness Types & Client
// ---------------------------------------------------------------------------

export interface StageDetail {
  status: string;
  summary: string;
  metadata?: Record<string, any>;
}

export interface WorkflowStatusData {
  application_id: string;
  application_reference: string;
  lifecycle_status: string;
  pipeline_status: string;
  submitted_at?: string | null;
  assigned_reviewer_id?: string | null;
  stages: Record<string, StageDetail>;
  last_updated_at: string;
}

export interface ApplicationReadinessData {
  application_id: string;
  is_ready_for_scrutiny: boolean;
  readiness_state: string;
  document_readiness: {
    complete: boolean;
    uploaded_count: number;
    required_count: number;
    missing_types: string[];
  };
  processing_readiness: {
    complete: boolean;
    total_documents: number;
    processed_count: number;
    pending_count: number;
    failed_count: number;
  };
  validation_readiness: {
    evaluated: boolean;
    passed_count: number;
    failed_count: number;
    needs_review_count: number;
    unable_to_evaluate_count: number;
  };
  anomaly_readiness: {
    analyzed: boolean;
    total_findings: number;
    open_findings: number;
    confirmed_findings: number;
    dismissed_findings: number;
    resolved_findings: number;
  };
  blockers: string[];
  recommended_action: string;
}

export interface ScrutinyQueueItemData {
  id: string;
  application_reference: string;
  institution_id: string;
  institution_name: string;
  category_code: string;
  academic_year?: string | null;
  lifecycle_status: string;
  pipeline_status: string;
  readiness_state: string;
  blockers_count: number;
  open_findings_count: number;
  validation_failure_count: number;
  assigned_reviewer_id?: string | null;
  submitted_at?: string | null;
  created_at: string;
}

export interface PaginatedScrutinyQueue {
  data: ScrutinyQueueItemData[];
  meta: {
    page: number;
    page_size: number;
    total: number;
  };
}

export async function fetchWorkflowStatus(applicationId: string): Promise<WorkflowStatusData> {
  const response = await fetch(`/api/v1/applications/${applicationId}/workflow`, {
    method: 'GET',
    headers: COMMON_HEADERS,
    credentials: 'include',
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error?.message || `Failed to fetch workflow status (${response.status})`);
  }

  const resJson = await response.json();
  return resJson.data;
}

export async function fetchApplicationReadiness(applicationId: string): Promise<ApplicationReadinessData> {
  const response = await fetch(`/api/v1/applications/${applicationId}/readiness`, {
    method: 'GET',
    headers: COMMON_HEADERS,
    credentials: 'include',
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error?.message || `Failed to fetch application readiness (${response.status})`);
  }

  const resJson = await response.json();
  return resJson.data;
}

export async function startApplicationWorkflow(applicationId: string): Promise<WorkflowStatusData> {
  const response = await fetch(`/api/v1/applications/${applicationId}/workflow/start`, {
    method: 'POST',
    headers: COMMON_HEADERS,
    credentials: 'include',
  });

  const resJson = await response.json();
  if (!response.ok) {
    const message = resJson?.error?.message || 'Failed to start workflow';
    const code = resJson?.error?.code;
    const error = new Error(code ? `[${code}] ${message}` : message);
    (error as any).code = code;
    throw error;
  }

  return resJson.data;
}

export async function transitionWorkflowState(
  applicationId: string,
  payload: { target_status: string; reason?: string; reviewer_notes?: string }
): Promise<WorkflowStatusData> {
  const response = await fetch(`/api/v1/applications/${applicationId}/workflow/transitions`, {
    method: 'POST',
    headers: COMMON_HEADERS,
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const resJson = await response.json();
  if (!response.ok) {
    const message = resJson?.error?.message || 'Failed to transition workflow state';
    const code = resJson?.error?.code;
    const error = new Error(code ? `[${code}] ${message}` : message);
    (error as any).code = code;
    throw error;
  }

  return resJson.data;
}

export async function fetchScrutinyQueue(params?: {
  page?: number;
  pageSize?: number;
  readinessState?: string;
  lifecycleStatus?: string;
}): Promise<PaginatedScrutinyQueue> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('page_size', String(params.pageSize));
  if (params?.readinessState) query.set('readiness_state', params.readinessState);
  if (params?.lifecycleStatus) query.set('lifecycle_status', params.lifecycleStatus);

  const response = await fetch(`/api/v1/scrutiny-queue?${query.toString()}`, {
    method: 'GET',
    headers: COMMON_HEADERS,
    credentials: 'include',
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error?.message || `Failed to fetch scrutiny queue (${response.status})`);
  }

  return response.json();
}

// ==========================================
// Phase 9: Reporting & Decision Support Types
// ==========================================

export interface RuleExplanationItem {
  rule_code: string;
  name: string;
  rule_type: string;
  status: string;
  purpose: string;
  expected: string;
  observed: string;
  evidence_source: string;
  document_name?: string | null;
  page_number?: number | null;
  evaluated_at?: string | null;
  limitation_or_uncertainty?: string | null;
  recommendation?: string | null;
}

export interface FindingEvidenceSummary {
  document_id?: string | null;
  document_name?: string | null;
  page_number?: number | null;
  field_key?: string | null;
  extracted_value?: string | null;
  declared_value?: string | null;
  source_type?: string | null;
  comparison_note?: string | null;
}

export interface AnomalyFindingItem {
  finding_id: string;
  finding_code: string;
  category: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  source_agent: string;
  confidence_score?: number | null;
  evidence: FindingEvidenceSummary[];
  suggested_action?: string | null;
}

export interface ActionRecommendation {
  action_type: string;
  priority: string;
  title: string;
  description: string;
  reference_id?: string | null;
}

export interface EvidenceTraceItem {
  id: string;
  application_id: string;
  document_id?: string | null;
  document_name?: string | null;
  page_number?: number | null;
  field_key?: string | null;
  declared_value?: string | null;
  observed_value?: string | null;
  comparison_note?: string | null;
  source: string;
  timestamp?: string | null;
}

export interface ReviewSummaryResponse {
  application_id: string;
  application_title: string;
  application_status: string;
  category_name?: string | null;
  institution_name?: string | null;
  institution_code?: string | null;
  created_at: string;
  documents_summary: {
    total_documents: number;
    processed_documents: number;
    missing_required_types: string[];
    is_complete: boolean;
  };
  validation_summary: {
    run_id?: string | null;
    evaluated_at?: string | null;
    total_rules: number;
    passed: number;
    failed: number;
    needs_review: number;
    unable_to_evaluate: number;
  };
  anomaly_summary: {
    total_findings: number;
    open_findings: number;
    confirmed_findings: number;
    dismissed_findings: number;
  };
  rule_explanations: RuleExplanationItem[];
  anomalies: AnomalyFindingItem[];
  evidence_items: EvidenceTraceItem[];
  recommended_actions: ActionRecommendation[];
  disclaimer: string;
}

export interface ScrutinyReportResponse {
  id: string;
  application_id: string;
  generated_by_id?: string | null;
  report_type: string;
  format: string;
  file_size_bytes: number;
  created_at: string;
  summary_snapshot?: Record<string, any> | null;
}

export async function fetchReviewSummary(applicationId: string): Promise<ReviewSummaryResponse> {
  const response = await fetch(`/api/v1/applications/${applicationId}/review-summary`, {
    method: 'GET',
    headers: COMMON_HEADERS,
    credentials: 'include',
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error?.message || `Failed to fetch review summary (${response.status})`);
  }

  return response.json();
}

export async function fetchEvidenceTrace(applicationId: string): Promise<EvidenceTraceItem[]> {
  const response = await fetch(`/api/v1/applications/${applicationId}/evidence`, {
    method: 'GET',
    headers: COMMON_HEADERS,
    credentials: 'include',
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error?.message || `Failed to fetch evidence trace (${response.status})`);
  }

  return response.json();
}

export async function generateReport(
  applicationId: string,
  format: 'PDF' | 'JSON' = 'PDF'
): Promise<ScrutinyReportResponse> {
  const response = await fetch(`/api/v1/applications/${applicationId}/reports`, {
    method: 'POST',
    headers: COMMON_HEADERS,
    credentials: 'include',
    body: JSON.stringify({ format, include_evidence_detail: true }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error?.message || `Failed to generate report (${response.status})`);
  }

  return response.json();
}

export async function fetchApplicationReports(applicationId: string): Promise<ScrutinyReportResponse[]> {
  const response = await fetch(`/api/v1/applications/${applicationId}/reports`, {
    method: 'GET',
    headers: COMMON_HEADERS,
    credentials: 'include',
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error?.message || `Failed to fetch reports (${response.status})`);
  }

  return response.json();
}

export function getReportDownloadUrl(reportId: string): string {
  return `/api/v1/reports/${reportId}/download`;
}

// ---------------------------------------------------------------------------
// Phase 11 — Extended Verification & Registry Integration
// ---------------------------------------------------------------------------

export interface RegistryProviderInfo {
  provider_code: string;
  provider_name: string;
  description: string;
  is_synthetic: boolean;
  is_available: boolean;
  status: string;
  statutory_authority: string;
  requires_network: boolean;
  notes?: string | null;
}

export interface RegistryVerificationResultItem {
  id: string;
  run_id: string;
  check_type: string;
  status: 'MATCH' | 'MISMATCH' | 'NOT_FOUND' | 'AMBIGUOUS' | 'STALE_REFERENCE' | 'INSUFFICIENT_DATA';
  application_value?: string | null;
  registry_value?: string | null;
  explanation: string;
  discrepancy_details?: Record<string, any> | null;
  requires_human_review: boolean;
  resolved_by_id?: string | null;
  resolution_status: 'UNRESOLVED' | 'ACCEPTED' | 'WAIVED' | 'FLAGGED';
  resolution_notes?: string | null;
  resolved_at?: string | null;
}

export interface RegistryVerificationRunItem {
  id: string;
  application_id: string;
  provider_code: string;
  overall_status: 'MATCH' | 'MISMATCH' | 'NOT_FOUND' | 'AMBIGUOUS' | 'STALE_REFERENCE' | 'INSUFFICIENT_DATA' | 'PROVIDER_UNAVAILABLE';
  summary?: string | null;
  reference_record_id?: string | null;
  executed_by_id?: string | null;
  executed_at: string;
  results: RegistryVerificationResultItem[];
}

export async function fetchRegistryProviders(): Promise<RegistryProviderInfo[]> {
  const response = await fetch('/api/v1/registry/providers', {
    method: 'GET',
    headers: COMMON_HEADERS,
    credentials: 'include',
  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.error?.message || `Failed to fetch registry providers (${response.status})`);
  }
  return response.json();
}

export async function triggerRegistryVerification(
  applicationId: string,
  providerCode: string = 'SYNTHETIC_AISHE'
): Promise<RegistryVerificationRunItem> {
  const response = await fetch(`/api/v1/applications/${applicationId}/registry-verification`, {
    method: 'POST',
    headers: COMMON_HEADERS,
    credentials: 'include',
    body: JSON.stringify({ provider_code: providerCode }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.error?.message || `Failed to trigger registry verification (${response.status})`);
  }
  return response.json();
}

export async function fetchApplicationRegistryRuns(applicationId: string): Promise<RegistryVerificationRunItem[]> {
  const response = await fetch(`/api/v1/applications/${applicationId}/registry-verification`, {
    method: 'GET',
    headers: COMMON_HEADERS,
    credentials: 'include',
  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.error?.message || `Failed to fetch registry verification runs (${response.status})`);
  }
  return response.json();
}

export async function resolveRegistryDiscrepancy(
  resultId: string,
  resolutionStatus: string,
  resolutionNotes: string
): Promise<RegistryVerificationResultItem> {
  const response = await fetch(`/api/v1/registry-verification/${resultId}/resolve`, {
    method: 'PATCH',
    headers: COMMON_HEADERS,
    credentials: 'include',
    body: JSON.stringify({
      resolution_status: resolutionStatus,
      resolution_notes: resolutionNotes,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.error?.message || `Failed to resolve registry discrepancy (${response.status})`);
  }
  return response.json();
}



