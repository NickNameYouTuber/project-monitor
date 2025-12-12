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
  participant_ids?: string[]; // UUIDs пользователей для приглашения
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
  participants?: CallParticipant[];
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

// ============== УПРАВЛЕНИЕ УЧАСТНИКАМИ ЗВОНКОВ ==============

export interface CallParticipant {
  id: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
  };
  role: 'ORGANIZER' | 'PARTICIPANT';
  status: 'INVITED' | 'JOINED' | 'LEFT' | 'DECLINED';
  invited_at: string;
  joined_at?: string;
  left_at?: string;
}

export interface CallWithParticipants extends CallResponse {
  participants: CallParticipant[];
}

/**
 * Добавить участника к звонку
 */
export async function addParticipant(
  callId: string, 
  userId: string, 
  role: 'ORGANIZER' | 'PARTICIPANT' = 'PARTICIPANT'
): Promise<void> {
  await apiClient.post(`/calls/${callId}/participants`, { user_id: userId, role });
}

/**
 * Удалить участника из звонка
 */
export async function removeParticipant(callId: string, userId: string): Promise<void> {
  await apiClient.delete(`/calls/${callId}/participants/${userId}`);
}

/**
 * Получить список участников звонка
 */
export async function getCallParticipants(callId: string): Promise<CallParticipant[]> {
  const response = await apiClient.get(`/calls/${callId}/participants`);
  return response.data;
}

/**
 * Проверить доступ текущего пользователя к звонку по roomId
 */
export async function checkCallAccess(roomId: string): Promise<{ hasAccess: boolean; role?: string }> {
  const response = await apiClient.get(`/calls/by-room/${roomId}/check-access`);
  const data = response.data;
  return {
    hasAccess: data.has_access ?? data.hasAccess ?? false,
    role: data.role
  };
}

/**
 * Обновить статус звонка (только для организатора)
 */
export async function updateCallStatus(callId: string, status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'): Promise<CallResponse> {
  const response = await apiClient.patch(`/calls/${callId}/status`, { status });
  return response.data;
}