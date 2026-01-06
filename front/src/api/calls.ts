import { apiClient } from './client';

export interface UserSummary {
  id: string;
  username: string;
  display_name?: string;
  displayName?: string; // Some parts of the app might use camelCase
  avatar?: string;
}

export interface CallParticipant {
  id: string;
  user: UserSummary;
  role: string;
  status: string;
  invited_at?: string;
  joined_at?: string;
  left_at?: string;
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
  scheduled_time?: string;
  duration_minutes?: number;
  status: string;
  created_at?: string;
  participants?: CallParticipant[];
  recurrence_group_id?: string;
  is_recurring?: boolean;
  recurrence_type?: string;
  recurrence_days?: string;
  recurrence_end_date?: string;
}

export interface CallAccess {
  hasAccess: boolean;
  role: string;
}

export const getToken = async (roomName: string, participantName: string): Promise<string> => {
  const response = await apiClient.post('/calls/token', { roomName, participantName });
  return response.data.token;
};

export const createRoom = async (): Promise<string> => {
  const response = await apiClient.post('/calls/create', {});
  return response.data.roomId;
};

export const checkAccess = async (callId: string): Promise<CallAccess> => {
  const response = await apiClient.get(`/calls/${callId}/access`);
  return response.data;
};

export const listCalls = async (): Promise<CallResponse[]> => {
  const response = await apiClient.get('/calls');
  return response.data;
};

export const getCall = async (id: string): Promise<CallResponse> => {
  const response = await apiClient.get(`/calls/${id}`);
  return response.data;
};

export const getByRoomId = async (roomId: string): Promise<CallResponse> => {
  const response = await apiClient.get(`/calls/by-room/${roomId}`);
  return response.data;
};

export const createCall = async (data: any): Promise<CallResponse> => {
  const response = await apiClient.post('/calls', data);
  return response.data;
};

export const updateCall = async (id: string, data: any): Promise<CallResponse> => {
  const response = await apiClient.put(`/calls/${id}`, data);
  return response.data;
};

export const deleteCall = async (id: string): Promise<void> => {
  await apiClient.delete(`/calls/${id}`);
};

export const getCallParticipants = async (callId: string): Promise<CallParticipant[]> => {
  const response = await apiClient.get(`/calls/${callId}/participants`);
  return response.data;
};

export const getCallsInRange = async (start: string, end: string): Promise<CallResponse[]> => {
  const response = await apiClient.get('/calls/range', { params: { start, end } });
  return response.data;
};