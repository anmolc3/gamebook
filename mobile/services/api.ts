import { MobileAuthService } from './auth.service';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
export const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:5000';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await MobileAuthService.getStoredToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  const headers = await getAuthHeaders();
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const res = await fetch(url, {
    method: 'GET',
    headers,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || json.error || `HTTP ${res.status}`);
  }
  return json;
}

export async function apiPost<T>(endpoint: string, body?: any): Promise<T> {
  const headers = await getAuthHeaders();
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || json.error || `HTTP ${res.status}`);
  }
  return json;
}

export async function apiDelete<T>(endpoint: string): Promise<T> {
  const headers = await getAuthHeaders();
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || json.error || `HTTP ${res.status}`);
  }
  return json;
}
