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

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch('/api/v1/health', {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-Requested-With': 'VerityAI',
    },
  });

  if (!response.ok) {
    throw new Error(`Health check failed with HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}
