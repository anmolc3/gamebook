import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_STORAGE_KEY = '@gameapp_jwt_token';

const hostUri =
  Constants.expoConfig?.hostUri ||
  (Constants as any).manifest?.debuggerHost ||
  (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
  '';
const expoHost = hostUri ? hostUri.split(':')[0] : 'localhost';

const localApiUrl = `http://${expoHost}:5000/api/v1`;
const localSocketUrl = `http://${expoHost}:5000`;

export const API_BASE_URL =
  expoHost && expoHost !== 'localhost'
    ? localApiUrl
    : process.env.EXPO_PUBLIC_API_URL || localApiUrl;

export const SOCKET_URL =
  expoHost && expoHost !== 'localhost'
    ? localSocketUrl
    : process.env.EXPO_PUBLIC_SOCKET_URL || localSocketUrl;

export function buildApiUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const base = API_BASE_URL.replace(/\/+$/, '');
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${cleanPath}`;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const inFlightGets = new Map<string, Promise<any>>();

export async function apiGet<T>(endpoint: string, options?: { timeoutMs?: number; skipDedupe?: boolean }): Promise<T> {
  const url = buildApiUrl(endpoint);
  
  if (!options?.skipDedupe && inFlightGets.has(url)) {
    return inFlightGets.get(url) as Promise<T>;
  }

  const fetchPromise = (async () => {
    const headers = await getAuthHeaders();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options?.timeoutMs || 30000);

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
  const url = buildApiUrl(endpoint);
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
  const url = buildApiUrl(endpoint);
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
  const url = buildApiUrl(endpoint);
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
  const url = buildApiUrl(endpoint);
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


