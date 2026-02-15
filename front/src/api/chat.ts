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
  id?: string; // Unique widget identifier for persistence
  type: 'clarification' | 'entity_preview' | 'action_confirmation' | 'action_notification' | 'action_result';
  data: Record<string, any> | null; // Typed as Record instead of any
  selectedValue?: string; // Persisted selected value (for questions, confirmations)
  selectedAt?: string; // When the selection was made
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
  isWidgetResponse?: boolean;
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

export async function sendMessage(chatId: string, message: string, isWidgetResponse?: boolean): Promise<SendMessageResponse> {
  const { data } = await apiClient.post(`/chats/${chatId}/messages`, { message, isWidgetResponse });
  return data;
}

export async function deleteChat(chatId: string): Promise<void> {
  await apiClient.delete(`/chats/${chatId}`);
}

export interface UpdateWidgetStateRequest {
  widgetId: string;
  widgetType: string;
  selectedValue: string;
}

export interface WidgetStateResponse {
  id: string;
  widgetId: string;
  widgetType: string;
  selectedValue: string;
  selectedAt: string;
}

export async function updateWidgetState(
  chatId: string,
  messageId: string,
  request: UpdateWidgetStateRequest
): Promise<WidgetStateResponse> {
  const { data } = await apiClient.patch(
    `/chats/${chatId}/messages/${messageId}/widgets`,
    request
  );
  return data;
}

export async function getWidgetStates(
  chatId: string,
  messageId: string
): Promise<WidgetStateResponse[]> {
  const { data } = await apiClient.get(
    `/chats/${chatId}/messages/${messageId}/widgets`
  );
  return Array.isArray(data) ? data : [];
}
