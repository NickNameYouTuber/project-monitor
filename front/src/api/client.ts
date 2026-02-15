import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem('access_token');
  } catch {
    return null;
  }
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
    // Track which token was used for this request (for safe 401 handling)
    (config as any)._tokenUsed = token;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      // Only remove token if it matches the one used for this request
      // Prevents a stale 401 from a concurrent request from wiping a newer valid token
      const tokenUsed = error?.config?._tokenUsed;
      const currentToken = getAccessToken();
      if (!currentToken || currentToken === tokenUsed) {
        try { localStorage.removeItem('access_token'); } catch {}
      }
    }
    return Promise.reject(error);
  }
);

export function setAccessToken(token: string | null) {
  try {
    if (token) localStorage.setItem('access_token', token);
    else localStorage.removeItem('access_token');
  } catch {}
}


