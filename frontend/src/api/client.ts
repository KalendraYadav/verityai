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


