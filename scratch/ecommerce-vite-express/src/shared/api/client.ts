export type ApiResult<T> = { data: T; requestId?: string };

export async function apiClient<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
  return response.json() as Promise<ApiResult<T>>;
}
