import axios from 'axios';
import { getAccessToken, clearAccessToken } from '../utils/auth';

const baseURL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:7671/api';

export const apiClient = axios.create({
  baseURL,
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearAccessToken();
      if (typeof window !== 'undefined') {
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

