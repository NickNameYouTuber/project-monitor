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
  scheduled_time?: string;
  duration_minutes?: number;
  status?: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
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
  status?: string;
  created_at: string;
}

export async function createCall(data: CallCreateRequest): Promise<CallResponse> {
  const response = await apiClient.post('/calls', data);
  return response.data;
}

export async function getCallByRoomId(roomId: string): Promise<CallResponse> {
  const response = await apiClient.get(`/calls/by-room/${roomId}`);
  return response.data;
}

export async function listCalls(): Promise<CallResponse[]> {
  const response = await apiClient.get('/calls');
  return response.data;
}

export async function getCallsInRange(start: string, end: string): Promise<CallResponse[]> {
  const response = await apiClient.get('/calls/range', {
    params: { start, end }
  });
  return response.data;
}

export interface RoomParticipant {
  socketId: string;
  userId: string;
  username: string;
  mediaState: {
    camera: boolean;
    microphone: boolean;
    screen: boolean;
  };
  joinedAt: string;
  lastSeen: string;
}

export interface RoomParticipantsResponse {
  roomId: string;
  count: number;
  participants: RoomParticipant[];
}

export async function getRoomParticipants(roomId: string): Promise<RoomParticipantsResponse> {
  const response = await apiClient.get(`/meet-api/rooms/${roomId}/participants`);
  return response.data;
}