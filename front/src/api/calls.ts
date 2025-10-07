// API для работы со звонками
import { apiClient } from './client';

export interface CallCreateRequest {
  room_id: string;
  title: string;
  description?: string;
  project_id?: string;
  task_id?: string;
  start_at?: string;
  end_at?: string;
}

export interface CallResponse {
  id: string;
  room_id: string;
  title: string;
  description?: string;
  project_id?: string;
  task_id?: string;
  created_by?: string;
  start_at?: string;
  end_at?: string;
  created_at: string;
}

export async function createCall(data: CallCreateRequest): Promise<CallResponse> {
  const response = await apiClient.post('/api/calls', data);
  return response.data;
}

export async function getCallByRoomId(roomId: string): Promise<CallResponse> {
  const response = await apiClient.get(`/api/calls/by-room/${roomId}`);
  return response.data;
}

export async function listCalls(): Promise<CallResponse[]> {
  const response = await apiClient.get('/api/calls');
  return response.data;
}