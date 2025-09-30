import axios from 'axios';
import { apiClient } from './client';

// Отдельный клиент, чтобы не конфликтовать с Java backend на /api
// Проксим через /pyapi → nginx → FastAPI (/api)
const callsClient = axios.create({
  baseURL: (import.meta as any).env?.VITE_CALLS_API_BASE_URL || '/pyapi',
  withCredentials: false,
  timeout: 15000,
});

callsClient.interceptors.request.use((config) => {
  // Пробрасываем токен как и для общего клиента
  const token = (() => { try { return localStorage.getItem('access_token'); } catch { return null; } })();
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any)['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export type CallDto = {
  id: string;
  title: string;
  description?: string;
  scheduled_start?: string;
  duration_minutes?: number;
  created_by_user_id?: string;
  created_at: string;
  updated_at: string;
};

export async function listCalls(): Promise<CallDto[]> {
  const { data } = await callsClient.get<CallDto[]>('/calls');
  return data;
}

export async function createCall(payload: { title: string; description?: string; scheduled_start?: string; duration_minutes?: number; participant_ids?: string[] }): Promise<CallDto> {
  const { data } = await callsClient.post<CallDto>('/calls', payload);
  return data;
}

export async function getCall(callId: string): Promise<CallDto> {
  const { data } = await callsClient.get<CallDto>(`/calls/${callId}`);
  return data;
}

export async function updateCall(callId: string, payload: Partial<{ title: string; description: string; scheduled_start: string; duration_minutes: number; participant_ids: string[] }>): Promise<CallDto> {
  const { data } = await callsClient.put<CallDto>(`/calls/${callId}`, payload);
  return data;
}

export async function deleteCall(callId: string): Promise<void> {
  await callsClient.delete(`/calls/${callId}`);
}


