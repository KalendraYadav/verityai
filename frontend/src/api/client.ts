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
