export interface ApiResult<T> {
  data: T;
  error?: string;
}

export async function apiClient<T>(endpoint: string, options?: RequestInit): Promise<ApiResult<T>> {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000/api';
  const res = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    return { data: null as any, error: `API Request failed with status ${res.status}` };
  }
  return res.json() as Promise<ApiResult<T>>;
}
