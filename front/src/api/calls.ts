import { apiClient } from './client';

export type CallDto = {
  id: string;
  room_id: string;
  title: string;
  description?: string;
  project_id?: string;
  created_by?: string;
  start_at?: string;
  end_at?: string;
  created_at: string;
};

export async function listCalls(): Promise<CallDto[]> {
  const { data } = await apiClient.get<CallDto[]>('/calls');
  return data;
}

export async function getCall(id: string): Promise<CallDto> {
  const { data } = await apiClient.get<CallDto>(`/calls/${id}`);
  return data;
}

export async function getCallByRoom(roomId: string): Promise<CallDto> {
  const { data } = await apiClient.get<CallDto>(`/calls/by-room/${roomId}`);
  return data;
}

export async function createCall(payload: {
  room_id: string;
  title: string;
  description?: string;
  project_id?: string;
  start_at?: string;
  end_at?: string;
}): Promise<CallDto> {
  const { data } = await apiClient.post<CallDto>('/calls', payload);
  return data;
}

export async function updateCall(id: string, payload: Partial<{
  title: string;
  description: string;
  start_at: string;
  end_at: string;
}>): Promise<CallDto> {
  const { data } = await apiClient.put<CallDto>(`/calls/${id}`, payload);
  return data;
}

export async function deleteCall(id: string): Promise<void> {
  await apiClient.delete(`/calls/${id}`);
}


