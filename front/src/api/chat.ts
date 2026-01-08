import { apiClient } from './client';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  actions?: Action[];
  widgets?: Widget[];
  isWidgetResponse?: boolean; // If true, this message should be hidden in UI
  createdAt: string;
}

export interface Widget {
  type: 'clarification' | 'entity_preview' | 'action_confirmation';
  data: any;
}

export interface Action {
  type: string;
  params: Record<string, any>;
  result?: any;
  notification?: {
    message: string;
    link: string;
    linkText: string;
  };
}

export interface Chat {
  id: string;
  title: string;
  organizationId?: string;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageRequest {
  message: string;
}

export interface SendMessageResponse {
  message: ChatMessage;
  actions?: Action[];
}

export interface ChatCreateRequest {
  title?: string;
  organizationId?: string;
  projectId?: string;
}

export async function listChats(organizationId?: string, projectId?: string): Promise<Chat[]> {
  const params: any = {};
  if (organizationId) params.organizationId = organizationId;
  if (projectId) params.projectId = projectId;

  const { data } = await apiClient.get('/chats', { params });
  return Array.isArray(data) ? data : [];
}

export async function getChat(chatId: string): Promise<Chat & { messages: ChatMessage[] }> {
  const { data } = await apiClient.get(`/chats/${chatId}`);
  return data;
}

export async function createChat(request: ChatCreateRequest): Promise<Chat> {
  const { data } = await apiClient.post('/chats', request);
  return data;
}

export async function sendMessage(chatId: string, message: string): Promise<SendMessageResponse> {
  const { data } = await apiClient.post(`/chats/${chatId}/messages`, { message });
  return data;
}

export async function deleteChat(chatId: string): Promise<void> {
  await apiClient.delete(`/chats/${chatId}`);
}
