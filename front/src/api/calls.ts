import { apiClient } from './client';

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
  const { data } = await apiClient.get<CallDto[]>('/calls');
  return data;
}

export async function createCall(payload: { title: string; description?: string; scheduled_start?: string; duration_minutes?: number; participant_ids?: string[] }): Promise<CallDto> {
  const { data } = await apiClient.post<CallDto>('/calls', payload);
  return data;
}

export async function getCall(callId: string): Promise<CallDto> {
  const { data } = await apiClient.get<CallDto>(`/calls/${callId}`);
  return data;
}

export async function updateCall(callId: string, payload: Partial<{ title: string; description: string; scheduled_start: string; duration_minutes: number; participant_ids: string[] }>): Promise<CallDto> {
  const { data } = await apiClient.put<CallDto>(`/calls/${callId}`, payload);
  return data;
}

export async function deleteCall(callId: string): Promise<void> {
  await apiClient.delete(`/calls/${callId}`);
}


