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

const inFlightGets = new Map<string, Promise<any>>();

export async function apiGet<T>(endpoint: string, options?: { timeoutMs?: number; skipDedupe?: boolean }): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  if (!options?.skipDedupe && inFlightGets.has(url)) {
    return inFlightGets.get(url) as Promise<T>;
  }

  const fetchPromise = (async () => {
    const headers = await getAuthHeaders();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options?.timeoutMs || 15000);

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      const text = await res.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(res.status === 404 ? `Service endpoint not found (404): ${endpoint}` : `Server error (${res.status})`);
      }
      if (!res.ok) {
        throw new Error(json.error?.message || json.error || `HTTP ${res.status}`);
      }
      return json as T;
    } finally {
      clearTimeout(timeout);
    }
  })().finally(() => {
    inFlightGets.delete(url);
  });

  if (!options?.skipDedupe) {
    inFlightGets.set(url, fetchPromise);
  }

  return fetchPromise;
}

export async function apiPost<T>(endpoint: string, body?: any): Promise<T> {
  const headers = await getAuthHeaders();
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(res.status === 404 ? `Service endpoint not found (404): ${endpoint}` : `Server error (${res.status})`);
  }
  if (!res.ok) {
    throw new Error(json.error?.message || json.error || `HTTP ${res.status}`);
  }
  return json;
}

export async function apiPut<T>(endpoint: string, body?: any): Promise<T> {
  const headers = await getAuthHeaders();
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(res.status === 404 ? `Service endpoint not found (404): ${endpoint}` : `Server error (${res.status})`);
  }
  if (!res.ok) {
    throw new Error(json.error?.message || json.error || `HTTP ${res.status}`);
  }
  return json;
}

export async function apiPatch<T>(endpoint: string, body?: any): Promise<T> {
  const headers = await getAuthHeaders();
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(res.status === 404 ? `Service endpoint not found (404): ${endpoint}` : `Server error (${res.status})`);
  }
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
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(res.status === 404 ? `Service endpoint not found (404): ${endpoint}` : `Server error (${res.status})`);
  }
  if (!res.ok) {
    throw new Error(json.error?.message || json.error || `HTTP ${res.status}`);
  }
  return json;
}


