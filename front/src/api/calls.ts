import { apiClient } from './client';

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
  // Backend returns { roomId: "uuid" }
  // We construct the URL or just return ID? 
  // For now let's return the ID, and the UI can navigate to /call/:id
  return response.data.roomId;
};

export const checkAccess = async (callId: string): Promise<CallAccess> => {
  const response = await apiClient.get(`/calls/${callId}/access`);
  return response.data;
};