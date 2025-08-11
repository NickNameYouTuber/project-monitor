import apiClient from './client';

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  username: string;
  content: string;
  is_system?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommentCreate {
  task_id: string;
  content: string;
  is_system?: boolean;
}

export async function getTaskComments(taskId: string): Promise<Comment[]> {
  const { data } = await apiClient.get<Comment[]>(`/tasks/${taskId}/comments`);
  return Array.isArray(data) ? data : [];
}

export async function createComment(payload: CommentCreate): Promise<Comment> {
  const { data } = await apiClient.post<Comment>(`/comments`, payload);
  return data;
}


